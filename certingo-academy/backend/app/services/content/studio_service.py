from sqlalchemy.orm import Session
from ...database import models
import uuid

class ContentStudioService:
    def __init__(self, db: Session):
        self.db = db

    def create_lesson(self, tenant_id: str, skill_id: str, title: str, content: str, user_id: str, status=models.ContentStatus.DRAFT):
        lesson = models.Lesson(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            skill_id=skill_id,
            title=title,
            content=content,
            version="1.0",
            status=status,
            created_by=user_id
        )
        self.db.add(lesson)
        self.db.commit()
        return lesson

    def approve_content(self, resource_type: str, resource_id: str, reviewer_id: str):
        model_map = {
            "Lesson": models.Lesson,
            "Question": models.Question,
            "LearningBit": models.LearningBit
        }
        resource = self.db.query(model_map[resource_type]).filter(model_map[resource_type].id == resource_id).first()
        if resource:
            resource.status = models.ContentStatus.PUBLISHED
            if hasattr(resource, 'reviewed_by'):
                resource.reviewed_by = reviewer_id
            self.db.commit()
        return resource
