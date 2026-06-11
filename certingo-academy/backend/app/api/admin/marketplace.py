from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...database.db import get_db
from ...database import models
from ...services.marketplace.pack_service import PackImportService
from ...services.audit.audit_service import AuditService
import os

router = APIRouter(prefix="/marketplace", tags=["admin-market"])

@router.get("/packs")
async def list_packs(db: Session = Depends(get_db)):
    return db.query(models.CertificationPack).all()

@router.post("/packs/import")
async def import_pack(data: dict, db: Session = Depends(get_db)):
    audit = AuditService()
    service = PackImportService(db, audit)
    # This expects packs to be in a known location for the demo
    pack_name = data.get('pack_id', 'aws-cloud-practitioner')
    pack_path = os.path.abspath(f"../content/packs/{pack_name}")
    if not os.path.exists(pack_path):
        raise HTTPException(status_code=404, detail=f"Pack path {pack_path} not found")

    await service.import_pack(data.get('tenant_id', 'default-demo-tenant'), pack_path, "admin")
    return {"status": "success"}
