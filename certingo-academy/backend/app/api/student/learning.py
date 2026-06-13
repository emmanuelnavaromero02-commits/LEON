from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...database.db import get_db
from ...database import models
from ...schemas import academy as schemas
from ...services.academy.learning_engine import MasteryEngine, DiagnosticEngine, LearningPathGenerator, ExamGenerator
from ...services.events.event_service import EventService
from ...services.audit.audit_service import AuditService
from ...services.ai.ai_service import AIService
from ...services.knowledge.knowledge_service import KnowledgeService
from ..deps import ensure_user_access, get_current_user
import uuid

router = APIRouter(tags=["student"])

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
    engine = DiagnosticEngine()
    questions = engine.generate_diagnostic_test(db, current_user.tenant_id, "aws-cloud-practitioner")
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

    mastery = db.query(models.MasteryScore).filter(
        models.MasteryScore.user_id == user_id,
        models.MasteryScore.tenant_id == tenant_id,
    ).all()
    lp_gen = LearningPathGenerator()
    recommendation = lp_gen.get_next_recommendation(db, user_id, tenant_id, "aws-cloud-practitioner")

    return {
        "user_name": user.full_name,
        "certification": "AWS Cloud Practitioner",
        "progress": sum([m.score for m in mastery]) / max(len(mastery), 1) if mastery else 0,
        "xp": user.profile.total_xp if user.profile else 0,
        "streak": user.profile.current_streak if user.profile else 0,
        "mastery_by_skill": {m.skill_id: m.score for m in mastery},
        "recommendation": recommendation
    }

@router.get("/lesson/next/{user_id}")
async def get_next_lesson(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = ensure_user_access(db, current_user, user_id)
    tenant_id = current_user.tenant_id

    # Logic to pick next skill
    skill = db.query(models.Skill).filter(models.Skill.tenant_id == tenant_id).first() # Simplified
    if skill is None:
        raise HTTPException(status_code=404, detail="No skills available yet")

    ai_service = AIService(db, tenant_id)
    kb_service = KnowledgeService(db)

    source_content = await kb_service.get_relevant_content(tenant_id, skill.id)
    lesson = await ai_service.generate_lesson(
        user.profile.__dict__ if user.profile else {},
        {"id": skill.id, "name": skill.name},
        source_content,
        0.5
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

    # Evaluate the submitted answer against the real correct answer
    is_correct = submission.selected_answer == question.correct_answer
    new_score = engine.update_user_mastery(
        db, user_id, tenant_id, question.skill_id, is_correct, question.difficulty or "medium"
    )

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

    # Find weakest skill
    mastery = db.query(models.MasteryScore).filter(
        models.MasteryScore.user_id == user_id,
        models.MasteryScore.tenant_id == tenant_id,
    ).order_by(models.MasteryScore.score.asc()).first()
    skill_id = mastery.skill_id if mastery else None

    query = db.query(models.Question).filter(
        models.Question.status == "published",
        models.Question.tenant_id == tenant_id,
    )
    if skill_id:
        query = query.filter(models.Question.skill_id == skill_id)

    question = query.first()
    if not question:
        raise HTTPException(status_code=404, detail="No questions available")

    return {
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

    # Feedback
    ai_service = AIService(db, tenant_id)
    feedback = await ai_service.provider.generate_feedback({}, question.__dict__, submission.selected_answer, is_correct)

    event_bus.emit(tenant_id, user_id, "practice_answered", {"is_correct": is_correct, "skill_id": question.skill_id})

    return {"status": "success", "is_correct": is_correct, "new_mastery": new_score, "feedback": feedback}

@router.post("/exam/start/{user_id}")
async def start_exam(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_access(db, current_user, user_id)
    generator = ExamGenerator()
    questions = generator.create_exam(db, current_user.tenant_id, "aws-cloud-practitioner")
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
