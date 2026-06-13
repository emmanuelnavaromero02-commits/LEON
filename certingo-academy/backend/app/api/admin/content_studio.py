from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...database.db import get_db
from ...database import models
from ...services.content.studio_service import ContentStudioService
from ..deps import require_role

require_admin = require_role(models.UserRole.TENANT_ADMIN, models.UserRole.SUPER_ADMIN)

router = APIRouter(prefix="/content-studio", tags=["admin-studio"])

@router.get("/certifications")
async def list_certifications(
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(models.Certification).filter(
        models.Certification.tenant_id == current_user.tenant_id
    ).all()

@router.post("/certifications")
async def create_certification(
    data: dict,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    cert = models.Certification(
        id=data['id'],
        tenant_id=current_user.tenant_id,
        name=data['name'],
        provider=data['provider'],
        version=data['version'],
        description=data.get('description', '')
    )
    db.add(cert)
    db.commit()
    return cert

@router.get("/questions")
async def list_questions(
    status: Optional[str] = None,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Review queue for the tenant's questions.

    By default returns questions pending review (draft / in_review). Pass
    ?status=<status> to filter by a specific status, or ?status=all for everything.
    """
    query = db.query(models.Question).filter(
        models.Question.tenant_id == current_user.tenant_id
    )
    if status is None:
        query = query.filter(models.Question.status.in_(["draft", "in_review"]))
    elif status != "all":
        query = query.filter(models.Question.status == status)
    return query.all()

@router.post("/approve")
async def approve_content(
    data: dict,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if data.get('type') not in ("Lesson", "Question", "LearningBit"):
        raise HTTPException(status_code=400, detail="Invalid content type")

    # Ensure the resource belongs to the admin's tenant before approving
    model_map = {
        "Lesson": models.Lesson,
        "Question": models.Question,
        "LearningBit": models.LearningBit,
    }
    model = model_map[data['type']]
    resource = db.query(model).filter(
        model.id == data['id'],
        model.tenant_id == current_user.tenant_id,
    ).first()
    if resource is None:
        raise HTTPException(status_code=404, detail="Content not found")

    service = ContentStudioService(db)
    return service.approve_content(data['type'], data['id'], current_user.id)
