from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...database.db import get_db
from ...database import models
from ...services.marketplace.pack_service import PackImportService
from ...services.audit.audit_service import AuditService
import os
import yaml

router = APIRouter(prefix="/marketplace", tags=["admin-market"])

@router.get("/packs")
async def list_packs(db: Session = Depends(get_db)):
    # Scan filesystem for available packs
    packs_dir = os.path.abspath("../content/packs")
    available_packs = []
    if os.path.exists(packs_dir):
        for d in os.listdir(packs_dir):
            pack_path = os.path.join(packs_dir, d, "pack.yml")
            if os.path.exists(pack_path):
                with open(pack_path, 'r') as f:
                    pack_data = yaml.safe_load(f)
                    available_packs.append(pack_data)

    # Also get installed status from DB
    installed = db.query(models.TenantCertificationInstallation).all()
    installed_ids = {i.pack_id: i.status for i in installed}

    for p in available_packs:
        p['status'] = installed_ids.get(p['id'], 'available')

    return available_packs

@router.post("/packs/import")
async def import_pack(data: dict, db: Session = Depends(get_db)):
    audit = AuditService()
    service = PackImportService(db, audit)
    pack_id = data.get('pack_id')
    tenant_id = data.get('tenant_id', 'default-demo-tenant')

    pack_path = os.path.abspath(f"../content/packs/{pack_id}")
    if not os.path.exists(pack_path):
        raise HTTPException(status_code=404, detail=f"Pack {pack_id} not found at {pack_path}")

    await service.import_pack(tenant_id, pack_path, "admin")
    return {"status": "success"}
