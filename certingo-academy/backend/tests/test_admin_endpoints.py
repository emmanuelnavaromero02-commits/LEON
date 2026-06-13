"""Phase 4 admin operational endpoints.

Covers the new admin endpoints: secret delete, content reject, knowledge-base
CRUD, MCP server delete, and the enriched control-room status. Every endpoint
is checked for: admin OK, student 403, and cross-tenant 404 isolation.
"""
import uuid

from app.database import models
from tests.conftest import auth_headers


# --- helpers -----------------------------------------------------------------

def _create_secret(client, admin, key="OPENAI_API_KEY", value="sk-aaaaaaaa1111"):
    resp = client.post(
        "/api/admin/secrets",
        json={"key": key, "value": value},
        headers=auth_headers(admin),
    )
    assert resp.status_code == 200
    # Read it back to obtain the id
    listed = client.get("/api/admin/secrets", headers=auth_headers(admin)).json()
    return next(s for s in listed if s["key"] == key)["id"]


def _make_question(db, tenant_id, status="draft"):
    skill = models.Skill(
        id=str(uuid.uuid4()), domain_id=None, tenant_id=tenant_id,
        name="S", description="", level="beginner", status="published",
    )
    db.add(skill)
    q = models.Question(
        id=str(uuid.uuid4()), skill_id=skill.id, tenant_id=tenant_id,
        prompt="?", options=["A", "B"], correct_answer="A",
        explanation="", difficulty="easy", status=status,
    )
    db.add(q)
    db.commit()
    return q


def _make_mcp_server(db, tenant_id, name="srv"):
    s = models.MCPServer(
        id=str(uuid.uuid4()), tenant_id=tenant_id, name=name,
        url="http://example.com", category="tools", description="",
    )
    db.add(s)
    db.commit()
    return s


# --- SECRETS: DELETE ---------------------------------------------------------

def test_delete_secret_as_admin(client, users):
    admin1 = users["admin1"]
    secret_id = _create_secret(client, admin1)

    resp = client.delete(f"/api/admin/secrets/{secret_id}", headers=auth_headers(admin1))
    assert resp.status_code == 200
    assert resp.json() == {"status": "deleted", "id": secret_id}

    # It is gone from the listing
    listed = client.get("/api/admin/secrets", headers=auth_headers(admin1)).json()
    assert all(s["id"] != secret_id for s in listed)


def test_delete_secret_as_student_forbidden(client, users):
    admin1 = users["admin1"]
    secret_id = _create_secret(client, admin1)
    resp = client.delete(
        f"/api/admin/secrets/{secret_id}", headers=auth_headers(users["student1"])
    )
    assert resp.status_code == 403


def test_delete_secret_cross_tenant_is_404(client, users):
    admin1 = users["admin1"]
    admin2 = users["admin2"]
    secret_id = _create_secret(client, admin1)
    # admin2 (tenant-2) must not be able to delete tenant-1's secret
    resp = client.delete(f"/api/admin/secrets/{secret_id}", headers=auth_headers(admin2))
    assert resp.status_code == 404
    # Still present for the owner
    listed = client.get("/api/admin/secrets", headers=auth_headers(admin1)).json()
    assert any(s["id"] == secret_id for s in listed)


def test_delete_secret_writes_audit_event(client, users, db):
    admin1 = users["admin1"]
    secret_id = _create_secret(client, admin1)
    client.delete(f"/api/admin/secrets/{secret_id}", headers=auth_headers(admin1))

    events = client.get("/api/admin/audit/events", headers=auth_headers(admin1)).json()
    assert any(
        e["action"] == "secret_deleted" and e["resource_id"] == secret_id for e in events
    )


# --- CONTENT STUDIO: REJECT --------------------------------------------------

def test_reject_question_as_admin(client, users, db):
    q = _make_question(db, users["admin1"].tenant_id, status="in_review")
    resp = client.post(
        "/api/admin/content-studio/reject",
        json={"question_id": q.id},
        headers=auth_headers(users["admin1"]),
    )
    assert resp.status_code == 200
    assert resp.json() == {"id": q.id, "status": "rejected"}

    db.refresh(q)
    assert q.status == models.ContentStatus.REJECTED.value


def test_reject_question_as_student_forbidden(client, users, db):
    q = _make_question(db, users["admin1"].tenant_id)
    resp = client.post(
        "/api/admin/content-studio/reject",
        json={"question_id": q.id},
        headers=auth_headers(users["student1"]),
    )
    assert resp.status_code == 403


def test_reject_question_cross_tenant_is_404(client, users, db):
    # Question lives in tenant-2; admin of tenant-1 must not reject it
    q = _make_question(db, users["admin2"].tenant_id)
    resp = client.post(
        "/api/admin/content-studio/reject",
        json={"question_id": q.id},
        headers=auth_headers(users["admin1"]),
    )
    assert resp.status_code == 404
    db.refresh(q)
    assert q.status != models.ContentStatus.REJECTED.value


def test_reject_question_missing_id_is_400(client, users):
    resp = client.post(
        "/api/admin/content-studio/reject",
        json={},
        headers=auth_headers(users["admin1"]),
    )
    assert resp.status_code == 400


# --- KNOWLEDGE BASE: CRUD ----------------------------------------------------

def test_knowledge_document_create_list_delete_cycle(client, users):
    admin1 = users["admin1"]
    content = (
        "This is the first verified paragraph with more than fifty characters of text.\n\n"
        "Second paragraph also has well over fifty characters so it becomes a chunk too."
    )
    # CREATE
    resp = client.post(
        "/api/admin/knowledge-base/documents",
        json={"title": "AWS Networking", "content": content, "skill_id": "skill-1"},
        headers=auth_headers(admin1),
    )
    assert resp.status_code == 201
    doc = resp.json()
    assert doc["title"] == "AWS Networking"
    assert doc["skill_id"] == "skill-1"
    doc_id = doc["id"]

    # LIST
    resp = client.get("/api/admin/knowledge-base/documents", headers=auth_headers(admin1))
    assert resp.status_code == 200
    listed = resp.json()
    assert any(d["id"] == doc_id and d["title"] == "AWS Networking" for d in listed)

    # DELETE
    resp = client.delete(
        f"/api/admin/knowledge-base/documents/{doc_id}", headers=auth_headers(admin1)
    )
    assert resp.status_code == 200
    assert resp.json() == {"status": "deleted", "id": doc_id}

    # Gone from the listing
    listed = client.get(
        "/api/admin/knowledge-base/documents", headers=auth_headers(admin1)
    ).json()
    assert all(d["id"] != doc_id for d in listed)


def test_knowledge_document_create_produces_chunks(client, users, db):
    admin1 = users["admin1"]
    content = (
        "Paragraph one is long enough to be retained as a knowledge chunk for retrieval.\n\n"
        "Paragraph two is also sufficiently long to be retained as its own knowledge chunk."
    )
    resp = client.post(
        "/api/admin/knowledge-base/documents",
        json={"title": "Doc", "content": content},
        headers=auth_headers(admin1),
    )
    doc_id = resp.json()["id"]
    chunks = db.query(models.KnowledgeChunk).filter(
        models.KnowledgeChunk.document_id == doc_id
    ).all()
    assert len(chunks) == 2
    assert all(c.tenant_id == admin1.tenant_id for c in chunks)


def test_knowledge_document_delete_removes_chunks(client, users, db):
    admin1 = users["admin1"]
    content = "A sufficiently long paragraph to be kept as a chunk inside the knowledge base."
    doc_id = client.post(
        "/api/admin/knowledge-base/documents",
        json={"title": "Doc", "content": content},
        headers=auth_headers(admin1),
    ).json()["id"]

    client.delete(
        f"/api/admin/knowledge-base/documents/{doc_id}", headers=auth_headers(admin1)
    )
    remaining = db.query(models.KnowledgeChunk).filter(
        models.KnowledgeChunk.document_id == doc_id
    ).count()
    assert remaining == 0


def test_knowledge_documents_list_as_student_forbidden(client, users):
    resp = client.get(
        "/api/admin/knowledge-base/documents", headers=auth_headers(users["student1"])
    )
    assert resp.status_code == 403


def test_knowledge_document_create_as_student_forbidden(client, users):
    resp = client.post(
        "/api/admin/knowledge-base/documents",
        json={"title": "x", "content": "y"},
        headers=auth_headers(users["student1"]),
    )
    assert resp.status_code == 403


def test_knowledge_documents_are_tenant_scoped(client, users):
    admin1, admin2 = users["admin1"], users["admin2"]
    long_text = "A long verified paragraph that exceeds the fifty character chunking threshold."
    client.post(
        "/api/admin/knowledge-base/documents",
        json={"title": "T1 doc", "content": long_text},
        headers=auth_headers(admin1),
    )
    client.post(
        "/api/admin/knowledge-base/documents",
        json={"title": "T2 doc", "content": long_text},
        headers=auth_headers(admin2),
    )
    t1 = client.get(
        "/api/admin/knowledge-base/documents", headers=auth_headers(admin1)
    ).json()
    titles = [d["title"] for d in t1]
    assert "T1 doc" in titles
    assert "T2 doc" not in titles


def test_knowledge_document_delete_cross_tenant_is_404(client, users):
    admin1, admin2 = users["admin1"], users["admin2"]
    long_text = "A long verified paragraph that exceeds the fifty character chunking threshold."
    doc_id = client.post(
        "/api/admin/knowledge-base/documents",
        json={"title": "T1 doc", "content": long_text},
        headers=auth_headers(admin1),
    ).json()["id"]
    # admin2 cannot delete tenant-1's document
    resp = client.delete(
        f"/api/admin/knowledge-base/documents/{doc_id}", headers=auth_headers(admin2)
    )
    assert resp.status_code == 404
    # Still present for the owner
    t1 = client.get(
        "/api/admin/knowledge-base/documents", headers=auth_headers(admin1)
    ).json()
    assert any(d["id"] == doc_id for d in t1)


# --- MCP: DELETE -------------------------------------------------------------

def test_delete_mcp_server_as_admin(client, users, db):
    server = _make_mcp_server(db, users["admin1"].tenant_id)
    resp = client.delete(
        f"/api/admin/mcp/servers/{server.id}", headers=auth_headers(users["admin1"])
    )
    assert resp.status_code == 200
    assert resp.json() == {"status": "deleted", "id": server.id}
    assert db.query(models.MCPServer).filter(models.MCPServer.id == server.id).first() is None


def test_delete_mcp_server_as_student_forbidden(client, users, db):
    server = _make_mcp_server(db, users["admin1"].tenant_id)
    resp = client.delete(
        f"/api/admin/mcp/servers/{server.id}", headers=auth_headers(users["student1"])
    )
    assert resp.status_code == 403


def test_delete_mcp_server_cross_tenant_is_404(client, users, db):
    server = _make_mcp_server(db, users["admin2"].tenant_id)  # tenant-2
    resp = client.delete(
        f"/api/admin/mcp/servers/{server.id}", headers=auth_headers(users["admin1"])
    )
    assert resp.status_code == 404
    # Still present
    assert db.query(models.MCPServer).filter(models.MCPServer.id == server.id).first() is not None


# --- CONTROL ROOM: real data -------------------------------------------------

def test_control_room_status_reports_real_provider(client, users, db):
    admin1 = users["admin1"]
    db.add(models.TenantAISettings(
        tenant_id=admin1.tenant_id, provider="anthropic", model_name="claude-x"
    ))
    db.commit()

    resp = client.get("/api/admin/control-room/status", headers=auth_headers(admin1))
    assert resp.status_code == 200
    body = resp.json()
    assert body["ai_provider"] == "anthropic"
    assert body["ai_model"] == "claude-x"
    # No hardcoded placeholder leaks through
    assert body["ai_provider"] != "Mock / GPT-4o"


def test_control_room_status_defaults_to_mock_without_settings(client, users):
    resp = client.get(
        "/api/admin/control-room/status", headers=auth_headers(users["admin1"])
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["ai_provider"] == "mock"
    # Enriched real counts are present
    for key in ("questions_published", "attempts", "knowledge_documents"):
        assert key in body
        assert isinstance(body[key], int)


def test_control_room_counts_are_tenant_scoped(client, users, db):
    admin1 = users["admin1"]
    # A published question only in tenant-1
    _make_question(db, admin1.tenant_id, status="published")
    # A published question only in tenant-2
    _make_question(db, users["admin2"].tenant_id, status="published")

    body = client.get(
        "/api/admin/control-room/status", headers=auth_headers(admin1)
    ).json()
    assert body["questions_published"] == 1
