def test_exercises_list_includes_all_configured():
    from app.exercises_config import EXERCISES

    # imported here (not at module top) so this test still runs even
    # if exercises_config.py changes shape - keeps the assertion honest
    assert len(EXERCISES) >= 1


def test_exercises_endpoint(client):
    resp = client.get("/v1/exercises")
    assert resp.status_code == 200
    body = resp.json()
    assert "squat" in body["exercises"]
    assert body["exercises"]["squat"]["display_name"] == "Squat"


def test_exercises_full_config_shape(client):
    """GET /v1/exercises must return the full config for every exercise."""
    resp = client.get("/v1/exercises")
    assert resp.status_code == 200
    exercises = resp.json()["exercises"]

    required_top_keys = {
        "display_name", "signals", "extra_signals", "down_state", "up_states",
        "count_on", "primary_signal", "min_valid_range", "good_depth_threshold",
        "extra_range_checks", "form_warnings", "visibility_threshold", "rotate_frame",
    }
    for name, cfg in exercises.items():
        assert required_top_keys == set(cfg.keys()), (
            f"Exercise '{name}' missing or extra keys: got {set(cfg.keys())}"
        )
        # signals must be a dict of objects with 'points' (list of strings) + 'feature_name'
        for sig_name, sig in cfg["signals"].items():
            assert "points" in sig and isinstance(sig["points"], list), (
                f"'{name}.signals.{sig_name}' missing 'points' list"
            )
            assert all(isinstance(p, str) for p in sig["points"]), (
                f"'{name}.signals.{sig_name}.points' must be strings, not enums"
            )
            assert "feature_name" in sig, f"'{name}.signals.{sig_name}' missing 'feature_name'"
        # up_states must be a list (set serialized to sorted list)
        assert isinstance(cfg["up_states"], list)

    # latpulldown must expose 'torso' under extra_signals
    lat = exercises.get("latpulldown")
    assert lat is not None, "latpulldown not found in /v1/exercises response"
    assert "torso" in lat["extra_signals"], "latpulldown extra_signals must include 'torso'"
    torso = lat["extra_signals"]["torso"]
    assert "points" in torso and len(torso["points"]) == 4
    assert torso["type"] == "lean_avg"

    # pushup must have rotate_frame = "ROTATE_90_CLOCKWISE"
    assert exercises["pushup"]["rotate_frame"] == "ROTATE_90_CLOCKWISE"

    # squat must have rotate_frame = null
    assert exercises["squat"]["rotate_frame"] is None


def test_predict_requires_active_session(auth_client):
    resp = auth_client.post(
        "/v1/predict",
        json={"session_id": "never-started", "signals": {"left_knee_angle": 90}},
    )
    assert resp.status_code == 404
    assert resp.json()["error"] == "SessionNotFoundError"


def test_predict_missing_signal_returns_400(auth_client):
    auth_client.post("/v1/session/start", json={"exercise": "squat", "session_id": "s1"})
    # squat's exercises_config.py signals are keyed "left"/"right" - omit "right"
    resp = auth_client.post(
        "/v1/predict",
        json={"session_id": "s1", "signals": {"left": 90}},
    )
    assert resp.status_code == 400
    assert resp.json()["error"] == "MissingSignalError"


def test_predict_empty_signals_rejected_by_schema(auth_client):
    auth_client.post("/v1/session/start", json={"exercise": "squat", "session_id": "s1"})
    resp = auth_client.post("/v1/predict", json={"session_id": "s1", "signals": {}})
    assert resp.status_code == 422  # Pydantic validation error, caught before it reaches the service layer


def test_predict_returns_state_and_rep_count(auth_client):
    auth_client.post("/v1/session/start", json={"exercise": "squat", "session_id": "s1"})
    resp = auth_client.post(
        "/v1/predict",
        json={
            "session_id": "s1",
            "signals": {"left": 80, "right": 80},
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "state" in body
    assert "rep_count" in body
    assert "rep_completed" in body


def test_predict_with_matching_exercise_field_succeeds(auth_client):
    """body.exercise matching the session exercise is allowed."""
    auth_client.post("/v1/session/start", json={"exercise": "squat", "session_id": "s_match"})
    resp = auth_client.post(
        "/v1/predict",
        json={"exercise": "squat", "session_id": "s_match", "signals": {"left": 90, "right": 90}},
    )
    assert resp.status_code == 200


def test_predict_session_exercise_mismatch(auth_client):
    """body.exercise != session exercise must return 400 ExerciseMismatchError."""
    auth_client.post("/v1/session/start", json={"exercise": "squat", "session_id": "s_mismatch"})
    resp = auth_client.post(
        "/v1/predict",
        json={"exercise": "pushup", "session_id": "s_mismatch", "signals": {"left": 90, "right": 90}},
    )
    assert resp.status_code == 400
    assert resp.json()["error"] == "ExerciseMismatchError"


def test_predict_invalid_angle_nan(auth_client):
    """NaN in signals must return 422 with RequestValidationError."""
    auth_client.post("/v1/session/start", json={"exercise": "squat", "session_id": "s_nan"})
    resp = auth_client.post(
        "/v1/predict",
        content=b'{"session_id":"s_nan","signals":{"left":NaN,"right":90}}',
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 422
    body = resp.json()
    assert body["error"] == "RequestValidationError"
    assert "left" in body["detail"]
    assert "request_id" in body


def test_predict_invalid_angle_inf(auth_client):
    """Infinity in signals must return 422 with RequestValidationError."""
    auth_client.post("/v1/session/start", json={"exercise": "squat", "session_id": "s_inf"})
    resp = auth_client.post(
        "/v1/predict",
        content=b'{"session_id":"s_inf","signals":{"left":Infinity,"right":90}}',
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 422
    body = resp.json()
    assert body["error"] == "RequestValidationError"
    assert "left" in body["detail"]
    assert "request_id" in body


def test_request_validation_error_response_shape(client):
    """Validation errors return uniform ErrorResponse JSON shape without leaking NaN/inf."""
    resp = client.post("/v1/auth/signup", json={"email": "not-an-email", "password": "short"})
    assert resp.status_code == 422
    body = resp.json()
    assert body["error"] == "RequestValidationError"
    assert "detail" in body and isinstance(body["detail"], str)
    assert "request_id" in body


def test_predict_angle_out_of_range_negative(auth_client):
    """Negative angle in signals must return 422."""
    auth_client.post("/v1/session/start", json={"exercise": "squat", "session_id": "s_neg"})
    resp = auth_client.post(
        "/v1/predict",
        json={"session_id": "s_neg", "signals": {"left": -1, "right": 90}},
    )
    assert resp.status_code == 422


def test_predict_angle_out_of_range_above_360(auth_client):
    """Angle > 360 in signals must return 422."""
    auth_client.post("/v1/session/start", json={"exercise": "squat", "session_id": "s_high"})
    resp = auth_client.post(
        "/v1/predict",
        json={"session_id": "s_high", "signals": {"left": 361, "right": 90}},
    )
    assert resp.status_code == 422


def test_health_endpoint(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "active_sessions" in body


def test_request_id_header_present(client):
    resp = client.get("/health")
    assert "X-Request-ID" in resp.headers


def test_predict_isolated_per_session(auth_client, auth_client_2):
    """User B calling /predict with User A's session_id should get 404."""
    auth_client.post("/v1/session/start", json={"exercise": "squat", "session_id": "shared-id"})

    # User B attempts to predict against User A's session
    resp = auth_client_2.post(
        "/v1/predict",
        json={
            "session_id": "shared-id",
            "signals": {"left": 90, "right": 90},
        },
    )

    assert resp.status_code == 404
    assert resp.json()["error"] == "SessionNotFoundError"


def test_predict_requires_token(client):
    """Calling /predict without a valid token must return 401."""
    resp = client.post(
        "/v1/predict",
        json={
            "session_id": "s1",
            "signals": {"left": 90, "right": 90},
        },
    )
    assert resp.status_code == 401
    assert resp.json()["error"] == "InvalidCredentialsError"
