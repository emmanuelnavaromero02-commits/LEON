from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from ..core.security import decode_access_token
from ..database import models
from ..database.db import get_db

# auto_error=False so we can return a proper 401 (with WWW-Authenticate) instead of 403
bearer_scheme = HTTPBearer(auto_error=False)

ADMIN_ROLES = (models.UserRole.TENANT_ADMIN, models.UserRole.SUPER_ADMIN)

CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """Resolve the authenticated user from the Bearer token. 401 if invalid."""
    if credentials is None or not credentials.credentials:
        raise CREDENTIALS_EXCEPTION

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise CREDENTIALS_EXCEPTION

    user_id = payload.get("sub")
    if not user_id:
        raise CREDENTIALS_EXCEPTION

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise CREDENTIALS_EXCEPTION

    # Tokens minted for another tenant context are rejected defensively
    token_tenant = payload.get("tenant_id")
    if token_tenant and token_tenant != user.tenant_id:
        raise CREDENTIALS_EXCEPTION

    return user


def require_role(*roles: models.UserRole):
    """Dependency factory: only allow users whose role is in `roles`."""
    allowed = {role.value if isinstance(role, models.UserRole) else str(role) for role in roles}

    def role_checker(current_user: models.User = Depends(get_current_user)) -> models.User:
        user_role = current_user.role.value if isinstance(current_user.role, models.UserRole) else str(current_user.role)
        if user_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return role_checker


def is_admin(user: models.User) -> bool:
    user_role = user.role.value if isinstance(user.role, models.UserRole) else str(user.role)
    return user_role in (models.UserRole.TENANT_ADMIN.value, models.UserRole.SUPER_ADMIN.value)


def ensure_user_access(db: Session, current_user: models.User, user_id: str) -> models.User:
    """Validate that `current_user` may act on resources of `user_id`.

    Allowed when the path user is the current user, or when the current user is a
    TENANT_ADMIN/SUPER_ADMIN of the same tenant as the target user. Returns the
    target user. Raises 403 otherwise.
    """
    if current_user.id == user_id:
        return current_user

    if not is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to access this user's resources",
        )

    target = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.tenant_id == current_user.tenant_id,
    ).first()
    if target is None:
        # Hide cross-tenant existence: admins only see users of their own tenant
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to access this user's resources",
        )
    return target
