from cryptography.fernet import Fernet
import os
from ...database import models
from sqlalchemy.orm import Session
import uuid

class VaultService:
    def __init__(self, encryption_key: str = None):
        if not encryption_key:
            encryption_key = os.getenv("FIELD_ENCRYPTION_KEY")

        if not encryption_key:
            # Generate a local key for development if not provided
            encryption_key = Fernet.generate_key().decode()
            print(f"DEBUG: No FIELD_ENCRYPTION_KEY found. Generated temporary dev key: {encryption_key}")

        self.fernet = Fernet(encryption_key.encode())

    def encrypt(self, value: str) -> str:
        return self.fernet.encrypt(value.encode()).decode()

    def decrypt(self, encrypted_value: str) -> str:
        return self.fernet.decrypt(encrypted_value.encode()).decode()

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

    def get_secret(self, db: Session, tenant_id: str, key: str) -> str:
        secret = db.query(models.TenantSecret).filter(
            models.TenantSecret.tenant_id == tenant_id,
            models.TenantSecret.key == key
        ).first()

        if not secret:
            return None

        return self.decrypt(secret.encrypted_value)
