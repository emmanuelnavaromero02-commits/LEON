from sqlalchemy.orm import Session
from ...database import models
from datetime import datetime, date
import uuid

class DailyMissionService:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create_missions(self, tenant_id: str, user_id: str):
        today = date.today()
        existing = self.db.query(models.DailyMission).filter(
            models.DailyMission.user_id == user_id,
            models.func.date(models.DailyMission.date) == today
        ).all()

        if existing:
            return existing

        # Create new missions for today
        missions = [
            models.DailyMission(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                user_id=user_id,
                title="Knowledge Seeker",
                description="Complete 2 micro-lessons",
                goal_value=2,
                xp_reward=50,
                status="pending"
            ),
            models.DailyMission(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                user_id=user_id,
                title="Security First",
                description="Answer 3 security questions correctly",
                goal_value=3,
                xp_reward=75,
                status="pending"
            )
        ]
        for m in missions: self.db.add(m)
        self.db.commit()
        return missions

    def update_progress(self, user_id: str, mission_type: str, increment: int = 1):
        # type would map to mission logic
        # For simplicity, increment first pending mission
        mission = self.db.query(models.DailyMission).filter(
            models.DailyMission.user_id == user_id,
            models.DailyMission.status == "pending"
        ).first()

        if mission:
            mission.current_value += increment
            if mission.current_value >= mission.goal_value:
                mission.status = "completed"
                # Reward XP logic would go here
            self.db.commit()
