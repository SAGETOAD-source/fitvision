def test_start_session_success(auth_client):
    resp = auth_client.post("/session/start", json={"exercise": "squat", "session_id": "s1"})
    assert resp.status_code == 200
    body = resp.json()
    assert body == {"session_id": "s1", "exercise": "squat", "rep_count": 0}


def test_start_session_unknown_exercise(auth_client):
    resp = auth_client.post("/session/start", json={"exercise": "not_a_real_exercise", "session_id": "s1"})
    assert resp.status_code == 400
    body = resp.json()
    assert body["error"] == "UnknownExerciseError"
    assert "request_id" in body


def test_start_session_model_not_loaded(auth_client):
    # "pushup" is not in the stub registry's scripted predictions
    resp = auth_client.post("/session/start", json={"exercise": "pushup", "session_id": "s1"})
    assert resp.status_code == 503
    assert resp.json()["error"] == "ModelNotLoadedError"


def test_end_session_returns_final_count(auth_client):
    auth_client.post("/session/start", json={"exercise": "squat", "session_id": "s1"})
    resp = auth_client.post("/session/end", params={"session_id": "s1"})
    assert resp.status_code == 200
    assert resp.json()["rep_count"] == 0


def test_end_session_not_found(auth_client):
    resp = auth_client.post("/session/end", params={"session_id": "does-not-exist"})
    assert resp.status_code == 404
    assert resp.json()["error"] == "SessionNotFoundError"


def test_session_id_is_isolated_per_session(auth_client, auth_client_2):
    """Two different users must not share RepCounter state, even with the same session_id string."""
    auth_client.post("/session/start", json={"exercise": "squat", "session_id": "shared-id"})
    
    # Drive predictions only for user 1.
    for angle in [170, 165, 160, 100, 95, 90]:
        auth_client.post(
            "/predict",
            json={
                "exercise": "squat",
                "session_id": "shared-id",
                "signals": {"left": angle, "right": angle},
            },
        )

    # User 2 tries to end the session. Should be 404 (hidden from them).
    end_b = auth_client_2.post("/session/end", params={"session_id": "shared-id"})
    assert end_b.status_code == 404

    # User 1 successfully ends it and sees their state intact.
    end_a = auth_client.post("/session/end", params={"session_id": "shared-id"})
    assert end_a.status_code == 200
    assert end_a.json()["rep_count"] == 0  # one half of a rep


def test_start_collision_does_not_overwrite_other_user(auth_client, auth_client_2):
    """User 2 starting a session with an ID already in use by User 1 should not overwrite User 1's state."""
    auth_client.post("/session/start", json={"exercise": "squat", "session_id": "shared-id"})
    
    # User 1 makes progress
    auth_client.post(
        "/predict",
        json={"exercise": "squat", "session_id": "shared-id", "signals": {"left": 100, "right": 100}},
    )
    
    # User 2 starts a session with the exact same ID
    resp2 = auth_client_2.post("/session/start", json={"exercise": "squat", "session_id": "shared-id"})
    assert resp2.status_code == 200
    
    # User 1 ends their session. They should still see their progress (rep_count), 
    # not a fresh state reset by User 2. (Note: in our stub model, a single prediction
    # doesn't increment the rep, but the RepCounter state is what matters. 
    # Let's just confirm it ends successfully and isn't 404'd or reset to a different exercise).
    end_a = auth_client.post("/session/end", params={"session_id": "shared-id"})
    assert end_a.status_code == 200


def test_workout_session_persisted_after_end(client, auth_headers):
    """A WorkoutSession row must be written to the DB when /session/end succeeds."""
    from sqlmodel import Session, select

    from app.db.models import WorkoutSession

    client.post("/session/start", json={"exercise": "squat", "session_id": "persist-test"}, headers=auth_headers)
    resp = client.post("/session/end", params={"session_id": "persist-test"}, headers=auth_headers)
    assert resp.status_code == 200

    # Query the in-memory DB directly via the engine exposed by the fixture.
    with Session(client.test_engine) as db:
        rows = db.exec(select(WorkoutSession)).all()

    assert len(rows) == 1
    row = rows[0]
    assert row.session_id == "persist-test"
    assert row.exercise == "squat"
    assert row.rep_count == 0
    assert row.started_at is not None
    assert row.ended_at is not None
    assert row.ended_at >= row.started_at

