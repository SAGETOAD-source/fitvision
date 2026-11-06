"""
test_stats.py

Tests for GET /v1/stats endpoint:
- Empty initial stats (totals 0, 7-day list initialized to 0, reps_per_exercise initialized)
- Aggregate sums (total_workouts, total_reps, reps_per_exercise)
- Current streak calculation across consecutive UTC calendar days
- Streak continuity when workout completed yesterday but not yet today
- Streak reset when a day is skipped
- 7-day rolling breakdown (exactly 7 chronological day/reps items)
- Strict user isolation (User B stats unaffected by User A workouts)
"""

from datetime import datetime, timedelta, timezone


def test_get_stats_requires_auth(client):
    resp = client.get("/v1/stats")
    assert resp.status_code == 401


def test_get_stats_empty_state(auth_client):
    resp = auth_client.get("/v1/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_workouts"] == 0
    assert data["total_reps"] == 0
    assert data["current_streak_days"] == 0
    assert len(data["reps_last_7_days"]) == 7
    # All 7 entries should have 0 reps
    assert all(item["reps"] == 0 for item in data["reps_last_7_days"])
    # All configured exercises present with 0 reps
    for ex in ["squat", "pushup", "situp", "pullup", "jumpingjack", "latpulldown"]:
        assert data["reps_per_exercise"].get(ex) == 0


def test_get_stats_aggregations_and_streak(auth_client):
    # Log workouts for today, yesterday, and 2 days ago (streak = 3)
    now_utc = datetime.now(timezone.utc)
    for day_offset in [0, 1, 2]:
        dt = now_utc - timedelta(days=day_offset)
        auth_client.post(
            "/v1/workouts",
            json={
                "exercise": "squat" if day_offset == 0 else "pushup",
                "rep_count": 20,
                "started_at": (dt - timedelta(minutes=15)).isoformat(),
                "ended_at": dt.isoformat(),
            },
        )

    resp = auth_client.get("/v1/stats")
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_workouts"] == 3
    assert data["total_reps"] == 60
    assert data["reps_per_exercise"]["squat"] == 20
    assert data["reps_per_exercise"]["pushup"] == 40
    assert data["current_streak_days"] == 3

    # Check 7-day breakdown: last entry is today, total reps in last 7 days = 60
    assert len(data["reps_last_7_days"]) == 7
    total_7_day_reps = sum(item["reps"] for item in data["reps_last_7_days"])
    assert total_7_day_reps == 60


def test_get_stats_streak_alive_from_yesterday(auth_client):
    # User worked out yesterday and 2 days ago, but not yet today
    now_utc = datetime.now(timezone.utc)
    for day_offset in [1, 2]:
        dt = now_utc - timedelta(days=day_offset)
        auth_client.post(
            "/v1/workouts",
            json={
                "exercise": "situp",
                "rep_count": 30,
                "started_at": (dt - timedelta(minutes=10)).isoformat(),
                "ended_at": dt.isoformat(),
            },
        )

    resp = auth_client.get("/v1/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_workouts"] == 2
    assert data["current_streak_days"] == 2


def test_get_stats_streak_broken_with_gap(auth_client):
    # User worked out today and 3 days ago, skipping yesterday
    now_utc = datetime.now(timezone.utc)
    for day_offset in [0, 3]:
        dt = now_utc - timedelta(days=day_offset)
        auth_client.post(
            "/v1/workouts",
            json={
                "exercise": "pullup",
                "rep_count": 10,
                "started_at": (dt - timedelta(minutes=10)).isoformat(),
                "ended_at": dt.isoformat(),
            },
        )

    resp = auth_client.get("/v1/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_workouts"] == 2
    # Streak should be 1 because yesterday had no workouts
    assert data["current_streak_days"] == 1


def test_stats_user_isolation(auth_client, auth_client_2):
    now_utc = datetime.now(timezone.utc)
    # User 1 logs workouts
    auth_client.post(
        "/v1/workouts",
        json={
            "exercise": "squat",
            "rep_count": 100,
            "started_at": (now_utc - timedelta(minutes=15)).isoformat(),
            "ended_at": now_utc.isoformat(),
        },
    )

    # User 2 checks stats -> must be 0
    resp2 = auth_client_2.get("/v1/stats")
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["total_workouts"] == 0
    assert data2["total_reps"] == 0
    assert data2["current_streak_days"] == 0
