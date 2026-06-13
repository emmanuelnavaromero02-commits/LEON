import uuid

from sqlalchemy.orm import Session

from ...database import models


class AuditService:
    def log(self, db: Session, tenant_id: str, user_id: str, action: str,
            resource_type: str = None, resource_id: str = None,
            status: str = "success", metadata: dict = None,
            request_id: str = "SYSTEM"):

        event = models.AuditEvent(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            status=status,
            request_id=request_id,
            metadata_json=metadata
        )
        db.add(event)
        db.commit()
