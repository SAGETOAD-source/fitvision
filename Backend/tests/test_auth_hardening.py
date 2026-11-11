"""
test_auth_hardening.py

Covers the auth hardening batch: email normalization, bcrypt 72-byte
password limit, signup race (IntegrityError -> 409), auth rate limiting,
production startup guard, and handler-level request_id logging.
"""

import logging
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.config import DEFAULT_JWT_SECRET, Settings
from app.db.models import User
from app.logging_config import configure_logging
from app.main import app

PASSWORD = "correcthorse123"


# --- Email normalization ---

def test_email_is_stripped_and_lowercased_on_signup_and_login(client):
    resp = client.post("/v1/auth/signup", json={"email": "  Foo@Example.COM  ", "password": PASSWORD})
    assert resp.status_code == 200

    resp = client.post("/v1/auth/login", json={"email": "FOO@example.com", "password": PASSWORD})
    assert resp.status_code == 200

    with Session(client.test_engine) as db:
        emails = [u.email for u in db.exec(select(User)).all()]
    assert emails == ["foo@example.com"]


def test_signup_duplicate_email_with_different_case_is_409(client):
    client.post("/v1/auth/signup", json={"email": "Case@Example.com", "password": PASSWORD})
    resp = client.post("/v1/auth/signup", json={"email": "case@example.COM", "password": PASSWORD})
    assert resp.status_code == 409
    assert resp.json()["error"] == "EmailAlreadyRegisteredError"


# --- bcrypt 72-byte limit ---

def test_password_over_72_bytes_ascii_rejected(client):
    resp = client.post("/v1/auth/signup", json={"email": "long@example.com", "password": "a" * 73})
    assert resp.status_code == 422


def test_password_over_72_bytes_multibyte_rejected(client):
    # 40 chars (passes max_length=128) but 120 bytes in UTF-8.
    resp = client.post("/v1/auth/signup", json={"email": "multi@example.com", "password": "€" * 40})
    assert resp.status_code == 422


def test_password_exactly_72_bytes_accepted(client):
    resp = client.post("/v1/auth/signup", json={"email": "edge@example.com", "password": "a" * 72})
    assert resp.status_code == 200


# --- Signup race ---

def test_signup_integrity_error_returns_409_and_session_stays_usable(client):
    client.post("/v1/auth/signup", json={"email": "race@example.com", "password": PASSWORD})

    # Simulate the race: the pre-check sees no existing user, so the INSERT hits the unique index.
    fake_result = MagicMock()
    fake_result.first.return_value = None
    with patch.object(Session, "exec", return_value=fake_result):
        resp = client.post("/v1/auth/signup", json={"email": "race@example.com", "password": PASSWORD})

    assert resp.status_code == 409
    assert resp.json()["error"] == "EmailAlreadyRegisteredError"

    with Session(client.test_engine) as db:
        assert len(db.exec(select(User)).all()) == 1


# --- Rate limiting ---

def test_login_is_rate_limited_after_five_attempts(client):
    payload = {"email": "nobody@example.com", "password": "whatever123"}
    for _ in range(5):
        assert client.post("/v1/auth/login", json=payload).status_code == 401
    assert client.post("/v1/auth/login", json=payload).status_code == 429


def test_signup_is_rate_limited_after_five_attempts(client):
    for i in range(5):
        resp = client.post("/v1/auth/signup", json={"email": f"u{i}@example.com", "password": PASSWORD})
        assert resp.status_code == 200
    resp = client.post("/v1/auth/signup", json={"email": "u5@example.com", "password": PASSWORD})
    assert resp.status_code == 429


# --- Production startup guard ---

def _prod_settings(**overrides) -> Settings:
    values = {
        "environment": "production",
        "jwt_secret_key": "x" * 64,
        "cors_origins": "https://fitvision.example",
    }
    values.update(overrides)
    return Settings(**values)


def test_production_with_default_jwt_secret_refuses_to_start():
    with patch("app.main.get_settings", return_value=_prod_settings(jwt_secret_key=DEFAULT_JWT_SECRET)):
        with pytest.raises(RuntimeError, match="JWT_SECRET_KEY"):
            with TestClient(app):
                pass


def test_production_with_wildcard_cors_refuses_to_start():
    with patch("app.main.get_settings", return_value=_prod_settings(cors_origins="*")):
        with pytest.raises(RuntimeError, match="CORS_ORIGINS"):
            with TestClient(app):
                pass


def test_production_with_valid_config_starts():
    with patch("app.main.get_settings", return_value=_prod_settings()):
        with TestClient(app) as c:
            assert c.get("/health").status_code == 200


# --- Logging ---

@pytest.fixture
def restore_root_logging():
    root = logging.getLogger()
    handlers, level = root.handlers[:], root.level
    yield
    root.handlers = handlers
    root.setLevel(level)


def test_uvicorn_error_logs_format_with_request_id(capsys, restore_root_logging):
    configure_logging()
    logging.getLogger("uvicorn.error").info("hello from uvicorn")

    captured = capsys.readouterr()
    assert "uvicorn.error | - | hello from uvicorn" in captured.out
    assert "Logging error" not in captured.err
