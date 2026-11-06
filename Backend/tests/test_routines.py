"""
test_routines.py

Tests for rules-based routine plans and GET /v1/routines endpoint:
- Contract verification: every exercise in ROUTINES must exist in EXERCISES
- Public accessibility (no auth header needed)
- Successful lookup for all valid combinations (slim/muscular/bulk x legs/upper_body/core/None)
- 422 validation on unknown goal or focus
"""

from app.exercises_config import EXERCISES
from app.routines_data import ROUTINES


def test_all_routines_reference_valid_configured_exercises():
    """
    Contract test: Fails if any routine in routines_data.py references
    an exercise key that is not in exercises_config.EXERCISES.
    """
    configured_keys = set(EXERCISES.keys())
    assert len(configured_keys) == 6

    for (goal, focus), exercise_list in ROUTINES.items():
        assert len(exercise_list) > 0, f"Routine ({goal}, {focus}) has no exercises"
        for item in exercise_list:
            ex_name = item["exercise"]
            assert ex_name in configured_keys, (
                f"Routine ({goal}, {focus}) references unknown exercise '{ex_name}'. "
                f"Valid exercises: {configured_keys}"
            )
            assert item["sets"] > 0, f"Sets must be positive for {ex_name}"
            assert item["reps"] > 0, f"Reps must be positive for {ex_name}"


def test_get_routines_public_no_auth(client):
    resp = client.get("/v1/routines?goal=slim")
    assert resp.status_code == 200
    body = resp.json()
    assert body["goal"] == "slim"
    assert body["focus"] is None
    assert isinstance(body["exercises"], list)
    assert len(body["exercises"]) > 0


def test_get_routines_with_focus(client):
    for goal in ["slim", "muscular", "bulk"]:
        for focus in ["legs", "upper_body", "core"]:
            resp = client.get(f"/v1/routines?goal={goal}&focus={focus}")
            assert resp.status_code == 200
            body = resp.json()
            assert body["goal"] == goal
            assert body["focus"] == focus
            assert len(body["exercises"]) > 0


def test_get_routines_missing_goal_returns_422(client):
    resp = client.get("/v1/routines")
    assert resp.status_code == 422
    assert resp.json()["error"] == "RequestValidationError"


def test_get_routines_unknown_goal_returns_422(client):
    resp = client.get("/v1/routines?goal=aerobic")
    assert resp.status_code == 422
    assert resp.json()["error"] == "RequestValidationError"


def test_get_routines_unknown_focus_returns_422(client):
    resp = client.get("/v1/routines?goal=slim&focus=neck")
    assert resp.status_code == 422
    assert resp.json()["error"] == "RequestValidationError"
