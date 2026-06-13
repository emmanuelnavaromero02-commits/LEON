from tests.conftest import auth_headers


def test_register_login_me_flow(client, tenants):
    # Register (default tenant slug "demo")
    resp = client.post("/api/auth/register", json={
        "email": "newuser@demo-tenant.com",
        "password": "supersecret1",
        "full_name": "New User",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "newuser@demo-tenant.com"
    assert body["user"]["role"] == "STUDENT"
    assert body["user"]["tenant_id"] == "tenant-1"

    # Login
    resp = client.post("/api/auth/login", json={
        "email": "newuser@demo-tenant.com",
        "password": "supersecret1",
    })
    assert resp.status_code == 200
    token = resp.json()["access_token"]

    # Me
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "newuser@demo-tenant.com"


def test_login_wrong_password_is_401(client, users):
    resp = client.post("/api/auth/login", json={
        "email": "student1@demo-tenant.com",
        "password": "not-the-password",
    })
    assert resp.status_code == 401
    # Generic message: no hint about what failed
    assert resp.json()["detail"] == "Invalid email or password"


def test_login_unknown_email_is_401(client, tenants):
    resp = client.post("/api/auth/login", json={
        "email": "ghost@demo-tenant.com",
        "password": "whatever123",
    })
    assert resp.status_code == 401


def test_register_duplicate_email_same_tenant_is_409(client, users):
    resp = client.post("/api/auth/register", json={
        "email": "student1@demo-tenant.com",
        "password": "supersecret1",
        "full_name": "Dup User",
    })
    assert resp.status_code == 409


def test_register_same_email_in_other_tenant_is_allowed(client, users):
    # student1@demo-tenant.com exists in tenant-1; registering it in tenant "acme" must work
    resp = client.post("/api/auth/register", json={
        "email": "student1@demo-tenant.com",
        "password": "supersecret1",
        "full_name": "Same Email Other Tenant",
        "tenant_slug": "acme",
    })
    assert resp.status_code == 201
    assert resp.json()["user"]["tenant_id"] == "tenant-2"


def test_register_unknown_tenant_is_404(client, tenants):
    resp = client.post("/api/auth/register", json={
        "email": "nobody@demo-tenant.com",
        "password": "supersecret1",
        "full_name": "Nobody",
        "tenant_slug": "does-not-exist",
    })
    assert resp.status_code == 404


def test_protected_endpoint_without_token_is_401(client, users):
    student = users["student1"]
    resp = client.get(f"/api/academy/dashboard/{student.id}")
    assert resp.status_code == 401

    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_protected_endpoint_with_garbage_token_is_401(client, users):
    student = users["student1"]
    resp = client.get(
        f"/api/academy/dashboard/{student.id}",
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert resp.status_code == 401


def test_dashboard_with_valid_token_works(client, users):
    student = users["student1"]
    resp = client.get(f"/api/academy/dashboard/{student.id}", headers=auth_headers(student))
    assert resp.status_code == 200
    body = resp.json()
    assert body["user_name"] == student.full_name
    assert "mastery_by_skill" in body
