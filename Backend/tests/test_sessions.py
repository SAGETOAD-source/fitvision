def test_start_session_success(client):
    resp = client.post("/session/start", json={"exercise": "squat", "session_id": "s1"})
    assert resp.status_code == 200
    body = resp.json()
    assert body == {"session_id": "s1", "exercise": "squat", "rep_count": 0}


def test_start_session_unknown_exercise(client):
    resp = client.post("/session/start", json={"exercise": "not_a_real_exercise", "session_id": "s1"})
    assert resp.status_code == 400
    body = resp.json()
    assert body["error"] == "UnknownExerciseError"
    assert "request_id" in body


def test_start_session_model_not_loaded(client):
    # "pushup" is not in the stub registry's scripted predictions
    resp = client.post("/session/start", json={"exercise": "pushup", "session_id": "s1"})
    assert resp.status_code == 503
    assert resp.json()["error"] == "ModelNotLoadedError"


def test_end_session_returns_final_count(client):
    client.post("/session/start", json={"exercise": "squat", "session_id": "s1"})
    resp = client.post("/session/end", params={"session_id": "s1"})
    assert resp.status_code == 200
    assert resp.json()["rep_count"] == 0


def test_end_session_not_found(client):
    resp = client.post("/session/end", params={"session_id": "does-not-exist"})
    assert resp.status_code == 404
    assert resp.json()["error"] == "SessionNotFoundError"


def test_session_id_is_isolated_per_session(client):
    """Two different session_ids must not share RepCounter state."""
    client.post("/session/start", json={"exercise": "squat", "session_id": "a"})
    client.post("/session/start", json={"exercise": "squat", "session_id": "b"})

    # Drive predictions only for session "a".
    for angle in [170, 165, 160, 100, 95, 90]:
        client.post(
            "/predict",
            json={
                "exercise": "squat",
                "session_id": "a",
                "signals": {"left": angle, "right": angle},
            },
        )

    end_a = client.post("/session/end", params={"session_id": "a"})
    end_b = client.post("/session/end", params={"session_id": "b"})

    # Session "b" never received a /predict call, so its RepCounter
    # must be untouched by whatever happened to session "a" - proves
    # state isn't accidentally shared across sessions.
    assert end_b.json()["rep_count"] == 0
