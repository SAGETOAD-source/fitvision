"""
test_real_models.py

Integration tests that load the REAL trained .pkl files from the
models/ directory and verify:
  1. Every model loads without InconsistentVersionWarning.
  2. Each model is a RandomForestClassifier.
  3. Each model can run .predict() on a dummy input whose feature
     count matches the exercise's signal count.

These tests are skipped automatically (not failed) if the models/
directory is missing — e.g. in a CI environment that doesn't ship
the .pkl files.
"""

import os
import warnings

import numpy as np
import pytest
from sklearn.ensemble._forest import RandomForestClassifier

from app.exercises_config import EXERCISES
from app.services.model_registry import ModelRegistry
from app.config import get_settings


# Resolve the models directory the same way ModelRegistry does.
_MODELS_DIR = get_settings().models_dir or os.path.join(
    os.path.dirname(__file__), "..", "..", "models"
)
_MODELS_DIR = os.path.normpath(_MODELS_DIR)

_models_available = os.path.isdir(_MODELS_DIR) and any(
    f.endswith(".pkl") for f in os.listdir(_MODELS_DIR)
)

pytestmark = pytest.mark.skipif(
    not _models_available,
    reason=f"Real model files not found in {_MODELS_DIR}",
)


class TestRealModelLoading:
    """Load every configured exercise model from disk."""

    def test_all_models_load_without_version_warning(self):
        """ModelRegistry.load_all() must not trigger InconsistentVersionWarning."""
        registry = ModelRegistry()

        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            registry.load_all()

        version_warnings = [
            w for w in caught
            if "InconsistentVersionWarning" in str(type(w.category))
        ]
        assert version_warnings == [], (
            f"Got {len(version_warnings)} InconsistentVersionWarning(s); "
            "scikit-learn version in requirements.txt likely doesn't match "
            "the version used to train the models."
        )

    def test_no_models_missing(self):
        """Every exercise in EXERCISES must have a loadable model."""
        registry = ModelRegistry()
        registry.load_all()

        assert registry.missing == [], (
            f"Models missing for: {registry.missing}"
        )
        assert sorted(registry.loaded) == sorted(EXERCISES.keys())

    @pytest.mark.parametrize("exercise", sorted(EXERCISES.keys()))
    def test_model_is_random_forest(self, exercise):
        """Each loaded model must be a RandomForestClassifier."""
        registry = ModelRegistry()
        registry.load_all()

        model = registry.get(exercise)
        assert model is not None, f"Model for '{exercise}' not loaded"
        assert isinstance(model, RandomForestClassifier), (
            f"Expected RandomForestClassifier, got {type(model)}"
        )

    @pytest.mark.parametrize("exercise", sorted(EXERCISES.keys()))
    def test_model_predicts_on_dummy_input(self, exercise):
        """
        Feed each model a dummy feature vector with the right number
        of columns (= number of signals) and verify .predict() returns
        a single string label without crashing.
        """
        registry = ModelRegistry()
        registry.load_all()

        model = registry.get(exercise)
        assert model is not None

        n_features = len(EXERCISES[exercise]["signals"])
        dummy = np.array([[90.0] * n_features])  # plausible angle values
        result = model.predict(dummy)

        assert len(result) == 1
        assert isinstance(result[0], str), (
            f"Expected a string label, got {type(result[0])}"
        )
