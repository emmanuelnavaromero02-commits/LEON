import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..config import get_settings
from ..core.security import create_access_token, hash_password, verify_password
from ..database import models
from ..database.db import get_db
from ..schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from ..services.audit.audit_service import AuditService
from .deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

INVALID_CREDENTIALS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid email or password",
    headers={"WWW-Authenticate": "Bearer"},
)


def _role_value(role) -> str:
    return role.value if isinstance(role, models.UserRole) else str(role)


def _user_response(user: models.User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=_role_value(user.role),
        tenant_id=user.tenant_id,
    )


def _token_response(user: models.User) -> TokenResponse:
    token = create_access_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        role=_role_value(user.role),
    )
    return TokenResponse(access_token=token, token_type="bearer", user=_user_response(user))


def _resolve_tenant(db: Session, tenant_slug: str | None) -> models.Tenant:
    slug = tenant_slug or get_settings().DEFAULT_TENANT_SLUG
    tenant = db.query(models.Tenant).filter(models.Tenant.slug == slug).first()
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return tenant


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    tenant = _resolve_tenant(db, request.tenant_slug)

    email = request.email.lower()
    existing = db.query(models.User).filter(
        models.User.tenant_id == tenant.id,
        models.User.email == email,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists in this tenant",
        )

    user = models.User(
        id=str(uuid.uuid4()),
        tenant_id=tenant.id,
        email=email,
        full_name=request.full_name,
        hashed_password=hash_password(request.password),
        role=models.UserRole.STUDENT,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    AuditService().log(db, tenant.id, user.id, "user_registered", "User", user.id)

    return _token_response(user)


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(
        models.Tenant.slug == (request.tenant_slug or get_settings().DEFAULT_TENANT_SLUG)
    ).first()
    if tenant is None:
        # Generic message: do not leak whether the tenant exists
        raise INVALID_CREDENTIALS

    user = db.query(models.User).filter(
        models.User.tenant_id == tenant.id,
        models.User.email == request.email.lower(),
    ).first()
    if user is None or not verify_password(request.password, user.hashed_password):
        raise INVALID_CREDENTIALS

    AuditService().log(db, tenant.id, user.id, "login", "User", user.id)

    return _token_response(user)


@router.get("/me", response_model=UserResponse)
async def me(current_user: models.User = Depends(get_current_user)):
    return _user_response(current_user)
