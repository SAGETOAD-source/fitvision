"""
exceptions.py

Custom exception types + a single registered handler, so every error
response has the same predictable JSON shape ({error, detail,
request_id}) regardless of which layer raised it. Callers (the
frontend, or you debugging with curl) never have to guess the error
format - and stack traces never leak to the client, only to logs.
"""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.logging_config import get_logger
from app.middleware import get_current_request_id
from app.models.schemas import ErrorResponse

logger = get_logger("fitvision.errors")


class FitVisionError(Exception):
    """Base class for all expected/handled application errors."""

    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


class UnknownExerciseError(FitVisionError):
    status_code = status.HTTP_400_BAD_REQUEST


class ModelNotLoadedError(FitVisionError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE


class SessionNotFoundError(FitVisionError):
    status_code = status.HTTP_404_NOT_FOUND


class MissingSignalError(FitVisionError):
    status_code = status.HTTP_400_BAD_REQUEST


class EmailAlreadyRegisteredError(FitVisionError):
    status_code = status.HTTP_409_CONFLICT


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(FitVisionError)
    async def handle_fitvision_error(request: Request, exc: FitVisionError):
        request_id = get_current_request_id()
        logger.warning(f"{type(exc).__name__}: {exc.detail}", extra={"request_id": request_id})
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error=type(exc).__name__,
                detail=exc.detail,
                request_id=request_id,
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception):
        request_id = get_current_request_id()
        logger.exception(f"Unhandled exception: {exc}", extra={"request_id": request_id})
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(
                error="InternalServerError",
                detail="Something went wrong. If this persists, report this request ID.",
                request_id=request_id,
            ).model_dump(),
        )
