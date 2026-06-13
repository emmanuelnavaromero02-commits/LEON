from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, EmailStr


class TenantBase(BaseModel):
    name: str
    slug: str

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str

class OnboardingRequest(BaseModel):
    """Learner profile payload. User identity comes from the auth token."""
    background: str
    preferred_style: str
    weekly_time_minutes: int
    confidence_level: float
    exam_deadline: Optional[datetime] = None
    target_certification_id: Optional[str] = None

class LessonResponse(BaseModel):
    title: str
    objective: str
    analogy: str
    simple_explanation: str
    example: str
    question: Dict
    next_recommendation: str

class QuestionResponse(BaseModel):
    id: str
    prompt: str
    options: List[str]
    difficulty: str

class AnswerSubmit(BaseModel):
    question_id: str
    selected_answer: str

class ExamResult(BaseModel):
    score: float
    domain_scores: Dict[str, float]
    recommendations: List[str]
