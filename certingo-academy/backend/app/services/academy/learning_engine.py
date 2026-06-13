from sqlalchemy.orm import Session
from ...database.models import MasteryScore, Question, Attempt, AttemptAnswer, User, Domain, Skill
from datetime import datetime
import uuid
import random

class MasteryEngine:
    @staticmethod
    def calculate_new_score(current_score: float, is_correct: bool, difficulty: str) -> float:
        difficulty_weights = {"easy": 0.05, "medium": 0.10, "hard": 0.15}
        weight = difficulty_weights.get(difficulty, 0.05)
        if is_correct:
            new_score = current_score + weight
        else:
            penalty_multiplier = 1.5 if difficulty == "easy" else 1.0
            new_score = current_score - (weight * penalty_multiplier)
        return max(0.0, min(1.0, new_score))

    def update_user_mastery(self, db: Session, user_id: str, tenant_id: str, skill_id: str, is_correct: bool, difficulty: str):
        mastery = db.query(MasteryScore).filter(
            MasteryScore.user_id == user_id,
            MasteryScore.skill_id == skill_id,
            MasteryScore.tenant_id == tenant_id
        ).first()
        if not mastery:
            mastery = MasteryScore(user_id=user_id, tenant_id=tenant_id, skill_id=skill_id, score=0.0)
            db.add(mastery)
        mastery.score = self.calculate_new_score(mastery.score, is_correct, difficulty)
        db.commit()
        return mastery.score

class DiagnosticEngine:
    def generate_diagnostic_test(self, db: Session, tenant_id: str, certification_id: str, num_questions: int = 10):
        # Pick balanced set across domains
        domains = db.query(Domain).filter(
            Domain.certification_id == certification_id,
            Domain.tenant_id == tenant_id
        ).all()
        if not domains: return []

        questions_per_domain = max(1, num_questions // len(domains))
        all_questions = []

        for d in domains:
            q_domain = db.query(Question).join(Skill).filter(
                Skill.domain_id == d.id,
                Question.tenant_id == tenant_id,
                Question.status == "published"
            ).limit(questions_per_domain).all()
            all_questions.extend(q_domain)

        return all_questions[:num_questions]

class LearningPathGenerator:
    def get_next_recommendation(self, db: Session, user_id: str, tenant_id: str, certification_id: str):
        mastery_scores = db.query(MasteryScore).filter(
            MasteryScore.user_id == user_id,
            MasteryScore.tenant_id == tenant_id
        ).all()

        if not mastery_scores:
            return "Start with Cloud Fundamentals to build your base."

        weakest = min(mastery_scores, key=lambda m: m.score)
        skill = db.query(Skill).filter(
            Skill.id == weakest.skill_id,
            Skill.tenant_id == tenant_id
        ).first()
        if skill and weakest.score < 0.8:
            return f"You're struggling with {skill.name}. Let's do a quick recap."

        return "You're doing great! Ready for a practice exam?"

class ExamGenerator:
    def create_exam(self, db: Session, tenant_id: str, certification_id: str, num_questions: int = 20):
        domains = db.query(Domain).filter(
            Domain.certification_id == certification_id,
            Domain.tenant_id == tenant_id
        ).all()
        if not domains: return []

        all_questions = []
        for d in domains:
            # Domain weight relative to total (e.g. 24%)
            count = int((d.weight / 100) * num_questions)
            if count == 0: count = 1

            q_domain = db.query(Question).join(Skill).filter(
                Skill.domain_id == d.id,
                Question.tenant_id == tenant_id,
                Question.status == "published"
            ).all()

            if q_domain:
                selected = random.sample(q_domain, min(len(q_domain), count))
                all_questions.extend(selected)

        random.shuffle(all_questions)
        return all_questions[:num_questions]
