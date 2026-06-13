from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from ..config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    if not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        # Stored value is not a valid bcrypt hash (e.g. legacy plaintext rows)
        return False


def create_access_token(
    user_id: str,
    tenant_id: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    settings = get_settings()
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": user_id,
        "tenant_id": tenant_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + expires_delta,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT. Returns the payload, or None if invalid/expired."""
    settings = get_settings()
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
