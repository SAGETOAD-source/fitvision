"""
test_postgres_smoke.py

Smoke test against a real PostgreSQL (Neon) database.
Runs ONLY when TEST_DATABASE_URL is set in the environment or Backend/.env.
Skipped cleanly otherwise.

Verifies:
1. Alembic migrations run cleanly to 'head' on PostgreSQL.
2. User signup (/auth/signup) creates a user in Postgres and returns token.
3. User login (/auth/login) returns a valid JWT token.
4. Protected endpoint (/auth/me) resolves the user.
5. Starting and ending a session (/session/start, /session/end) persists a
   WorkoutSession row in PostgreSQL.
6. All test data created during the run is cleaned up.
7. Datetime columns in Postgres are TIMESTAMPTZ (timestamp with time zone).
8. Mixed-case emails are normalized and work seamlessly on PostgreSQL.
"""

import os
from pathlib import Path
import uuid
import pytest
from dotenv import dotenv_values
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlmodel import Session, select

from app.db.database import create_db_engine, get_session
from app.db.models import User, UserProfile, WorkoutSession
from app.dependencies import get_model_registry, get_sessions
from app.main import app
from app.services.session_manager import SessionManager
from tests.conftest import StubModelRegistry


def _resolve_test_db_url() -> str | None:
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        env_path = Path(__file__).resolve().parents[1] / ".env"
        if env_path.exists():
            vals = dotenv_values(str(env_path))
            url = vals.get("TEST_DATABASE_URL")
    return url.strip() if url else None


TEST_DB_URL = _resolve_test_db_url()

if not TEST_DB_URL:
    pytest.skip("TEST_DATABASE_URL is not set; skipping Postgres smoke test", allow_module_level=True)


@pytest.fixture(scope="module")
def pg_engine():
    from alembic import command
    from alembic.config import Config

    backend_dir = Path(__file__).resolve().parents[1]
    alembic_ini = backend_dir / "alembic.ini"

    # Run Alembic migrations up to head on the test database
    alembic_cfg = Config(str(alembic_ini))
    alembic_cfg.set_main_option("sqlalchemy.url", TEST_DB_URL)
    alembic_cfg.set_section_option("alembic", "prepend_sys_path", str(backend_dir))
    command.upgrade(alembic_cfg, "head")

    engine = create_db_engine(TEST_DB_URL)
    yield engine
    engine.dispose()


def test_postgres_end_to_end_smoke(pg_engine):
    unique_suffix = uuid.uuid4().hex[:8]
    test_email = f"pg_smoke_{unique_suffix}@fitvision.test"
    test_password = "SmokeTestPassword123!"
    session_id = f"pg_sess_{unique_suffix}"

    def get_test_pg_session():
        with Session(pg_engine) as session:
            yield session

    stub_registry = StubModelRegistry(
        {
            "squat": ["squat_down"] * 5 + ["squat_up"] * 5,
        }
    )
    test_session_manager = SessionManager(ttl_seconds=3600)

    app.dependency_overrides[get_model_registry] = lambda: stub_registry
    app.dependency_overrides[get_sessions] = lambda: test_session_manager
    app.dependency_overrides[get_session] = get_test_pg_session

    user_id = None
    try:
        with TestClient(app) as client:
            # 1. Sign up
            signup_resp = client.post(
                "/auth/signup",
                json={"email": test_email, "password": test_password},
            )
            assert signup_resp.status_code == 200, f"Signup failed: {signup_resp.text}"
            signup_data = signup_resp.json()
            assert "access_token" in signup_data
            assert signup_data.get("token_type") == "bearer"

            # 2. Log in
            login_resp = client.post(
                "/auth/login",
                json={"email": test_email, "password": test_password},
            )
            assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
            token = login_resp.json()["access_token"]
            auth_headers = {"Authorization": f"Bearer {token}"}

            # 3. Check /auth/me
            me_resp = client.get("/auth/me", headers=auth_headers)
            assert me_resp.status_code == 200, f"/auth/me failed: {me_resp.text}"
            me_data = me_resp.json()
            assert me_data["email"] == test_email
            user_id = me_data["id"]
            assert user_id is not None

            # 4. Start a workout session
            start_resp = client.post(
                "/session/start",
                json={"exercise": "squat", "session_id": session_id},
                headers=auth_headers,
            )
            assert start_resp.status_code == 200, f"Start session failed: {start_resp.text}"

            # 5. End session
            end_resp = client.post(
                f"/session/end?session_id={session_id}",
                headers=auth_headers,
            )
            assert end_resp.status_code == 200, f"End session failed: {end_resp.text}"
            end_data = end_resp.json()
            assert end_data["session_id"] == session_id

            # 6. Direct verification in Postgres database
            with Session(pg_engine) as session:
                persisted_session = session.exec(
                    select(WorkoutSession).where(WorkoutSession.session_id == session_id)
                ).first()
                assert persisted_session is not None, "WorkoutSession row not found in PostgreSQL"
                assert persisted_session.user_id == user_id
                assert persisted_session.exercise == "squat"

                persisted_user = session.exec(
                    select(User).where(User.email == test_email)
                ).first()
                assert persisted_user is not None
                assert persisted_user.id == user_id

    finally:
        # Cleanup test records from PostgreSQL
        with Session(pg_engine) as session:
            # Delete workout sessions
            sessions_to_del = session.exec(
                select(WorkoutSession).where(WorkoutSession.session_id == session_id)
            ).all()
            for s in sessions_to_del:
                session.delete(s)

            # Delete profiles and user if created
            if user_id:
                profiles_to_del = session.exec(
                    select(UserProfile).where(UserProfile.user_id == user_id)
                ).all()
                for p in profiles_to_del:
                    session.delete(p)

                user_to_del = session.exec(
                    select(User).where(User.id == user_id)
                ).first()
                if user_to_del:
                    session.delete(user_to_del)

            session.commit()

        app.dependency_overrides.clear()


def test_postgres_timezone_aware_columns(pg_engine):
    """Verify that all datetime columns in Postgres are TIMESTAMPTZ."""
    with pg_engine.connect() as conn:
        query = text("""
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND column_name IN ('created_at', 'updated_at', 'started_at', 'ended_at')
            ORDER BY table_name, column_name;
        """)
        rows = conn.execute(query).mappings().all()
        column_types = {f"{r['table_name']}.{r['column_name']}": r['data_type'] for r in rows}

        expected_columns = [
            "user.created_at",
            "userprofile.updated_at",
            "workoutsession.started_at",
            "workoutsession.ended_at",
        ]
        for col in expected_columns:
            assert col in column_types, f"Column {col} not found in PostgreSQL schema"
            assert column_types[col] == "timestamp with time zone", (
                f"Expected {col} to be 'timestamp with time zone', got '{column_types[col]}'"
            )


def test_postgres_email_case_insensitivity_and_normalization(pg_engine):
    """Verify that mixed-case emails are normalized and match correctly on PostgreSQL."""
    unique_suffix = uuid.uuid4().hex[:8]
    mixed_email = f"PG_MixedCase_{unique_suffix}@FitVision.Test"
    expected_normalized = mixed_email.strip().lower()
    test_password = "SmokeTestPassword123!"

    def get_test_pg_session():
        with Session(pg_engine) as session:
            yield session

    app.dependency_overrides[get_session] = get_test_pg_session

    user_id = None
    try:
        with TestClient(app) as client:
            signup_resp = client.post(
                "/auth/signup",
                json={"email": mixed_email, "password": test_password},
            )
            assert signup_resp.status_code == 200

            # Log in using lowercase
            login_resp = client.post(
                "/auth/login",
                json={"email": expected_normalized, "password": test_password},
            )
            assert login_resp.status_code == 200
            token = login_resp.json()["access_token"]

            me_resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert me_resp.status_code == 200
            assert me_resp.json()["email"] == expected_normalized
            user_id = me_resp.json()["id"]

    finally:
        with Session(pg_engine) as session:
            if user_id:
                user_to_del = session.exec(select(User).where(User.id == user_id)).first()
                if user_to_del:
                    session.delete(user_to_del)
                session.commit()
        app.dependency_overrides.clear()
