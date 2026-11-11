"""
test_rate_limit_proxy.py

Tests for proxy-aware client IP extraction and rate limiting behind reverse proxies.
Verifies that when TRUSTED_PROXY_COUNT > 0, the limiter keys off the n-th IP from the
right of X-Forwarded-For, preventing spoofing and shared rate limits behind proxies like
Render, Railway, or Fly.io.
"""

from unittest.mock import MagicMock, patch
from starlette.requests import Request

from app.rate_limit import get_client_ip


def _make_request(xff: str | None = None, socket_ip: str = "127.0.0.1") -> Request:
    headers = []
    if xff is not None:
        headers.append((b"x-forwarded-for", xff.encode("utf-8")))
    scope = {
        "type": "http",
        "headers": headers,
        "client": (socket_ip, 12345),
    }
    return Request(scope)


def test_proxy_key_zero_proxies_ignores_xff():
    """When trusted_proxy_count == 0, X-Forwarded-For must be ignored (safe default)."""
    mock_settings = MagicMock()
    mock_settings.trusted_proxy_count = 0

    with patch("app.rate_limit.get_settings", return_value=mock_settings):
        req = _make_request(xff="203.0.113.195", socket_ip="10.0.0.1")
        assert get_client_ip(req) == "10.0.0.1"


def test_proxy_key_single_proxy_uses_rightmost_ip():
    """When trusted_proxy_count == 1, rightmost IP in X-Forwarded-For is returned."""
    mock_settings = MagicMock()
    mock_settings.trusted_proxy_count = 1

    with patch("app.rate_limit.get_settings", return_value=mock_settings):
        # Single entry
        req1 = _make_request(xff="203.0.113.195", socket_ip="10.0.0.1")
        assert get_client_ip(req1) == "203.0.113.195"

        # Multiple entries: attacker prepends a spoofed IP, proxy appends real client IP
        req2 = _make_request(xff="1.2.3.4, 203.0.113.195", socket_ip="10.0.0.1")
        assert get_client_ip(req2) == "203.0.113.195"


def test_proxy_key_single_proxy_missing_or_empty_falls_back_to_socket():
    """When header is missing or empty, fall back to socket client IP."""
    mock_settings = MagicMock()
    mock_settings.trusted_proxy_count = 1

    with patch("app.rate_limit.get_settings", return_value=mock_settings):
        req_none = _make_request(xff=None, socket_ip="10.0.0.1")
        assert get_client_ip(req_none) == "10.0.0.1"

        req_empty = _make_request(xff="", socket_ip="10.0.0.1")
        assert get_client_ip(req_empty) == "10.0.0.1"

        req_spaces = _make_request(xff="   ", socket_ip="10.0.0.1")
        assert get_client_ip(req_spaces) == "10.0.0.1"


def test_proxy_key_multiple_trusted_proxies():
    """When trusted_proxy_count == 2, returns 2nd entry from the right."""
    mock_settings = MagicMock()
    mock_settings.trusted_proxy_count = 2

    with patch("app.rate_limit.get_settings", return_value=mock_settings):
        req = _make_request(
            xff="spoofed.client.ip, 198.51.100.55, 10.0.0.2",
            socket_ip="10.0.0.1",
        )
        assert get_client_ip(req) == "198.51.100.55"


def test_proxy_key_two_proxies_with_only_one_entry_falls_back_to_socket():
    """When trusted_proxy_count == 2 but header has only 1 entry, falls back to socket IP."""
    mock_settings = MagicMock()
    mock_settings.trusted_proxy_count = 2

    with patch("app.rate_limit.get_settings", return_value=mock_settings):
        req = _make_request(xff="203.0.113.195", socket_ip="10.0.0.1")
        assert get_client_ip(req) == "10.0.0.1"


def test_proxy_rate_limit_per_client_isolation(client):
    """
    Behind a proxy (trusted_proxy_count=1), distinct client IPs in X-Forwarded-For
    get independent rate limit buckets, and spoof attempts do not bypass the limit.
    """
    mock_settings = MagicMock()
    mock_settings.trusted_proxy_count = 1
    mock_settings.rate_limit_auth = "5/minute"

    with patch("app.rate_limit.get_settings", return_value=mock_settings):
        ip1_headers = {"X-Forwarded-For": "198.51.100.1"}
        ip2_headers = {"X-Forwarded-For": "198.51.100.2"}

        # 5 login attempts from IP 1
        for _ in range(5):
            resp = client.post(
                "/v1/auth/login",
                json={"email": "nobody@example.com", "password": "wrongpassword123"},
                headers=ip1_headers,
            )
            assert resp.status_code == 401

        # 6th attempt from IP 1 is rate limited
        resp_limited = client.post(
            "/v1/auth/login",
            json={"email": "nobody@example.com", "password": "wrongpassword123"},
            headers=ip1_headers,
        )
        assert resp_limited.status_code == 429
        assert "Rate limit exceeded" in resp_limited.json()["error"]

        # IP 2 is unaffected and gets 401 instead of 429
        resp_ip2 = client.post(
            "/v1/auth/login",
            json={"email": "nobody@example.com", "password": "wrongpassword123"},
            headers=ip2_headers,
        )
        assert resp_ip2.status_code == 401

        # Attacker trying to evade limit by prepending another IP to IP 1 is still limited
        spoofed_headers = {"X-Forwarded-For": "spoofed.client.ip, 198.51.100.1"}
        resp_spoofed = client.post(
            "/v1/auth/login",
            json={"email": "nobody@example.com", "password": "wrongpassword123"},
            headers=spoofed_headers,
        )
        assert resp_spoofed.status_code == 429

