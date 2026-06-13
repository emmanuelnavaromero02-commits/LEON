from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...database.db import get_db
from ...database import models
from ..deps import require_role

require_admin = require_role(models.UserRole.TENANT_ADMIN, models.UserRole.SUPER_ADMIN)

router = APIRouter(prefix="/control-room", tags=["admin-ops"])

@router.get("/status")
async def get_system_status(
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    tenant_id = current_user.tenant_id
    is_super = current_user.role == models.UserRole.SUPER_ADMIN

    # Real AI provider configured for this tenant (defaults to mock when unset).
    ai_settings = db.query(models.TenantAISettings).filter(
        models.TenantAISettings.tenant_id == tenant_id
    ).first()
    ai_provider = ai_settings.provider if ai_settings and ai_settings.provider else "mock"
    ai_model = ai_settings.model_name if ai_settings else None

    return {
        "health": "healthy",
        "tenants": db.query(models.Tenant).count() if is_super else 1,
        "active_users": db.query(models.User).filter(models.User.tenant_id == tenant_id).count(),
        "mcp_servers": db.query(models.MCPServer).filter(models.MCPServer.tenant_id == tenant_id).count(),
        "ai_provider": ai_provider,
        "ai_model": ai_model,
        "content_drafts": db.query(models.Lesson).filter(
            models.Lesson.tenant_id == tenant_id,
            models.Lesson.status == "draft"
        ).count(),
        "questions_pending": db.query(models.Question).filter(
            models.Question.tenant_id == tenant_id,
            models.Question.status == "draft"
        ).count(),
        "questions_published": db.query(models.Question).filter(
            models.Question.tenant_id == tenant_id,
            models.Question.status == "published"
        ).count(),
        "attempts": db.query(models.Attempt).filter(
            models.Attempt.tenant_id == tenant_id
        ).count(),
        "knowledge_documents": db.query(models.KnowledgeDocument).filter(
            models.KnowledgeDocument.tenant_id == tenant_id
        ).count(),
    }
