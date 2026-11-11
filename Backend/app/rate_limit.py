"""
rate_limit.py

Rate limiting via slowapi (a FastAPI-friendly wrapper around the
well-established `limits` library). Keyed by client IP by default.
When deployed behind trusted reverse proxies (e.g. Render, Railway),
TRUSTED_PROXY_COUNT in settings determines how many proxy hops to
trust from the right of X-Forwarded-For, preventing spoofing.
"""

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings


def get_client_ip(request: Request) -> str:
    n = get_settings().trusted_proxy_count
    if n > 0:
        xff = request.headers.get("x-forwarded-for")
        if xff:
            parts = [p.strip() for p in xff.split(",") if p.strip()]
            if len(parts) >= n:
                return parts[-n]
    return get_remote_address(request)


limiter = Limiter(key_func=get_client_ip)
