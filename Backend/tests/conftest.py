"""
conftest.py

Test fixtures. The key idea: tests never touch real trained models
or a shared session store, and never touch a real database file -
each test gets a fresh in-memory SQLite DB. Fast, isolated, and
tests can't leave stray rows behind for other tests to trip over.
"""

from typing import List

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.db.database import get_session
from app.dependencies import get_model_registry, get_sessions
from app.main import app
from app.services.session_manager import SessionManager


class _StubModel:
    """Returns predictions from a pre-scripted list, one per call, then repeats the last one."""

    def __init__(self, predictions: List[str]):
        self._predictions = predictions
        self._call_count = 0

    def predict(self, X):
        idx = min(self._call_count, len(self._predictions) - 1)
        self._call_count += 1
        return [self._predictions[idx]]


class StubModelRegistry:
    """Drop-in replacement for ModelRegistry that doesn't need real .pkl files."""

    def __init__(self, scripted_predictions: dict[str, List[str]] | None = None):
        self._scripts = scripted_predictions or {}
        self._models = {name: _StubModel(preds) for name, preds in self._scripts.items()}

    def get(self, exercise: str):
        return self._models.get(exercise)

    def is_loaded(self, exercise: str) -> bool:
        return exercise in self._models

    @property
    def loaded(self):
        return sorted(self._models.keys())

    @property
    def missing(self):
        return []


@pytest.fixture
def stub_registry():
    """
    Default stub: squat scripted to go down -> up, which should
    produce exactly one completed rep given STABLE_FRAMES_REQUIRED=4
    and a real angle swing.
    """
    return StubModelRegistry(
        {
            "squat": ["squat_down"] * 5 + ["squat_up"] * 5,
            "situp": ["situp_up"] * 5 + ["situp_down"] * 5,
        }
    )


@pytest.fixture
def client(stub_registry):
    # In-memory SQLite, fresh per test. StaticPool keeps it alive for
    # the duration of the test (a plain in-memory DB would otherwise
    # vanish between connections).
    test_engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(test_engine)

    def get_test_session():
        with Session(test_engine) as session:
            yield session

    # IMPORTANT: create one SessionManager instance and always return
    # the *same* object, not a new one per call. FastAPI resolves
    # Depends(...) fresh on every request; a lambda that instantiates
    # a new SessionManager each time would silently lose all session
    # state between the /session/start and /predict calls in a test.
    test_session_manager = SessionManager(ttl_seconds=3600)

    app.dependency_overrides[get_model_registry] = lambda: stub_registry
    app.dependency_overrides[get_sessions] = lambda: test_session_manager
    app.dependency_overrides[get_session] = get_test_session

    with TestClient(app) as test_client:
        # Expose the engine so tests can query rows directly (e.g. to
        # verify WorkoutSession persistence after /session/end).
        test_client.test_engine = test_engine
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client):
    """
    Signs up a fresh user and returns a Bearer token header dict,
    reusable by any test that hits an authenticated endpoint.

    Usage::

        def test_foo(client, auth_headers):
            resp = client.post("/session/start", json={...}, headers=auth_headers)
    """
    client.post("/auth/signup", json={"email": "test@example.com", "password": "password123"})
    resp = client.post("/auth/login", json={"email": "test@example.com", "password": "password123"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_client(client):
    client.post("/auth/signup", json={"email": "test@example.com", "password": "password123"})
    resp = client.post("/auth/login", json={"email": "test@example.com", "password": "password123"})
    token = resp.json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client


@pytest.fixture
def auth_client_2(client):
    client.post("/auth/signup", json={"email": "test2@example.com", "password": "password123"})
    resp = client.post("/auth/login", json={"email": "test2@example.com", "password": "password123"})
    token = resp.json()["access_token"]
    
    from app.main import app
    from fastapi.testclient import TestClient
    
    new_client = TestClient(app)
    new_client.headers.update({"Authorization": f"Bearer {token}"})
    return new_client

