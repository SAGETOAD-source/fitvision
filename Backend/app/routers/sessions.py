"""
sessions.py

Session start/end endpoints. All actual logic lives in
services/prediction_service.py - this file only translates HTTP
requests into service calls and service results into HTTP responses.
"""

from fastapi import APIRouter, Depends

from app.dependencies import get_model_registry, get_sessions
from app.models.schemas import SessionResponse, StartSessionRequest
from app.services import prediction_service
from app.services.model_registry import ModelRegistry
from app.services.session_manager import SessionManager

router = APIRouter(prefix="/session", tags=["sessions"])


@router.post("/start", response_model=SessionResponse)
def start_session(
    body: StartSessionRequest,
    registry: ModelRegistry = Depends(get_model_registry),
    sessions: SessionManager = Depends(get_sessions),
):
    counter = prediction_service.start_session(sessions, registry, body.exercise, body.session_id)
    return SessionResponse(session_id=body.session_id, exercise=counter.exercise_name, rep_count=counter.rep_count)


@router.post("/end", response_model=SessionResponse)
def end_session(
    session_id: str,
    sessions: SessionManager = Depends(get_sessions),
):
    counter = prediction_service.end_session(sessions, session_id)
    return SessionResponse(session_id=session_id, exercise=counter.exercise_name, rep_count=counter.rep_count)
