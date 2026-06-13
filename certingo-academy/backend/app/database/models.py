from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Enum, JSON, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .db import Base

# --- Enums ---

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    TENANT_ADMIN = "TENANT_ADMIN"
    INSTRUCTOR = "INSTRUCTOR"
    REVIEWER = "REVIEWER"
    STUDENT = "STUDENT"

class ContentStatus(str, enum.Enum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    REJECTED = "rejected"

class CertificationStatus(str, enum.Enum):
    AVAILABLE = "available"
    INSTALLING = "installing"
    READY = "ready"
    FAILED = "failed"
    DISABLED = "disabled"
    ARCHIVED = "archived"

class LearningBitType(str, enum.Enum):
    CONCEPT = "concept"
    ANALOGY = "analogy"
    EXAMPLE = "example"
    COMMON_MISTAKE = "common_mistake"
    BEST_PRACTICE = "best_practice"
    EXAM_TRAP = "exam_trap"
    COMPARISON = "comparison"
    MEMORY_RULE = "memory_rule"
    NON_TECHNICAL_EXPLANATION = "non_technical_explanation"
    TECHNICAL_EXPLANATION = "technical_explanation"

# --- Infrastructure & Multi-tenancy ---

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
    workspaces = relationship("Workspace", back_populates="tenant")

class Workspace(Base):
    __tablename__ = "workspaces"
    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    name = Column(String)
    slug = Column(String, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant", back_populates="workspaces")

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
    model_name = Column(String, nullable=True)
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=2000)
    rag_enabled = Column(Boolean, default=True)
    mcp_server_url = Column(String, nullable=True)
    tenant = relationship("Tenant", back_populates="ai_settings")

class TenantSecret(Base):
    __tablename__ = "tenant_secrets"
    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    key = Column(String) # e.g. OPENAI_API_KEY
    encrypted_value = Column(Text)
    masked_preview = Column(String)
    created_by = Column(String)
    updated_by = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class AuditEvent(Base):
    __tablename__ = "audit_events"
    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    user_id = Column(String, nullable=True)
    email = Column(String, nullable=True)
    action = Column(String) # e.g. login, content_publish
    resource_type = Column(String) # e.g. Question, Secret
    resource_id = Column(String, nullable=True)
    status = Column(String) # success, failure
    request_id = Column(String, index=True)
    metadata_json = Column(JSON)
    ip = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# --- User Management ---

class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
    )
    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    email = Column(String, index=True)
    full_name = Column(String)
    hashed_password = Column(String)
    role = Column(String, default=UserRole.STUDENT)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant", back_populates="users")
    profile = relationship("LearnerProfile", back_populates="user", uselist=False)
    attempts = relationship("Attempt", back_populates="user")
    mastery_scores = relationship("MasteryScore", back_populates="user")
    learning_sessions = relationship("LearningSession", back_populates="user")

class LearnerProfile(Base):
    __tablename__ = "learner_profiles"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    tenant_id = Column(String, ForeignKey("tenants.id"))
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True)
    target_certification_id = Column(String, ForeignKey("certifications.id"))
    background = Column(String)
    preferred_style = Column(String)
    weekly_time_minutes = Column(Integer)
    exam_deadline = Column(DateTime, nullable=True)
    confidence_level = Column(Float)
    total_xp = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)

    user = relationship("User", back_populates="profile")

# --- Certification Packs & Marketplace ---

class CertificationPack(Base):
    __tablename__ = "certification_packs"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    provider = Column(String)
    version = Column(String)
    description = Column(Text)
    manifest_json = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class TenantCertificationInstallation(Base):
    __tablename__ = "tenant_cert_installations"
    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    certification_id = Column(String)
    pack_id = Column(String, ForeignKey("certification_packs.id"))
    status = Column(String, default=CertificationStatus.AVAILABLE)
    error_message = Column(Text, nullable=True)
    installed_by = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# --- Content Model ---

class Certification(Base):
    __tablename__ = "certifications"
    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    name = Column(String)
    provider = Column(String)
    version = Column(String)
    description = Column(Text)
    status = Column(String, default=ContentStatus.PUBLISHED)

    domains = relationship("Domain", back_populates="certification")

class Domain(Base):
    __tablename__ = "domains"
    id = Column(String, primary_key=True, index=True)
    certification_id = Column(String, ForeignKey("certifications.id"))
    tenant_id = Column(String, ForeignKey("tenants.id"))
    name = Column(String)
    weight = Column(Float)
    status = Column(String, default=ContentStatus.PUBLISHED)

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
    status = Column(String, default=ContentStatus.PUBLISHED)

    domain = relationship("Domain", back_populates="skills")
    questions = relationship("Question", back_populates="skill")
    learning_bits = relationship("LearningBit", back_populates="skill")

class Lesson(Base):
    __tablename__ = "lessons"
    id = Column(String, primary_key=True, index=True)
    skill_id = Column(String, ForeignKey("skills.id"))
    tenant_id = Column(String, ForeignKey("tenants.id"))
    title = Column(String)
    content = Column(Text)
    version = Column(String)
    status = Column(String, default=ContentStatus.DRAFT)
    created_by = Column(String)
    reviewed_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    skill = relationship("Skill")

class LearningBit(Base):
    __tablename__ = "learning_bits"
    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    certification_id = Column(String, ForeignKey("certifications.id"))
    domain_id = Column(String, ForeignKey("domains.id"), nullable=True)
    skill_id = Column(String, ForeignKey("skills.id"), nullable=True)
    type = Column(String) # LearningBitType
    title = Column(String)
    content = Column(Text)
    difficulty = Column(String)
    tags = Column(JSON)
    source_document_id = Column(String, nullable=True)
    status = Column(String, default=ContentStatus.DRAFT)
    version = Column(String, default="1.0")
    created_by = Column(String)
    reviewed_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    skill = relationship("Skill", back_populates="learning_bits")

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
    status = Column(String, default=ContentStatus.DRAFT)
    created_by = Column(String)

    skill = relationship("Skill", back_populates="questions")

# --- Knowledge Base ---

class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"
    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    name = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"
    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    kb_id = Column(String, ForeignKey("knowledge_bases.id"))
    certification_id = Column(String, nullable=True)
    domain_id = Column(String, nullable=True)
    skill_id = Column(String, nullable=True)
    title = Column(String)
    source_type = Column(String) # markdown, pdf, etc.
    source_url = Column(String, nullable=True)
    content = Column(Text)
    status = Column(String, default=ContentStatus.PUBLISHED)
    version = Column(String)
    tags = Column(JSON)
    created_by = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"
    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    document_id = Column(String, ForeignKey("knowledge_documents.id"))
    chunk_index = Column(Integer)
    content = Column(Text)
    metadata_json = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# --- MCP Registry ---

class MCPServer(Base):
    __tablename__ = "mcp_servers"
    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    name = Column(String)
    url = Column(String)
    category = Column(String)
    description = Column(Text)
    status = Column(String, default="active")
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    tool_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class MCPInvocationLog(Base):
    __tablename__ = "mcp_invocation_logs"
    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    server_id = Column(String, ForeignKey("mcp_servers.id"))
    tool_name = Column(String)
    request_json = Column(JSON)
    response_json = Column(JSON)
    status = Column(String)
    duration_ms = Column(Integer)
    request_id = Column(String, ForeignKey("audit_events.request_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# --- Student Learning Engine ---

class LearningSession(Base):
    __tablename__ = "learning_sessions"
    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    user_id = Column(String, ForeignKey("users.id"))
    certification_id = Column(String)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    total_xp = Column(Integer, default=0)

    user = relationship("User", back_populates="learning_sessions")

class DailyMission(Base):
    __tablename__ = "daily_missions"
    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    user_id = Column(String, ForeignKey("users.id"))
    title = Column(String)
    description = Column(String)
    goal_value = Column(Integer)
    current_value = Column(Integer, default=0)
    xp_reward = Column(Integer)
    status = Column(String) # pending, completed
    date = Column(DateTime, server_default=func.now())

class Attempt(Base):
    __tablename__ = "attempts"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    tenant_id = Column(String, ForeignKey("tenants.id"))
    workspace_id = Column(String, nullable=True)
    certification_id = Column(String, ForeignKey("certifications.id"))
    type = Column(String) # 'diagnostic', 'practice', 'exam'
    score = Column(Float)
    xp_earned = Column(Integer, default=0)
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

class MistakeLog(Base):
    __tablename__ = "mistake_logs"
    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    user_id = Column(String, ForeignKey("users.id"))
    question_id = Column(String, ForeignKey("questions.id"))
    skill_id = Column(String)
    count = Column(Integer, default=1)
    last_seen = Column(DateTime(timezone=True), server_default=func.now())

class MasteryScore(Base):
    __tablename__ = "mastery_scores"
    id = Column(Integer, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    tenant_id = Column(String, ForeignKey("tenants.id"))
    workspace_id = Column(String, nullable=True)
    skill_id = Column(String, ForeignKey("skills.id"))
    score = Column(Float, default=0.0) # 0 to 1
    last_updated = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="mastery_scores")

class ReviewSchedule(Base):
    """Spaced-repetition schedule (SM-2 simplified) per user/question."""
    __tablename__ = "review_schedules"
    __table_args__ = (
        UniqueConstraint("user_id", "question_id", name="uq_review_user_question"),
    )
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    tenant_id = Column(String, ForeignKey("tenants.id"))
    question_id = Column(String, ForeignKey("questions.id"))
    skill_id = Column(String, ForeignKey("skills.id"))
    repetitions = Column(Integer, default=0)
    ease_factor = Column(Float, default=2.5)
    interval_days = Column(Float, default=0.0)
    due_at = Column(DateTime, index=True)
    last_reviewed_at = Column(DateTime, nullable=True)
