"""
routine_service.py

Rules-based routine recommendation service.
Looks up static routines from routines_data.py without ML dependencies.
"""

from typing import Optional

from app.models.schemas import RoutineExercise, RoutineResponse
from app.routines_data import ROUTINES

VALID_GOALS = {"slim", "muscular", "bulk"}
VALID_FOCUS_AREAS = {"legs", "upper_body", "core", None}


def get_routine(goal: str, focus: Optional[str] = None) -> RoutineResponse:
    normalized_goal = goal.strip().lower() if isinstance(goal, str) else ""
    if normalized_goal not in VALID_GOALS:
        raise ValueError(
            f"Unknown goal '{goal}'. Must be one of: {', '.join(sorted(VALID_GOALS))}"
        )

    normalized_focus: Optional[str] = None
    if focus is not None:
        stripped = focus.strip().lower()
        if stripped in ("", "balanced", "none"):
            normalized_focus = None
        elif stripped in VALID_FOCUS_AREAS:
            normalized_focus = stripped
        else:
            raise ValueError(
                f"Unknown focus '{focus}'. Must be one of: legs, upper_body, core, or null"
            )

    exercises_data = ROUTINES.get((normalized_goal, normalized_focus))
    if exercises_data is None:
        # Fallback to balanced if specific focus not defined
        exercises_data = ROUTINES.get((normalized_goal, None), [])

    return RoutineResponse(
        goal=normalized_goal,
        focus=normalized_focus,
        exercises=[RoutineExercise(**ex) for ex in exercises_data],
    )
