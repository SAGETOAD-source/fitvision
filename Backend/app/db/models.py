"""
models.py

Database tables. Kept minimal for this phase (auth foundation only),
but UserProfile exists now - even mostly empty - so the onboarding
flow (body goal, focus areas) has a home to write into later without
a schema migration fire drill. Routine/WorkoutSession tables come in
the next phase once onboarding UI exists.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = Field(default=True)


class UserProfile(SQLModel, table=True):
    """
    One-to-one with User. Populated by the onboarding flow: body goal
    (slim/muscular/bulk) and optional focus area (e.g. "legs"). Left
    nullable so a freshly signed-up user has a row-less or
    partially-filled profile until they complete onboarding.
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, index=True)
    body_goal: Optional[str] = Field(default=None)  # "slim" | "muscular" | "bulk"
    focus_area: Optional[str] = Field(default=None)  # e.g. "legs", "upper_body", None = balanced
    onboarding_completed: bool = Field(default=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
