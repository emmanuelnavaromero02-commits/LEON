import os
import uuid

# Configure the environment BEFORE importing the app so settings pick it up.
os.environ["ENV"] = "dev"
os.environ["DATABASE_URL"] = "sqlite://"  # in-memory; routes use the override below
os.environ["JWT_SECRET"] = "test-jwt-secret"
os.environ["FIELD_ENCRYPTION_KEY"] = "x9y0Vn3PfYwGUVmZS9CY6kvIRI9dWFBGLZ3334Vc2tk="
os.environ["AI_PROVIDER"] = "mock"
os.environ["DEFAULT_TENANT_SLUG"] = "demo"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings

get_settings.cache_clear()

from app.core.security import create_access_token, hash_password
from app.database import models
from app.database.db import Base, get_db
from app.main import app

# Single in-memory database shared by every session in a test
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture()
def db():
    """Fresh schema per test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db):
    return TestClient(app)


def _make_user(db, tenant_id, email, role, password="password123", full_name="Test User"):
    user = models.User(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        email=email,
        full_name=full_name,
        role=role,
        hashed_password=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def tenants(db):
    """Two tenants to verify isolation. tenant1 uses the default slug."""
    tenant1 = models.Tenant(id="tenant-1", name="Demo Tenant", slug="demo")
    tenant2 = models.Tenant(id="tenant-2", name="Acme Corp", slug="acme")
    db.add_all([tenant1, tenant2])
    db.commit()
    return tenant1, tenant2


@pytest.fixture()
def users(db, tenants):
    tenant1, tenant2 = tenants
    return {
        "student1": _make_user(db, tenant1.id, "student1@demo-tenant.com", models.UserRole.STUDENT),
        "student2": _make_user(db, tenant1.id, "student2@demo-tenant.com", models.UserRole.STUDENT),
        "admin1": _make_user(db, tenant1.id, "admin1@demo-tenant.com", models.UserRole.TENANT_ADMIN),
        "student_t2": _make_user(db, tenant2.id, "student@acme-corp.com", models.UserRole.STUDENT),
        "admin2": _make_user(db, tenant2.id, "admin2@acme-corp.com", models.UserRole.TENANT_ADMIN),
    }


def token_for(user) -> str:
    role = user.role.value if isinstance(user.role, models.UserRole) else str(user.role)
    return create_access_token(user_id=user.id, tenant_id=user.tenant_id, role=role)


def auth_headers(user) -> dict:
    return {"Authorization": f"Bearer {token_for(user)}"}


@pytest.fixture()
def make_question(db):
    """Create a published question (with its skill) for a tenant."""

    def _make(tenant_id, correct_answer="B", difficulty="medium", status="published"):
        skill = models.Skill(
            id=str(uuid.uuid4()),
            domain_id=None,
            tenant_id=tenant_id,
            name="Test Skill",
            description="",
            level="beginner",
            status="published",
        )
        db.add(skill)
        question = models.Question(
            id=str(uuid.uuid4()),
            skill_id=skill.id,
            tenant_id=tenant_id,
            prompt="What is the right answer?",
            options=["A", "B", "C", "D"],
            correct_answer=correct_answer,
            explanation="Because B.",
            difficulty=difficulty,
            status=status,
        )
        db.add(question)
        db.commit()
        db.refresh(question)
        return question

    return _make
