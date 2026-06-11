from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database.db import get_db
from ..database import models
from ..services.marketplace.pack_service import PackImportService
from ..services.audit.audit_service import AuditService
from ..services.quality.quality_service import ContentQualityService
import os

router = APIRouter(prefix="/api/academy", tags=["academy"])
DEFAULT_TENANT_ID = "default-demo-tenant"

@router.get("/admin/control-room/status")
async def get_control_room_status(db: Session = Depends(get_db)):
    return {
        "health": "healthy",
        "tenants": db.query(models.Tenant).count(),
        "users": db.query(models.User).count(),
        "certifications": db.query(models.Certification).count(),
        "questions_approved": db.query(models.Question).filter(models.Question.status == "published").count(),
        "questions_draft": db.query(models.Question).filter(models.Question.status == "draft").count(),
    }

@router.get("/admin/questions")
async def get_all_questions(db: Session = Depends(get_db)):
    return db.query(models.Question).all()

@router.post("/admin/packs/import-aws")
async def import_aws_pack(db: Session = Depends(get_db)):
    audit = AuditService()
    service = PackImportService(db, audit)
    # Correct path relative to app execution (which is from backend root)
    pack_path = os.path.join(os.getcwd(), "../content/packs/aws-cloud-practitioner")
    await service.import_pack(DEFAULT_TENANT_ID, pack_path, "system-admin")
    return {"status": "success"}

@router.get("/dashboard/{user_id}")
async def get_dashboard(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    return {
        "user_name": user.full_name if user else "Jane Student",
        "certification": "AWS Cloud Practitioner",
        "progress": 0.15,
        "xp": 450,
        "streak": 5,
        "mastery_by_skill": {}
    }
