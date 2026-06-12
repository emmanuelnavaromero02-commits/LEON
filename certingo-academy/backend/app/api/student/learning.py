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
import uuid

router = APIRouter(tags=["student"])
DEFAULT_TENANT_ID = "default-demo-tenant"

@router.get("/certifications")
async def list_active_certifications(db: Session = Depends(get_db)):
    return db.query(models.Certification).filter(models.Certification.tenant_id == DEFAULT_TENANT_ID).all()

@router.post("/onboarding")
async def onboarding(request: schemas.OnboardingRequest, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == request.email).first()
    if existing_user:
        return {"user_id": existing_user.id, "message": "User already exists"}

    user_id = str(uuid.uuid4())
    user = models.User(
        id=user_id,
        tenant_id=DEFAULT_TENANT_ID,
        email=request.email,
        full_name=request.full_name,
        role=models.UserRole.STUDENT
    )
    db.add(user)

    profile = models.LearnerProfile(
        id=str(uuid.uuid4()),
        user_id=user_id,
        tenant_id=DEFAULT_TENANT_ID,
        target_certification_id=request.target_certification_id,
        background=request.background,
        preferred_style=request.preferred_style,
        weekly_time_minutes=request.weekly_time_minutes,
        confidence_level=request.confidence_level
    )
    db.add(profile)
    db.commit()

    return {"user_id": user_id, "message": "Onboarding successful"}

@router.get("/dashboard/{user_id}")
async def get_dashboard(user_id: str, cert_id: str = None, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # If no cert_id provided, use the one from profile
    if not cert_id and user.profile:
        cert_id = user.profile.target_certification_id

    if not cert_id:
        cert = db.query(models.Certification).first()
        cert_id = cert.id if cert else "none"

    mastery = db.query(models.MasteryScore).filter(
        models.MasteryScore.user_id == user_id,
        models.MasteryScore.skill_id.in_(
            db.query(models.Skill.id).join(models.Domain).filter(models.Domain.certification_id == cert_id)
        )
    ).all()

    lp_gen = LearningPathGenerator()
    recommendation = lp_gen.get_next_recommendation(db, user_id, DEFAULT_TENANT_ID, cert_id)

    return {
        "user_name": user.full_name,
        "certification_id": cert_id,
        "certification": db.query(models.Certification.name).filter(models.Certification.id == cert_id).scalar() or "Unknown",
        "progress": sum([m.score for m in mastery]) / max(len(mastery), 1) if mastery else 0,
        "xp": user.profile.total_xp if user.profile else 0,
        "streak": user.profile.current_streak if user.profile else 0,
        "mastery_by_skill": {m.skill_id: m.score for m in mastery},
        "recommendation": recommendation
    }

@router.post("/diagnostic/start/{user_id}")
async def start_diagnostic(user_id: str, cert_id: str = "aws-cloud-practitioner", db: Session = Depends(get_db)):
    engine = DiagnosticEngine()
    questions = engine.generate_diagnostic_test(db, DEFAULT_TENANT_ID, cert_id)
    return {"questions": [
        {"id": q.id, "prompt": q.prompt, "options": q.options, "difficulty": q.difficulty, "correct_answer": q.correct_answer} for q in questions
    ]}

@router.post("/diagnostic/submit/{user_id}")
async def submit_diagnostic(user_id: str, answers: list[schemas.AnswerSubmit], db: Session = Depends(get_db)):
    engine = MasteryEngine()
    for ans in answers:
        question = db.query(models.Question).filter(models.Question.id == ans.question_id).first()
        if question:
            is_correct = ans.selected_answer == question.correct_answer
            engine.update_user_mastery(db, user_id, DEFAULT_TENANT_ID, question.skill_id, is_correct, question.difficulty)
    return {"status": "success"}

@router.get("/lesson/next/{user_id}")
async def get_next_lesson(user_id: str, cert_id: str = "aws-cloud-practitioner", db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    # Find a skill in this cert with low mastery
    skill = db.query(models.Skill).join(models.Domain).filter(models.Domain.certification_id == cert_id).first()

    ai_service = AIService(db, DEFAULT_TENANT_ID)
    kb_service = KnowledgeService(db)
    source_content = await kb_service.get_relevant_content(DEFAULT_TENANT_ID, skill.id)
    lesson = await ai_service.generate_lesson(user.profile.__dict__ if user.profile else {}, {"id": skill.id, "name": skill.name}, source_content, 0.5)
    lesson["skill_id"] = skill.id
    return lesson

@router.post("/lesson/submit/{user_id}")
async def submit_lesson(user_id: str, submission: schemas.AnswerSubmit, db: Session = Depends(get_db)):
    engine = MasteryEngine()
    is_correct = True
    new_score = engine.update_user_mastery(db, user_id, DEFAULT_TENANT_ID, submission.skill_id, is_correct, "medium")
    return {"status": "success", "new_mastery": new_score}

@router.get("/practice/next/{user_id}")
async def get_next_practice(user_id: str, cert_id: str = "aws-cloud-practitioner", db: Session = Depends(get_db)):
    question = db.query(models.Question).join(models.Skill).join(models.Domain).filter(
        models.Domain.certification_id == cert_id,
        models.Question.status == "published"
    ).first()
    if not question: raise HTTPException(status_code=404, detail="No questions")
    return {"question": {"id": question.id, "prompt": question.prompt, "options": question.options, "difficulty": question.difficulty, "correct_answer": question.correct_answer}}

@router.post("/practice/submit/{user_id}")
async def submit_practice(user_id: str, submission: schemas.AnswerSubmit, db: Session = Depends(get_db)):
    question = db.query(models.Question).filter(models.Question.id == submission.question_id).first()
    is_correct = submission.selected_answer == question.correct_answer
    engine = MasteryEngine()
    new_score = engine.update_user_mastery(db, user_id, DEFAULT_TENANT_ID, question.skill_id, is_correct, question.difficulty)

    if not is_correct:
        mistake = models.MistakeLog(id=str(uuid.uuid4()), tenant_id=DEFAULT_TENANT_ID, user_id=user_id, question_id=question.id, skill_id=question.skill_id, count=1)
        db.add(mistake)
        db.commit()

    ai_service = AIService(db, DEFAULT_TENANT_ID)
    feedback = await ai_service.provider.generate_feedback({}, question.__dict__, submission.selected_answer, is_correct)
    return {"status": "success", "is_correct": is_correct, "new_mastery": new_score, "feedback": feedback}

@router.post("/exam/start/{user_id}")
async def start_exam(user_id: str, cert_id: str = "aws-cloud-practitioner", db: Session = Depends(get_db)):
    generator = ExamGenerator()
    questions = generator.create_exam(db, DEFAULT_TENANT_ID, cert_id)
    return {"exam_id": str(uuid.uuid4()), "questions": [{"id": q.id, "prompt": q.prompt, "options": q.options, "difficulty": q.difficulty, "correct_answer": q.correct_answer} for q in questions]}
