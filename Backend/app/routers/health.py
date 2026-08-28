"""
health.py

Two distinct checks, deliberately not merged into one:

  GET /health       - liveness: "is the process up." Should basically
                       never fail. Used by orchestrators to decide
                       whether to restart the container.

  GET /health/ready  - readiness: "is it safe to send this instance
                       real traffic." Fails if models aren't loaded.
                       Used by load balancers to decide whether to
                       route traffic here yet - important during
                       rolling deploys so a fresh instance doesn't
                       receive requests before its models finish
                       loading.
"""

from fastapi import APIRouter, Depends, Response, status

from app.config import get_settings
from app.dependencies import get_model_registry, get_sessions
from app.exercises_config import EXERCISES
from app.models.schemas import HealthResponse
from app.services.model_registry import ModelRegistry
from app.services.session_manager import SessionManager

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def liveness(
    registry: ModelRegistry = Depends(get_model_registry),
    sessions: SessionManager = Depends(get_sessions),
):
    settings = get_settings()
    return HealthResponse(
        status="ok",
        environment=settings.environment,
        models_loaded=registry.loaded,
        models_missing=registry.missing,
        active_sessions=sessions.active_count(),
    )


@router.get("/health/ready")
def readiness(response: Response, registry: ModelRegistry = Depends(get_model_registry)):
    all_loaded = len(registry.missing) == 0 and len(registry.loaded) == len(EXERCISES)
    if not all_loaded:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"ready": False, "missing_models": registry.missing}
    return {"ready": True, "missing_models": []}
