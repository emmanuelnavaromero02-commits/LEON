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


MASTERED_THRESHOLD = 0.8


def _mastery_status(mastery: float) -> str:
    """Skill node status from mastery: 0 -> locked, <0.8 -> in_progress, >=0.8 -> mastered."""
    if mastery <= 0.0:
        return "locked"
    if mastery < MASTERED_THRESHOLD:
        return "in_progress"
    return "mastered"


def build_skill_tree(db: Session, user_id: str, tenant_id: str, certification_id: str) -> list[dict]:
    """Build the skill tree for a certification, scoped to the tenant.

    Returns one node per skill of the certification's domains with the user's
    mastery (0.0 when they have no MasteryScore yet) and a derived status. This
    is the exact shape the frontend dashboard renders.
    """
    skills = (
        db.query(models.Skill)
        .join(models.Domain, models.Skill.domain_id == models.Domain.id)
        .filter(
            models.Domain.certification_id == certification_id,
            models.Skill.tenant_id == tenant_id,
            models.Domain.tenant_id == tenant_id,
        )
        .all()
    )

    mastery_by_skill = {
        m.skill_id: m.score
        for m in db.query(models.MasteryScore).filter(
            models.MasteryScore.user_id == user_id,
            models.MasteryScore.tenant_id == tenant_id,
        ).all()
    }

    tree = []
    for skill in skills:
        mastery = mastery_by_skill.get(skill.id, 0.0) or 0.0
        tree.append({
            "skill_id": skill.id,
            "name": skill.name,
            "domain_id": skill.domain_id,
            "mastery": mastery,
            "status": _mastery_status(mastery),
        })
    return tree


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

    skill_tree = build_skill_tree(db, user_id, tenant_id, cert_id)

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
        # Real skill tree for the target certification, rendered by the frontend.
        "skill_tree": skill_tree,
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

# Exam duration shown to the learner (minutes). Mirrors the frontend timer.
EXAM_DURATION_MINUTES = 20
# A learner passes the exam at 70% or above (product threshold).
EXAM_PASS_THRESHOLD = 0.7


def _skill_to_domain_map(db: Session, tenant_id: str, skill_ids: list[str]) -> dict[str, str]:
    """Map skill_id -> domain_id for the given skills, scoped to the tenant."""
    if not skill_ids:
        return {}
    rows = (
        db.query(models.Skill.id, models.Skill.domain_id)
        .filter(
            models.Skill.id.in_(skill_ids),
            models.Skill.tenant_id == tenant_id,
        )
        .all()
    )
    return {skill_id: domain_id for skill_id, domain_id in rows}


@router.post("/exam/start/{user_id}")
async def start_exam(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Start a full exam.

    Returns the questions WITHOUT their ``correct_answer``/``explanation`` so the
    exam can no longer be graded on the client. The exam is persisted as an open
    Attempt (type="exam", score=NULL) whose AttemptAnswer rows pin exactly which
    questions belong to it; the answers are filled in (and the score computed) by
    the server at ``/exam/submit``. The Attempt id IS the ``exam_id``.
    """
    ensure_user_access(db, current_user, user_id)
    tenant_id = current_user.tenant_id
    cert_id = resolve_certification_id(db, user_id, tenant_id)

    generator = ExamGenerator()
    questions = generator.create_exam(db, tenant_id, cert_id)

    skill_ids = [q.skill_id for q in questions]
    domain_by_skill = _skill_to_domain_map(db, tenant_id, skill_ids)

    # Open exam Attempt: score stays NULL until the learner submits. The
    # placeholder AttemptAnswer rows are the authoritative list of which
    # questions this exam contains (so submit can reject foreign question ids).
    exam_id = str(uuid.uuid4())
    attempt = models.Attempt(
        id=exam_id,
        user_id=user_id,
        tenant_id=tenant_id,
        certification_id=cert_id,
        type="exam",
        score=None,
        xp_earned=0,
    )
    db.add(attempt)
    db.flush()  # need attempt.id before adding the answer rows
    for q in questions:
        db.add(models.AttemptAnswer(
            attempt_id=exam_id,
            question_id=q.id,
            selected_answer=None,
            is_correct=None,
        ))
    db.commit()

    return {
        "exam_id": exam_id,
        "questions": [
            {
                "id": q.id,
                "prompt": q.prompt,
                "options": q.options,
                "difficulty": q.difficulty,
                "domain_id": domain_by_skill.get(q.skill_id),
            } for q in questions
        ],
        "total": len(questions),
        "duration_minutes": EXAM_DURATION_MINUTES,
    }


@router.post("/exam/submit/{user_id}")
async def submit_exam(
    user_id: str,
    submission: schemas.ExamSubmitRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Grade a full exam ON THE SERVER.

    The exam_id must belong to this user+tenant. Each answer is compared with the
    real ``Question.correct_answer`` (tenant-scoped); unanswered exam questions
    count as incorrect and answers for questions not in this exam are ignored.
    Every graded answer updates mastery (same MasteryEngine as practice) and feeds
    spaced repetition. The open Attempt is completed with the final score/xp.

    correct_answer/explanation are revealed ONLY in the ``results`` here (post-exam
    review), never at ``/exam/start``. Re-submitting a graded exam returns the
    previously computed result (idempotent; HTTP 200).
    """
    ensure_user_access(db, current_user, user_id)
    tenant_id = current_user.tenant_id

    # The exam_id is the Attempt id; it must belong to this user and tenant.
    attempt = db.query(models.Attempt).filter(
        models.Attempt.id == submission.exam_id,
        models.Attempt.user_id == user_id,
        models.Attempt.tenant_id == tenant_id,
        models.Attempt.type == "exam",
    ).first()
    if attempt is None:
        raise HTTPException(status_code=404, detail="Exam not found")

    # The placeholder rows created at start are the authoritative question set.
    answer_rows = db.query(models.AttemptAnswer).filter(
        models.AttemptAnswer.attempt_id == attempt.id
    ).all()
    exam_question_ids = [row.question_id for row in answer_rows]

    # Anti-double-submit: a completed exam (score already set) is idempotent.
    if attempt.score is not None:
        return _build_exam_result(db, tenant_id, attempt, exam_question_ids, answer_rows)

    # Map submitted answers; later duplicates for the same question win.
    submitted = {a.question_id: a.selected_answer for a in submission.answers}

    questions = {
        q.id: q
        for q in db.query(models.Question).filter(
            models.Question.id.in_(exam_question_ids),
            models.Question.tenant_id == tenant_id,
        ).all()
    } if exam_question_ids else {}

    mastery_engine = MasteryEngine()
    spaced = SpacedRepetitionService(db)
    rows_by_question = {row.question_id: row for row in answer_rows}

    correct_count = 0
    for question_id in exam_question_ids:
        question = questions.get(question_id)
        row = rows_by_question[question_id]
        selected = submitted.get(question_id)  # None => unanswered => incorrect
        if question is None:
            # Question vanished (e.g. archived) — treat as incorrect, no grading.
            row.selected_answer = selected
            row.is_correct = False
            continue

        is_correct = selected is not None and selected == question.correct_answer
        row.selected_answer = selected
        row.is_correct = is_correct
        if is_correct:
            correct_count += 1

        # Same learning side effects as practice/submit: mastery + spaced rep.
        mastery_engine.update_user_mastery(
            db, user_id, tenant_id, question.skill_id, is_correct, question.difficulty or "medium"
        )
        spaced.record_review(tenant_id, user_id, question, is_correct)

    total = len(exam_question_ids)
    score = (correct_count / total) if total else 0.0

    # Complete the open Attempt.
    attempt.score = score
    attempt.xp_earned = correct_count * 10
    db.commit()

    audit = AuditService()
    event_bus = EventService(db, audit)
    event_bus.emit(tenant_id, user_id, "exam_completed", {
        "exam_id": attempt.id, "score": score, "total": total, "correct": correct_count,
    })

    return _build_exam_result(db, tenant_id, attempt, exam_question_ids, answer_rows)


def _build_exam_result(db: Session, tenant_id: str, attempt, exam_question_ids: list[str], answer_rows):
    """Assemble the exact exam-result payload the frontend renders.

    Reveals correct_answer/explanation here (post-exam review). Computes the
    per-domain breakdown (correct/total within each domain of the exam).
    """
    questions = {
        q.id: q
        for q in db.query(models.Question).filter(
            models.Question.id.in_(exam_question_ids),
            models.Question.tenant_id == tenant_id,
        ).all()
    } if exam_question_ids else {}

    rows_by_question = {row.question_id: row for row in answer_rows}

    total = len(exam_question_ids)
    correct_count = sum(1 for row in answer_rows if row.is_correct)
    score = attempt.score if attempt.score is not None else 0.0

    # Domain breakdown: resolve each exam question's domain (skill -> domain).
    skill_ids = [q.skill_id for q in questions.values()]
    domain_by_skill = _skill_to_domain_map(db, tenant_id, skill_ids)
    domain_ids = [d for d in set(domain_by_skill.values()) if d is not None]
    domain_names = {}
    if domain_ids:
        domain_names = {
            d.id: d.name
            for d in db.query(models.Domain).filter(
                models.Domain.id.in_(domain_ids),
                models.Domain.tenant_id == tenant_id,
            ).all()
        }

    # Aggregate correct/total per domain.
    domain_totals: dict[str, list[int]] = {}  # domain_id -> [correct, total]
    results = []
    for question_id in exam_question_ids:
        question = questions.get(question_id)
        row = rows_by_question.get(question_id)
        is_correct = bool(row.is_correct) if row is not None else False
        selected = row.selected_answer if row is not None else None
        results.append({
            "question_id": question_id,
            "selected_answer": selected,
            "correct": is_correct,
            "correct_answer": question.correct_answer if question is not None else None,
            "explanation": question.explanation if question is not None else None,
        })
        if question is not None:
            domain_id = domain_by_skill.get(question.skill_id)
            if domain_id is not None:
                bucket = domain_totals.setdefault(domain_id, [0, 0])
                bucket[1] += 1
                if is_correct:
                    bucket[0] += 1

    domain_breakdown = [
        {
            "domain_id": domain_id,
            "name": domain_names.get(domain_id, ""),
            "score": (counts[0] / counts[1]) if counts[1] else 0.0,
        }
        for domain_id, counts in domain_totals.items()
    ]

    return {
        "score": score,
        "total": total,
        "correct": correct_count,
        "passed": score >= EXAM_PASS_THRESHOLD,
        "domain_breakdown": domain_breakdown,
        "results": results,
    }
