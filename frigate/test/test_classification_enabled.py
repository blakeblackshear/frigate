"""Tests that disabled custom classification models are not registered or run."""

import sys
import unittest
from unittest.mock import MagicMock

# Mock TFLite before importing the maintainer / classification modules
_MOCK_MODULES = [
    "tflite_runtime",
    "tflite_runtime.interpreter",
    "ai_edge_litert",
    "ai_edge_litert.interpreter",
]
for mod in _MOCK_MODULES:
    if mod not in sys.modules:
        sys.modules[mod] = MagicMock()

from frigate.data_processing.real_time.custom_classification import (  # noqa: E402
    CustomObjectClassificationProcessor,
)
from frigate.embeddings.maintainer import EmbeddingMaintainer  # noqa: E402


class TestCustomClassificationEnabledGating(unittest.TestCase):
    """A model with enabled: false must not keep a processor registered."""

    def _make_maintainer(self) -> EmbeddingMaintainer:
        # Bypass the heavy __init__; only the attributes touched by the
        # config update path are needed for these tests.
        maintainer = EmbeddingMaintainer.__new__(EmbeddingMaintainer)
        maintainer.realtime_processors = []
        maintainer.config = MagicMock()
        maintainer.config.classification.custom = {}
        maintainer.requestor = MagicMock()
        maintainer.metrics = MagicMock()
        maintainer.event_metadata_publisher = MagicMock()
        return maintainer

    def _make_model_config(self, name: str, enabled: bool) -> MagicMock:
        model_config = MagicMock()
        model_config.name = name
        model_config.enabled = enabled
        model_config.state_config = None
        return model_config

    def _make_processor(self, name: str) -> MagicMock:
        processor = MagicMock(spec=CustomObjectClassificationProcessor)
        processor.model_config = MagicMock()
        processor.model_config.name = name
        return processor

    def test_disabled_update_tears_down_existing_processor(self):
        """Toggling a running model to disabled shuts down and drops its processor."""
        maintainer = self._make_maintainer()
        processor = self._make_processor("atli")
        maintainer.realtime_processors = [processor]

        maintainer._handle_custom_classification_update(
            "config/classification/custom/atli",
            self._make_model_config("atli", enabled=False),
        )

        processor.shutdown.assert_called_once()
        self.assertEqual(maintainer.realtime_processors, [])

    def test_disabled_update_does_not_register_processor(self):
        """A disabled model that has no processor is never registered."""
        maintainer = self._make_maintainer()

        maintainer._handle_custom_classification_update(
            "config/classification/custom/atli",
            self._make_model_config("atli", enabled=False),
        )

        self.assertEqual(maintainer.realtime_processors, [])

    def test_disabled_update_leaves_other_processors_untouched(self):
        """Disabling one model must not affect other running processors."""
        maintainer = self._make_maintainer()
        other = self._make_processor("simbi")
        maintainer.realtime_processors = [other]

        maintainer._handle_custom_classification_update(
            "config/classification/custom/atli",
            self._make_model_config("atli", enabled=False),
        )

        other.shutdown.assert_not_called()
        self.assertEqual(maintainer.realtime_processors, [other])

    def test_removed_model_tears_down_processor(self):
        """A None payload (model deleted) still shuts down its processor."""
        maintainer = self._make_maintainer()
        processor = self._make_processor("atli")
        maintainer.realtime_processors = [processor]

        maintainer._handle_custom_classification_update(
            "config/classification/custom/atli", None
        )

        processor.shutdown.assert_called_once()
        self.assertEqual(maintainer.realtime_processors, [])


if __name__ == "__main__":
    unittest.main()
