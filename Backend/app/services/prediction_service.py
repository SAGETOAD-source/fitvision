"""
prediction_service.py

The actual business logic for turning a signals payload into a rep
count. Deliberately has no knowledge of HTTP/FastAPI - it raises
plain FitVisionError subclasses, which the router layer translates
to HTTP responses. This separation is what makes the logic unit-
testable without spinning up a test client, and reusable if you ever
add a second transport (e.g. a WebSocket endpoint for lower-latency
streaming - a natural upgrade once this is working over plain HTTP).
"""

from typing import Dict

from app.exceptions import (
    MissingSignalError,
    ModelNotLoadedError,
    SessionNotFoundError,
    UnknownExerciseError,
)
from app.exercises_config import EXERCISES
from app.services.model_registry import ModelRegistry
from app.services.rep_counter import RepCounter
from app.services.session_manager import SessionManager


def validate_exercise(exercise: str) -> dict:
    config = EXERCISES.get(exercise)
    if config is None:
        raise UnknownExerciseError(
            f"Unknown exercise '{exercise}'. Available: {', '.join(sorted(EXERCISES.keys()))}"
        )
    return config


def start_session(
    session_manager: SessionManager,
    model_registry: ModelRegistry,
    exercise: str,
    session_id: str,
) -> RepCounter:
    validate_exercise(exercise)
    if not model_registry.is_loaded(exercise):
        raise ModelNotLoadedError(f"Model for '{exercise}' is not currently loaded on this server")
    return session_manager.start(session_id, exercise)


def end_session(session_manager: SessionManager, session_id: str) -> RepCounter:
    counter = session_manager.end(session_id)
    if counter is None:
        raise SessionNotFoundError(f"No active session '{session_id}'")
    return counter


def run_prediction(
    session_manager: SessionManager,
    model_registry: ModelRegistry,
    exercise: str,
    session_id: str,
    signals: Dict[str, float],
):
    config = validate_exercise(exercise)

    model = model_registry.get(exercise)
    if model is None:
        raise ModelNotLoadedError(f"Model for '{exercise}' is not currently loaded on this server")

    counter = session_manager.get(session_id)
    if counter is None:
        raise SessionNotFoundError(f"No active session '{session_id}'. Call /session/start first.")

    # Feature order must match training order - exercises_config.py's
    # "signals" dict preserves insertion order, same contract used by
    # build_feature_vector() in src/live_predict.py.
    try:
        features = [signals[name] for name in config["signals"].keys()]
    except KeyError as e:
        raise MissingSignalError(f"Missing required signal: {e}") from e

    raw_prediction = model.predict([features])[0]
    rep_completed, feedback = counter.update(raw_prediction, signals)

    return counter, rep_completed, feedback
