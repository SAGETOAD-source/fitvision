"""
config.py

Centralized, environment-driven configuration. Nothing environment-
specific (URLs, secrets, tunable numbers) should be hardcoded anywhere
else in the app - it belongs here, sourced from env vars / .env, with
sane defaults for local dev.

This is what lets the exact same code run correctly in local dev,
staging, and production just by changing environment variables -
no code branches on "are we in prod."
"""

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- App identity ---
    app_name: str = "FitVision API"
    environment: str = Field(default="development")  # development | staging | production
    debug: bool = Field(default=False)

    # --- CORS ---
    # Comma-separated in .env, e.g. CORS_ORIGINS=https://fitvision.app,https://staging.fitvision.app
    cors_origins: str = Field(default="*")

    @property
    def cors_origin_list(self) -> List[str]:
        if self.cors_origins == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    # --- Models ---
    # Directory containing the trained .pkl files. exercises_config.py's
    # model_path entries are resolved relative to this.
    models_dir: str = Field(default="../models")

    # --- Session management ---
    # How long an idle session survives before being garbage collected.
    # Prevents unbounded memory growth from abandoned browser tabs that
    # never call /session/end.
    session_ttl_seconds: int = Field(default=1800)  # 30 minutes
    session_cleanup_interval_seconds: int = Field(default=300)  # sweep every 5 minutes

    # --- Rate limiting ---
    rate_limit_predict: str = Field(default="120/minute")  # ~2 req/sec, generous for a live rep counter
    rate_limit_default: str = Field(default="60/minute")

    # --- Logging ---
    log_level: str = Field(default="INFO")

    # --- Database ---
    # SQLite by default for local dev - zero setup required. Swap to a
    # real Postgres URL in production (e.g.
    # postgresql://user:pass@host:5432/fitvision) - SQLModel/SQLAlchemy
    # code does not change either way.
    database_url: str = Field(default="sqlite:///./fitvision.db")

    # --- Auth / JWT ---
    # MUST be overridden via env var in any real deployment. The default
    # here is only safe for local dev - never ship this literal value.
    jwt_secret_key: str = Field(default="dev-only-insecure-secret-change-me")
    jwt_algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=60 * 24 * 7)  # 7 days


@lru_cache
def get_settings() -> Settings:
    """Cached so Settings() is only constructed once per process."""
    return Settings()
