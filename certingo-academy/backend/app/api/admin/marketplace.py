import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ...database import models
from ...database.db import get_db
from ...schemas.pack import PackValidationError
from ...services.audit.audit_service import AuditService
from ...services.marketplace.pack_service import PackImportService
from ..deps import require_role

require_admin = require_role(models.UserRole.TENANT_ADMIN, models.UserRole.SUPER_ADMIN)

router = APIRouter(prefix="/marketplace", tags=["admin-market"])

@router.get("/packs")
async def list_packs(
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Certification packs are a global catalog (no tenant column)
    return db.query(models.CertificationPack).all()

@router.post("/packs/import")
async def import_pack(
    data: dict,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    audit = AuditService()
    service = PackImportService(db, audit)
    # This expects packs to be in a known location for the demo
    pack_name = data.get('pack_id', 'aws-cloud-practitioner')
    if os.path.sep in pack_name or pack_name.startswith("."):
        raise HTTPException(status_code=400, detail="Invalid pack id")
    pack_path = os.path.abspath(f"../content/packs/{pack_name}")
    if not os.path.exists(pack_path):
        raise HTTPException(status_code=404, detail=f"Pack path {pack_path} not found")

    try:
        await service.import_pack(current_user.tenant_id, pack_path, current_user.id)
    except PackValidationError as exc:
        # A malformed pack is a client error, not a server fault: surface the
        # readable list of problems so the caller can fix the content.
        raise HTTPException(
            status_code=422,
            detail={"message": "Pack validation failed", "errors": exc.errors},
        ) from exc
    return {"status": "success"}
