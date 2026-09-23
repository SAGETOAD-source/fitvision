import os
from unittest.mock import patch

from app.services.model_registry import ModelRegistry


def test_model_registry_uses_custom_models_dir(monkeypatch):
    registry = ModelRegistry()
    
    # Fake settings object to return our custom directory
    class FakeSettings:
        models_dir = "/fake/custom/models/path"
        
    with patch("app.services.model_registry.get_settings", return_value=FakeSettings()), \
         patch("app.services.model_registry.joblib.load") as mock_load, \
         patch("app.services.model_registry.os.path.exists", return_value=True):
        
        registry.load_all()
        
        # Verify joblib.load was called.
        assert mock_load.called
        
        # Check all calls to joblib.load to ensure the path was prefixed with our custom directory
        for call in mock_load.call_args_list:
            called_path = call[0][0]
            expected_prefix = os.path.normpath("/fake/custom/models/path")
            called_path_norm = os.path.normpath(called_path)
            assert called_path_norm.startswith(expected_prefix)
