"""
sessions.py

Session start/end endpoints. All actual logic lives in
services/prediction_service.py - this file only translates HTTP
requests into service calls and service results into HTTP responses.
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.auth.dependencies import get_current_user
from app.db.database import get_session
from app.db.models import User
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
    current_user: User = Depends(get_current_user),
):
    counter = prediction_service.start_session(sessions, registry, body.exercise, body.session_id, str(current_user.id))
    return SessionResponse(session_id=body.session_id, exercise=counter.exercise_name, rep_count=counter.rep_count)


@router.post("/end", response_model=SessionResponse)
def end_session(
    session_id: str,
    sessions: SessionManager = Depends(get_sessions),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    counter = prediction_service.end_session(
        sessions, session_id, str(current_user.id), db=db, user_id=current_user.id
    )
    return SessionResponse(session_id=session_id, exercise=counter.exercise_name, rep_count=counter.rep_count)
