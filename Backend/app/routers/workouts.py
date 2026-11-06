"""
workouts.py

Authenticated endpoints for logging completed workouts and querying workout history.
"""

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.auth.dependencies import get_current_user
from app.db.database import get_session
from app.db.models import User
from app.models.schemas import CreateWorkoutRequest, WorkoutListResponse, WorkoutResponse
from app.services import workout_service

router = APIRouter(tags=["workouts"])


@router.post("/workouts", response_model=WorkoutResponse)
def record_workout(
    body: CreateWorkoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Records a completed workout session with server-generated session ID.
    Validates exercise existence, rep count (0-1000), and max 3-hour duration.
    """
    return workout_service.create_workout(
        db=db,
        user_id=current_user.id,
        request=body,
    )


@router.get("/workouts", response_model=WorkoutListResponse)
def get_workout_history(
    limit: int = Query(20, ge=1, le=100, description="Max workouts to return (1-100)"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Returns the authenticated user's workout history, ordered newest first.
    Strictly isolated: users cannot view other users' workouts.
    """
    return workout_service.list_workouts(
        db=db,
        user_id=current_user.id,
        limit=limit,
        offset=offset,
    )
