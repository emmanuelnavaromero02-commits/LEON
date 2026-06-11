from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...database.db import get_db
from ...database import models
from ...services.content.studio_service import ContentStudioService

router = APIRouter(prefix="/content-studio", tags=["admin-studio"])

@router.get("/certifications")
async def list_certifications(db: Session = Depends(get_db)):
    return db.query(models.Certification).all()

@router.post("/certifications")
async def create_certification(data: dict, db: Session = Depends(get_db)):
    cert = models.Certification(
        id=data['id'],
        tenant_id=data['tenant_id'],
        name=data['name'],
        provider=data['provider'],
        version=data['version'],
        description=data.get('description', '')
    )
    db.add(cert)
    db.commit()
    return cert

@router.post("/approve")
async def approve_content(data: dict, db: Session = Depends(get_db)):
    service = ContentStudioService(db)
    return service.approve_content(data['type'], data['id'], "admin-user")
