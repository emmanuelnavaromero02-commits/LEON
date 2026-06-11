from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...database.db import get_db
from ...database import models
from ...services.ai.ai_service import AIService
from ...services.knowledge.knowledge_service import KnowledgeService

router = APIRouter(prefix="/ai-studio", tags=["admin-ai"])

@router.post("/generate-test")
async def test_generation(data: dict, db: Session = Depends(get_db)):
    # data: { tenant_id, skill_id, prompt_type }
    tenant_id = data.get('tenant_id', 'default-demo-tenant')
    ai_service = AIService(db, tenant_id)
    kb_service = KnowledgeService(db)

    source_content = await kb_service.get_relevant_content(tenant_id, data['skill_id'])

    if data['prompt_type'] == 'lesson':
        return await ai_service.generate_lesson({}, {"id": data['skill_id'], "name": "Test Skill"}, source_content, 0.5)
    elif data['prompt_type'] == 'question':
        return await ai_service.generate_question({"id": data['skill_id']}, source_content, "medium")

    return {"error": "Invalid prompt type"}
