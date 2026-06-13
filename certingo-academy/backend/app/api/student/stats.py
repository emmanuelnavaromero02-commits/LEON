from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...database import models
from ...database.db import get_db
from ...services.academy.mission_service import DailyMissionService
from ...services.academy.readiness_service import ReadinessScoreService
from ...services.academy.review_service import ReviewModeService
from ..deps import ensure_user_access, get_current_user

router = APIRouter(prefix="/learning-stats", tags=["student-stats"])

@router.get("/readiness/{user_id}")
async def get_readiness(
    user_id: str,
    cert_id: str = "aws-cloud-practitioner",
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_access(db, current_user, user_id)
    service = ReadinessScoreService(db)
    return service.calculate_readiness(current_user.tenant_id, user_id, cert_id)

@router.get("/missions/{user_id}")
async def get_missions(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_access(db, current_user, user_id)
    service = DailyMissionService(db)
    return service.get_or_create_missions(current_user.tenant_id, user_id)

@router.get("/notebook/{user_id}")
async def get_notebook(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_access(db, current_user, user_id)
    service = ReviewModeService(db)
    return service.get_mistakes_notebook(current_user.tenant_id, user_id)

@router.get("/weak-topics/{user_id}")
async def get_weak_topics(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_access(db, current_user, user_id)
    service = ReviewModeService(db)
    return service.get_weak_topics(current_user.tenant_id, user_id)
