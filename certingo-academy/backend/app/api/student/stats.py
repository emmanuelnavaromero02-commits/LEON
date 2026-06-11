from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...database.db import get_db
from ...database import models
from ...services.academy.readiness_service import ReadinessScoreService
from ...services.academy.mission_service import DailyMissionService
from ...services.academy.review_service import ReviewModeService

router = APIRouter(prefix="/learning-stats", tags=["student-stats"])
DEFAULT_TENANT_ID = "default-demo-tenant"

@router.get("/readiness/{user_id}")
async def get_readiness(user_id: str, cert_id: str = "aws-cloud-practitioner", db: Session = Depends(get_db)):
    service = ReadinessScoreService(db)
    return service.calculate_readiness(DEFAULT_TENANT_ID, user_id, cert_id)

@router.get("/missions/{user_id}")
async def get_missions(user_id: str, db: Session = Depends(get_db)):
    service = DailyMissionService(db)
    return service.get_or_create_missions(DEFAULT_TENANT_ID, user_id)

@router.get("/notebook/{user_id}")
async def get_notebook(user_id: str, db: Session = Depends(get_db)):
    service = ReviewModeService(db)
    return service.get_mistakes_notebook(DEFAULT_TENANT_ID, user_id)

@router.get("/weak-topics/{user_id}")
async def get_weak_topics(user_id: str, db: Session = Depends(get_db)):
    service = ReviewModeService(db)
    return service.get_weak_topics(DEFAULT_TENANT_ID, user_id)
