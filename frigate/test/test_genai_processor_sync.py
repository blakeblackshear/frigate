"""Tests for GenAI enablement gating in the embeddings maintainer.

Covers creating post processors when GenAI is enabled at runtime, and the
per-camera gating those processors apply once they exist.
"""

import sys
import unittest
from unittest.mock import MagicMock, patch

# Mock TFLite before importing the maintainer
_MOCK_MODULES = [
    "tflite_runtime",
    "tflite_runtime.interpreter",
    "ai_edge_litert",
    "ai_edge_litert.interpreter",
]
for mod in _MOCK_MODULES:
    if mod not in sys.modules:
        sys.modules[mod] = MagicMock()

# imported from the maintainer to avoid tripping the circular import between
# the maintainer and the processor modules
from frigate.embeddings.maintainer import (  # noqa: E402
    EmbeddingMaintainer,
    ObjectDescriptionProcessor,
    PostProcessDataEnum,
    ReviewDescriptionProcessor,
)


class TestGenAIProcessorSync(unittest.TestCase):
    """Enabling GenAI on the first camera must not require a restart."""

    def _make_maintainer(
        self,
        review: bool = False,
        objects: bool = False,
        review_in_config: bool | None = None,
        objects_in_config: bool | None = None,
    ) -> EmbeddingMaintainer:
        # Bypass the heavy __init__; only the attributes touched by
        # _sync_genai_processors are needed for these tests.
        maintainer = EmbeddingMaintainer.__new__(EmbeddingMaintainer)
        maintainer.post_processors = []
        maintainer.config = MagicMock()
        maintainer.config.cameras = {
            "front": self._make_camera(
                review,
                objects,
                review if review_in_config is None else review_in_config,
                objects if objects_in_config is None else objects_in_config,
            )
        }
        maintainer.config_updater = MagicMock()
        maintainer.embeddings = None
        maintainer.requestor = MagicMock()
        maintainer.metrics = MagicMock()
        maintainer.genai_manager = MagicMock()
        maintainer.semantic_trigger_processor = None
        return maintainer

    def _make_camera(
        self,
        review: bool,
        objects: bool,
        review_in_config: bool,
        objects_in_config: bool,
    ) -> MagicMock:
        camera = MagicMock()
        camera.review.genai.enabled = review
        camera.review.genai.enabled_in_config = review_in_config
        camera.objects.genai.enabled = objects
        camera.objects.genai.enabled_in_config = objects_in_config
        return camera

    def _processor_types(self, maintainer: EmbeddingMaintainer) -> list[type]:
        return [type(p) for p in maintainer.post_processors]

    def test_no_processors_when_genai_disabled(self):
        """A config with no GenAI cameras registers neither processor."""
        maintainer = self._make_maintainer()

        maintainer._sync_genai_processors()

        self.assertEqual(maintainer.post_processors, [])

    def test_review_processor_added_when_enabled_after_startup(self):
        """Enabling review GenAI on the first camera registers the processor."""
        maintainer = self._make_maintainer()
        maintainer._sync_genai_processors()

        camera = maintainer.config.cameras["front"]
        camera.review.genai.enabled = True
        camera.review.genai.enabled_in_config = True
        maintainer._sync_genai_processors()

        self.assertEqual(
            self._processor_types(maintainer), [ReviewDescriptionProcessor]
        )

    def test_object_processor_added_when_enabled_after_startup(self):
        """Enabling object GenAI on the first camera registers the processor."""
        maintainer = self._make_maintainer()
        maintainer._sync_genai_processors()

        camera = maintainer.config.cameras["front"]
        camera.objects.genai.enabled = True
        camera.objects.genai.enabled_in_config = True
        maintainer._sync_genai_processors()

        self.assertEqual(
            self._processor_types(maintainer), [ObjectDescriptionProcessor]
        )

    def test_processor_added_when_only_enabled_by_profile(self):
        """A profile enables GenAI without setting enabled_in_config."""
        maintainer = self._make_maintainer(
            review=True, objects=True, review_in_config=False, objects_in_config=False
        )

        maintainer._sync_genai_processors()

        self.assertEqual(
            self._processor_types(maintainer),
            [ReviewDescriptionProcessor, ObjectDescriptionProcessor],
        )

    def test_processors_are_not_duplicated(self):
        """Repeated config updates must not register a second processor."""
        maintainer = self._make_maintainer(review=True, objects=True)

        maintainer._sync_genai_processors()
        maintainer._sync_genai_processors()

        self.assertEqual(
            self._processor_types(maintainer),
            [ReviewDescriptionProcessor, ObjectDescriptionProcessor],
        )

    def test_genai_topic_triggers_sync(self):
        """A camera config update on a GenAI topic registers the processor."""
        maintainer = self._make_maintainer(review=True)
        maintainer.config_updater.check_for_updates.return_value = {"review": ["front"]}

        maintainer._check_camera_config_updates()

        self.assertEqual(
            self._processor_types(maintainer), [ReviewDescriptionProcessor]
        )

    def test_unrelated_topic_does_not_sync(self):
        """An unrelated camera config update must not register processors."""
        maintainer = self._make_maintainer(review=True)
        maintainer.config_updater.check_for_updates.return_value = {"motion": ["front"]}

        maintainer._check_camera_config_updates()

        self.assertEqual(maintainer.post_processors, [])


class TestObjectDescriptionCameraGating(unittest.TestCase):
    """One camera enabling object descriptions must not enlist the others."""

    def _make_processor(self, enabled: bool) -> ObjectDescriptionProcessor:
        config = MagicMock()
        camera = MagicMock()
        camera.objects.genai.enabled = enabled
        camera.objects.genai.send_triggers.after_significant_updates = None
        config.cameras = {"front": camera}

        genai_manager = MagicMock()
        genai_manager.description_client = MagicMock()

        return ObjectDescriptionProcessor(
            config, None, MagicMock(), MagicMock(), genai_manager, None
        )

    def _update(self, processor: ObjectDescriptionProcessor) -> None:
        processor.process_data(
            {
                "camera": "front",
                "data": {
                    "id": "1234.5-abcdef",
                    "box": (0, 0, 10, 10),
                    "stationary": False,
                },
                "state": "update",
                "yuv_frame": MagicMock(),
            },
            PostProcessDataEnum.tracked_object,
        )

    @patch("frigate.data_processing.post.object_descriptions.create_thumbnail")
    def test_disabled_camera_collects_no_thumbnails(self, mock_create_thumbnail):
        """A camera with object descriptions off does no thumbnail work."""
        processor = self._make_processor(enabled=False)

        self._update(processor)

        mock_create_thumbnail.assert_not_called()
        self.assertEqual(processor.tracked_events, {})

    @patch("frigate.data_processing.post.object_descriptions.create_thumbnail")
    def test_enabled_camera_collects_thumbnails(self, mock_create_thumbnail):
        """A camera with object descriptions on still collects thumbnails."""
        mock_create_thumbnail.return_value = b"jpg"
        processor = self._make_processor(enabled=True)

        self._update(processor)

        mock_create_thumbnail.assert_called_once()
        self.assertEqual(len(processor.tracked_events["1234.5-abcdef"]), 1)
