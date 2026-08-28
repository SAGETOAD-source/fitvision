"""
middleware.py

Two pieces of cross-cutting behavior every request should get:

1. A unique request ID, generated per request and echoed back in the
   `X-Request-ID` response header - lets a frontend or client log a
   failing request ID and you can grep it straight out of backend logs.
2. Timing + structured access logging (method, path, status, duration).
"""

import time
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.logging_config import get_logger

logger = get_logger("fitvision.access")

_request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")


def get_current_request_id() -> str:
    return _request_id_ctx.get()


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
        token = _request_id_ctx.set(request_id)
        start = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.error(
                f"{request.method} {request.url.path} -> UNHANDLED EXCEPTION ({duration_ms:.1f}ms)",
                extra={"request_id": request_id},
            )
            raise
        finally:
            _request_id_ctx.reset(token)

        duration_ms = (time.perf_counter() - start) * 1000
        logger.info(
            f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms:.1f}ms)",
            extra={"request_id": request_id},
        )
        response.headers["X-Request-ID"] = request_id
        return response
