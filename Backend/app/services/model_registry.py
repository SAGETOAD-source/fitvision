"""
model_registry.py

Loads every exercise's trained model once at startup and holds it in
memory for the life of the process. Centralizing this means:

  - The app fails fast and loudly at startup if a model is missing,
    rather than failing on a random user's first /predict call.
  - Reload logic (for deploying a newly trained exercise without a
    full restart) lives in exactly one place.
  - It's trivially mockable in tests via dependency injection - tests
    never need real .pkl files on disk.
"""

import os
from typing import Dict, List, Optional

import joblib

from app.exercises_config import EXERCISES
from app.logging_config import get_logger

logger = get_logger("fitvision.models")


class ModelRegistry:
    def __init__(self):
        self._models: Dict[str, object] = {}
        self._missing: List[str] = []

    def load_all(self) -> None:
        self._models.clear()
        self._missing.clear()

        for name, config in EXERCISES.items():
            path = config["model_path"]
            if os.path.exists(path):
                try:
                    self._models[name] = joblib.load(path)
                    logger.info(f"Loaded model for '{name}' from {path}")
                except Exception as e:
                    logger.error(f"Failed to load model for '{name}' at {path}: {e}")
                    self._missing.append(name)
            else:
                logger.warning(f"Model not found for '{name}' at {path} - endpoint will 503 for this exercise")
                self._missing.append(name)

    def get(self, exercise: str) -> Optional[object]:
        return self._models.get(exercise)

    def is_loaded(self, exercise: str) -> bool:
        return exercise in self._models

    @property
    def loaded(self) -> List[str]:
        return sorted(self._models.keys())

    @property
    def missing(self) -> List[str]:
        return sorted(self._missing)


# Single shared instance for the process. FastAPI's dependency system
# (see app/dependencies.py) hands this out to route handlers, and
# tests override it with a stub registry - see tests/conftest.py.
model_registry = ModelRegistry()
