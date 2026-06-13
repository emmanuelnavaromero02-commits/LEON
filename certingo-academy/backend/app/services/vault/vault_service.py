import os
import uuid
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.orm import Session

from ...config import get_settings
from ...core.logging import get_logger
from ...database import models

logger = get_logger(__name__)

# Local file used to persist a generated dev key across restarts (gitignored).
DEV_KEY_FILE = os.path.join(os.getcwd(), ".field_key")


def _load_or_create_dev_key() -> str:
    """Load the persisted dev encryption key, generating it once if missing.

    Only used when ENV=dev and FIELD_ENCRYPTION_KEY is not configured. The key is
    persisted to a local file so encrypted secrets survive app restarts.
    """
    if os.path.exists(DEV_KEY_FILE):
        with open(DEV_KEY_FILE, "r", encoding="utf-8") as f:
            key = f.read().strip()
        if key:
            return key

    key = Fernet.generate_key().decode()
    with open(DEV_KEY_FILE, "w", encoding="utf-8") as f:
        f.write(key)
    try:
        os.chmod(DEV_KEY_FILE, 0o600)
    except OSError:
        pass
    logger.warning(
        "FIELD_ENCRYPTION_KEY not set. Generated a development key and persisted it to %s. "
        "Set FIELD_ENCRYPTION_KEY explicitly for any non-local environment.",
        DEV_KEY_FILE,
    )
    return key


def _resolve_encryption_key(explicit_key: Optional[str] = None) -> str:
    if explicit_key:
        return explicit_key

    settings = get_settings()
    if settings.FIELD_ENCRYPTION_KEY:
        return settings.FIELD_ENCRYPTION_KEY

    if settings.is_production:
        # get_settings() already rejects this combination at startup; this is a
        # defense-in-depth guard in case the service is built with a stale cache.
        raise RuntimeError("FIELD_ENCRYPTION_KEY is required when ENV=production.")

    return _load_or_create_dev_key()


class VaultService:
    def __init__(self, encryption_key: Optional[str] = None):
        key = _resolve_encryption_key(encryption_key)
        self.fernet = Fernet(key.encode())

    def encrypt(self, value: str) -> str:
        return self.fernet.encrypt(value.encode()).decode()

    def decrypt(self, encrypted_value: Optional[str]) -> Optional[str]:
        """Decrypt a stored value. Returns None instead of raising on bad input."""
        if not encrypted_value:
            return None
        try:
            return self.fernet.decrypt(encrypted_value.encode()).decode()
        except (InvalidToken, ValueError):
            logger.error(
                "Failed to decrypt a stored secret. The FIELD_ENCRYPTION_KEY may have changed."
            )
            return None

    def set_secret(self, db: Session, tenant_id: str, key: str, value: str, user_id: str):
        existing = db.query(models.TenantSecret).filter(
            models.TenantSecret.tenant_id == tenant_id,
            models.TenantSecret.key == key
        ).first()

        encrypted = self.encrypt(value)
        # Simple masking: show only first 4 and last 4
        masked = f"{value[:4]}...{value[-4:]}" if len(value) > 8 else "****"

        if existing:
            existing.encrypted_value = encrypted
            existing.masked_preview = masked
            existing.updated_by = user_id
        else:
            secret = models.TenantSecret(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                key=key,
                encrypted_value=encrypted,
                masked_preview=masked,
                created_by=user_id,
                updated_by=user_id
            )
            db.add(secret)

        db.commit()

    def get_secret(self, db: Session, tenant_id: str, key: str) -> Optional[str]:
        """Return the decrypted secret value, or None if missing/undecryptable."""
        secret = db.query(models.TenantSecret).filter(
            models.TenantSecret.tenant_id == tenant_id,
            models.TenantSecret.key == key
        ).first()

        if not secret:
            return None

        return self.decrypt(secret.encrypted_value)

    def delete_secret(self, db: Session, tenant_id: str, secret_id: str) -> bool:
        """Delete a tenant secret by id, scoped to the tenant.

        Returns True if a secret was deleted, False if none matched the
        tenant/id pair (cross-tenant ids are treated as not found).
        """
        secret = db.query(models.TenantSecret).filter(
            models.TenantSecret.id == secret_id,
            models.TenantSecret.tenant_id == tenant_id,
        ).first()

        if not secret:
            return False

        db.delete(secret)
        db.commit()
        return True
