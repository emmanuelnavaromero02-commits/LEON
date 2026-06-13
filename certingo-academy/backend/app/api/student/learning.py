import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ...database import models
from ...database.db import get_db
from ...schemas import academy as schemas
from ...services.academy.learning_engine import (
    AdaptiveSelector,
    DiagnosticEngine,
    ExamGenerator,
    LearningPathGenerator,
    MasteryEngine,
)
from ...services.academy.spaced_repetition_service import SpacedRepetitionService
from ...services.ai.ai_service import AIService
from ...services.audit.audit_service import AuditService
from ...services.events.event_service import EventService
from ...services.knowledge.knowledge_service import KnowledgeService
from ..deps import ensure_user_access, get_current_user

router = APIRouter(tags=["student"])

DEFAULT_CERTIFICATION_ID = "aws-cloud-practitioner"


def resolve_certification_id(db: Session, user_id: str, tenant_id: str) -> str:
    """Target certification from the learner profile, with a safe fallback."""
    profile = db.query(models.LearnerProfile).filter(
        models.LearnerProfile.user_id == user_id,
        models.LearnerProfile.tenant_id == tenant_id,
    ).first()
    if profile and profile.target_certification_id:
        return profile.target_certification_id
    return DEFAULT_CERTIFICATION_ID


def record_attempt(db: Session, user_id: str, tenant_id: str, certification_id: str,
                   attempt_type: str, question, selected_answer: str, is_correct: bool):
    """Persist a single-answer Attempt so adaptive history (last N answers,
    no-repeat) has data to work with. Additive; does not change responses."""
    attempt = models.Attempt(
        id=str(uuid.uuid4()),
        user_id=user_id,
        tenant_id=tenant_id,
        certification_id=certification_id,
        type=attempt_type,
        score=1.0 if is_correct else 0.0,
        xp_earned=10 if is_correct else 0,
    )
    db.add(attempt)
    db.flush()  # need attempt.id for the answer row
    db.add(models.AttemptAnswer(
        attempt_id=attempt.id,
        question_id=question.id,
        selected_answer=selected_answer,
        is_correct=is_correct,
    ))
    db.commit()
    return attempt

@router.post("/onboarding")
async def onboarding(
    request: schemas.OnboardingRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or update the learner profile of the authenticated user.

    User registration lives in /api/auth/register; this endpoint only manages
    the learning profile.
    """
    tenant_id = current_user.tenant_id

    profile = db.query(models.LearnerProfile).filter(
        models.LearnerProfile.user_id == current_user.id,
        models.LearnerProfile.tenant_id == tenant_id,
    ).first()

    if profile is None:
        profile = models.LearnerProfile(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            tenant_id=tenant_id,
        )
        db.add(profile)

    profile.background = request.background
    profile.preferred_style = request.preferred_style
    profile.weekly_time_minutes = request.weekly_time_minutes
    profile.confidence_level = request.confidence_level
    if request.exam_deadline is not None:
        profile.exam_deadline = request.exam_deadline
    if request.target_certification_id is not None:
        profile.target_certification_id = request.target_certification_id
    db.commit()
    db.refresh(profile)

    AuditService().log(db, tenant_id, current_user.id, "onboarding_completed", "LearnerProfile", profile.id)

    return {
        "user_id": current_user.id,
        "profile_id": profile.id,
        "background": profile.background,
        "preferred_style": profile.preferred_style,
        "weekly_time_minutes": profile.weekly_time_minutes,
        "exam_deadline": profile.exam_deadline,
        "confidence_level": profile.confidence_level,
        "target_certification_id": profile.target_certification_id,
        "message": "Onboarding successful",
    }

@router.post("/diagnostic/start/{user_id}")
async def start_diagnostic(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_access(db, current_user, user_id)
    cert_id = resolve_certification_id(db, user_id, current_user.tenant_id)
    engine = DiagnosticEngine()
    questions = engine.generate_diagnostic_test(db, current_user.tenant_id, cert_id)
    return {"questions": [
        {
            "id": q.id,
            "prompt": q.prompt,
            "options": q.options,
            "difficulty": q.difficulty,
            "correct_answer": q.correct_answer
        } for q in questions
    ]}

@router.post("/diagnostic/submit/{user_id}")
async def submit_diagnostic(
    user_id: str,
    answers: list[schemas.AnswerSubmit],
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_access(db, current_user, user_id)
    tenant_id = current_user.tenant_id
    engine = MasteryEngine()
    audit = AuditService()
    event_bus = EventService(db, audit)

    for ans in answers:
        question = db.query(models.Question).filter(
            models.Question.id == ans.question_id,
            models.Question.tenant_id == tenant_id,
        ).first()
        if question:
            is_correct = ans.selected_answer == question.correct_answer
            engine.update_user_mastery(db, user_id, tenant_id, question.skill_id, is_correct, question.difficulty)

    event_bus.emit(tenant_id, user_id, "diagnostic_completed", {"question_count": len(answers)})
    return {"status": "success"}

@router.get("/dashboard/{user_id}")
async def get_dashboard(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = ensure_user_access(db, current_user, user_id)
    tenant_id = current_user.tenant_id

    cert_id = resolve_certification_id(db, user_id, tenant_id)
    mastery = db.query(models.MasteryScore).filter(
        models.MasteryScore.user_id == user_id,
        models.MasteryScore.tenant_id == tenant_id,
    ).all()
    lp_gen = LearningPathGenerator()
    recommendation = lp_gen.get_next_recommendation(db, user_id, tenant_id, cert_id)

    return {
        "user_name": user.full_name,
        "certification": "AWS Cloud Practitioner",
        "progress": sum([m.score for m in mastery]) / max(len(mastery), 1) if mastery else 0,
        "xp": user.profile.total_xp if user.profile else 0,
        "streak": user.profile.current_streak if user.profile else 0,
        "mastery_by_skill": {m.skill_id: m.score for m in mastery},
        # Backwards-compatible string; the structured object lives alongside it.
        "recommendation": recommendation["message"],
        "recommendation_detail": recommendation,
    }

@router.get("/lesson/next/{user_id}")
async def get_next_lesson(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = ensure_user_access(db, current_user, user_id)
    tenant_id = current_user.tenant_id

    cert_id = resolve_certification_id(db, user_id, tenant_id)
    selector = AdaptiveSelector()

    # Pick the learner's weakest skill (falls back to any cert skill with content).
    skill_id = selector.get_weakest_skill_id(db, user_id, tenant_id, cert_id)
    skill = None
    if skill_id:
        skill = db.query(models.Skill).filter(
            models.Skill.id == skill_id,
            models.Skill.tenant_id == tenant_id,
        ).first()
    if skill is None:
        skill = db.query(models.Skill).filter(models.Skill.tenant_id == tenant_id).first()
    if skill is None:
        raise HTTPException(status_code=404, detail="No skills available yet")

    mastery = selector.get_skill_mastery(db, user_id, tenant_id, skill.id)

    ai_service = AIService(db, tenant_id)
    kb_service = KnowledgeService(db)

    source_content = await kb_service.get_relevant_content(tenant_id, skill.id)
    lesson = await ai_service.generate_lesson(
        user.profile.__dict__ if user.profile else {},
        {"id": skill.id, "name": skill.name},
        source_content,
        mastery,
    )
    lesson["skill_id"] = skill.id
    return lesson

@router.post("/lesson/submit/{user_id}")
async def submit_lesson(
    user_id: str,
    submission: schemas.AnswerSubmit,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_access(db, current_user, user_id)
    tenant_id = current_user.tenant_id

    question = db.query(models.Question).filter(
        models.Question.id == submission.question_id,
        models.Question.tenant_id == tenant_id,
    ).first()
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    engine = MasteryEngine()
    audit = AuditService()
    event_bus = EventService(db, audit)
    cert_id = resolve_certification_id(db, user_id, tenant_id)

    # Evaluate the submitted answer against the real correct answer
    is_correct = submission.selected_answer == question.correct_answer
    new_score = engine.update_user_mastery(
        db, user_id, tenant_id, question.skill_id, is_correct, question.difficulty or "medium"
    )

    # Schedule the next spaced-repetition review and log the attempt for history.
    SpacedRepetitionService(db).record_review(tenant_id, user_id, question, is_correct)
    record_attempt(db, user_id, tenant_id, cert_id, "lesson", question, submission.selected_answer, is_correct)

    event_bus.emit(tenant_id, user_id, "lesson_completed", {"skill_id": question.skill_id, "is_correct": is_correct})
    return {"status": "success", "is_correct": is_correct, "new_mastery": new_score}

@router.get("/practice/next/{user_id}")
async def get_next_practice(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_access(db, current_user, user_id)
    tenant_id = current_user.tenant_id

    cert_id = resolve_certification_id(db, user_id, tenant_id)
    selector = AdaptiveSelector()
    question, source = selector.select_question(db, user_id, tenant_id, cert_id)
    if not question:
        raise HTTPException(status_code=404, detail="No questions available")

    return {
        # `source` is additive: "review" for due spaced-repetition items, else "new".
        "source": source,
        "question": {
            "id": question.id,
            "prompt": question.prompt,
            "options": question.options,
            "difficulty": question.difficulty,
            "correct_answer": question.correct_answer
        }
    }

@router.post("/practice/submit/{user_id}")
async def submit_practice(
    user_id: str,
    submission: schemas.AnswerSubmit,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_access(db, current_user, user_id)
    tenant_id = current_user.tenant_id

    question = db.query(models.Question).filter(
        models.Question.id == submission.question_id,
        models.Question.tenant_id == tenant_id,
    ).first()
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    is_correct = submission.selected_answer == question.correct_answer

    engine = MasteryEngine()
    audit = AuditService()
    event_bus = EventService(db, audit)
    cert_id = resolve_certification_id(db, user_id, tenant_id)

    new_score = engine.update_user_mastery(db, user_id, tenant_id, question.skill_id, is_correct, question.difficulty)

    # Mistakes Notebook Logic
    if not is_correct:
        mistake = db.query(models.MistakeLog).filter(
            models.MistakeLog.user_id == user_id,
            models.MistakeLog.tenant_id == tenant_id,
            models.MistakeLog.question_id == question.id
        ).first()
        if mistake:
            mistake.count += 1
            mistake.last_seen = datetime.utcnow()
        else:
            mistake = models.MistakeLog(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                user_id=user_id,
                question_id=question.id,
                skill_id=question.skill_id,
                count=1
            )
            db.add(mistake)
        db.commit()

    # Schedule the next spaced-repetition review and log the attempt for history.
    SpacedRepetitionService(db).record_review(tenant_id, user_id, question, is_correct)
    record_attempt(db, user_id, tenant_id, cert_id, "practice", question, submission.selected_answer, is_correct)

    # Feedback (AIService falls back to the mock provider if the LLM fails)
    ai_service = AIService(db, tenant_id)
    feedback = await ai_service.generate_feedback({}, question.__dict__, submission.selected_answer, is_correct)

    event_bus.emit(tenant_id, user_id, "practice_answered", {"is_correct": is_correct, "skill_id": question.skill_id})

    return {"status": "success", "is_correct": is_correct, "new_mastery": new_score, "feedback": feedback}

@router.post("/exam/start/{user_id}")
async def start_exam(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_access(db, current_user, user_id)
    cert_id = resolve_certification_id(db, user_id, current_user.tenant_id)
    generator = ExamGenerator()
    questions = generator.create_exam(db, current_user.tenant_id, cert_id)
    return {
        "exam_id": str(uuid.uuid4()),
        "questions": [
            {
                "id": q.id,
                "prompt": q.prompt,
                "options": q.options,
                "difficulty": q.difficulty,
                "correct_answer": q.correct_answer
            } for q in questions
        ]
    }
