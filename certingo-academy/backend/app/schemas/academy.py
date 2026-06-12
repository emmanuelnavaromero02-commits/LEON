from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Optional, Dict
from datetime import datetime

class OnboardingRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    target_certification_id: str
    background: str
    preferred_style: str
    weekly_time_minutes: int = Field(..., ge=30, le=3000)
    confidence_level: float = Field(0.5, ge=0.0, le=1.0)

    @validator('target_certification_id')
    def validate_cert_id(cls, v):
        if not v: raise ValueError("Certification ID cannot be empty")
        return v

class AnswerSubmit(BaseModel):
    question_id: str
    selected_answer: str
    skill_id: Optional[str] = None
    time_taken_seconds: Optional[int] = None

class PackImportRequest(BaseModel):
    pack_id: str

class SecretCreate(BaseModel):
    key_name: str = Field(..., regex="^[A-Z0-9_]+$")
    value: str

class AITestRequest(BaseModel):
    prompt: str
    skill_id: str
    student_profile: Dict
