from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...database import models
from ...database.db import get_db
from ..deps import require_role

require_admin = require_role(models.UserRole.TENANT_ADMIN, models.UserRole.SUPER_ADMIN)

router = APIRouter(prefix="/audit", tags=["admin-audit"])

@router.get("/events")
async def get_audit_events(
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.AuditEvent)
        .filter(models.AuditEvent.tenant_id == current_user.tenant_id)
        .order_by(models.AuditEvent.created_at.desc())
        .limit(100)
        .all()
    )
