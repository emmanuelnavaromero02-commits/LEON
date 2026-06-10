from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database.db import get_db
from ..database import models
from ..schemas import academy as schemas
from ..services.academy.learning_engine import MasteryEngine, DiagnosticEngine, LearningPathGenerator, ExamGenerator
from ..services.ai.ai_service import AIService
from ..services.academy.knowledge_service import KnowledgeService
import uuid

router = APIRouter(prefix="/api/academy", tags=["academy"])

# Dependency helpers (to be replaced with real Auth/Tenant middleware)
DEFAULT_TENANT_ID = "default-demo-tenant"

@router.post("/diagnostic/start/{user_id}")
async def start_diagnostic(user_id: str, db: Session = Depends(get_db)):
    engine = DiagnosticEngine()
    questions = engine.generate_diagnostic_test(db, DEFAULT_TENANT_ID, "aws-cloud-practitioner")
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
async def submit_diagnostic(user_id: str, answers: List[schemas.AnswerSubmit], db: Session = Depends(get_db)):
    # Calculate initial mastery based on diagnostic
    engine = MasteryEngine()
    for ans in answers:
        question = db.query(models.Question).filter(models.Question.id == ans.question_id).first()
        if question:
            is_correct = ans.selected_answer == question.correct_answer
            engine.update_user_mastery(db, user_id, DEFAULT_TENANT_ID, question.skill_id, is_correct, question.difficulty)

    return {"status": "success", "message": "Diagnostic completed"}

@router.post("/onboarding")
async def onboarding(request: schemas.OnboardingRequest, db: Session = Depends(get_db)):
    # Check if user exists
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
async def get_dashboard(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    mastery = db.query(models.MasteryScore).filter(models.MasteryScore.user_id == user_id).all()

    return {
        "user_name": user.full_name,
        "certification": "AWS Cloud Practitioner",
        "progress": sum([m.score for m in mastery]) / max(len(mastery), 1) if mastery else 0,
        "xp": 150, # Mock
        "streak": 3, # Mock
        "mastery_by_skill": {m.skill_id: m.score for m in mastery}
    }

@router.get("/lesson/next/{user_id}")
async def get_next_lesson(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    # In a real app, we'd find the next skill. For demo, we pick one.
    skill = db.query(models.Skill).first()

    ai_service = AIService()
    kb_service = KnowledgeService(db)

    source_content = await kb_service.get_relevant_content(DEFAULT_TENANT_ID, skill.id)
    lesson = await ai_service.generate_lesson(
        user.profile.__dict__ if user and user.profile else {},
        {"id": skill.id, "name": skill.name} if skill else {"id": "demo", "name": "Cloud Basics"},
        source_content,
        0.5 # Current mastery
    )
    return lesson

@router.post("/lesson/submit/{user_id}")
async def submit_lesson(user_id: str, submission: schemas.AnswerSubmit, db: Session = Depends(get_db)):
    if submission.question_id == "mock-id":
        question = db.query(models.Question).first()
    else:
        question = db.query(models.Question).filter(models.Question.id == submission.question_id).first()

    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    is_correct = submission.selected_answer == question.correct_answer
    engine = MasteryEngine()
    new_score = engine.update_user_mastery(db, user_id, DEFAULT_TENANT_ID, question.skill_id, is_correct, question.difficulty)

    return {"status": "success", "is_correct": is_correct, "new_mastery": new_score}

@router.get("/practice/next/{user_id}")
async def get_next_practice(user_id: str, db: Session = Depends(get_db)):
    # Find skills with low mastery for the user
    mastery_scores = db.query(models.MasteryScore).filter(
        models.MasteryScore.user_id == user_id,
        models.MasteryScore.score < 0.9
    ).all()

    if mastery_scores:
        skill_id = mastery_scores[0].skill_id
        question = db.query(models.Question).filter(
            models.Question.skill_id == skill_id,
            models.Question.status == "approved"
        ).first()
    else:
        question = db.query(models.Question).filter(models.Question.status == "approved").first()

    if not question:
        raise HTTPException(status_code=404, detail="No practice questions available")

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
async def submit_practice(user_id: str, submission: schemas.AnswerSubmit, db: Session = Depends(get_db)):
    question = db.query(models.Question).filter(models.Question.id == submission.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    is_correct = submission.selected_answer == question.correct_answer
    engine = MasteryEngine()
    new_score = engine.update_user_mastery(db, user_id, DEFAULT_TENANT_ID, question.skill_id, is_correct, question.difficulty)

    ai_service = AIService()
    feedback = await ai_service.generate_feedback({}, question.__dict__, submission.selected_answer, is_correct)

    return {
        "status": "success",
        "is_correct": is_correct,
        "new_mastery": new_score,
        "feedback": feedback
    }

@router.post("/exam/start/{user_id}")
async def start_exam(user_id: str, db: Session = Depends(get_db)):
    generator = ExamGenerator()
    questions = generator.create_exam(db, DEFAULT_TENANT_ID, "aws-cloud-practitioner")
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

@router.get("/admin/questions")
async def get_admin_questions(db: Session = Depends(get_db)):
    return db.query(models.Question).filter(models.Question.tenant_id == DEFAULT_TENANT_ID).all()
