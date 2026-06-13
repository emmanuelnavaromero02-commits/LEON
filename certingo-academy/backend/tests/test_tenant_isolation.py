from tests.conftest import auth_headers


def test_student_cannot_view_other_users_dashboard(client, users):
    student1 = users["student1"]
    student2 = users["student2"]
    resp = client.get(f"/api/academy/dashboard/{student2.id}", headers=auth_headers(student1))
    assert resp.status_code == 403


def test_student_cannot_view_cross_tenant_dashboard(client, users):
    student1 = users["student1"]
    student_t2 = users["student_t2"]
    resp = client.get(f"/api/academy/dashboard/{student_t2.id}", headers=auth_headers(student1))
    assert resp.status_code == 403


def test_tenant_admin_can_view_dashboard_of_student_in_same_tenant(client, users):
    admin1 = users["admin1"]
    student1 = users["student1"]
    resp = client.get(f"/api/academy/dashboard/{student1.id}", headers=auth_headers(admin1))
    assert resp.status_code == 200


def test_tenant_admin_cannot_view_dashboard_of_other_tenant_student(client, users):
    admin1 = users["admin1"]
    student_t2 = users["student_t2"]
    resp = client.get(f"/api/academy/dashboard/{student_t2.id}", headers=auth_headers(admin1))
    assert resp.status_code == 403


def test_student_cannot_access_admin_endpoints(client, users):
    student1 = users["student1"]
    resp = client.get("/api/admin/secrets/", headers=auth_headers(student1))
    assert resp.status_code == 403

    resp = client.get("/api/admin/audit/events", headers=auth_headers(student1))
    assert resp.status_code == 403


def test_admin_endpoints_require_token(client, users):
    resp = client.get("/api/admin/secrets/")
    assert resp.status_code == 401


def test_admin_only_sees_own_tenant_secrets(client, users):
    admin1 = users["admin1"]
    admin2 = users["admin2"]

    # Each admin creates a secret in their own tenant
    resp = client.post(
        "/api/admin/secrets/",
        json={"key": "OPENAI_API_KEY", "value": "sk-tenant1-aaaaaaaa"},
        headers=auth_headers(admin1),
    )
    assert resp.status_code == 200

    resp = client.post(
        "/api/admin/secrets/",
        json={"key": "ANTHROPIC_API_KEY", "value": "sk-tenant2-bbbbbbbb"},
        headers=auth_headers(admin2),
    )
    assert resp.status_code == 200

    # Admin 1 only sees tenant-1 secrets
    resp = client.get("/api/admin/secrets/", headers=auth_headers(admin1))
    assert resp.status_code == 200
    secrets = resp.json()
    assert len(secrets) == 1
    assert secrets[0]["tenant_id"] == admin1.tenant_id
    assert secrets[0]["key"] == "OPENAI_API_KEY"
    # Raw encrypted value is never exposed
    assert "encrypted_value" not in secrets[0]

    # Admin 2 only sees tenant-2 secrets
    resp = client.get("/api/admin/secrets/", headers=auth_headers(admin2))
    secrets = resp.json()
    assert len(secrets) == 1
    assert secrets[0]["tenant_id"] == admin2.tenant_id


def test_admin_audit_events_are_tenant_scoped(client, users, db):
    from app.services.audit.audit_service import AuditService

    audit = AuditService()
    audit.log(db, users["admin1"].tenant_id, users["admin1"].id, "tenant1_action")
    audit.log(db, users["admin2"].tenant_id, users["admin2"].id, "tenant2_action")

    resp = client.get("/api/admin/audit/events", headers=auth_headers(users["admin1"]))
    assert resp.status_code == 200
    actions = [e["action"] for e in resp.json()]
    assert "tenant1_action" in actions
    assert "tenant2_action" not in actions


def test_practice_next_does_not_leak_cross_tenant_questions(client, users, make_question):
    # Question only exists in tenant 2
    make_question(tenant_id=users["student_t2"].tenant_id)

    student1 = users["student1"]
    resp = client.get(f"/api/academy/practice/next/{student1.id}", headers=auth_headers(student1))
    assert resp.status_code == 404  # nothing available in tenant 1
