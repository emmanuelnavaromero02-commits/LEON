
from sqlalchemy.orm import Session

from ..audit.audit_service import AuditService


class EventService:
    def __init__(self, db: Session, audit: AuditService):
        self.db = db
        self.audit = audit

    def emit(self, tenant_id: str, user_id: str, event_type: str, data: dict):
        if event_type == "skill_mastery_updated":
            self._handle_mastery_update(tenant_id, user_id, data)
        elif event_type == "lesson_completed":
            self._handle_lesson_completion(tenant_id, user_id, data)
        self.audit.log(self.db, tenant_id, user_id, event_type, metadata=data)

    def _handle_mastery_update(self, tenant_id: str, user_id: str, data: dict):
        from ...database import models
        profile = self.db.query(models.LearnerProfile).filter(models.LearnerProfile.user_id == user_id).first()
        if profile:
            xp_gain = 10 if data.get('is_correct') else 2
            profile.total_xp += xp_gain
            self.db.commit()

    def _handle_lesson_completion(self, tenant_id: str, user_id: str, data: dict):
        from ...database import models
        profile = self.db.query(models.LearnerProfile).filter(models.LearnerProfile.user_id == user_id).first()
        if profile:
            profile.current_streak += 1
            self.db.commit()
