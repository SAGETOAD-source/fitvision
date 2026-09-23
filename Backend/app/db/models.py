"""
models.py

Database tables. Auth foundation (User, UserProfile) plus workout
history persistence (WorkoutSession). WorkoutSession is written on
/session/end so the app accumulates per-user rep history from day one.
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


class WorkoutSession(SQLModel, table=True):
    """
    One row per completed workout session. Written by
    prediction_service.end_session() immediately after the
    RepCounter is popped from in-memory state, so nothing is lost
    even if the client never calls /session/end explicitly (the TTL
    sweep handles those via a separate housekeeping path).
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    session_id: str = Field(index=True)
    exercise: str
    rep_count: int
    started_at: datetime
    ended_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
