"""
dependencies.py

FastAPI dependency providers. Routes ask for these by type via
Depends(...) instead of importing global singletons directly - this
is what lets tests swap in fakes (a stub ModelRegistry with no real
.pkl files, a fresh SessionManager per test) via
app.dependency_overrides, without touching route code at all.
"""

from app.services.model_registry import model_registry as _model_registry
from app.services.model_registry import ModelRegistry
from app.services.session_manager import get_session_manager, SessionManager


def get_model_registry() -> ModelRegistry:
    return _model_registry


def get_sessions() -> SessionManager:
    return get_session_manager()
