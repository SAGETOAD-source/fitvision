"""
test_profile.py

Tests for GET /v1/profile and PUT /v1/profile endpoints:
- Default values when row does not exist (no row created)
- Profile upsert with body_goal and optional focus_area
- Input validation (body_goal, focus_area) -> 422
- Auth requirements -> 401
- User isolation (User B does not see User A's profile)
"""

from sqlmodel import Session, select

from app.db.models import UserProfile


def test_get_profile_requires_auth(client):
    resp = client.get("/v1/profile")
    assert resp.status_code == 401


def test_get_profile_defaults_without_creating_row(auth_client):
    resp = auth_client.get("/v1/profile")
    assert resp.status_code == 200
    body = resp.json()
    assert body == {
        "body_goal": None,
        "focus_area": None,
        "onboarding_completed": False,
    }

    # Verify directly in DB that no UserProfile row was created
    with Session(auth_client.test_engine) as db:
        rows = db.exec(select(UserProfile)).all()
        assert len(rows) == 0


def test_put_profile_creates_new_row(auth_client):
    resp = auth_client.put(
        "/v1/profile",
        json={"body_goal": "slim", "focus_area": "legs"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["body_goal"] == "slim"
    assert body["focus_area"] == "legs"
    assert body["onboarding_completed"] is True

    # Verify directly in DB
    with Session(auth_client.test_engine) as db:
        row = db.exec(select(UserProfile)).first()
        assert row is not None
        assert row.body_goal == "slim"
        assert row.focus_area == "legs"
        assert row.onboarding_completed is True


def test_put_profile_updates_existing_row(auth_client):
    # Initial setup
    auth_client.put("/v1/profile", json={"body_goal": "slim", "focus_area": "legs"})

    # Update to muscular / upper_body
    resp = auth_client.put(
        "/v1/profile",
        json={"body_goal": "muscular", "focus_area": "upper_body"},
    )
    assert resp.status_code == 200
    assert resp.json()["body_goal"] == "muscular"
    assert resp.json()["focus_area"] == "upper_body"

    # Ensure single row updated in DB, not duplicated
    with Session(auth_client.test_engine) as db:
        rows = db.exec(select(UserProfile)).all()
        assert len(rows) == 1
        assert rows[0].body_goal == "muscular"
        assert rows[0].focus_area == "upper_body"


def test_put_profile_allows_null_focus_area(auth_client):
    resp = auth_client.put(
        "/v1/profile",
        json={"body_goal": "bulk", "focus_area": None},
    )
    assert resp.status_code == 200
    assert resp.json()["body_goal"] == "bulk"
    assert resp.json()["focus_area"] is None
    assert resp.json()["onboarding_completed"] is True


def test_put_profile_invalid_body_goal_returns_422(auth_client):
    resp = auth_client.put(
        "/v1/profile",
        json={"body_goal": "super_lean", "focus_area": "legs"},
    )
    assert resp.status_code == 422
    assert resp.json()["error"] == "RequestValidationError"


def test_put_profile_invalid_focus_area_returns_422(auth_client):
    resp = auth_client.put(
        "/v1/profile",
        json={"body_goal": "slim", "focus_area": "arms"},
    )
    assert resp.status_code == 422
    assert resp.json()["error"] == "RequestValidationError"


def test_profile_user_isolation(auth_client, auth_client_2):
    # User 1 sets profile
    auth_client.put("/v1/profile", json={"body_goal": "slim", "focus_area": "legs"})

    # User 2 gets profile -> must return defaults, not User 1's profile
    resp2 = auth_client_2.get("/v1/profile")
    assert resp2.status_code == 200
    assert resp2.json()["body_goal"] is None
    assert resp2.json()["onboarding_completed"] is False
