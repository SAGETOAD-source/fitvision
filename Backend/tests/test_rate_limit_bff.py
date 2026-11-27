"""
test_rate_limit_bff.py

Tests for BFF shared-secret visitor IP attribution in Backend/app/rate_limit.py
and production CORS hardening in Backend/app/config.py & Backend/app/main.py.
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app


def _prod_settings(**overrides) -> Settings:
    values = {
        "environment": "production",
        "jwt_secret_key": "x" * 64,
        "cors_origins": "https://fitvision.vercel.app/",
        "bff_proxy_secret": "test-shared-bff-secret-value-1234",
    }
    values.update(overrides)
    return Settings(**values)


def test_bff_proxy_isolates_visitors_and_blocks_direct_spoofing(client):
    """
    With BFF_PROXY_SECRET set, verified Vercel BFF callers get isolated 5/minute
    auth buckets per X-FitVision-Client-IP while direct callers without the
    shared secret cannot spoof X-FitVision-Client-IP or bypass limits.
    """
    mock_settings = MagicMock()
    mock_settings.trusted_proxy_count = 1
    mock_settings.bff_proxy_secret = "shared-bff-secret-xyz"
    mock_settings.rate_limit_auth = "5/minute"

    with patch("app.rate_limit.get_settings", return_value=mock_settings):
        user_a_headers = {
            "X-Forwarded-For": "76.76.21.10",
            "X-FitVision-Proxy-Secret": "shared-bff-secret-xyz",
            "X-FitVision-Client-IP": "198.51.100.10",
        }
        user_b_headers = {
            "X-Forwarded-For": "76.76.21.10",
            "X-FitVision-Proxy-Secret": "shared-bff-secret-xyz",
            "X-FitVision-Client-IP": "198.51.100.20",
        }

        # User A hits 5/min auth limit even though Vercel egress IP matches User B
        for _ in range(5):
            resp = client.post(
                "/v1/auth/login",
                json={"email": "nobody@example.com", "password": "wrongpassword123"},
                headers=user_a_headers,
            )
            assert resp.status_code == 401

        assert (
            client.post(
                "/v1/auth/login",
                json={"email": "nobody@example.com", "password": "wrongpassword123"},
                headers=user_a_headers,
            ).status_code
            == 429
        )

        # User B behind the same Vercel egress IP stays unaffected
        assert (
            client.post(
                "/v1/auth/login",
                json={"email": "nobody@example.com", "password": "wrongpassword123"},
                headers=user_b_headers,
            ).status_code
            == 401
        )

        # Direct attacker with wrong secret cannot spoof X-FitVision-Client-IP to evade limit
        for idx in range(5):
            resp = client.post(
                "/v1/auth/login",
                json={"email": "nobody@example.com", "password": "wrongpassword123"},
                headers={
                    "X-Forwarded-For": "203.0.113.77",
                    "X-FitVision-Proxy-Secret": "wrong-secret",
                    "X-FitVision-Client-IP": f"192.0.2.{idx + 1}",
                },
            )
            assert resp.status_code == 401

        spoofed_direct = client.post(
            "/v1/auth/login",
            json={"email": "nobody@example.com", "password": "wrongpassword123"},
            headers={
                "X-Forwarded-For": "203.0.113.77",
                "X-FitVision-Proxy-Secret": "wrong-secret",
                "X-FitVision-Client-IP": "192.0.2.99",
            },
        )
        assert spoofed_direct.status_code == 429

        # Malformed X-FitVision-Client-IP cannot inject custom bucket keys even with secret
        assert (
            client.post(
                "/v1/auth/login",
                json={"email": "nobody@example.com", "password": "wrongpassword123"},
                headers={
                    "X-Forwarded-For": "203.0.113.77",
                    "X-FitVision-Proxy-Secret": "shared-bff-secret-xyz",
                    "X-FitVision-Client-IP": "not-an-ip",
                },
            ).status_code
            == 429
        )


def test_cors_origin_list_normalizes_trailing_slashes():
    s = _prod_settings(cors_origins="https://fitvision.vercel.app/, https://fitvision.app/")
    assert s.cors_origin_list == [
        "https://fitvision.vercel.app",
        "https://fitvision.app",
    ]


def test_production_refuses_wildcard_in_comma_list_or_empty_cors():
    with patch(
        "app.main.get_settings",
        return_value=_prod_settings(cors_origins="https://fitvision.vercel.app, *"),
    ):
        with pytest.raises(RuntimeError, match="CORS_ORIGINS"):
            with TestClient(app):
                pass

    with patch("app.main.get_settings", return_value=_prod_settings(cors_origins="   ")):
        with pytest.raises(RuntimeError, match="CORS_ORIGINS"):
            with TestClient(app):
                pass
