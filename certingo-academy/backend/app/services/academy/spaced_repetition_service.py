import uuid
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from ...core.logging import get_logger
from ...database import models

logger = get_logger(__name__)

EASE_FLOOR = 1.3
EASE_CAP = 3.0
DEFAULT_EASE = 2.5
# Cap the interval so very long streaks can't overflow datetime arithmetic and
# so cards still resurface roughly once a year.
MAX_INTERVAL_DAYS = 365.0


class SpacedRepetitionService:
    """SM-2 (simplified) spaced-repetition scheduler.

    On every answer we update (or create) a ReviewSchedule row for the
    user/question pair. Wrong answers reset the card to be reviewed tomorrow and
    lower the ease factor; correct answers grow the interval (1 day, then 3 days,
    then interval * ease) and slowly raise the ease factor.
    """

    def __init__(self, db: Session):
        self.db = db

    def record_review(self, tenant_id: str, user_id: str, question: models.Question, is_correct: bool):
        now = datetime.utcnow()
        schedule = self.db.query(models.ReviewSchedule).filter(
            models.ReviewSchedule.user_id == user_id,
            models.ReviewSchedule.tenant_id == tenant_id,
            models.ReviewSchedule.question_id == question.id,
        ).first()

        if schedule is None:
            schedule = models.ReviewSchedule(
                id=str(uuid.uuid4()),
                user_id=user_id,
                tenant_id=tenant_id,
                question_id=question.id,
                skill_id=question.skill_id,
                repetitions=0,
                ease_factor=DEFAULT_EASE,
                interval_days=0.0,
            )
            self.db.add(schedule)

        if not is_correct:
            schedule.repetitions = 0
            schedule.interval_days = 1.0
            schedule.ease_factor = max(EASE_FLOOR, schedule.ease_factor - 0.2)
        else:
            schedule.repetitions = (schedule.repetitions or 0) + 1
            if schedule.repetitions == 1:
                schedule.interval_days = 1.0
            elif schedule.repetitions == 2:
                schedule.interval_days = 3.0
            else:
                schedule.interval_days = schedule.interval_days * schedule.ease_factor
            schedule.interval_days = min(schedule.interval_days, MAX_INTERVAL_DAYS)
            schedule.ease_factor = min(EASE_CAP, schedule.ease_factor + 0.1)

        schedule.last_reviewed_at = now
        schedule.due_at = now + timedelta(days=schedule.interval_days)
        self.db.commit()
        return schedule
