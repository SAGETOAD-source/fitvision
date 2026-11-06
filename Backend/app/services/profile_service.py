"""
profile_service.py

Business logic for user profile and onboarding management.
Follows the layered pattern: HTTP-independent, acts on DB session and models.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select

from app.db.models import UserProfile
from app.models.schemas import ProfileResponse


def get_profile(db: Session, user_id: int) -> ProfileResponse:
    """
    Returns the user's profile. If no row exists, returns defaults
    (null, null, false) without creating a row.
    """
    profile = db.exec(
        select(UserProfile).where(UserProfile.user_id == user_id)
    ).first()

    if profile is None:
        return ProfileResponse(
            body_goal=None,
            focus_area=None,
            onboarding_completed=False,
        )

    return ProfileResponse(
        body_goal=profile.body_goal,
        focus_area=profile.focus_area,
        onboarding_completed=profile.onboarding_completed,
    )


def upsert_profile(
    db: Session,
    user_id: int,
    body_goal: str,
    focus_area: Optional[str],
) -> ProfileResponse:
    """
    Upserts the user's profile. Sets onboarding_completed=True when body_goal is set,
    and updates updated_at timestamp.
    """
    profile = db.exec(
        select(UserProfile).where(UserProfile.user_id == user_id)
    ).first()

    now = datetime.now(timezone.utc)
    if profile is None:
        profile = UserProfile(
            user_id=user_id,
            body_goal=body_goal,
            focus_area=focus_area,
            onboarding_completed=True,
            updated_at=now,
        )
        db.add(profile)
    else:
        profile.body_goal = body_goal
        profile.focus_area = focus_area
        profile.onboarding_completed = True
        profile.updated_at = now
        db.add(profile)

    db.commit()
    db.refresh(profile)

    return ProfileResponse(
        body_goal=profile.body_goal,
        focus_area=profile.focus_area,
        onboarding_completed=profile.onboarding_completed,
    )
