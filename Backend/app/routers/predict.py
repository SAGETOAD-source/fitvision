"""
predict.py

The hot path. Every frame the browser processes calls this endpoint,
so it's rate-limited per client and kept as lean as possible - the
actual model inference + rep-counting logic lives in
prediction_service.py, this file is just the HTTP adapter.
"""

from fastapi import APIRouter, Depends, Request

from app.config import get_settings
from app.dependencies import get_model_registry, get_sessions
from app.models.schemas import PredictRequest, PredictResponse
from app.rate_limit import limiter
from app.services import prediction_service
from app.services.model_registry import ModelRegistry
from app.services.session_manager import SessionManager

router = APIRouter(tags=["predict"])

_settings = get_settings()


@router.post("/predict", response_model=PredictResponse)
@limiter.limit(_settings.rate_limit_predict)
def predict(
    request: Request,  # required by slowapi's limiter decorator, unused otherwise
    body: PredictRequest,
    registry: ModelRegistry = Depends(get_model_registry),
    sessions: SessionManager = Depends(get_sessions),
):
    counter, rep_completed, feedback = prediction_service.run_prediction(
        sessions, registry, body.exercise, body.session_id, body.signals
    )
    return PredictResponse(
        state=counter.confirmed_state,
        rep_count=counter.rep_count,
        rep_completed=rep_completed,
        feedback=feedback,
    )
