from sqlalchemy.orm import Session
from ...database import models
from typing import List
import uuid

class ReviewModeService:
    def __init__(self, db: Session):
        self.db = db

    def get_mistakes_notebook(self, tenant_id: str, user_id: str):
        mistakes = self.db.query(models.MistakeLog).filter(
            models.MistakeLog.user_id == user_id,
            models.MistakeLog.tenant_id == tenant_id
        ).order_by(models.MistakeLog.count.desc()).all()

        notebook = []
        for m in mistakes:
            question = self.db.query(models.Question).filter(
                models.Question.id == m.question_id,
                models.Question.tenant_id == tenant_id
            ).first()
            # Fetch relevant learning bits for this skill to help review
            bits = self.db.query(models.LearningBit).filter(
                models.LearningBit.skill_id == m.skill_id,
                models.LearningBit.tenant_id == tenant_id,
                models.LearningBit.status == "published"
            ).all()

            # Spaced-repetition due date for this exact question (if scheduled).
            schedule = self.db.query(models.ReviewSchedule).filter(
                models.ReviewSchedule.user_id == user_id,
                models.ReviewSchedule.tenant_id == tenant_id,
                models.ReviewSchedule.question_id == m.question_id,
            ).first()

            notebook.append({
                "skill_id": m.skill_id,
                "fail_count": m.count,
                "last_question": question.prompt if question else "Unknown",
                "review_hints": [b.content for b in bits[:2]],
                "due_at": schedule.due_at.isoformat() if schedule and schedule.due_at else None,
            })
        return notebook

    def get_weak_topics(self, tenant_id: str, user_id: str):
        # Skills with mastery < 0.5
        weak_mastery = self.db.query(models.MasteryScore).filter(
            models.MasteryScore.user_id == user_id,
            models.MasteryScore.tenant_id == tenant_id,
            models.MasteryScore.score < 0.5
        ).all()

        topics = []
        for m in weak_mastery:
            skill = self.db.query(models.Skill).filter(
                models.Skill.id == m.skill_id,
                models.Skill.tenant_id == tenant_id
            ).first()
            if skill:
                topics.append({"id": skill.id, "name": skill.name, "score": m.score})
        return topics
