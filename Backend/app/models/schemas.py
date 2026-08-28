"""
schemas.py

All request/response shapes in one place. Keeping these separate
from the route handlers (routers/) and from business logic
(services/) means the API contract is easy to review or diff on
its own, and easy to reuse in tests.
"""

from typing import Dict, Optional

from pydantic import BaseModel, Field, field_validator


class ExerciseInfo(BaseModel):
    display_name: str


class ExercisesResponse(BaseModel):
    exercises: Dict[str, ExerciseInfo]


class StartSessionRequest(BaseModel):
    exercise: str
    session_id: str = Field(..., min_length=1, max_length=128)


class SessionResponse(BaseModel):
    session_id: str
    exercise: str
    rep_count: int


class PredictRequest(BaseModel):
    exercise: str
    session_id: str = Field(..., min_length=1, max_length=128)
    signals: Dict[str, float]

    @field_validator("signals")
    @classmethod
    def signals_not_empty(cls, v: Dict[str, float]) -> Dict[str, float]:
        if not v:
            raise ValueError("signals must contain at least one value")
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


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    id: int
    email: str
    created_at: str
