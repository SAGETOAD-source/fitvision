"""
database.py

Engine + session setup. Works identically against SQLite (local dev,
zero setup) and Postgres (production) - only DATABASE_URL changes,
no code does. Tables are auto-created on startup for now; once the
schema is stable and you need real migrations (adding columns without
losing data), switch to Alembic - this file's `engine` object is
exactly what an Alembic env.py would import.
"""

from sqlmodel import SQLModel, Session, create_engine

from app.config import get_settings

settings = get_settings()

# SQLite needs this flag because FastAPI can call the same connection
# from different threads (it runs sync routes in a thread pool).
# Postgres doesn't need it and ignores the extra kwarg being absent.
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args)


def init_db() -> None:
    """Create tables if they don't exist. Safe to call every startup."""
    # Importing models here (not at module top) ensures they're
    # registered on SQLModel.metadata before create_all runs.
    from app.db import models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI dependency - yields a DB session, closed after the request."""
    with Session(engine) as session:
        yield session
