from sqlalchemy.orm import Session
from ...database import models
from ...core.logging import get_logger
from datetime import datetime, date
import uuid

logger = get_logger(__name__)


class DailyMissionService:
    """Generates the learner's daily missions from their current state.

    Instead of two fixed missions, missions adapt to context: due spaced-
    repetition reviews, the weakest skill, an active streak, or a fresh start.
    Generation is deterministic within a day (same state on the same date yields
    the same missions), so repeated calls return the persisted set.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_or_create_missions(self, tenant_id: str, user_id: str):
        today = date.today()
        existing = self.db.query(models.DailyMission).filter(
            models.DailyMission.user_id == user_id,
            models.DailyMission.tenant_id == tenant_id,
            models.func.date(models.DailyMission.date) == today,
        ).all()

        if existing:
            return existing

        missions = [
            models.DailyMission(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                user_id=user_id,
                title=spec["title"],
                description=spec["description"],
                goal_value=spec["goal_value"],
                xp_reward=spec["xp_reward"],
                status="pending",
            )
            for spec in self._mission_specs(tenant_id, user_id)
        ]
        for m in missions:
            self.db.add(m)
        self.db.commit()
        return missions

    def _mission_specs(self, tenant_id: str, user_id: str) -> list[dict]:
        """Build 2-3 mission specs from the learner's state (deterministic)."""
        specs: list[dict] = []

        # 1) Due reviews -> clear them.
        due_count = self.db.query(models.ReviewSchedule).filter(
            models.ReviewSchedule.user_id == user_id,
            models.ReviewSchedule.tenant_id == tenant_id,
            models.ReviewSchedule.due_at <= datetime.utcnow(),
        ).count()
        if due_count > 0:
            goal = min(due_count, 10)
            specs.append({
                "title": "Spaced Review",
                "description": f"Clear {goal} due reviews",
                "goal_value": goal,
                "xp_reward": 20 * goal,
            })

        # 2) Weakest skill -> drill it.
        weakest = self.db.query(models.MasteryScore).filter(
            models.MasteryScore.user_id == user_id,
            models.MasteryScore.tenant_id == tenant_id,
        ).order_by(models.MasteryScore.score.asc()).first()
        if weakest is not None:
            skill = self.db.query(models.Skill).filter(
                models.Skill.id == weakest.skill_id,
                models.Skill.tenant_id == tenant_id,
            ).first()
            skill_name = skill.name if skill else "your weakest topic"
            specs.append({
                "title": "Target Practice",
                "description": f"Answer 5 questions on {skill_name}",
                "goal_value": 5,
                "xp_reward": 75,
            })
        else:
            # No mastery yet -> kickoff mission.
            specs.append({
                "title": "Getting Started",
                "description": "Answer your first 3 questions",
                "goal_value": 3,
                "xp_reward": 50,
            })

        # 3) Streak-aware closer.
        profile = self.db.query(models.LearnerProfile).filter(
            models.LearnerProfile.user_id == user_id,
            models.LearnerProfile.tenant_id == tenant_id,
        ).first()
        if profile and (profile.current_streak or 0) > 0:
            specs.append({
                "title": "Keep Your Streak",
                "description": "Complete at least 1 lesson today",
                "goal_value": 1,
                "xp_reward": 30,
            })
        elif len(specs) < 2:
            specs.append({
                "title": "Knowledge Seeker",
                "description": "Complete 2 micro-lessons",
                "goal_value": 2,
                "xp_reward": 50,
            })

        # Keep it to at most 3 missions a day.
        return specs[:3]

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
