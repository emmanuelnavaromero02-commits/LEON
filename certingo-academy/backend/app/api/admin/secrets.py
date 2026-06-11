from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...database.db import get_db
from ...database import models
from ...services.vault.vault_service import VaultService
import uuid

router = APIRouter(prefix="/secrets", tags=["admin-secrets"])

@router.get("/")
async def list_secrets(db: Session = Depends(get_db)):
    # In a real multi-tenant app, we'd filter by tenant_id
    return db.query(models.TenantSecret).all()

@router.post("/")
async def create_secret(data: dict, db: Session = Depends(get_db)):
    vault = VaultService()
    vault.set_secret(db, data['tenant_id'], data['key'], data['value'], "admin-user")
    return {"status": "success"}
