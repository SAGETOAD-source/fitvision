"""
test_workouts.py

Tests for workout logging and history retrieval:
- POST /v1/workouts validation (exercise in EXERCISES, rep_count 0-1000, ended_at >= started_at, duration <= 3h)
- Server-generated session_id persistence
- GET /v1/workouts pagination (limit, offset) and descending date order
- Strict user isolation (User B cannot see User A's workout sessions)
"""

from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.db.models import WorkoutSession


def test_post_workout_requires_auth(client):
    now = datetime.now(timezone.utc)
    resp = client.post(
        "/v1/workouts",
        json={
            "exercise": "squat",
            "rep_count": 20,
            "started_at": (now - timedelta(minutes=15)).isoformat(),
            "ended_at": now.isoformat(),
        },
    )
    assert resp.status_code == 401


def test_post_workout_success(auth_client):
    now = datetime.now(timezone.utc)
    started = now - timedelta(minutes=20)
    resp = auth_client.post(
        "/v1/workouts",
        json={
            "exercise": "squat",
            "rep_count": 25,
            "started_at": started.isoformat(),
            "ended_at": now.isoformat(),
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["exercise"] == "squat"
    assert body["rep_count"] == 25
    assert "session_id" in body and body["session_id"].startswith("manual_")
    assert "id" in body

    # Verify persisted in DB
    with Session(auth_client.test_engine) as db:
        row = db.exec(select(WorkoutSession).where(WorkoutSession.id == body["id"])).first()
        assert row is not None
        assert row.exercise == "squat"
        assert row.rep_count == 25
        assert row.session_id == body["session_id"]


def test_post_workout_unknown_exercise_rejected(auth_client):
    now = datetime.now(timezone.utc)
    resp = auth_client.post(
        "/v1/workouts",
        json={
            "exercise": "bench_press",
            "rep_count": 10,
            "started_at": (now - timedelta(minutes=10)).isoformat(),
            "ended_at": now.isoformat(),
        },
    )
    assert resp.status_code == 422
    assert resp.json()["error"] == "RequestValidationError"


def test_post_workout_negative_rep_count_rejected(auth_client):
    now = datetime.now(timezone.utc)
    resp = auth_client.post(
        "/v1/workouts",
        json={
            "exercise": "squat",
            "rep_count": -5,
            "started_at": (now - timedelta(minutes=10)).isoformat(),
            "ended_at": now.isoformat(),
        },
    )
    assert resp.status_code == 422
    assert resp.json()["error"] == "RequestValidationError"


def test_post_workout_rep_count_over_1000_rejected(auth_client):
    now = datetime.now(timezone.utc)
    resp = auth_client.post(
        "/v1/workouts",
        json={
            "exercise": "squat",
            "rep_count": 1001,
            "started_at": (now - timedelta(minutes=10)).isoformat(),
            "ended_at": now.isoformat(),
        },
    )
    assert resp.status_code == 422
    assert resp.json()["error"] == "RequestValidationError"


def test_post_workout_ended_before_started_rejected(auth_client):
    now = datetime.now(timezone.utc)
    resp = auth_client.post(
        "/v1/workouts",
        json={
            "exercise": "squat",
            "rep_count": 10,
            "started_at": now.isoformat(),
            "ended_at": (now - timedelta(minutes=10)).isoformat(),
        },
    )
    assert resp.status_code == 422
    assert resp.json()["error"] == "RequestValidationError"


def test_post_workout_duration_over_3_hours_rejected(auth_client):
    now = datetime.now(timezone.utc)
    started = now - timedelta(hours=3, minutes=1)
    resp = auth_client.post(
        "/v1/workouts",
        json={
            "exercise": "squat",
            "rep_count": 10,
            "started_at": started.isoformat(),
            "ended_at": now.isoformat(),
        },
    )
    assert resp.status_code == 422
    assert resp.json()["error"] == "RequestValidationError"


def test_get_workouts_pagination_and_ordering(auth_client):
    base_time = datetime.now(timezone.utc)
    # Log 3 workouts across different times
    for i in range(3):
        start = base_time - timedelta(hours=3 - i)
        end = start + timedelta(minutes=30)
        auth_client.post(
            "/v1/workouts",
            json={
                "exercise": "squat",
                "rep_count": (i + 1) * 10,
                "started_at": start.isoformat(),
                "ended_at": end.isoformat(),
            },
        )

    # Fetch all (limit 20) -> newest first
    resp = auth_client.get("/v1/workouts?limit=20&offset=0")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert len(data["workouts"]) == 3
    # Newest workout has rep_count 30
    assert data["workouts"][0]["rep_count"] == 30
    assert data["workouts"][1]["rep_count"] == 20
    assert data["workouts"][2]["rep_count"] == 10

    # Test limit=1 offset=1
    page_resp = auth_client.get("/v1/workouts?limit=1&offset=1")
    assert page_resp.status_code == 200
    page_data = page_resp.json()
    assert page_data["total"] == 3
    assert len(page_data["workouts"]) == 1
    assert page_data["workouts"][0]["rep_count"] == 20


def test_workouts_user_isolation(auth_client, auth_client_2):
    now = datetime.now(timezone.utc)
    # User 1 creates workout
    auth_client.post(
        "/v1/workouts",
        json={
            "exercise": "pushup",
            "rep_count": 50,
            "started_at": (now - timedelta(minutes=15)).isoformat(),
            "ended_at": now.isoformat(),
        },
    )

    # User 2 queries workouts -> must be empty
    resp_user2 = auth_client_2.get("/v1/workouts")
    assert resp_user2.status_code == 200
    assert resp_user2.json()["total"] == 0
    assert len(resp_user2.json()["workouts"]) == 0
