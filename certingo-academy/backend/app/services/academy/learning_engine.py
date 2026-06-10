from sqlalchemy.orm import Session
from ...database.models import MasteryScore, Question, Attempt, AttemptAnswer, User
from datetime import datetime
import uuid

class MasteryEngine:
    @staticmethod
    def calculate_new_score(current_score: float, is_correct: bool, difficulty: str) -> float:
        difficulty_weights = {
            "easy": 0.05,
            "medium": 0.10,
            "hard": 0.15
        }
        weight = difficulty_weights.get(difficulty, 0.05)

        if is_correct:
            new_score = current_score + weight
        else:
            # Penalize more for failing easy questions
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
            mastery = MasteryScore(
                user_id=user_id,
                tenant_id=tenant_id,
                skill_id=skill_id,
                score=0.0
            )
            db.add(mastery)

        mastery.score = self.calculate_new_score(mastery.score, is_correct, difficulty)
        db.commit()
        return mastery.score

class DiagnosticEngine:
    def generate_diagnostic_test(self, db: Session, tenant_id: str, certification_id: str, num_questions: int = 10):
        # Pick a balanced set of questions across domains for the diagnostic
        questions = db.query(Question).filter(
            Question.tenant_id == tenant_id,
            Question.status == "approved"
        ).limit(num_questions).all() # Simple selection for demo
        return questions

class LearningPathGenerator:
    def get_next_recommendation(self, db: Session, user_id: str, tenant_id: str, certification_id: str):
        # Logic to find skills with low mastery that are next in the path
        # For demo: just find the first skill with score < 0.9
        mastery_scores = db.query(MasteryScore).filter(
            MasteryScore.user_id == user_id,
            MasteryScore.tenant_id == tenant_id
        ).all()

        # Simple recommendation logic
        return "Introduction to Cloud Security" # Example

class ExamGenerator:
    def create_exam(self, db: Session, tenant_id: str, certification_id: str, num_questions: int = 20):
        # Create a balanced exam based on domain weights (to be implemented more deeply)
        questions = db.query(Question).filter(
            Question.tenant_id == tenant_id,
            Question.status == "approved"
        ).limit(num_questions).all()
        return questions
