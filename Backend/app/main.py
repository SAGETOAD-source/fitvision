"""
main.py

Application entrypoint. Responsible for wiring everything together:
config, logging, models, sessions, middleware, routers, and a clean
startup/shutdown lifecycle - and nothing else. Business logic lives
in services/, HTTP shape lives in routers/ and models/.

Run with:
    uvicorn app.main:app --reload          (dev)
    uvicorn app.main:app --workers 4        (prod, behind a process manager)
"""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.db.database import init_db
from app.exceptions import register_exception_handlers
from app.logging_config import configure_logging, get_logger
from app.middleware import RequestContextMiddleware
from app.rate_limit import limiter
from app.routers import auth, exercises, health, predict, sessions
from app.services.model_registry import model_registry
from app.services.session_manager import init_session_manager

logger = get_logger("fitvision.main")


async def _session_cleanup_loop(interval_seconds: int) -> None:
    """
    Background task: periodically evict idle sessions so a user who
    never calls /session/end (closed tab, lost connection, etc.)
    doesn't leak memory forever. Started in the lifespan below and
    cancelled cleanly on shutdown.
    """
    from app.services.session_manager import get_session_manager

    while True:
        await asyncio.sleep(interval_seconds)
        try:
            get_session_manager().sweep_expired()
        except Exception as e:
            logger.error(f"Session cleanup sweep failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging()

    logger.info(f"Starting {settings.app_name} in '{settings.environment}' mode")

    # Create DB tables if they don't exist yet. Fine for this phase;
    # switch to Alembic migrations once the schema needs to evolve
    # without losing existing data.
    init_db()
    logger.info(f"Database ready at {settings.database_url}")

    # Load all trained models into memory once, up front. If any are
    # missing, we log it and keep running - /predict for that specific
    # exercise will 503 rather than the whole app failing to start,
    # since other exercises may still be usable.
    model_registry.load_all()
    if model_registry.missing:
        logger.warning(f"Startup complete with missing models: {model_registry.missing}")
    else:
        logger.info(f"All models loaded: {model_registry.loaded}")

    init_session_manager(ttl_seconds=settings.session_ttl_seconds)

    cleanup_task = asyncio.create_task(
        _session_cleanup_loop(settings.session_cleanup_interval_seconds)
    )

    yield  # ---- app is now serving requests ----

    logger.info("Shutting down - cancelling background tasks")
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        lifespan=lifespan,
    )

    # --- Rate limiting ---
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # --- CORS ---
    from fastapi.middleware.cors import CORSMiddleware

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Request context (request IDs, access logging) ---
    app.add_middleware(RequestContextMiddleware)

    # --- Consistent error responses ---
    register_exception_handlers(app)

    # --- Routes ---
    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(exercises.router)
    app.include_router(sessions.router)
    app.include_router(predict.router)

    return app


app = create_app()
