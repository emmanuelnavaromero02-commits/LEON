from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...database.db import get_db
from ...database import models
from ...services.ai.ai_service import AIService
from ...services.knowledge.knowledge_service import KnowledgeService
from ..deps import require_role

require_admin = require_role(models.UserRole.TENANT_ADMIN, models.UserRole.SUPER_ADMIN)

router = APIRouter(prefix="/ai-studio", tags=["admin-ai"])

@router.post("/generate-test")
async def test_generation(
    data: dict,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # data: { skill_id, prompt_type }
    if 'skill_id' not in data or 'prompt_type' not in data:
        raise HTTPException(status_code=400, detail="skill_id and prompt_type are required")

    tenant_id = current_user.tenant_id
    ai_service = AIService(db, tenant_id)
    kb_service = KnowledgeService(db)

    source_content = await kb_service.get_relevant_content(tenant_id, data['skill_id'])
    skill = {"id": data['skill_id'], "name": "Test Skill"}

    if data['prompt_type'] == 'lesson':
        output = await ai_service.generate_lesson({}, skill, source_content, 0.5)
    elif data['prompt_type'] == 'question':
        output = await ai_service.generate_question({}, skill, source_content, "medium")
    else:
        raise HTTPException(status_code=400, detail="Invalid prompt type. Use 'lesson' or 'question'.")

    # Report the provider that actually answered (it may have fallen back to
    # mock mid-request); only report the model when no fallback happened.
    provider = ai_service.last_provider_used
    model = getattr(ai_service.provider, "model_name", None) if provider == ai_service.provider_name else None
    return {"provider": provider, "model": model, "output": output}
