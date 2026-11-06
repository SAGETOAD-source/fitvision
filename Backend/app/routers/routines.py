"""
routines.py

Public endpoint for retrieving rules-based routine recommendations.
"""

from typing import Optional

from fastapi import APIRouter, Query
from fastapi.exceptions import RequestValidationError

from app.models.schemas import RoutineResponse
from app.services import routine_service

router = APIRouter(tags=["routines"])


@router.get("/routines", response_model=RoutineResponse)
def get_routine_plan(
    goal: str = Query(..., description="body_goal: slim, muscular, bulk"),
    focus: Optional[str] = Query(None, description="focus_area: legs, upper_body, core, or null"),
):
    """
    Public rules-based routine recommendation endpoint.
    Returns 422 for an unknown goal or focus.
    """
    try:
        return routine_service.get_routine(goal=goal, focus=focus)
    except ValueError as exc:
        param_name = "goal" if "goal" in str(exc) else "focus"
        raise RequestValidationError([
            {
                "loc": ["query", param_name],
                "msg": str(exc),
                "type": "value_error",
            }
        ]) from exc
