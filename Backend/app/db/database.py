"""
database.py

Engine + session setup. Supports SQLite (local dev, zero setup) and
Postgres / Neon (production).

For Postgres (Neon):
- Automatically rewrites `postgresql://` and `postgres://` to `postgresql+psycopg://`
  so the psycopg 3 driver is used.
- Uses `pool_pre_ping=True` and `pool_recycle=300` because Neon suspends
  idle compute endpoints after ~5 minutes, which would otherwise cause
  broken pipe / connection closed errors on stale pool connections.
- Tables are NOT auto-created on startup for Postgres; schema is managed
  via Alembic migrations (`alembic upgrade head`). For SQLite, `init_db()`
  still calls `SQLModel.metadata.create_all(engine)` for dev/test convenience.
"""

from typing import Any, Dict
from sqlalchemy import pool
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.engine import Engine

from app.config import get_settings


def normalize_database_url(url: str) -> str:
    """
    Ensure postgres URLs explicitly use the psycopg 3 driver dialect.
    Rewrites postgresql:// or postgres:// to postgresql+psycopg:// in one place.
    """
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def create_db_engine(url: str, **kwargs: Any) -> Engine:
    """
    Create a SQLAlchemy Engine with sensible settings per dialect.
    """
    normalized_url = normalize_database_url(url)
    if normalized_url.startswith("sqlite"):
        connect_args: Dict[str, Any] = kwargs.pop("connect_args", {})
        # SQLite needs check_same_thread=False for multi-threaded access in FastAPI
        connect_args.setdefault("check_same_thread", False)
        return create_engine(normalized_url, connect_args=connect_args, **kwargs)

    # Postgres / Neon engine settings
    engine_kwargs: Dict[str, Any] = {
        "pool_pre_ping": True,
        "pool_recycle": 300,  # Recycle connections before Neon 5-minute compute suspension
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 30.0,
    }
    engine_kwargs.update(kwargs)

    # NullPool (e.g. used in Alembic migrations or scripts) does not support pool sizing kwargs
    if engine_kwargs.get("poolclass") is pool.NullPool:
        engine_kwargs.pop("pool_size", None)
        engine_kwargs.pop("max_overflow", None)
        engine_kwargs.pop("pool_timeout", None)

    return create_engine(normalized_url, **engine_kwargs)


settings = get_settings()
engine = create_db_engine(settings.database_url)


def init_db() -> None:
    """
    Create tables if they don't exist for SQLite.
    For Postgres, migrations must be executed via 'alembic upgrade head'.
    """
    if not settings.database_url.startswith("sqlite"):
        return

    # Importing models here ensures they are registered on SQLModel.metadata
    from app.db import models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI dependency - yields a DB session, closed after the request."""
    with Session(engine) as session:
        yield session
