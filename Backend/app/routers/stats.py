"""
stats.py

Authenticated endpoint for retrieving personal training statistics.
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.auth.dependencies import get_current_user
from app.db.database import get_session
from app.db.models import User
from app.models.schemas import StatsResponse
from app.services import workout_service

router = APIRouter(tags=["stats"])


@router.get("/stats", response_model=StatsResponse)
def get_user_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Returns personal training statistics for the current user:
    - total workouts & reps
    - reps per exercise breakdown
    - current streak in UTC days
    - 7-day chronological reps breakdown in UTC days
    """
    return workout_service.get_stats(db=db, user_id=current_user.id)
