from sqlalchemy.orm import Session
from ...database import models

class ContentQualityService:
    def __init__(self, db: Session):
        self.db = db

    def get_certification_readiness(self, tenant_id: str, certification_id: str):
        domains = self.db.query(models.Domain).filter(models.Domain.certification_id == certification_id).all()
        skills = self.db.query(models.Skill).join(models.Domain).filter(models.Domain.certification_id == certification_id).all()

        total_skills = len(skills)
        if total_skills == 0: return {"score": 0, "status": "Blocked"}

        skills_with_lessons = self.db.query(models.Skill.id).join(models.Lesson).filter(
            models.Lesson.tenant_id == tenant_id,
            models.Lesson.status == models.ContentStatus.PUBLISHED
        ).all()

        skills_with_questions = self.db.query(models.Skill.id).join(models.Question).filter(
            models.Question.tenant_id == tenant_id,
            models.Question.status == models.ContentStatus.PUBLISHED
        ).group_by(models.Skill.id).having(models.func.count(models.Question.id) >= 3).all()

        readiness_score = (len(skills_with_lessons) + len(skills_with_questions)) / (total_skills * 2) * 100

        status = "Ready" if readiness_score > 80 else "Needs work" if readiness_score > 40 else "Blocked"

        return {
            "certification_id": certification_id,
            "readiness_score": readiness_score,
            "status": status,
            "total_skills": total_skills,
            "skills_covered": len(skills_with_lessons),
            "questions_ready": len(skills_with_questions)
        }
