from sqlalchemy.orm import Session
from ...database import models
import math

class ReadinessScoreService:
    def __init__(self, db: Session):
        self.db = db

    def calculate_readiness(self, tenant_id: str, user_id: str, certification_id: str):
        mastery_scores = self.db.query(models.MasteryScore).filter(
            models.MasteryScore.user_id == user_id,
            models.MasteryScore.tenant_id == tenant_id
        ).all()

        domains = self.db.query(models.Domain).filter(
            models.Domain.certification_id == certification_id,
            models.Domain.tenant_id == tenant_id
        ).all()
        if not domains: return {"overall": 0, "pass_probability": 0}

        domain_scores = {}
        weighted_sum = 0
        total_weight = 0

        for d in domains:
            # Get skills for this domain
            skills = self.db.query(models.Skill).filter(models.Skill.domain_id == d.id).all()
            skill_ids = [s.id for s in skills]

            relevant_mastery = [m.score for m in mastery_scores if m.skill_id in skill_ids]

            # Domain score is average of mastered skills (0 if none)
            avg_score = sum(relevant_mastery) / len(skill_ids) if skill_ids else 0
            domain_scores[d.name] = avg_score

            weighted_sum += avg_score * d.weight
            total_weight += d.weight

        overall_readiness = weighted_sum / total_weight if total_weight > 0 else 0

        # Pass probability estimation: sigmoid-like curve
        # 70% readiness -> ~50% probability
        # 90% readiness -> ~95% probability
        pass_prob = 1 / (1 + math.exp(-15 * (overall_readiness - 0.75)))

        return {
            "overall": round(overall_readiness * 100, 2),
            "domain_breakdown": {k: round(v * 100, 2) for k, v in domain_scores.items()},
            "pass_probability": round(pass_prob * 100, 2),
            "status": "Ready" if overall_readiness > 0.8 else "Needs Study"
        }
