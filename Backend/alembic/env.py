import os
import sys
from logging.config import fileConfig

from sqlalchemy import pool
from alembic import context
from sqlmodel import SQLModel
from dotenv import dotenv_values

# Ensure app is importable from Backend/
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import get_settings
from app.db.database import create_db_engine, normalize_database_url
# Import models to register them on SQLModel.metadata
from app.db import models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata


def get_target_url() -> str:
    """
    Determine target database URL in precedence order:
    1. Alembic -x db_url=<url> runtime argument
    2. ALEMBIC_USE_TEST_DB=1 -> TEST_DATABASE_URL
    3. Explicitly passed in config option (sqlalchemy.url)
    4. app.config.get_settings().database_url
    """
    x_args = context.get_x_argument(as_dictionary=True)
    if "db_url" in x_args and x_args["db_url"]:
        return normalize_database_url(x_args["db_url"])

    if os.getenv("ALEMBIC_USE_TEST_DB") == "1":
        test_url = os.getenv("TEST_DATABASE_URL")
        if not test_url:
            env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
            if os.path.exists(env_path):
                test_url = dotenv_values(env_path).get("TEST_DATABASE_URL")
        if test_url:
            return normalize_database_url(test_url)

    main_url = config.get_main_option("sqlalchemy.url")
    if main_url:
        return normalize_database_url(main_url)

    settings = get_settings()
    return normalize_database_url(settings.database_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_target_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    url = get_target_url()
    # Use create_db_engine with NullPool for migrations so connection is closed promptly
    connectable = create_db_engine(url, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
