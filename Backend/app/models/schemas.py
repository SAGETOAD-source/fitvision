"""
schemas.py

All request/response shapes in one place. Keeping these separate
from the route handlers (routers/) and from business logic
(services/) means the API contract is easy to review or diff on
its own, and easy to reuse in tests.
"""

import re
from typing import Dict, Optional

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
