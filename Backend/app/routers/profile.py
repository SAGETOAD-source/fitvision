"""
profile.py

Router for user profile retrieval and onboarding update endpoints.
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.auth.dependencies import get_current_user
from app.db.database import get_session
from app.db.models import User
from app.models.schemas import ProfileResponse, UpdateProfileRequest
from app.services import profile_service

router = APIRouter(tags=["profile"])


@router.get("/profile", response_model=ProfileResponse)
def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Returns the user's profile. If the user has no row in UserProfile,
    returns default null values and onboarding_completed=false without
    creating a row in the database.
    """
    return profile_service.get_profile(db=db, user_id=current_user.id)


@router.put("/profile", response_model=ProfileResponse)
def update_user_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Upserts the user's profile with their body goal and optional focus area.
    Sets onboarding_completed=True and updates the updated_at timestamp.
    """
    return profile_service.upsert_profile(
        db=db,
        user_id=current_user.id,
        body_goal=body.body_goal,
        focus_area=body.focus_area,
    )
