"""
schemas.py

All request/response shapes in one place. Keeping these separate
from the route handlers (routers/) and from business logic
(services/) means the API contract is easy to review or diff on
its own, and easy to reuse in tests.
"""

import math
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

# RFC 5322 compliant practical email pattern requiring valid local-part and domain with TLD
EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$"
)


def validate_and_normalize_email(v: str) -> str:
    if not isinstance(v, str):
        raise ValueError("Email must be a string")
    normalized = v.strip().lower()
    if not normalized or len(normalized) > 254:
        raise ValueError("Invalid email length")
    if not EMAIL_REGEX.match(normalized):
        raise ValueError("Invalid email format")
    return normalized


# --- Exercise config response shapes ---

class SignalInfo(BaseModel):
    points: List[str]       # landmark name strings, e.g. ["LEFT_HIP", "LEFT_KNEE", "LEFT_ANKLE"]
    feature_name: str       # must match training CSV column name


class ExtraSignalInfo(BaseModel):
    points: List[str]
    type: str


class ExerciseConfig(BaseModel):
    display_name: str
    signals: Dict[str, SignalInfo]              # ordered dict; insertion order = feature order
    extra_signals: Dict[str, ExtraSignalInfo]   # e.g. {"torso": ...} for latpulldown
    down_state: str
    up_states: List[str]                        # sorted list (original config uses set)
    count_on: str
    primary_signal: str
    min_valid_range: float
    good_depth_threshold: Optional[float]
    extra_range_checks: Dict[str, float]
    form_warnings: Dict[str, Any]
    visibility_threshold: float
    rotate_frame: Optional[str]                 # e.g. "ROTATE_90_CLOCKWISE" or null


class ExercisesResponse(BaseModel):
    exercises: Dict[str, ExerciseConfig]


class ExerciseInfo(BaseModel):
    """Kept for internal use; full shape is ExerciseConfig."""
    display_name: str


# --- Session ---

class StartSessionRequest(BaseModel):
    exercise: str
    session_id: str = Field(..., min_length=1, max_length=128)


class SessionResponse(BaseModel):
    session_id: str
    exercise: str
    rep_count: int


class EndSessionRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=128)


# --- Predict ---

class PredictRequest(BaseModel):
    exercise: Optional[str] = None   # optional; if provided, must match the session's exercise
    session_id: str = Field(..., min_length=1, max_length=128)
    signals: Dict[str, float]

    @field_validator("signals")
    @classmethod
    def signals_not_empty(cls, v: Dict[str, float]) -> Dict[str, float]:
        if not v:
            raise ValueError("signals must contain at least one value")
        return v

    @field_validator("signals")
    @classmethod
    def validate_signal_values(cls, v: Dict[str, float]) -> Dict[str, float]:
        for name, val in v.items():
            if math.isnan(val) or math.isinf(val) or not (0.0 <= val <= 360.0):
                raise ValueError(
                    f"Signal '{name}' has invalid value {val}. "
                    "All signals must be finite numbers in the range [0, 360]."
                )
        return v


class PredictResponse(BaseModel):
    state: Optional[str]
    rep_count: int
    rep_completed: bool
    feedback: Optional[str]


class HealthResponse(BaseModel):
    status: str
    environment: str
    models_loaded: list[str]
    models_missing: list[str]
    active_sessions: int


class ErrorResponse(BaseModel):
    error: str
    detail: str
    request_id: str


# --- Auth ---

class SignupRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return validate_and_normalize_email(v)


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return validate_and_normalize_email(v)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    id: int
    email: str
    created_at: str


# --- Profile ---

class ProfileResponse(BaseModel):
    body_goal: Optional[str] = None
    focus_area: Optional[str] = None
    onboarding_completed: bool = False


class UpdateProfileRequest(BaseModel):
    body_goal: str
    focus_area: Optional[str] = None

    @field_validator("body_goal")
    @classmethod
    def validate_body_goal(cls, v: str) -> str:
        allowed = {"slim", "muscular", "bulk"}
        if v not in allowed:
            raise ValueError(f"body_goal must be one of {sorted(allowed)}")
        return v

    @field_validator("focus_area")
    @classmethod
    def validate_focus_area(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            allowed = {"legs", "upper_body", "core"}
            if v not in allowed:
                raise ValueError(f"focus_area must be one of {sorted(allowed)} or null")
        return v


# --- Routines ---

class RoutineExercise(BaseModel):
    exercise: str
    sets: int
    reps: int


class RoutineResponse(BaseModel):
    goal: str
    focus: Optional[str] = None
    exercises: List[RoutineExercise]


# --- Workouts (History) ---

class CreateWorkoutRequest(BaseModel):
    exercise: str
    rep_count: int = Field(..., ge=0, le=1000)
    started_at: datetime
    ended_at: datetime

    @field_validator("exercise")
    @classmethod
    def validate_exercise_exists(cls, v: str) -> str:
        from app.exercises_config import EXERCISES
        if v not in EXERCISES:
            raise ValueError(
                f"Unknown exercise '{v}'. Available: {', '.join(sorted(EXERCISES.keys()))}"
            )
        return v

    @field_validator("ended_at")
    @classmethod
    def validate_dates_order(cls, v: datetime, info) -> datetime:
        started_at = info.data.get("started_at")
        if started_at is not None:
            if v < started_at:
                raise ValueError("ended_at must be greater than or equal to started_at")
            duration_seconds = (v - started_at).total_seconds()
            if duration_seconds > 3 * 3600:
                raise ValueError("Workout duration cannot exceed 3 hours")
        return v


class WorkoutResponse(BaseModel):
    id: int
    session_id: str
    exercise: str
    rep_count: int
    started_at: datetime
    ended_at: datetime


class WorkoutListResponse(BaseModel):
    workouts: List[WorkoutResponse]
    total: int
    limit: int
    offset: int


# --- Stats ---

class DailyReps(BaseModel):
    date: str  # YYYY-MM-DD (UTC)
    reps: int


class StatsResponse(BaseModel):
    total_workouts: int
    total_reps: int
    reps_per_exercise: Dict[str, int]
    current_streak_days: int
    reps_last_7_days: List[DailyReps]

