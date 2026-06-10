from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Enum, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .db import Base

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    TENANT_ADMIN = "TENANT_ADMIN"
    INSTRUCTOR = "INSTRUCTOR"
    REVIEWER = "REVIEWER"
    STUDENT = "STUDENT"

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    slug = Column(String, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    settings = relationship("TenantSettings", back_populates="tenant", uselist=False)
    branding = relationship("TenantBranding", back_populates="tenant", uselist=False)
    ai_settings = relationship("TenantAISettings", back_populates="tenant", uselist=False)
    users = relationship("User", back_populates="tenant")

class TenantSettings(Base):
    __tablename__ = "tenant_settings"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    allowed_certifications = Column(JSON) # List of certification IDs
    tenant = relationship("Tenant", back_populates="settings")

class TenantBranding(Base):
    __tablename__ = "tenant_branding"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    logo_url = Column(String)
    primary_color = Column(String)
    secondary_color = Column(String)
    company_name = Column(String)
    theme = Column(String) # 'light', 'dark', 'system'
    tenant = relationship("Tenant", back_populates="branding")

class TenantAISettings(Base):
    __tablename__ = "tenant_ai_settings"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    provider = Column(String, default="mock") # 'mock', 'openai', 'anthropic', 'mcp'
    api_key = Column(String, nullable=True)
    model_name = Column(String, nullable=True)
    mcp_server_url = Column(String, nullable=True)
    tenant = relationship("Tenant", back_populates="ai_settings")

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String)
    role = Column(String, default=UserRole.STUDENT)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant", back_populates="users")
    profile = relationship("LearnerProfile", back_populates="user", uselist=False)
    attempts = relationship("Attempt", back_populates="user")
    mastery_scores = relationship("MasteryScore", back_populates="user")

class LearnerProfile(Base):
    __tablename__ = "learner_profiles"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    tenant_id = Column(String, ForeignKey("tenants.id"))
    target_certification_id = Column(String, ForeignKey("certifications.id"))
    background = Column(String)
    preferred_style = Column(String)
    weekly_time_minutes = Column(Integer)
    exam_deadline = Column(DateTime, nullable=True)
    confidence_level = Column(Float)

    user = relationship("User", back_populates="profile")

class Certification(Base):
    __tablename__ = "certifications"
    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    name = Column(String)
    provider = Column(String)
    version = Column(String)
    description = Column(Text)

    domains = relationship("Domain", back_populates="certification")

class Domain(Base):
    __tablename__ = "domains"
    id = Column(String, primary_key=True, index=True)
    certification_id = Column(String, ForeignKey("certifications.id"))
    tenant_id = Column(String, ForeignKey("tenants.id"))
    name = Column(String)
    weight = Column(Float)

    certification = relationship("Certification", back_populates="domains")
    skills = relationship("Skill", back_populates="domain")

class Skill(Base):
    __tablename__ = "skills"
    id = Column(String, primary_key=True, index=True)
    domain_id = Column(String, ForeignKey("domains.id"))
    tenant_id = Column(String, ForeignKey("tenants.id"))
    name = Column(String)
    description = Column(Text)
    level = Column(String) # 'beginner', 'intermediate', 'advanced'

    domain = relationship("Domain", back_populates="skills")
    questions = relationship("Question", back_populates="skill")

class Question(Base):
    __tablename__ = "questions"
    id = Column(String, primary_key=True, index=True)
    skill_id = Column(String, ForeignKey("skills.id"))
    tenant_id = Column(String, ForeignKey("tenants.id"))
    prompt = Column(Text)
    options = Column(JSON) # List of options
    correct_answer = Column(String)
    explanation = Column(Text)
    difficulty = Column(String) # 'easy', 'medium', 'hard'
    status = Column(String) # 'draft', 'approved', 'rejected'

    skill = relationship("Skill", back_populates="questions")

class Attempt(Base):
    __tablename__ = "attempts"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    tenant_id = Column(String, ForeignKey("tenants.id"))
    certification_id = Column(String, ForeignKey("certifications.id"))
    type = Column(String) # 'diagnostic', 'practice', 'exam'
    score = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="attempts")
    answers = relationship("AttemptAnswer", back_populates="attempt")

class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"
    id = Column(Integer, primary_key=True)
    attempt_id = Column(String, ForeignKey("attempts.id"))
    question_id = Column(String, ForeignKey("questions.id"))
    selected_answer = Column(String)
    is_correct = Column(Boolean)

    attempt = relationship("Attempt", back_populates="answers")

class MasteryScore(Base):
    __tablename__ = "mastery_scores"
    id = Column(Integer, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    tenant_id = Column(String, ForeignKey("tenants.id"))
    skill_id = Column(String, ForeignKey("skills.id"))
    score = Column(Float, default=0.0) # 0 to 1
    last_updated = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="mastery_scores")

class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"
    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    name = Column(String)

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"
    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    kb_id = Column(String, ForeignKey("knowledge_bases.id"))
    title = Column(String)
    content = Column(Text)
    metadata_json = Column(JSON)
    version = Column(String)
