from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from ...database.db import get_db
from ...database import models
from ...services.vault.vault_service import VaultService
from ..deps import require_role

require_admin = require_role(models.UserRole.TENANT_ADMIN, models.UserRole.SUPER_ADMIN)

router = APIRouter(prefix="/secrets", tags=["admin-secrets"])


class SecretCreate(BaseModel):
    key: str = Field(min_length=1, max_length=255)
    value: str = Field(min_length=1)


# Registered with and without trailing slash so clients hitting
# /api/admin/secrets are answered directly (no 307 redirect).
@router.get("")
@router.get("/", include_in_schema=False)
async def list_secrets(
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    secrets = db.query(models.TenantSecret).filter(
        models.TenantSecret.tenant_id == current_user.tenant_id
    ).all()
    # Never expose encrypted values through the API
    return [
        {
            "id": s.id,
            "tenant_id": s.tenant_id,
            "key": s.key,
            "masked_preview": s.masked_preview,
            "created_by": s.created_by,
            "updated_by": s.updated_by,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
        }
        for s in secrets
    ]


@router.post("")
@router.post("/", include_in_schema=False)
async def create_secret(
    data: SecretCreate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    vault = VaultService()
    vault.set_secret(db, current_user.tenant_id, data.key, data.value, current_user.id)
    return {"status": "success"}
