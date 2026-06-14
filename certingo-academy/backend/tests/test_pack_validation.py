"""Phase 6 — pack validation, real-pack import, and dashboard skill tree.

Covers:
  * Pydantic + referential validation of content packs (``app.schemas.pack``).
  * The importer failing fast on invalid packs WITHOUT writing to the DB.
  * The real, expanded aws-cloud-practitioner pack importing ~60-80 questions.
  * The dashboard ``skill_tree`` contract the frontend renders (shape, mastery,
    status thresholds, tenant isolation).
"""
import os
import uuid

import pytest
import yaml

from app.database import models
from app.schemas.pack import (
    PackValidationError,
    QuestionSpec,
    load_and_validate_pack,
)
from app.services.audit.audit_service import AuditService
from app.services.marketplace.pack_service import PackImportService
from tests.conftest import auth_headers

# Absolute path to the real content pack, independent of the cwd.
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
REAL_PACK_PATH = os.path.join(REPO_ROOT, "content", "packs", "aws-cloud-practitioner")

CERT_ID = "aws-cloud-practitioner"


# --------------------------------------------------------------------------- #
# Helpers: build temp packs on disk
# --------------------------------------------------------------------------- #

def _write_pack(base_dir, *, domains, skills, questions, learning_bits=None,
                manifest=None, certification=None):
    """Write a full pack to ``base_dir`` and return its path."""
    pack_dir = os.path.join(base_dir, "pack")
    os.makedirs(pack_dir, exist_ok=True)

    manifest = manifest or {
        "id": "test-pack", "name": "Test Pack", "provider": "AWS",
        "version": "1.0", "certification_id": "test-cert",
    }
    certification = certification or {
        "id": "test-cert", "name": "Test Cert", "provider": "AWS",
        "version": "1.0", "description": "desc",
    }

    def dump(name, data):
        with open(os.path.join(pack_dir, name), "w") as f:
            yaml.safe_dump(data, f)

    dump("pack.yml", manifest)
    dump("certification.yml", certification)
    dump("domains.yml", domains)
    dump("skills.yml", skills)
    dump("questions.yml", questions)
    if learning_bits is not None:
        dump("learning_bits.yml", learning_bits)
    return pack_dir


def _valid_pack_args():
    """A minimal but fully valid pack definition."""
    domains = [{"id": "d1", "name": "Domain 1", "weight": 100}]
    skills = [{"id": "s1", "domain_id": "d1", "name": "Skill 1", "level": "beginner"}]
    questions = [{
        "skill_id": "s1",
        "prompt": "What is 2+2?",
        "options": ["3", "4", "5", "6"],
        "correct_answer": "4",
        "difficulty": "easy",
        "explanation": "Basic arithmetic.",
        "status": "published",
    }]
    return {"domains": domains, "skills": skills, "questions": questions}


def _import(db, pack_path, tenant_id="tenant-1", user_id="user-1"):
    service = PackImportService(db, AuditService())
    import asyncio
    asyncio.run(service.import_pack(tenant_id, pack_path, user_id))


# --------------------------------------------------------------------------- #
# 1) Schema-level validation (no DB)
# --------------------------------------------------------------------------- #

def test_question_spec_rejects_correct_answer_outside_options():
    with pytest.raises(Exception) as exc:
        QuestionSpec(
            skill_id="s1", prompt="q", options=["A", "B"],
            correct_answer="Z", difficulty="easy",
        )
    assert "correct_answer" in str(exc.value)


def test_question_spec_rejects_fewer_than_two_options():
    with pytest.raises(Exception) as exc:
        QuestionSpec(
            skill_id="s1", prompt="q", options=["A"],
            correct_answer="A", difficulty="easy",
        )
    assert "at least 2" in str(exc.value)


def test_question_spec_rejects_invalid_difficulty():
    with pytest.raises(Exception) as exc:
        QuestionSpec(
            skill_id="s1", prompt="q", options=["A", "B"],
            correct_answer="A", difficulty="trivial",
        )
    assert "difficulty" in str(exc.value)


def test_valid_pack_passes_load_and_validate(tmp_path):
    pack_path = _write_pack(str(tmp_path), **_valid_pack_args())
    spec = load_and_validate_pack(pack_path)
    assert len(spec.domains) == 1
    assert len(spec.skills) == 1
    assert len(spec.questions) == 1


def test_load_rejects_correct_answer_outside_options(tmp_path):
    args = _valid_pack_args()
    args["questions"][0]["correct_answer"] = "not-an-option"
    pack_path = _write_pack(str(tmp_path), **args)
    with pytest.raises(PackValidationError) as exc:
        load_and_validate_pack(pack_path)
    assert any("correct_answer" in e for e in exc.value.errors)


def test_load_rejects_orphan_skill_domain(tmp_path):
    args = _valid_pack_args()
    args["skills"][0]["domain_id"] = "does-not-exist"
    pack_path = _write_pack(str(tmp_path), **args)
    with pytest.raises(PackValidationError) as exc:
        load_and_validate_pack(pack_path)
    assert any("domain_id" in e and "does not exist" in e for e in exc.value.errors)


def test_load_rejects_invalid_difficulty(tmp_path):
    args = _valid_pack_args()
    args["questions"][0]["difficulty"] = "super-hard"
    pack_path = _write_pack(str(tmp_path), **args)
    with pytest.raises(PackValidationError) as exc:
        load_and_validate_pack(pack_path)
    assert any("difficulty" in e for e in exc.value.errors)


def test_load_rejects_orphan_question_skill(tmp_path):
    args = _valid_pack_args()
    args["questions"][0]["skill_id"] = "ghost-skill"
    pack_path = _write_pack(str(tmp_path), **args)
    with pytest.raises(PackValidationError) as exc:
        load_and_validate_pack(pack_path)
    assert any("skill_id" in e and "does not exist" in e for e in exc.value.errors)


def test_load_reports_missing_required_file(tmp_path):
    args = _valid_pack_args()
    pack_path = _write_pack(str(tmp_path), **args)
    os.remove(os.path.join(pack_path, "skills.yml"))
    with pytest.raises(PackValidationError) as exc:
        load_and_validate_pack(pack_path)
    assert any("skills.yml" in e and "missing" in e for e in exc.value.errors)


# --------------------------------------------------------------------------- #
# 2) Importer fails fast and does not write on invalid packs
# --------------------------------------------------------------------------- #

def test_import_valid_pack_writes_to_db(db, tenants, tmp_path):
    pack_path = _write_pack(str(tmp_path), **_valid_pack_args())
    _import(db, pack_path, tenant_id="tenant-1")

    assert db.query(models.Question).filter(
        models.Question.tenant_id == "tenant-1"
    ).count() == 1
    assert db.query(models.Skill).filter(models.Skill.id == "s1").count() == 1


def test_import_invalid_pack_does_not_corrupt_db(db, tenants, tmp_path):
    args = _valid_pack_args()
    args["questions"][0]["correct_answer"] = "broken"
    pack_path = _write_pack(str(tmp_path), **args)

    with pytest.raises(PackValidationError):
        _import(db, pack_path, tenant_id="tenant-1")

    # Nothing must have been written: no questions, no skills, no installation.
    assert db.query(models.Question).count() == 0
    assert db.query(models.Skill).count() == 0
    assert db.query(models.Certification).count() == 0
    assert db.query(models.TenantCertificationInstallation).count() == 0


def test_import_orphan_domain_does_not_write(db, tenants, tmp_path):
    args = _valid_pack_args()
    args["skills"][0]["domain_id"] = "nope"
    pack_path = _write_pack(str(tmp_path), **args)

    with pytest.raises(PackValidationError):
        _import(db, pack_path, tenant_id="tenant-1")
    assert db.query(models.Skill).count() == 0
    assert db.query(models.Domain).count() == 0


def test_import_invalid_difficulty_does_not_write(db, tenants, tmp_path):
    args = _valid_pack_args()
    args["questions"][0]["difficulty"] = "impossible"
    pack_path = _write_pack(str(tmp_path), **args)

    with pytest.raises(PackValidationError):
        _import(db, pack_path, tenant_id="tenant-1")
    assert db.query(models.Question).count() == 0


# --------------------------------------------------------------------------- #
# 3) The real, expanded aws-cloud-practitioner pack
# --------------------------------------------------------------------------- #

def test_real_pack_validates():
    spec = load_and_validate_pack(REAL_PACK_PATH)
    assert len(spec.skills) == 12
    # The expanded bank should land in the ~60-80 range.
    assert 60 <= len(spec.questions) <= 80
    # Every skill must have at least one question.
    skill_ids = {s.id for s in spec.skills}
    covered = {q.skill_id for q in spec.questions}
    assert skill_ids == covered, f"uncovered skills: {skill_ids - covered}"


def test_real_pack_imports_and_creates_questions(db, tenants):
    _import(db, REAL_PACK_PATH, tenant_id="tenant-1")

    q_count = db.query(models.Question).filter(
        models.Question.tenant_id == "tenant-1"
    ).count()
    assert 60 <= q_count <= 80

    assert db.query(models.Skill).filter(
        models.Skill.tenant_id == "tenant-1"
    ).count() == 12
    assert db.query(models.Domain).filter(
        models.Domain.tenant_id == "tenant-1"
    ).count() == 4

    # Installation should be marked READY.
    inst = db.query(models.TenantCertificationInstallation).filter(
        models.TenantCertificationInstallation.tenant_id == "tenant-1"
    ).first()
    assert inst is not None
    assert inst.status == models.CertificationStatus.READY

    # Every imported question has its correct_answer within its options.
    for q in db.query(models.Question).filter(models.Question.tenant_id == "tenant-1"):
        assert q.correct_answer in q.options


# --------------------------------------------------------------------------- #
# 4) Dashboard skill_tree contract (the shape the frontend renders)
# --------------------------------------------------------------------------- #

def _build_cert_tree(db, tenant_id, *, cert_id, skills):
    """certification -> domain -> N skills. Returns list of created Skill rows."""
    cert = models.Certification(
        id=cert_id, tenant_id=tenant_id, name="AWS CP", provider="aws",
        version="1.0", description="", status="published",
    )
    db.add(cert)
    domain = models.Domain(
        id=f"dom-{tenant_id}", certification_id=cert_id, tenant_id=tenant_id,
        name="Domain", weight=100.0, status="published",
    )
    db.add(domain)
    created = []
    for name in skills:
        skill = models.Skill(
            id=str(uuid.uuid4()), domain_id=domain.id, tenant_id=tenant_id,
            name=name, description="", level="beginner", status="published",
        )
        db.add(skill)
        created.append(skill)
    db.commit()
    return domain, created


def _set_mastery(db, user_id, tenant_id, skill_id, score):
    db.add(models.MasteryScore(
        user_id=user_id, tenant_id=tenant_id, skill_id=skill_id, score=score
    ))
    db.commit()


def test_dashboard_includes_skill_tree(client, users, db):
    student = users["student1"]
    domain, skills = _build_cert_tree(
        db, student.tenant_id, cert_id=CERT_ID,
        skills=["Locked Skill", "In Progress Skill", "Mastered Skill"],
    )
    locked, in_progress, mastered = skills
    # locked: no mastery row -> 0.0 -> locked
    _set_mastery(db, student.id, student.tenant_id, in_progress.id, 0.5)
    _set_mastery(db, student.id, student.tenant_id, mastered.id, 0.9)

    resp = client.get(f"/api/academy/dashboard/{student.id}", headers=auth_headers(student))
    assert resp.status_code == 200
    body = resp.json()

    assert "skill_tree" in body
    tree = body["skill_tree"]
    assert isinstance(tree, list)
    assert len(tree) == 3

    by_id = {node["skill_id"]: node for node in tree}

    # Shape check: every node has exactly the expected keys.
    for node in tree:
        assert set(node.keys()) == {"skill_id", "name", "domain_id", "mastery", "status"}
        assert node["domain_id"] == domain.id

    # mastery reflects MasteryScore (or 0.0 when missing).
    assert by_id[locked.id]["mastery"] == 0.0
    assert by_id[locked.id]["status"] == "locked"

    assert by_id[in_progress.id]["mastery"] == pytest.approx(0.5)
    assert by_id[in_progress.id]["status"] == "in_progress"

    assert by_id[mastered.id]["mastery"] == pytest.approx(0.9)
    assert by_id[mastered.id]["status"] == "mastered"


def test_skill_tree_status_threshold_at_080(client, users, db):
    """Exactly 0.8 mastery counts as 'mastered' (boundary)."""
    student = users["student1"]
    _, skills = _build_cert_tree(
        db, student.tenant_id, cert_id=CERT_ID, skills=["Boundary Skill"],
    )
    _set_mastery(db, student.id, student.tenant_id, skills[0].id, 0.8)

    resp = client.get(f"/api/academy/dashboard/{student.id}", headers=auth_headers(student))
    tree = resp.json()["skill_tree"]
    assert tree[0]["status"] == "mastered"


def test_skill_tree_is_tenant_isolated(client, users, db):
    """A user only sees skills for their tenant's certification, with their own mastery."""
    student1 = users["student1"]      # tenant-1
    student_t2 = users["student_t2"]  # tenant-2

    # tenant-1 cert tree (shared CERT_ID is globally unique on certifications.id).
    _, skills1 = _build_cert_tree(
        db, student1.tenant_id, cert_id=CERT_ID, skills=["T1 Skill A", "T1 Skill B"],
    )
    _set_mastery(db, student1.id, student1.tenant_id, skills1[0].id, 0.9)

    # tenant-2 cert tree under a different cert id (its learners target this one
    # by default only if profile points there; here we just assert isolation of
    # tenant-1's tree from tenant-2 rows).
    _build_cert_tree(
        db, student_t2.tenant_id, cert_id=f"{CERT_ID}-t2", skills=["T2 Skill"],
    )

    resp = client.get(f"/api/academy/dashboard/{student1.id}", headers=auth_headers(student1))
    tree = resp.json()["skill_tree"]

    names = {node["name"] for node in tree}
    assert names == {"T1 Skill A", "T1 Skill B"}
    assert "T2 Skill" not in names
    # No tenant-2 mastery leaks in.
    for node in tree:
        assert node["domain_id"] == f"dom-{student1.tenant_id}"


# --------------------------------------------------------------------------- #
# 5) Admin import endpoint — invalid pack -> 422 with errors (was 500)
# --------------------------------------------------------------------------- #
#
# The endpoint resolves packs from ``../content/packs/<pack_id>`` relative to the
# backend cwd (where pytest runs). To exercise the real HTTP path we drop a
# temporary pack directory there and clean it up afterwards.

PACKS_DIR = os.path.join(REPO_ROOT, "content", "packs")


def _write_endpoint_pack(pack_id, *, questions):
    """Write a pack named ``pack_id`` under content/packs and return its path."""
    pack_dir = os.path.join(PACKS_DIR, pack_id)
    os.makedirs(pack_dir, exist_ok=True)

    def dump(name, data):
        with open(os.path.join(pack_dir, name), "w") as f:
            yaml.safe_dump(data, f)

    dump("pack.yml", {
        "id": pack_id, "name": "Endpoint Pack", "provider": "AWS",
        "version": "1.0", "certification_id": f"{pack_id}-cert",
    })
    dump("certification.yml", {
        "id": f"{pack_id}-cert", "name": "Endpoint Cert", "provider": "AWS",
        "version": "1.0", "description": "desc",
    })
    dump("domains.yml", [{"id": f"{pack_id}-d1", "name": "Domain 1", "weight": 100}])
    dump("skills.yml", [{
        "id": f"{pack_id}-s1", "domain_id": f"{pack_id}-d1",
        "name": "Skill 1", "level": "beginner",
    }])
    dump("questions.yml", questions)
    return pack_dir


def _valid_endpoint_questions(pack_id):
    return [{
        "skill_id": f"{pack_id}-s1",
        "prompt": "What is 2+2?",
        "options": ["3", "4", "5", "6"],
        "correct_answer": "4",
        "difficulty": "easy",
        "explanation": "Basic arithmetic.",
        "status": "published",
    }]


@pytest.fixture()
def endpoint_pack():
    """Create a temporary pack under content/packs and remove it afterwards."""
    import shutil

    created = []

    def _make(pack_id, *, questions):
        path = _write_endpoint_pack(pack_id, questions=questions)
        created.append(path)
        return pack_id

    yield _make

    for path in created:
        shutil.rmtree(path, ignore_errors=True)


def test_import_endpoint_invalid_pack_returns_422_with_errors(client, users, endpoint_pack):
    """A pack whose correct_answer is outside its options -> 422 (not 500)."""
    admin = users["admin1"]
    pack_id = endpoint_pack(
        "test-invalid-pack",
        questions=[{
            "skill_id": "test-invalid-pack-s1",
            "prompt": "Bad question",
            "options": ["A", "B"],
            "correct_answer": "Z",  # not one of the options
            "difficulty": "easy",
        }],
    )

    resp = client.post(
        "/api/admin/marketplace/packs/import",
        json={"pack_id": pack_id},
        headers=auth_headers(admin),
    )
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert "errors" in detail
    assert isinstance(detail["errors"], list)
    assert detail["errors"]
    assert any("correct_answer" in e for e in detail["errors"])


def test_import_endpoint_invalid_pack_does_not_write(client, users, db, endpoint_pack):
    admin = users["admin1"]
    pack_id = endpoint_pack(
        "test-invalid-pack-nowrite",
        questions=[{
            "skill_id": "test-invalid-pack-nowrite-s1",
            "prompt": "Bad question",
            "options": ["A", "B"],
            "correct_answer": "nope",
            "difficulty": "easy",
        }],
    )

    resp = client.post(
        "/api/admin/marketplace/packs/import",
        json={"pack_id": pack_id},
        headers=auth_headers(admin),
    )
    assert resp.status_code == 422
    # Fail-fast: nothing from this pack was persisted.
    db.expire_all()
    assert db.query(models.Skill).filter(
        models.Skill.id == f"{pack_id}-s1"
    ).count() == 0
    assert db.query(models.Certification).filter(
        models.Certification.id == f"{pack_id}-cert"
    ).count() == 0


def test_import_endpoint_valid_pack_returns_200(client, users, db, endpoint_pack):
    admin = users["admin1"]
    pack_id = endpoint_pack(
        "test-valid-pack",
        questions=_valid_endpoint_questions("test-valid-pack"),
    )

    resp = client.post(
        "/api/admin/marketplace/packs/import",
        json={"pack_id": pack_id},
        headers=auth_headers(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"

    db.expire_all()
    assert db.query(models.Question).filter(
        models.Question.tenant_id == admin.tenant_id,
        models.Question.skill_id == f"{pack_id}-s1",
    ).count() == 1


def test_import_endpoint_requires_admin(client, users, endpoint_pack):
    student = users["student1"]
    pack_id = endpoint_pack(
        "test-valid-pack-forbidden",
        questions=_valid_endpoint_questions("test-valid-pack-forbidden"),
    )
    resp = client.post(
        "/api/admin/marketplace/packs/import",
        json={"pack_id": pack_id},
        headers=auth_headers(student),
    )
    assert resp.status_code == 403
