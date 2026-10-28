"""
test_real_models.py

Integration tests that load the REAL trained .pkl files from the
models/ directory and verify:
  1. Every model loads without InconsistentVersionWarning.
  2. Each model is a RandomForestClassifier from sklearn.ensemble.
  3. Feature count and feature names insertion order match config["signals"].
  4. Classes match down_state and up_states contracts.
  5. Each model can run .predict() on dummy input and returns a valid state.

These tests are skipped automatically if the models/ directory is missing.
If the folder exists, any missing single .pkl file is a hard test failure.
"""

from pathlib import Path
import warnings

import numpy as np
import pytest
from sklearn.ensemble import RandomForestClassifier
from sklearn.exceptions import InconsistentVersionWarning

from app.exercises_config import EXERCISES
from app.services.model_registry import ModelRegistry


MODELS_DIR = Path(__file__).resolve().parents[2] / "models"

pytestmark = pytest.mark.skipif(
    not MODELS_DIR.is_dir(),
    reason=f"Real models directory not found at {MODELS_DIR}",
)


@pytest.fixture(scope="module")
def loaded_registry():
    """Load all configured exercise models once for the test module."""
    for exercise, config in EXERCISES.items():
        expected_path = MODELS_DIR / Path(config["model_path"]).name
        if not expected_path.is_file():
            pytest.fail(f"Required model file missing for exercise '{exercise}': {expected_path}")

    class TestSettings:
        models_dir = str(MODELS_DIR)

    registry = ModelRegistry()
    with pytest.MonkeyPatch.context() as mp:
        mp.setattr("app.services.model_registry.get_settings", lambda: TestSettings())
        registry.load_all()

    return registry


class TestRealModelLoading:
    """Load every configured exercise model from disk."""

    def test_all_models_load_without_version_warning(self):
        """ModelRegistry.load_all() must not trigger InconsistentVersionWarning."""
        for exercise, config in EXERCISES.items():
            expected_path = MODELS_DIR / Path(config["model_path"]).name
            if not expected_path.is_file():
                pytest.fail(f"Required model file missing for exercise '{exercise}': {expected_path}")

        class TestSettings:
            models_dir = str(MODELS_DIR)

        registry = ModelRegistry()
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            with pytest.MonkeyPatch.context() as mp:
                mp.setattr("app.services.model_registry.get_settings", lambda: TestSettings())
                registry.load_all()

        version_warnings = [
            w for w in caught
            if issubclass(w.category, InconsistentVersionWarning)
        ]
        assert version_warnings == [], (
            f"Got {len(version_warnings)} InconsistentVersionWarning(s); "
            "scikit-learn version in requirements.txt likely doesn't match "
            "the version used to train the models."
        )
        assert registry.missing == [], (
            f"Models missing from registry: {registry.missing}"
        )

    def test_no_models_missing(self, loaded_registry):
        """Every exercise in EXERCISES must have a loadable model."""
        assert loaded_registry.missing == [], (
            f"Models missing for: {loaded_registry.missing}"
        )
        assert sorted(loaded_registry.loaded) == sorted(EXERCISES.keys())

    @pytest.mark.parametrize("exercise", sorted(EXERCISES.keys()))
    def test_model_is_random_forest(self, exercise, loaded_registry):
        """Each loaded model must be a RandomForestClassifier."""
        model = loaded_registry.get(exercise)
        assert model is not None, f"Model for '{exercise}' not loaded"
        assert isinstance(model, RandomForestClassifier), (
            f"Expected RandomForestClassifier, got {type(model)}"
        )

    @pytest.mark.parametrize("exercise", sorted(EXERCISES.keys()))
    def test_model_features(self, exercise, loaded_registry):
        """Verify feature count and exact feature names order."""
        model = loaded_registry.get(exercise)
        assert model is not None, f"Model for '{exercise}' not loaded"
        config = EXERCISES[exercise]

        assert model.n_features_in_ == len(config["signals"]), (
            f"Model for '{exercise}' has {model.n_features_in_} features, "
            f"expected {len(config['signals'])}"
        )
        expected_features = [sig["feature_name"] for sig in config["signals"].values()]
        assert list(model.feature_names_in_) == expected_features, (
            f"Feature names order mismatch for '{exercise}': "
            f"got {list(model.feature_names_in_)}, expected {expected_features}"
        )

    @pytest.mark.parametrize("exercise", sorted(EXERCISES.keys()))
    def test_model_classes(self, exercise, loaded_registry):
        """Verify model classes match down_state and up_states contract."""
        model = loaded_registry.get(exercise)
        assert model is not None, f"Model for '{exercise}' not loaded"
        config = EXERCISES[exercise]

        down_state = config["down_state"]
        up_states = set(config["up_states"])
        expected_states = {down_state} | up_states
        model_classes = set(model.classes_)

        assert model_classes.issubset(expected_states), (
            f"Model for '{exercise}' has unexpected classes {model_classes - expected_states}. "
            f"Model classes: {model_classes}, expected subset of: {expected_states}"
        )
        assert down_state in model_classes, (
            f"Model for '{exercise}' classes {model_classes} missing down_state '{down_state}'"
        )
        assert bool(model_classes & up_states), (
            f"Model for '{exercise}' classes {model_classes} has no up states (expected at least one of {up_states})"
        )

    @pytest.mark.parametrize("exercise", sorted(EXERCISES.keys()))
    def test_model_predicts_on_dummy_input(self, exercise, loaded_registry):
        """
        Feed each model a dummy feature vector with the right number
        of columns (= number of signals) and verify .predict() returns
        a valid state label from the exercise configuration.
        """
        model = loaded_registry.get(exercise)
        assert model is not None, f"Model for '{exercise}' not loaded"
        config = EXERCISES[exercise]

        n_features = len(config["signals"])
        dummy = np.array([[90.0] * n_features])  # plausible angle values
        result = model.predict(dummy)

        assert len(result) == 1
        valid_states = {config["down_state"]} | set(config["up_states"])
        assert result[0] in valid_states, (
            f"Model for '{exercise}' predicted '{result[0]}', "
            f"expected one of {valid_states}"
        )
