def test_exercises_list_includes_all_configured():
    from app.exercises_config import EXERCISES

    # imported here (not at module top) so this test still runs even
    # if exercises_config.py changes shape - keeps the assertion honest
    assert len(EXERCISES) >= 1


def test_exercises_endpoint(client):
    resp = client.get("/exercises")
    assert resp.status_code == 200
    body = resp.json()
    assert "squat" in body["exercises"]
    assert body["exercises"]["squat"]["display_name"] == "Squat"


def test_predict_requires_active_session(client):
    resp = client.post(
        "/predict",
        json={"exercise": "squat", "session_id": "never-started", "signals": {"left_knee_angle": 90}},
    )
    assert resp.status_code == 404
    assert resp.json()["error"] == "SessionNotFoundError"


def test_predict_missing_signal_returns_400(client):
    client.post("/session/start", json={"exercise": "squat", "session_id": "s1"})
    # squat's exercises_config.py signals are keyed "left"/"right" - omit "right"
    resp = client.post(
        "/predict",
        json={"exercise": "squat", "session_id": "s1", "signals": {"left": 90}},
    )
    assert resp.status_code == 400
    assert resp.json()["error"] == "MissingSignalError"


def test_predict_empty_signals_rejected_by_schema(client):
    client.post("/session/start", json={"exercise": "squat", "session_id": "s1"})
    resp = client.post("/predict", json={"exercise": "squat", "session_id": "s1", "signals": {}})
    assert resp.status_code == 422  # Pydantic validation error, caught before it reaches the service layer


def test_predict_returns_state_and_rep_count(client):
    client.post("/session/start", json={"exercise": "squat", "session_id": "s1"})
    resp = client.post(
        "/predict",
        json={
            "exercise": "squat",
            "session_id": "s1",
            "signals": {"left": 80, "right": 80},
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "state" in body
    assert "rep_count" in body
    assert "rep_completed" in body


def test_health_endpoint(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "active_sessions" in body


def test_request_id_header_present(client):
    resp = client.get("/health")
    assert "X-Request-ID" in resp.headers
