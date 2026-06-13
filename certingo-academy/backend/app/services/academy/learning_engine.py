from sqlalchemy.orm import Session
from ...database.models import (
    MasteryScore, Question, Attempt, AttemptAnswer, User, Domain, Skill,
    ReviewSchedule, LearnerProfile,
)
from ...core.logging import get_logger
from datetime import datetime
import random

logger = get_logger(__name__)

# Difficulty thresholds derived from mastery of the target skill.
# score < 0.4 -> easy; 0.4 <= score <= 0.7 -> medium; score > 0.7 -> hard.
EASY_MAX = 0.4
MEDIUM_MAX = 0.7
# Degradation order when the target difficulty has no candidate questions.
DIFFICULTY_FALLBACK = {
    "easy": ["easy", "medium", "hard"],
    "medium": ["medium", "easy", "hard"],
    "hard": ["hard", "medium", "easy"],
}


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


class AdaptiveSelector:
    """Selects the next practice question for a learner.

    The selection is adaptive on three axes: it targets the weakest skill of the
    learner for the certification, picks a difficulty that matches the current
    mastery of that skill, and avoids serving questions the learner answered very
    recently. Questions that are due for spaced-repetition review take priority.
    """

    @staticmethod
    def target_difficulty(mastery_score: float) -> str:
        if mastery_score < EASY_MAX:
            return "easy"
        if mastery_score <= MEDIUM_MAX:
            return "medium"
        return "hard"

    def get_weakest_skill_id(self, db: Session, user_id: str, tenant_id: str, certification_id: str):
        """Return the id of the learner's weakest skill for the certification.

        Prefers the lowest mastery score among the certification's skills; if the
        learner has no mastery scores yet, falls back to any certification skill
        that has published questions.
        """
        cert_skill_ids = self._certification_skill_ids(db, tenant_id, certification_id)

        mastery_query = db.query(MasteryScore).filter(
            MasteryScore.user_id == user_id,
            MasteryScore.tenant_id == tenant_id,
        )
        if cert_skill_ids:
            mastery_query = mastery_query.filter(MasteryScore.skill_id.in_(cert_skill_ids))
        weakest = mastery_query.order_by(MasteryScore.score.asc()).first()
        if weakest:
            return weakest.skill_id

        # No mastery yet: any certification skill with published questions.
        candidate_query = db.query(Question.skill_id).filter(
            Question.tenant_id == tenant_id,
            Question.status == "published",
        )
        if cert_skill_ids:
            candidate_query = candidate_query.filter(Question.skill_id.in_(cert_skill_ids))
        row = candidate_query.first()
        return row[0] if row else None

    def get_skill_mastery(self, db: Session, user_id: str, tenant_id: str, skill_id: str) -> float:
        mastery = db.query(MasteryScore).filter(
            MasteryScore.user_id == user_id,
            MasteryScore.tenant_id == tenant_id,
            MasteryScore.skill_id == skill_id,
        ).first()
        return mastery.score if mastery else 0.0

    def _certification_skill_ids(self, db: Session, tenant_id: str, certification_id: str):
        rows = db.query(Skill.id).join(Domain, Skill.domain_id == Domain.id).filter(
            Domain.certification_id == certification_id,
            Skill.tenant_id == tenant_id,
        ).all()
        return [r[0] for r in rows]

    def _recent_question_ids(self, db: Session, user_id: str, tenant_id: str, limit: int = 10):
        """Question ids from the learner's last `limit` answers (this tenant)."""
        rows = (
            db.query(AttemptAnswer.question_id)
            .join(Attempt, AttemptAnswer.attempt_id == Attempt.id)
            .filter(Attempt.user_id == user_id, Attempt.tenant_id == tenant_id)
            .order_by(AttemptAnswer.id.desc())
            .limit(limit)
            .all()
        )
        return {r[0] for r in rows}

    def get_due_review_question(self, db: Session, user_id: str, tenant_id: str, certification_id: str):
        """Return a (Question, schedule) due for review, or None.

        Only questions belonging to the certification (and still published) are
        considered, oldest due first.
        """
        now = datetime.utcnow()
        cert_skill_ids = self._certification_skill_ids(db, tenant_id, certification_id)

        query = (
            db.query(Question, ReviewSchedule)
            .join(ReviewSchedule, ReviewSchedule.question_id == Question.id)
            .filter(
                ReviewSchedule.user_id == user_id,
                ReviewSchedule.tenant_id == tenant_id,
                ReviewSchedule.due_at <= now,
                Question.tenant_id == tenant_id,
                Question.status == "published",
            )
            .order_by(ReviewSchedule.due_at.asc())
        )
        if cert_skill_ids:
            query = query.filter(Question.skill_id.in_(cert_skill_ids))
        return query.first()

    def select_question(self, db: Session, user_id: str, tenant_id: str, certification_id: str):
        """Pick the next question for the learner.

        Returns a tuple (question, source) where source is "review" when the
        question is a due spaced-repetition item and "new" otherwise. Returns
        (None, None) when nothing is available.
        """
        # 1) Review priority: serve due spaced-repetition questions first.
        due = self.get_due_review_question(db, user_id, tenant_id, certification_id)
        if due is not None:
            question, _schedule = due
            return question, "review"

        # 2) New question on the weakest skill, at the right difficulty.
        skill_id = self.get_weakest_skill_id(db, user_id, tenant_id, certification_id)

        base_query = db.query(Question).filter(
            Question.tenant_id == tenant_id,
            Question.status == "published",
        )
        if skill_id:
            base_query = base_query.filter(Question.skill_id == skill_id)

        recent_ids = self._recent_question_ids(db, user_id, tenant_id, limit=10)

        mastery_score = self.get_skill_mastery(db, user_id, tenant_id, skill_id) if skill_id else 0.0
        target = self.target_difficulty(mastery_score)

        # Try the target difficulty, then degrade through the preference order,
        # always excluding recently-answered questions when alternatives exist.
        for difficulty in DIFFICULTY_FALLBACK[target]:
            candidates = base_query.filter(Question.difficulty == difficulty).all()
            fresh = [q for q in candidates if q.id not in recent_ids]
            pool = fresh if fresh else candidates
            if pool:
                return random.choice(pool), "new"

        # No question matched any known difficulty: fall back to anything fresh.
        all_candidates = base_query.all()
        fresh = [q for q in all_candidates if q.id not in recent_ids]
        pool = fresh if fresh else all_candidates
        if pool:
            return random.choice(pool), "new"
        return None, None


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
    """Data-driven next-best-action recommendation.

    Combines the exam deadline (days remaining), current readiness and the number
    of weak skills to compose a recommendation with an urgency level and an
    optional focus skill. Backwards compatible: the human-readable text always
    lives in ``message`` so callers that expect a string can keep using it.
    """

    def get_next_recommendation(self, db: Session, user_id: str, tenant_id: str, certification_id: str):
        from .readiness_service import ReadinessScoreService

        profile = db.query(LearnerProfile).filter(
            LearnerProfile.user_id == user_id,
            LearnerProfile.tenant_id == tenant_id,
        ).first()

        mastery_scores = db.query(MasteryScore).filter(
            MasteryScore.user_id == user_id,
            MasteryScore.tenant_id == tenant_id,
        ).all()

        days_to_exam = None
        if profile and profile.exam_deadline is not None:
            delta = profile.exam_deadline - datetime.utcnow()
            days_to_exam = max(0, delta.days)

        readiness = ReadinessScoreService(db).calculate_readiness(
            tenant_id, user_id, certification_id
        )
        readiness_fraction = (readiness.get("overall", 0) or 0) / 100.0

        weak_skills = [m for m in mastery_scores if m.score < 0.5]

        # Cold start: no signal yet.
        if not mastery_scores:
            return {
                "message": "Start with the fundamentals to build your base, then take the diagnostic.",
                "urgency": "low",
                "focus_skill_id": None,
                "days_to_exam": days_to_exam,
            }

        weakest = min(mastery_scores, key=lambda m: m.score)
        focus_skill = db.query(Skill).filter(
            Skill.id == weakest.skill_id,
            Skill.tenant_id == tenant_id,
        ).first()
        focus_skill_name = focus_skill.name if focus_skill else "your weakest topic"

        # Deadline pressure with low readiness -> high urgency, focus on the
        # skill of the highest-weight domain among the weak ones.
        if days_to_exam is not None and days_to_exam < 14 and readiness_fraction < 0.6:
            focus_id = self._highest_weight_weak_skill(db, tenant_id, certification_id, weak_skills) or weakest.skill_id
            focus_skill = db.query(Skill).filter(
                Skill.id == focus_id, Skill.tenant_id == tenant_id
            ).first()
            focus_skill_name = focus_skill.name if focus_skill else focus_skill_name
            return {
                "message": (
                    f"Only {days_to_exam} days to your exam and readiness is at "
                    f"{round(readiness_fraction * 100)}%. Focus hard on {focus_skill_name}."
                ),
                "urgency": "high",
                "focus_skill_id": focus_id,
                "days_to_exam": days_to_exam,
            }

        # Strong readiness -> push towards a practice exam.
        if readiness_fraction > 0.8:
            return {
                "message": "You're in great shape! Time to take a full practice exam.",
                "urgency": "low",
                "focus_skill_id": None,
                "days_to_exam": days_to_exam,
            }

        # Medium urgency when a deadline exists but is not critical.
        urgency = "medium" if days_to_exam is not None else "low"
        if days_to_exam is None and profile and profile.weekly_time_minutes:
            pace = (
                f" Aim for about {max(1, profile.weekly_time_minutes // 30)} short sessions this week."
            )
        else:
            pace = ""
        return {
            "message": f"You're struggling with {focus_skill_name}. Let's do a focused recap.{pace}",
            "urgency": urgency,
            "focus_skill_id": weakest.skill_id,
            "days_to_exam": days_to_exam,
        }

    def _highest_weight_weak_skill(self, db: Session, tenant_id: str, certification_id: str, weak_scores):
        """Among weak skills, return the one in the highest-weight domain."""
        if not weak_scores:
            return None
        weak_ids = [m.skill_id for m in weak_scores]
        rows = (
            db.query(Skill.id, Domain.weight)
            .join(Domain, Skill.domain_id == Domain.id)
            .filter(
                Domain.certification_id == certification_id,
                Skill.tenant_id == tenant_id,
                Skill.id.in_(weak_ids),
            )
            .all()
        )
        if not rows:
            return None
        return max(rows, key=lambda r: (r[1] or 0))[0]


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
