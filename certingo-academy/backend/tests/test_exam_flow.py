"""Hardening sprint — server-side exam integrity.

The exam used to be graded on the client: ``/exam/start`` returned every
question WITH its ``correct_answer`` and the browser computed the score. These
tests pin the new contract:

  * ``/exam/start`` never leaks ``correct_answer``/``explanation`` and includes
    ``domain_id`` for the per-domain breakdown.
  * ``/exam/submit`` grades on the SERVER, completes the open ``exam`` Attempt
    with the score, records every answer, updates mastery and feeds spaced
    repetition, reveals the answers only in the post-exam ``results``, is
    tenant-isolated, and is idempotent on a second submit.

The exam is persisted as an open Attempt (type="exam", score=NULL) whose
placeholder AttemptAnswer rows are the authoritative question set; the Attempt
id is the ``exam_id``.
"""
import uuid

from app.database import models
from tests.conftest import auth_headers

# --------------------------------------------------------------------------- #
# Fixtures / helpers: build a certification with domains, skills and questions.
# --------------------------------------------------------------------------- #

CERT_ID = "exam-cert"


def _build_exam_content(db, tenant_id, *, cert_id=CERT_ID):
    """Create a cert with 2 weighted domains, one skill each, and questions.

    Domain A (weight 50): 2 questions. Domain B (weight 50): 2 questions.
    Every question has a known correct_answer of "B" and a distinct explanation.
    Returns (domain_a, domain_b, [questions...]).
    """
    cert = models.Certification(
        id=cert_id, tenant_id=tenant_id, name="Exam Cert", provider="x",
        version="1.0", description="", status="published",
    )
    db.add(cert)

    domain_a = models.Domain(
        id=f"domA-{tenant_id}", certification_id=cert_id, tenant_id=tenant_id,
        name="Domain A", weight=50.0, status="published",
    )
    domain_b = models.Domain(
        id=f"domB-{tenant_id}", certification_id=cert_id, tenant_id=tenant_id,
        name="Domain B", weight=50.0, status="published",
    )
    db.add_all([domain_a, domain_b])

    skill_a = models.Skill(
        id=f"skA-{tenant_id}", domain_id=domain_a.id, tenant_id=tenant_id,
        name="Skill A", description="", level="beginner", status="published",
    )
    skill_b = models.Skill(
        id=f"skB-{tenant_id}", domain_id=domain_b.id, tenant_id=tenant_id,
        name="Skill B", description="", level="beginner", status="published",
    )
    db.add_all([skill_a, skill_b])

    questions = []
    for skill in (skill_a, skill_b):
        for i in range(2):
            q = models.Question(
                id=str(uuid.uuid4()), skill_id=skill.id, tenant_id=tenant_id,
                prompt=f"Q for {skill.name} #{i}",
                options=["A", "B", "C", "D"],
                correct_answer="B",
                explanation=f"Explanation for {skill.name} #{i}",
                difficulty="medium", status="published",
            )
            db.add(q)
            questions.append(q)
    db.commit()
    return domain_a, domain_b, questions


def _point_profile_at_cert(db, user, cert_id=CERT_ID):
    """Make the learner target ``cert_id`` so the exam generator uses it."""
    profile = models.LearnerProfile(
        id=str(uuid.uuid4()), user_id=user.id, tenant_id=user.tenant_id,
        target_certification_id=cert_id, background="t", preferred_style="s",
        weekly_time_minutes=60, confidence_level=0.5,
    )
    db.add(profile)
    db.commit()


def _start(client, user):
    return client.post(f"/api/academy/exam/start/{user.id}", headers=auth_headers(user))


def _submit(client, user, exam_id, answers):
    return client.post(
        f"/api/academy/exam/submit/{user.id}",
        json={"exam_id": exam_id, "answers": answers},
        headers=auth_headers(user),
    )


# --------------------------------------------------------------------------- #
# 1) exam/start — never leaks the answer key, includes domain_id
# --------------------------------------------------------------------------- #

def test_exam_start_does_not_leak_correct_answer_or_explanation(client, users, db):
    student = users["student1"]
    _build_exam_content(db, student.tenant_id)
    _point_profile_at_cert(db, student)

    resp = _start(client, student)
    assert resp.status_code == 200
    body = resp.json()

    assert isinstance(body["exam_id"], str)
    assert body["total"] == len(body["questions"])
    assert body["total"] > 0
    assert body["duration_minutes"] == 20

    for q in body["questions"]:
        # The hardening invariant: the answer key must NOT be present.
        assert "correct_answer" not in q
        assert "explanation" not in q
        # Exact shape required by the frontend.
        assert set(q.keys()) == {"id", "prompt", "options", "difficulty", "domain_id"}
        assert q["domain_id"] is not None
        assert isinstance(q["options"], list)


def test_exam_start_persists_open_attempt_with_question_set(client, users, db):
    student = users["student1"]
    _build_exam_content(db, student.tenant_id)
    _point_profile_at_cert(db, student)

    body = _start(client, student).json()
    exam_id = body["exam_id"]

    db.expire_all()
    attempt = db.query(models.Attempt).filter(models.Attempt.id == exam_id).first()
    assert attempt is not None
    assert attempt.type == "exam"
    assert attempt.user_id == student.id
    assert attempt.tenant_id == student.tenant_id
    # Open exam: not yet graded.
    assert attempt.score is None

    # Placeholder answers pin exactly which questions belong to this exam.
    answer_rows = db.query(models.AttemptAnswer).filter(
        models.AttemptAnswer.attempt_id == exam_id
    ).all()
    pinned = {r.question_id for r in answer_rows}
    served = {q["id"] for q in body["questions"]}
    assert pinned == served
    for r in answer_rows:
        assert r.selected_answer is None
        assert r.is_correct is None


def test_exam_start_requires_auth(client, users, db):
    student = users["student1"]
    _build_exam_content(db, student.tenant_id)
    resp = client.post(f"/api/academy/exam/start/{student.id}")
    assert resp.status_code == 401


# --------------------------------------------------------------------------- #
# 2) exam/submit — server-side grading
# --------------------------------------------------------------------------- #

def test_exam_submit_all_correct_scores_one(client, users, db):
    student = users["student1"]
    _build_exam_content(db, student.tenant_id)
    _point_profile_at_cert(db, student)

    body = _start(client, student).json()
    answers = [{"question_id": q["id"], "selected_answer": "B"} for q in body["questions"]]

    resp = _submit(client, student, body["exam_id"], answers)
    assert resp.status_code == 200
    result = resp.json()

    assert result["score"] == 1.0
    assert result["passed"] is True
    assert result["correct"] == result["total"] == body["total"]
    # Shape of the result envelope.
    assert set(result.keys()) == {
        "score", "total", "correct", "passed", "domain_breakdown", "results"
    }


def test_exam_submit_all_wrong_scores_zero_and_fails(client, users, db):
    student = users["student1"]
    _build_exam_content(db, student.tenant_id)
    _point_profile_at_cert(db, student)

    body = _start(client, student).json()
    answers = [{"question_id": q["id"], "selected_answer": "A"} for q in body["questions"]]

    result = _submit(client, student, body["exam_id"], answers).json()
    assert result["score"] == 0.0
    assert result["passed"] is False
    assert result["correct"] == 0


def test_exam_submit_mixed_score_is_fraction_correct(client, users, db):
    student = users["student1"]
    _build_exam_content(db, student.tenant_id)
    _point_profile_at_cert(db, student)

    body = _start(client, student).json()
    questions = body["questions"]
    total = len(questions)
    # Answer the first half correctly ("B"), the rest wrong ("A").
    half = total // 2
    answers = []
    for idx, q in enumerate(questions):
        answers.append({
            "question_id": q["id"],
            "selected_answer": "B" if idx < half else "A",
        })

    result = _submit(client, student, body["exam_id"], answers).json()
    assert result["correct"] == half
    assert result["score"] == half / total


def test_exam_submit_unanswered_questions_count_incorrect(client, users, db):
    student = users["student1"]
    _build_exam_content(db, student.tenant_id)
    _point_profile_at_cert(db, student)

    body = _start(client, student).json()
    questions = body["questions"]
    total = len(questions)
    # Only answer the FIRST question (correctly); omit the rest entirely.
    answers = [{"question_id": questions[0]["id"], "selected_answer": "B"}]

    result = _submit(client, student, body["exam_id"], answers).json()
    assert result["total"] == total
    assert result["correct"] == 1
    assert result["score"] == 1 / total
    # The omitted questions appear in results as incorrect with selected_answer None.
    by_q = {r["question_id"]: r for r in result["results"]}
    for q in questions[1:]:
        assert by_q[q["id"]]["correct"] is False
        assert by_q[q["id"]]["selected_answer"] is None


def test_exam_submit_results_reveal_correct_answer_and_explanation(client, users, db):
    student = users["student1"]
    _build_exam_content(db, student.tenant_id)
    _point_profile_at_cert(db, student)

    body = _start(client, student).json()
    answers = [{"question_id": q["id"], "selected_answer": "A"} for q in body["questions"]]
    result = _submit(client, student, body["exam_id"], answers).json()

    assert len(result["results"]) == body["total"]
    for r in result["results"]:
        assert set(r.keys()) == {
            "question_id", "selected_answer", "correct", "correct_answer", "explanation"
        }
        # Post-exam review: the answer key IS revealed here.
        assert r["correct_answer"] == "B"
        assert r["explanation"]  # non-empty


def test_exam_submit_domain_breakdown(client, users, db):
    student = users["student1"]
    domain_a, domain_b, _questions = _build_exam_content(db, student.tenant_id)
    _point_profile_at_cert(db, student)

    body = _start(client, student).json()
    # Answer questions of Domain A correctly, Domain B wrong, using the served
    # domain_id to decide.
    answers = []
    for q in body["questions"]:
        correct = "B" if q["domain_id"] == domain_a.id else "A"
        answers.append({"question_id": q["id"], "selected_answer": correct})

    result = _submit(client, student, body["exam_id"], answers).json()
    breakdown = {d["domain_id"]: d for d in result["domain_breakdown"]}

    # Each served domain appears with a name and a 0..1 score.
    served_domains = {q["domain_id"] for q in body["questions"]}
    assert set(breakdown.keys()) == served_domains
    for d in result["domain_breakdown"]:
        assert set(d.keys()) == {"domain_id", "name", "score"}
        assert 0.0 <= d["score"] <= 1.0

    if domain_a.id in breakdown:
        assert breakdown[domain_a.id]["score"] == 1.0
        assert breakdown[domain_a.id]["name"] == "Domain A"
    if domain_b.id in breakdown:
        assert breakdown[domain_b.id]["score"] == 0.0


def test_exam_submit_completes_attempt_and_records_answers(client, users, db):
    student = users["student1"]
    _build_exam_content(db, student.tenant_id)
    _point_profile_at_cert(db, student)

    body = _start(client, student).json()
    answers = [{"question_id": q["id"], "selected_answer": "B"} for q in body["questions"]]
    _submit(client, student, body["exam_id"], answers)

    db.expire_all()
    attempt = db.query(models.Attempt).filter(models.Attempt.id == body["exam_id"]).first()
    assert attempt.type == "exam"
    assert attempt.score == 1.0  # completed with the computed score
    assert attempt.xp_earned > 0

    answer_rows = db.query(models.AttemptAnswer).filter(
        models.AttemptAnswer.attempt_id == body["exam_id"]
    ).all()
    assert len(answer_rows) == body["total"]
    for r in answer_rows:
        assert r.selected_answer == "B"
        assert r.is_correct is True


def test_exam_submit_updates_mastery(client, users, db):
    student = users["student1"]
    _, _, questions = _build_exam_content(db, student.tenant_id)
    _point_profile_at_cert(db, student)

    # No mastery rows exist yet.
    assert db.query(models.MasteryScore).filter(
        models.MasteryScore.user_id == student.id
    ).count() == 0

    body = _start(client, student).json()
    answers = [{"question_id": q["id"], "selected_answer": "B"} for q in body["questions"]]
    _submit(client, student, body["exam_id"], answers)

    db.expire_all()
    scores = db.query(models.MasteryScore).filter(
        models.MasteryScore.user_id == student.id,
        models.MasteryScore.tenant_id == student.tenant_id,
    ).all()
    # Correct answers must have raised mastery above the 0.0 starting point.
    assert scores  # mastery rows were created
    assert any(s.score > 0.0 for s in scores)


def test_exam_submit_feeds_spaced_repetition(client, users, db):
    student = users["student1"]
    _build_exam_content(db, student.tenant_id)
    _point_profile_at_cert(db, student)

    body = _start(client, student).json()
    answers = [{"question_id": q["id"], "selected_answer": "B"} for q in body["questions"]]
    _submit(client, student, body["exam_id"], answers)

    db.expire_all()
    schedules = db.query(models.ReviewSchedule).filter(
        models.ReviewSchedule.user_id == student.id,
        models.ReviewSchedule.tenant_id == student.tenant_id,
    ).all()
    # One review schedule per answered exam question.
    assert len(schedules) == body["total"]


# --------------------------------------------------------------------------- #
# 3) Anti-double-submit (idempotency)
# --------------------------------------------------------------------------- #

def test_exam_double_submit_is_idempotent(client, users, db):
    student = users["student1"]
    _build_exam_content(db, student.tenant_id)
    _point_profile_at_cert(db, student)

    body = _start(client, student).json()
    answers = [{"question_id": q["id"], "selected_answer": "B"} for q in body["questions"]]

    first = _submit(client, student, body["exam_id"], answers).json()
    # Second submit with DIFFERENT (all-wrong) answers must NOT re-grade.
    wrong = [{"question_id": q["id"], "selected_answer": "A"} for q in body["questions"]]
    second_resp = _submit(client, student, body["exam_id"], wrong)
    assert second_resp.status_code == 200
    second = second_resp.json()

    assert second["score"] == first["score"] == 1.0
    assert second["correct"] == first["correct"]

    # Stored answers were not overwritten by the second attempt.
    db.expire_all()
    answer_rows = db.query(models.AttemptAnswer).filter(
        models.AttemptAnswer.attempt_id == body["exam_id"]
    ).all()
    for r in answer_rows:
        assert r.selected_answer == "B"
        assert r.is_correct is True


# --------------------------------------------------------------------------- #
# 4) Isolation & access control
# --------------------------------------------------------------------------- #

def test_exam_submit_ignores_foreign_question_ids(client, users, db):
    """Answers for questions outside this exam are ignored, not graded."""
    student = users["student1"]
    _build_exam_content(db, student.tenant_id)
    _point_profile_at_cert(db, student)

    body = _start(client, student).json()
    # Correct answers for the real exam, PLUS a bogus question id.
    answers = [{"question_id": q["id"], "selected_answer": "B"} for q in body["questions"]]
    answers.append({"question_id": str(uuid.uuid4()), "selected_answer": "B"})

    result = _submit(client, student, body["exam_id"], answers).json()
    assert result["total"] == body["total"]  # foreign id did not inflate the total
    assert result["correct"] == body["total"]
    foreign_ids = {q["id"] for q in body["questions"]}
    for r in result["results"]:
        assert r["question_id"] in foreign_ids


def test_exam_submit_does_not_grade_with_other_tenant_questions(client, users, db):
    """Cross-tenant question ids in the submission are ignored entirely."""
    student = users["student1"]
    _build_exam_content(db, student.tenant_id)
    _point_profile_at_cert(db, student)

    # A question that belongs to tenant-2.
    foreign = models.Question(
        id=str(uuid.uuid4()), skill_id=f"skA-{users['student_t2'].tenant_id}",
        tenant_id=users["student_t2"].tenant_id, prompt="foreign",
        options=["A", "B"], correct_answer="B", explanation="x",
        difficulty="easy", status="published",
    )
    db.add(foreign)
    db.commit()

    body = _start(client, student).json()
    answers = [{"question_id": q["id"], "selected_answer": "A"} for q in body["questions"]]
    answers.append({"question_id": foreign.id, "selected_answer": "B"})

    result = _submit(client, student, body["exam_id"], answers).json()
    # All real answers wrong; the foreign (correct) answer must not count.
    assert result["total"] == body["total"]
    assert result["correct"] == 0
    assert result["score"] == 0.0


def test_exam_submit_other_users_exam_is_not_found(client, users, db):
    """A learner cannot submit another user's exam (even same tenant)."""
    owner = users["student1"]
    other = users["student2"]
    _build_exam_content(db, owner.tenant_id)
    _point_profile_at_cert(db, owner)

    body = _start(client, owner).json()
    # student2 tries to submit student1's exam_id against their own user path.
    resp = _submit(client, other, body["exam_id"], [])
    assert resp.status_code == 404

    # And student2 cannot target student1's user path either (403 from access ctrl).
    resp = client.post(
        f"/api/academy/exam/submit/{owner.id}",
        json={"exam_id": body["exam_id"], "answers": []},
        headers=auth_headers(other),
    )
    assert resp.status_code == 403


def test_exam_submit_unknown_exam_id_is_404(client, users, db):
    student = users["student1"]
    _build_exam_content(db, student.tenant_id)
    _point_profile_at_cert(db, student)
    resp = _submit(client, student, str(uuid.uuid4()), [])
    assert resp.status_code == 404


def test_exam_submit_cross_tenant_exam_id_is_404(client, users, db):
    """An exam started by a tenant-2 user is invisible to a tenant-1 user."""
    t2_student = users["student_t2"]
    _build_exam_content(db, t2_student.tenant_id, cert_id=f"{CERT_ID}-t2")
    _point_profile_at_cert(db, t2_student, cert_id=f"{CERT_ID}-t2")

    t2_body = _start(client, t2_student).json()

    student1 = users["student1"]
    resp = client.post(
        f"/api/academy/exam/submit/{student1.id}",
        json={"exam_id": t2_body["exam_id"], "answers": []},
        headers=auth_headers(student1),
    )
    # student1 owns no such attempt in tenant-1 -> 404.
    assert resp.status_code == 404
