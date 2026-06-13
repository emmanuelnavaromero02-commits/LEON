import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from ...database.db import get_db
from ...database import models
from ...services.knowledge.knowledge_service import KnowledgeService
from ...services.audit.audit_service import AuditService
from ..deps import require_role

require_admin = require_role(models.UserRole.TENANT_ADMIN, models.UserRole.SUPER_ADMIN)

router = APIRouter(prefix="/knowledge-base", tags=["admin-knowledge"])


class DocumentCreate(BaseModel):
    title: str = Field(min_length=1)
    content: str = Field(min_length=1)
    skill_id: Optional[str] = None
    domain_id: Optional[str] = None
    certification_id: Optional[str] = None


def _serialize_document(doc: models.KnowledgeDocument) -> dict:
    """Safe projection of a KnowledgeDocument (never leaks raw content fields)."""
    return {
        "id": doc.id,
        "title": doc.title,
        "skill_id": doc.skill_id,
        "domain_id": doc.domain_id,
        "certification_id": doc.certification_id,
        "source_type": doc.source_type,
        "status": doc.status,
        "size": len(doc.content or ""),
        "created_at": doc.created_at,
    }


@router.get("/documents")
async def list_documents(
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List the tenant's knowledge documents (safe fields only)."""
    docs = db.query(models.KnowledgeDocument).filter(
        models.KnowledgeDocument.tenant_id == current_user.tenant_id
    ).order_by(models.KnowledgeDocument.created_at.desc()).all()
    return [_serialize_document(d) for d in docs]


@router.post("/documents", status_code=201)
async def create_document(
    data: DocumentCreate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a knowledge document in the tenant's KB and chunk it."""
    service = KnowledgeService(db)
    kb = service.get_or_create_default_kb(current_user.tenant_id)

    doc = models.KnowledgeDocument(
        id=str(uuid.uuid4()),
        tenant_id=current_user.tenant_id,
        kb_id=kb.id,
        certification_id=data.certification_id,
        domain_id=data.domain_id,
        skill_id=data.skill_id,
        title=data.title,
        source_type="markdown",
        content=data.content,
        status=models.ContentStatus.PUBLISHED,
        version="1.0",
        tags=[],
        created_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Chunk for retrieval (skips short paragraphs, see KnowledgeService).
    service.chunk_document(doc)

    AuditService().log(
        db,
        current_user.tenant_id,
        current_user.id,
        "knowledge_document_created",
        "KnowledgeDocument",
        doc.id,
    )
    return _serialize_document(doc)


@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a knowledge document and its chunks. 404 when cross-tenant/missing."""
    service = KnowledgeService(db)
    deleted = service.delete_document(current_user.tenant_id, doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")

    AuditService().log(
        db,
        current_user.tenant_id,
        current_user.id,
        "knowledge_document_deleted",
        "KnowledgeDocument",
        doc_id,
    )
    return {"status": "deleted", "id": doc_id}
