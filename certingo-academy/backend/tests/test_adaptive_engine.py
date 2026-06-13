"""Phase 3 — adaptive engine tests.

Covers adaptive question selection (difficulty by mastery, degradation,
no-repeat of recent answers, review priority), the SM-2 spaced repetition
service, lesson selection with real mastery, data-driven recommendations and
dynamic daily missions. Tenant isolation is exercised where relevant.
"""
import uuid
from datetime import datetime, timedelta

import pytest

from app.database import models
from app.services.academy.learning_engine import AdaptiveSelector, LearningPathGenerator
from app.services.academy.mission_service import DailyMissionService
from app.services.academy.spaced_repetition_service import SpacedRepetitionService
from tests.conftest import auth_headers

CERT_ID = "aws-cloud-practitioner"


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _build_cert_tree(db, tenant_id, *, domain_weight=50.0, skill_name="Cloud Concepts",
                     cert_id=None):
    """Create certification -> domain -> skill and return the skill.

    The certification id defaults to the shared CERT_ID for the demo tenant
    (tenant-1) and to a tenant-scoped id otherwise, so two tenants never collide
    on the globally-unique certifications.id.
    """
    if cert_id is None:
        cert_id = CERT_ID if tenant_id == "tenant-1" else f"{CERT_ID}-{tenant_id}"
    cert = db.query(models.Certification).filter(
        models.Certification.id == cert_id,
        models.Certification.tenant_id == tenant_id,
    ).first()
    if cert is None:
        cert = models.Certification(
            id=cert_id, tenant_id=tenant_id, name="AWS CP", provider="aws",
            version="1.0", description="", status="published",
        )
        db.add(cert)
    domain = models.Domain(
        id=str(uuid.uuid4()), certification_id=cert_id, tenant_id=tenant_id,
        name=f"Domain {skill_name}", weight=domain_weight, status="published",
    )
    db.add(domain)
    skill = models.Skill(
        id=str(uuid.uuid4()), domain_id=domain.id, tenant_id=tenant_id,
        name=skill_name, description="", level="beginner", status="published",
    )
    db.add(skill)
    db.commit()
    return skill


def _add_question(db, tenant_id, skill_id, difficulty="medium", correct="B", status="published"):
    q = models.Question(
        id=str(uuid.uuid4()), skill_id=skill_id, tenant_id=tenant_id,
        prompt=f"{difficulty} question?", options=["A", "B", "C", "D"],
        correct_answer=correct, explanation="because", difficulty=difficulty, status=status,
    )
    db.add(q)
    db.commit()
    return q


def _set_mastery(db, user_id, tenant_id, skill_id, score):
    m = models.MasteryScore(user_id=user_id, tenant_id=tenant_id, skill_id=skill_id, score=score)
    db.add(m)
    db.commit()
    return m


# --------------------------------------------------------------------------- #
# 1) Difficulty selection by mastery
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("score,expected", [
    (0.0, "easy"),
    (0.39, "easy"),
    (0.4, "medium"),
    (0.55, "medium"),
    (0.7, "medium"),
    (0.71, "hard"),
    (1.0, "hard"),
])
def test_target_difficulty_thresholds(score, expected):
    assert AdaptiveSelector.target_difficulty(score) == expected


def test_select_question_low_mastery_picks_easy(db, users):
    student = users["student1"]
    skill = _build_cert_tree(db, student.tenant_id)
    easy = _add_question(db, student.tenant_id, skill.id, difficulty="easy")
    _add_question(db, student.tenant_id, skill.id, difficulty="medium")
    _add_question(db, student.tenant_id, skill.id, difficulty="hard")
    _set_mastery(db, student.id, student.tenant_id, skill.id, 0.2)  # < 0.4 -> easy

    q, source = AdaptiveSelector().select_question(db, student.id, student.tenant_id, CERT_ID)
    assert source == "new"
    assert q.difficulty == "easy"
    assert q.id == easy.id


def test_select_question_mid_mastery_picks_medium(db, users):
    student = users["student1"]
    skill = _build_cert_tree(db, student.tenant_id)
    _add_question(db, student.tenant_id, skill.id, difficulty="easy")
    medium = _add_question(db, student.tenant_id, skill.id, difficulty="medium")
    _add_question(db, student.tenant_id, skill.id, difficulty="hard")
    _set_mastery(db, student.id, student.tenant_id, skill.id, 0.55)  # 0.4-0.7 -> medium

    q, _ = AdaptiveSelector().select_question(db, student.id, student.tenant_id, CERT_ID)
    assert q.difficulty == "medium"
    assert q.id == medium.id


def test_select_question_high_mastery_picks_hard(db, users):
    student = users["student1"]
    skill = _build_cert_tree(db, student.tenant_id)
    _add_question(db, student.tenant_id, skill.id, difficulty="easy")
    _add_question(db, student.tenant_id, skill.id, difficulty="medium")
    hard = _add_question(db, student.tenant_id, skill.id, difficulty="hard")
    _set_mastery(db, student.id, student.tenant_id, skill.id, 0.9)  # > 0.7 -> hard

    q, _ = AdaptiveSelector().select_question(db, student.id, student.tenant_id, CERT_ID)
    assert q.difficulty == "hard"
    assert q.id == hard.id


# --------------------------------------------------------------------------- #
# 1b) Degradation when target difficulty has no questions
# --------------------------------------------------------------------------- #

def test_select_question_degrades_when_target_missing(db, users):
    """Mastery wants 'hard', but only easy/medium exist -> degrades to medium."""
    student = users["student1"]
    skill = _build_cert_tree(db, student.tenant_id)
    _add_question(db, student.tenant_id, skill.id, difficulty="easy")
    medium = _add_question(db, student.tenant_id, skill.id, difficulty="medium")
    _set_mastery(db, student.id, student.tenant_id, skill.id, 0.95)  # wants hard

    q, _ = AdaptiveSelector().select_question(db, student.id, student.tenant_id, CERT_ID)
    # Fallback order for hard is hard -> medium -> easy; medium is the first available.
    assert q.difficulty == "medium"
    assert q.id == medium.id


def test_select_question_easy_target_degrades_to_medium(db, users):
    """Mastery wants 'easy', only medium/hard exist -> degrades to medium first."""
    student = users["student1"]
    skill = _build_cert_tree(db, student.tenant_id)
    medium = _add_question(db, student.tenant_id, skill.id, difficulty="medium")
    _add_question(db, student.tenant_id, skill.id, difficulty="hard")
    _set_mastery(db, student.id, student.tenant_id, skill.id, 0.1)  # wants easy

    q, _ = AdaptiveSelector().select_question(db, student.id, student.tenant_id, CERT_ID)
    assert q.id == medium.id


# --------------------------------------------------------------------------- #
# 1c) No-repeat of the last 10 answered questions
# --------------------------------------------------------------------------- #

def _record_answer(db, user_id, tenant_id, question_id, is_correct=True):
    attempt = models.Attempt(
        id=str(uuid.uuid4()), user_id=user_id, tenant_id=tenant_id,
        certification_id=CERT_ID, type="practice", score=1.0, xp_earned=0,
    )
    db.add(attempt)
    db.flush()
    db.add(models.AttemptAnswer(
        attempt_id=attempt.id, question_id=question_id,
        selected_answer="B", is_correct=is_correct,
    ))
    db.commit()


def test_select_question_excludes_recently_answered(db, users):
    student = users["student1"]
    skill = _build_cert_tree(db, student.tenant_id)
    # Two medium questions; one was answered recently -> the other must be served.
    answered = _add_question(db, student.tenant_id, skill.id, difficulty="medium")
    fresh = _add_question(db, student.tenant_id, skill.id, difficulty="medium")
    _set_mastery(db, student.id, student.tenant_id, skill.id, 0.5)
    _record_answer(db, student.id, student.tenant_id, answered.id)

    # Run a few times: it must never pick the recently answered one.
    for _ in range(8):
        q, _src = AdaptiveSelector().select_question(db, student.id, student.tenant_id, CERT_ID)
        assert q.id == fresh.id


def test_recent_excludes_only_last_10(db, users):
    """The 11th-most-recent answer is no longer excluded."""
    student = users["student1"]
    skill = _build_cert_tree(db, student.tenant_id)
    _set_mastery(db, student.id, student.tenant_id, skill.id, 0.5)

    # The oldest answered question.
    oldest = _add_question(db, student.tenant_id, skill.id, difficulty="medium")
    _record_answer(db, student.id, student.tenant_id, oldest.id)
    # 10 more distinct answers push `oldest` out of the last-10 window.
    for _ in range(10):
        q = _add_question(db, student.tenant_id, skill.id, difficulty="medium")
        _record_answer(db, student.id, student.tenant_id, q.id)

    recent = AdaptiveSelector()._recent_question_ids(db, student.id, student.tenant_id, limit=10)
    assert oldest.id not in recent
    assert len(recent) == 10


def test_recent_answers_are_tenant_scoped(db, users):
    """Another tenant's answers never leak into the recent-question filter."""
    s1 = users["student1"]
    skill = _build_cert_tree(db, s1.tenant_id)
    q1 = _add_question(db, s1.tenant_id, skill.id)
    # An answer recorded under tenant 2 must not appear for tenant 1's user.
    s2 = users["student_t2"]
    skill2 = _build_cert_tree(db, s2.tenant_id, skill_name="Other")
    q2 = _add_question(db, s2.tenant_id, skill2.id)
    _record_answer(db, s1.id, s1.tenant_id, q1.id)
    _record_answer(db, s2.id, s2.tenant_id, q2.id)

    recent_t1 = AdaptiveSelector()._recent_question_ids(db, s1.id, s1.tenant_id)
    assert recent_t1 == {q1.id}


# --------------------------------------------------------------------------- #
# 1d) Review priority
# --------------------------------------------------------------------------- #

def test_due_review_takes_priority_over_new(db, users):
    student = users["student1"]
    skill = _build_cert_tree(db, student.tenant_id)
    _add_question(db, student.tenant_id, skill.id, difficulty="easy")
    due_q = _add_question(db, student.tenant_id, skill.id, difficulty="hard")
    _set_mastery(db, student.id, student.tenant_id, skill.id, 0.1)  # would normally pick easy

    # Schedule due_q as overdue.
    db.add(models.ReviewSchedule(
        id=str(uuid.uuid4()), user_id=student.id, tenant_id=student.tenant_id,
        question_id=due_q.id, skill_id=skill.id, repetitions=1, ease_factor=2.5,
        interval_days=1.0, due_at=datetime.utcnow() - timedelta(days=1),
    ))
    db.commit()

    q, source = AdaptiveSelector().select_question(db, student.id, student.tenant_id, CERT_ID)
    assert source == "review"
    assert q.id == due_q.id


def test_future_review_not_served_as_review(db, users):
    student = users["student1"]
    skill = _build_cert_tree(db, student.tenant_id)
    _add_question(db, student.tenant_id, skill.id, difficulty="easy")
    later_q = _add_question(db, student.tenant_id, skill.id, difficulty="hard")
    _set_mastery(db, student.id, student.tenant_id, skill.id, 0.1)

    db.add(models.ReviewSchedule(
        id=str(uuid.uuid4()), user_id=student.id, tenant_id=student.tenant_id,
        question_id=later_q.id, skill_id=skill.id, repetitions=1, ease_factor=2.5,
        interval_days=3.0, due_at=datetime.utcnow() + timedelta(days=3),
    ))
    db.commit()

    q, source = AdaptiveSelector().select_question(db, student.id, student.tenant_id, CERT_ID)
    assert source == "new"  # nothing due -> serves a new question


# --------------------------------------------------------------------------- #
# 2) SM-2 spaced repetition
# --------------------------------------------------------------------------- #

def test_sm2_incorrect_resets_and_due_tomorrow(db, users, make_question):
    student = users["student1"]
    question = make_question(tenant_id=student.tenant_id)
    svc = SpacedRepetitionService(db)

    # Build up some progress first.
    svc.record_review(student.tenant_id, student.id, question, is_correct=True)
    svc.record_review(student.tenant_id, student.id, question, is_correct=True)
    before = db.query(models.ReviewSchedule).filter(
        models.ReviewSchedule.question_id == question.id
    ).first()
    ease_before = before.ease_factor

    sched = svc.record_review(student.tenant_id, student.id, question, is_correct=False)
    assert sched.repetitions == 0
    assert sched.interval_days == 1.0
    # Due ~tomorrow
    delta = sched.due_at - datetime.utcnow()
    assert 0.9 <= delta.total_seconds() / 86400 <= 1.1
    # Ease lowered by 0.2
    assert sched.ease_factor == pytest.approx(ease_before - 0.2, abs=1e-6)


def test_sm2_correct_grows_intervals(db, users, make_question):
    student = users["student1"]
    question = make_question(tenant_id=student.tenant_id)
    svc = SpacedRepetitionService(db)

    s1 = svc.record_review(student.tenant_id, student.id, question, is_correct=True)
    assert s1.repetitions == 1
    assert s1.interval_days == 1.0

    s2 = svc.record_review(student.tenant_id, student.id, question, is_correct=True)
    assert s2.repetitions == 2
    assert s2.interval_days == 3.0
    # Capture ease BEFORE the 3rd review (s2/s3 are the same persisted object).
    ease_after_two = s2.ease_factor  # 2.5 + 0.1 + 0.1 = 2.7

    # 3rd correct: interval = previous interval (3) * ease factor at that point (2.7).
    s3 = svc.record_review(student.tenant_id, student.id, question, is_correct=True)
    assert s3.repetitions == 3
    assert s3.interval_days == pytest.approx(3.0 * ease_after_two, abs=1e-6)
    assert s3.interval_days > 3.0


def test_sm2_ease_floor(db, users, make_question):
    student = users["student1"]
    question = make_question(tenant_id=student.tenant_id)
    svc = SpacedRepetitionService(db)
    # Many wrong answers should not push ease below 1.3.
    for _ in range(20):
        sched = svc.record_review(student.tenant_id, student.id, question, is_correct=False)
    assert sched.ease_factor == pytest.approx(1.3, abs=1e-9)
    assert sched.ease_factor >= 1.3


def test_sm2_ease_cap(db, users, make_question):
    student = users["student1"]
    question = make_question(tenant_id=student.tenant_id)
    svc = SpacedRepetitionService(db)
    # Many correct answers should not push ease above 3.0.
    for _ in range(20):
        sched = svc.record_review(student.tenant_id, student.id, question, is_correct=True)
    assert sched.ease_factor == pytest.approx(3.0, abs=1e-9)
    assert sched.ease_factor <= 3.0


def test_practice_submit_creates_schedule_and_due_tomorrow(client, users, db, make_question):
    """End-to-end: a wrong practice answer schedules a review for tomorrow."""
    student = users["student1"]
    question = make_question(tenant_id=student.tenant_id, correct_answer="B")

    resp = client.post(
        f"/api/academy/practice/submit/{student.id}",
        json={"question_id": question.id, "selected_answer": "A"},
        headers=auth_headers(student),
    )
    assert resp.status_code == 200
    db.expire_all()
    sched = db.query(models.ReviewSchedule).filter(
        models.ReviewSchedule.user_id == student.id,
        models.ReviewSchedule.question_id == question.id,
    ).first()
    assert sched is not None
    assert sched.tenant_id == student.tenant_id
    assert sched.interval_days == 1.0


# --------------------------------------------------------------------------- #
# 3) Lesson uses weakest skill and real mastery
# --------------------------------------------------------------------------- #

def test_lesson_next_uses_weakest_skill_and_real_mastery(client, users, db, monkeypatch):
    student = users["student1"]
    # Two skills; the weak one (0.2) should be chosen over the strong one (0.9).
    strong = _build_cert_tree(db, student.tenant_id, skill_name="Strong")
    weak = _build_cert_tree(db, student.tenant_id, skill_name="Weak")
    _set_mastery(db, student.id, student.tenant_id, strong.id, 0.9)
    _set_mastery(db, student.id, student.tenant_id, weak.id, 0.2)

    # Knowledge content so the lesson is actually generated (>= 50 chars).
    from app.services.knowledge import knowledge_service as ks_module

    async def fake_content(self, tenant_id, skill_id):
        return "Verified knowledge content that is definitely longer than fifty chars."

    monkeypatch.setattr(ks_module.KnowledgeService, "get_relevant_content", fake_content)

    # Capture the args passed to generate_lesson.
    from app.services.ai import ai_service as ai_module
    captured = {}
    orig = ai_module.AIService.generate_lesson

    async def spy_generate_lesson(self, learner_profile, skill, source_content, mastery):
        captured["skill_id"] = skill["id"]
        captured["mastery"] = mastery
        return await orig(self, learner_profile, skill, source_content, mastery)

    monkeypatch.setattr(ai_module.AIService, "generate_lesson", spy_generate_lesson)

    resp = client.get(
        f"/api/academy/lesson/next/{student.id}",
        headers=auth_headers(student),
    )
    assert resp.status_code == 200
    assert resp.json()["skill_id"] == weak.id
    assert captured["skill_id"] == weak.id
    # Real mastery passed through, not the old hardcoded 0.5.
    assert captured["mastery"] == pytest.approx(0.2)


# --------------------------------------------------------------------------- #
# 4) Data-driven recommendation
# --------------------------------------------------------------------------- #

def test_recommendation_cold_start(db, users):
    student = users["student1"]
    _build_cert_tree(db, student.tenant_id)
    rec = LearningPathGenerator().get_next_recommendation(
        db, student.id, student.tenant_id, CERT_ID
    )
    assert rec["urgency"] == "low"
    assert isinstance(rec["message"], str)
    assert rec["days_to_exam"] is None


def test_recommendation_high_urgency_near_deadline_low_readiness(db, users):
    student = users["student1"]
    skill = _build_cert_tree(db, student.tenant_id, domain_weight=80.0)
    _set_mastery(db, student.id, student.tenant_id, skill.id, 0.2)  # low readiness

    db.add(models.LearnerProfile(
        id=str(uuid.uuid4()), user_id=student.id, tenant_id=student.tenant_id,
        target_certification_id=CERT_ID, background="x", preferred_style="y",
        weekly_time_minutes=60, confidence_level=0.3,
        exam_deadline=datetime.utcnow() + timedelta(days=5),  # < 14 days
    ))
    db.commit()

    rec = LearningPathGenerator().get_next_recommendation(
        db, student.id, student.tenant_id, CERT_ID
    )
    assert rec["urgency"] == "high"
    assert rec["focus_skill_id"] == skill.id
    assert rec["days_to_exam"] is not None and rec["days_to_exam"] <= 5


def test_recommendation_practice_exam_when_ready(db, users):
    student = users["student1"]
    skill = _build_cert_tree(db, student.tenant_id)
    _set_mastery(db, student.id, student.tenant_id, skill.id, 0.95)  # high readiness

    rec = LearningPathGenerator().get_next_recommendation(
        db, student.id, student.tenant_id, CERT_ID
    )
    assert rec["urgency"] == "low"
    assert "exam" in rec["message"].lower()


def test_recommendation_medium_urgency_with_distant_deadline(db, users):
    student = users["student1"]
    skill = _build_cert_tree(db, student.tenant_id)
    _set_mastery(db, student.id, student.tenant_id, skill.id, 0.45)  # mid readiness

    db.add(models.LearnerProfile(
        id=str(uuid.uuid4()), user_id=student.id, tenant_id=student.tenant_id,
        target_certification_id=CERT_ID, background="x", preferred_style="y",
        weekly_time_minutes=120, confidence_level=0.5,
        exam_deadline=datetime.utcnow() + timedelta(days=40),  # > 14 days
    ))
    db.commit()

    rec = LearningPathGenerator().get_next_recommendation(
        db, student.id, student.tenant_id, CERT_ID
    )
    assert rec["urgency"] == "medium"
    assert rec["days_to_exam"] is not None and rec["days_to_exam"] >= 14


def test_dashboard_recommendation_is_string(client, users, db):
    """Frontend compatibility: dashboard.recommendation stays a plain string."""
    student = users["student1"]
    skill = _build_cert_tree(db, student.tenant_id)
    _set_mastery(db, student.id, student.tenant_id, skill.id, 0.3)

    resp = client.get(f"/api/academy/dashboard/{student.id}", headers=auth_headers(student))
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body["recommendation"], str)
    assert isinstance(body["recommendation_detail"], dict)
    assert body["recommendation"] == body["recommendation_detail"]["message"]


# --------------------------------------------------------------------------- #
# 5) Dynamic missions
# --------------------------------------------------------------------------- #

def test_missions_deterministic_within_day(db, users):
    student = users["student1"]
    skill = _build_cert_tree(db, student.tenant_id)
    _set_mastery(db, student.id, student.tenant_id, skill.id, 0.3)

    svc = DailyMissionService(db)
    first = svc.get_or_create_missions(student.tenant_id, student.id)
    first_ids = {m.id for m in first}
    # A second call the same day returns exactly the persisted set.
    second = svc.get_or_create_missions(student.tenant_id, student.id)
    assert {m.id for m in second} == first_ids


def test_missions_cold_start_has_getting_started(db, users):
    student = users["student1"]
    _build_cert_tree(db, student.tenant_id)  # no mastery yet
    missions = DailyMissionService(db).get_or_create_missions(student.tenant_id, student.id)
    titles = {m.title for m in missions}
    assert "Getting Started" in titles
    assert 2 <= len(missions) <= 3


def test_missions_react_to_weak_skill(db, users):
    student = users["student1"]
    skill = _build_cert_tree(db, student.tenant_id, skill_name="Networking")
    _set_mastery(db, student.id, student.tenant_id, skill.id, 0.2)

    missions = DailyMissionService(db).get_or_create_missions(student.tenant_id, student.id)
    descs = " ".join(m.description for m in missions)
    assert "Networking" in descs  # target-practice mission references the weak skill


def test_missions_include_due_reviews(db, users, make_question):
    student = users["student1"]
    skill = _build_cert_tree(db, student.tenant_id)
    _set_mastery(db, student.id, student.tenant_id, skill.id, 0.3)
    _add_question(db, student.tenant_id, skill.id)
    # Two overdue reviews.
    for _ in range(2):
        db.add(models.ReviewSchedule(
            id=str(uuid.uuid4()), user_id=student.id, tenant_id=student.tenant_id,
            question_id=_add_question(db, student.tenant_id, skill.id).id, skill_id=skill.id,
            repetitions=1, ease_factor=2.5, interval_days=1.0,
            due_at=datetime.utcnow() - timedelta(days=1),
        ))
    db.commit()

    missions = DailyMissionService(db).get_or_create_missions(student.tenant_id, student.id)
    titles = {m.title for m in missions}
    assert "Spaced Review" in titles


def test_missions_react_to_streak(db, users):
    student = users["student1"]
    skill = _build_cert_tree(db, student.tenant_id)
    _set_mastery(db, student.id, student.tenant_id, skill.id, 0.3)
    db.add(models.LearnerProfile(
        id=str(uuid.uuid4()), user_id=student.id, tenant_id=student.tenant_id,
        target_certification_id=CERT_ID, background="x", preferred_style="y",
        weekly_time_minutes=60, confidence_level=0.5, current_streak=5,
    ))
    db.commit()

    missions = DailyMissionService(db).get_or_create_missions(student.tenant_id, student.id)
    titles = {m.title for m in missions}
    assert "Keep Your Streak" in titles


def test_missions_are_tenant_scoped(db, users):
    """Missions created for tenant 1 are not returned for tenant 2's user."""
    s1 = users["student1"]
    _build_cert_tree(db, s1.tenant_id)
    DailyMissionService(db).get_or_create_missions(s1.tenant_id, s1.id)

    s2 = users["student_t2"]
    m2 = db.query(models.DailyMission).filter(
        models.DailyMission.tenant_id == s2.tenant_id
    ).all()
    assert m2 == []
