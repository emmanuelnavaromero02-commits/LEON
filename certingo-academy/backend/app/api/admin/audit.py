from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...database.db import get_db
from ...database import models
from ...services.audit.audit_service import AuditService

router = APIRouter(prefix="/audit", tags=["admin-audit"])

@router.get("/events")
async def get_audit_events(db: Session = Depends(get_db)):
    return db.query(models.AuditEvent).order_by(models.AuditEvent.created_at.desc()).limit(100).all()
