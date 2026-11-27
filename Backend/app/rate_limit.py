"""
rate_limit.py

Rate limiting via slowapi (a FastAPI-friendly wrapper around the
well-established `limits` library). Keyed by client IP by default.
When deployed behind trusted reverse proxies (e.g. Render, Railway),
TRUSTED_PROXY_COUNT in settings determines how many proxy hops to
trust from the right of X-Forwarded-For, preventing spoofing.
"""

import hmac
import ipaddress

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings


def _valid_ip(value: str) -> str | None:
    candidate = value.strip()
    if not candidate or len(candidate) > 45:
        return None
    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        return None


def get_client_ip(request: Request) -> str:
    settings = get_settings()
    secret = settings.bff_proxy_secret if isinstance(settings.bff_proxy_secret, str) else ""
    provided_secret = request.headers.get("x-fitvision-proxy-secret") or ""

    # Only trust BFF client IP attribution after constant-time shared secret verification.
    if secret and provided_secret and hmac.compare_digest(provided_secret, secret):
        validated_ip = _valid_ip(request.headers.get("x-fitvision-client-ip") or "")
        if validated_ip:
            return f"bff:{validated_ip}"

    n = settings.trusted_proxy_count
    if n > 0:
        xff = request.headers.get("x-forwarded-for")
        if xff:
            parts = [p.strip() for p in xff.split(",") if p.strip()]
            if len(parts) >= n:
                return parts[-n]
    return get_remote_address(request)


limiter = Limiter(key_func=get_client_ip)
