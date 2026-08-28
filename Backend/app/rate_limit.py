"""
rate_limit.py

Rate limiting via slowapi (a FastAPI-friendly wrapper around the
well-established `limits` library). Keyed by client IP by default -
good enough as a first line of defense against a runaway/buggy
client hammering /predict. If you later put this behind Cloudflare
or another edge proxy, you may want to key off a forwarded-for header
instead; slowapi supports a custom key_func for that.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
