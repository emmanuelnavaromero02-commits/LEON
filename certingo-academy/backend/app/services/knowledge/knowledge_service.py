from sqlalchemy.orm import Session
from ...database import models
from typing import List, Optional
import uuid

class KnowledgeService:
    def __init__(self, db: Session):
        self.db = db

    def chunk_document(self, document: models.KnowledgeDocument):
        # Simple chunking by paragraph for now
        content = document.content
        paragraphs = content.split('\n\n')
        for i, p in enumerate(paragraphs):
            if len(p.strip()) < 50: continue
            chunk = models.KnowledgeChunk(
                id=str(uuid.uuid4()),
                tenant_id=document.tenant_id,
                document_id=document.id,
                chunk_index=i,
                content=p.strip(),
                metadata_json={"source": document.title, "type": document.source_type}
            )
            self.db.add(chunk)
        self.db.commit()

    def search(self, tenant_id: str, certification_id: str = None,
               domain_id: str = None, skill_id: str = None,
               query: str = None, limit: int = 8) -> List[models.KnowledgeChunk]:

        q = self.db.query(models.KnowledgeChunk).filter(models.KnowledgeChunk.tenant_id == tenant_id)

        # Simple keyword search in content if query provided
        if query:
            q = q.filter(models.KnowledgeChunk.content.ilike(f"%{query}%"))

        # In a real app we would join with KnowledgeDocument to filter by cert/domain/skill
        # For this demo we'll return all relevant tenant chunks
        return q.limit(limit).all()

    async def get_relevant_content(self, tenant_id: str, skill_id: str):
        chunks = self.search(tenant_id, skill_id=skill_id)
        learning_bits = self.db.query(models.LearningBit).filter(
            models.LearningBit.tenant_id == tenant_id,
            models.LearningBit.skill_id == skill_id,
            models.LearningBit.status == models.ContentStatus.PUBLISHED
        ).all()

        context = "Verified Knowledge:\n"
        context += "\n".join([c.content for c in chunks])
        context += "\n\nLearning Bits:\n"
        context += "\n".join([f"- {b.type}: {b.content}" for b in learning_bits])

        return context
