import uuid

from app.database import models
from tests.conftest import auth_headers


def _mastery(db, user_id, skill_id):
    return db.query(models.MasteryScore).filter(
        models.MasteryScore.user_id == user_id,
        models.MasteryScore.skill_id == skill_id,
    ).first()


def test_lesson_submit_incorrect_answer_is_not_marked_correct(client, users, db, make_question):
    """Regression: lesson/submit used to hardcode is_correct=True."""
    student = users["student1"]
    question = make_question(tenant_id=student.tenant_id, correct_answer="B", difficulty="medium")

    # Existing mastery so we can observe the decrease
    db.add(models.MasteryScore(
        user_id=student.id, tenant_id=student.tenant_id, skill_id=question.skill_id, score=0.5,
    ))
    db.commit()

    resp = client.post(
        f"/api/academy/lesson/submit/{student.id}",
        json={"question_id": question.id, "selected_answer": "A"},
        headers=auth_headers(student),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["is_correct"] is False
    # Mastery must NOT increase on a wrong answer (medium: 0.5 - 0.10 = 0.4)
    assert body["new_mastery"] < 0.5

    db.expire_all()
    score = _mastery(db, student.id, question.skill_id)
    assert score.score < 0.5


def test_lesson_submit_correct_answer_increases_mastery(client, users, db, make_question):
    student = users["student1"]
    question = make_question(tenant_id=student.tenant_id, correct_answer="B", difficulty="medium")

    resp = client.post(
        f"/api/academy/lesson/submit/{student.id}",
        json={"question_id": question.id, "selected_answer": "B"},
        headers=auth_headers(student),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["is_correct"] is True
    assert body["new_mastery"] > 0.0


def test_lesson_submit_unknown_question_is_404(client, users):
    student = users["student1"]
    resp = client.post(
        f"/api/academy/lesson/submit/{student.id}",
        json={"question_id": str(uuid.uuid4()), "selected_answer": "A"},
        headers=auth_headers(student),
    )
    assert resp.status_code == 404


def test_practice_submit_wrong_answer_logs_mistake(client, users, db, make_question):
    student = users["student1"]
    question = make_question(tenant_id=student.tenant_id, correct_answer="C", difficulty="easy")

    resp = client.post(
        f"/api/academy/practice/submit/{student.id}",
        json={"question_id": question.id, "selected_answer": "D"},
        headers=auth_headers(student),
    )
    assert resp.status_code == 200
    assert resp.json()["is_correct"] is False

    db.expire_all()
    mistake = db.query(models.MistakeLog).filter(
        models.MistakeLog.user_id == student.id,
        models.MistakeLog.question_id == question.id,
    ).first()
    assert mistake is not None
    assert mistake.count == 1


def test_practice_submit_cross_tenant_question_is_404(client, users, make_question):
    """A student must not be able to answer (or probe) questions of another tenant."""
    student = users["student1"]
    foreign_question = make_question(tenant_id=users["student_t2"].tenant_id)

    resp = client.post(
        f"/api/academy/practice/submit/{student.id}",
        json={"question_id": foreign_question.id, "selected_answer": "B"},
        headers=auth_headers(student),
    )
    assert resp.status_code == 404


def test_onboarding_creates_profile_for_current_user(client, users, db):
    student = users["student1"]
    resp = client.post(
        "/api/academy/onboarding",
        json={
            "background": "non-technical",
            "preferred_style": "simple-analogies",
            "weekly_time_minutes": 90,
            "confidence_level": 0.4,
        },
        headers=auth_headers(student),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["user_id"] == student.id
    assert body["weekly_time_minutes"] == 90

    db.expire_all()
    profile = db.query(models.LearnerProfile).filter(
        models.LearnerProfile.user_id == student.id
    ).first()
    assert profile is not None
    assert profile.background == "non-technical"

    # Calling it again updates the same profile instead of duplicating it
    resp = client.post(
        "/api/academy/onboarding",
        json={
            "background": "technical",
            "preferred_style": "deep-dive",
            "weekly_time_minutes": 120,
            "confidence_level": 0.7,
        },
        headers=auth_headers(student),
    )
    assert resp.status_code == 200
    db.expire_all()
    profiles = db.query(models.LearnerProfile).filter(
        models.LearnerProfile.user_id == student.id
    ).all()
    assert len(profiles) == 1
    assert profiles[0].background == "technical"


def test_onboarding_requires_auth(client, tenants):
    resp = client.post(
        "/api/academy/onboarding",
        json={
            "background": "non-technical",
            "preferred_style": "simple-analogies",
            "weekly_time_minutes": 90,
            "confidence_level": 0.4,
        },
    )
    assert resp.status_code == 401
