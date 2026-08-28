def test_signup_creates_user_and_returns_token(client):
    resp = client.post("/auth/signup", json={"email": "a@example.com", "password": "correcthorse123"})
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_signup_duplicate_email_rejected(client):
    client.post("/auth/signup", json={"email": "dup@example.com", "password": "correcthorse123"})
    resp = client.post("/auth/signup", json={"email": "dup@example.com", "password": "differentpass1"})
    assert resp.status_code == 409
    assert resp.json()["error"] == "EmailAlreadyRegisteredError"


def test_signup_password_too_short_rejected(client):
    resp = client.post("/auth/signup", json={"email": "b@example.com", "password": "short"})
    assert resp.status_code == 422  # Pydantic min_length validation


def test_login_success(client):
    client.post("/auth/signup", json={"email": "c@example.com", "password": "correcthorse123"})
    resp = client.post("/auth/login", json={"email": "c@example.com", "password": "correcthorse123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password_rejected(client):
    client.post("/auth/signup", json={"email": "d@example.com", "password": "correcthorse123"})
    resp = client.post("/auth/login", json={"email": "d@example.com", "password": "wrongpassword"})
    assert resp.status_code == 401
    assert resp.json()["error"] == "InvalidCredentialsError"


def test_login_nonexistent_user_rejected(client):
    resp = client.post("/auth/login", json={"email": "nobody@example.com", "password": "whatever123"})
    assert resp.status_code == 401


def test_me_requires_token(client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401  # no Authorization header at all


def test_me_returns_current_user_with_valid_token(client):
    signup_resp = client.post("/auth/signup", json={"email": "e@example.com", "password": "correcthorse123"})
    token = signup_resp.json()["access_token"]

    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "e@example.com"
    assert "id" in body


def test_me_rejects_garbage_token(client):
    resp = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 401
    assert resp.json()["error"] == "InvalidCredentialsError"
