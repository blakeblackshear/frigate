"""Tests for GenAI enablement gating in the embeddings maintainer.

Covers creating post processors when GenAI is enabled at runtime, and the
per-camera gating those processors apply once they exist.
"""

import sys
import unittest
from types import SimpleNamespace
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
from frigate.comms.embeddings_updater import EmbeddingsRequestEnum  # noqa: E402
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

    def test_genai_config_update_rebinds_semantic_search_client(self):
        """Runtime GenAI changes must not leave embeddings on the old client."""
        maintainer = self._make_maintainer()
        old_provider = SimpleNamespace(
            provider=SimpleNamespace(value="vllm"),
            model="Qwen/Qwen3-VL-Embedding-2B",
            provider_options={},
        )
        new_provider = SimpleNamespace(
            provider=SimpleNamespace(value="vllm"),
            model="Qwen/Qwen3-VL-Embedding-8B",
            provider_options={},
        )
        maintainer.config.genai = {"qwen": old_provider}
        maintainer.config.semantic_search.model = "qwen"
        maintainer.embeddings = MagicMock()
        new_client = MagicMock()
        maintainer.genai_manager.embeddings_client = new_client
        maintainer.enrichment_config_subscriber = MagicMock()
        maintainer.enrichment_config_subscriber.check_for_update.return_value = (
            "config/genai",
            {"qwen": new_provider},
        )
        maintainer.realtime_processors = []

        with self.assertLogs("frigate.embeddings.maintainer", level="WARNING"):
            maintainer._check_enrichment_config_updates()

        maintainer.genai_manager.update_config.assert_called_once_with(
            maintainer.config
        )
        maintainer.embeddings.mark_embedding_config_update.assert_called_once_with()
        maintainer.embeddings.update_genai_client.assert_called_once_with(new_client)
        maintainer.embeddings.start_reindex.assert_called_once_with(
            restart_if_running=True
        )
        self.assertIs(maintainer.config.genai["qwen"], new_provider)

    def test_same_vector_space_update_restores_index_readiness(self):
        """Connection-only changes must not force a full historical reindex."""
        maintainer = self._make_maintainer()
        old_provider = SimpleNamespace(
            provider=SimpleNamespace(value="vllm"),
            model="Qwen/Qwen3-VL-Embedding-2B",
            provider_options={},
            base_url="http://old-vllm:8000/v1",
        )
        new_provider = SimpleNamespace(
            provider=SimpleNamespace(value="vllm"),
            model="Qwen/Qwen3-VL-Embedding-2B",
            provider_options={},
            base_url="http://new-vllm:8000/v1",
        )
        maintainer.config.genai = {"qwen": old_provider}
        maintainer.config.semantic_search.model = "qwen"
        maintainer.embeddings = MagicMock()
        maintainer.embeddings.mark_embedding_config_update.return_value = True
        maintainer.genai_manager.embeddings_client = MagicMock()
        maintainer.enrichment_config_subscriber = MagicMock()
        maintainer.enrichment_config_subscriber.check_for_update.return_value = (
            "config/genai",
            {"qwen": new_provider},
        )
        maintainer.realtime_processors = []

        maintainer._check_enrichment_config_updates()

        maintainer.embeddings.start_reindex.assert_not_called()
        maintainer.embeddings.restore_index_ready.assert_called_once_with(True)

    def test_transport_fix_retries_an_unavailable_index(self):
        """Fixing a provider after reindex failure must retry the same vector space."""
        maintainer = self._make_maintainer()
        old_provider = SimpleNamespace(
            provider=SimpleNamespace(value="vllm"),
            model="Qwen/Qwen3-VL-Embedding-2B",
            provider_options={},
            base_url="http://old-vllm:8000/v1",
        )
        new_provider = SimpleNamespace(
            provider=SimpleNamespace(value="vllm"),
            model="Qwen/Qwen3-VL-Embedding-2B",
            provider_options={},
            base_url="http://new-vllm:8000/v1",
        )
        maintainer.config.genai = {"qwen": old_provider}
        maintainer.config.semantic_search.model = "qwen"
        maintainer.embeddings = MagicMock()
        maintainer.embeddings.mark_embedding_config_update.return_value = False
        maintainer.genai_manager.embeddings_client = MagicMock()
        maintainer.enrichment_config_subscriber = MagicMock()
        maintainer.enrichment_config_subscriber.check_for_update.return_value = (
            "config/genai",
            {"qwen": new_provider},
        )
        maintainer.realtime_processors = []

        with self.assertLogs("frigate.embeddings.maintainer", level="WARNING"):
            maintainer._check_enrichment_config_updates()

        maintainer.embeddings.start_reindex.assert_called_once_with(
            restart_if_running=True
        )
        maintainer.embeddings.restore_index_ready.assert_not_called()

    def test_invalid_embedding_provider_update_rolls_back(self):
        """A failed hot update must keep the maintainer on its previous config."""
        maintainer = self._make_maintainer()
        old_provider = SimpleNamespace(
            provider=SimpleNamespace(value="vllm"),
            model="Qwen/Qwen3-VL-Embedding-2B",
            provider_options={},
        )
        new_provider = SimpleNamespace(
            provider=SimpleNamespace(value="vllm"),
            model="Qwen/Qwen3-VL-Embedding-8B",
            provider_options={},
        )
        old_config = {"qwen": old_provider}
        maintainer.config.genai = old_config
        maintainer.config.semantic_search.model = "qwen"
        maintainer.embeddings = MagicMock()
        maintainer.genai_manager.embeddings_client = None
        maintainer.enrichment_config_subscriber = MagicMock()
        maintainer.enrichment_config_subscriber.check_for_update.return_value = (
            "config/genai",
            {"qwen": new_provider},
        )
        maintainer.realtime_processors = []

        with self.assertLogs("frigate.embeddings.maintainer", level="ERROR"):
            maintainer._check_enrichment_config_updates()

        self.assertIs(maintainer.config.genai, old_config)
        self.assertEqual(maintainer.genai_manager.update_config.call_count, 2)
        maintainer.embeddings.update_genai_client.assert_not_called()
        maintainer.embeddings.start_reindex.assert_not_called()
        maintainer.embeddings.restore_index_ready.assert_called_once_with(
            maintainer.embeddings.mark_embedding_config_update.return_value
        )

    def test_embedding_provider_outage_does_not_escape_finalized_event(self):
        """A transient embedding failure must not kill the maintainer loop."""
        maintainer = self._make_maintainer()
        maintainer.config.semantic_search.enabled = True
        maintainer.embeddings = MagicMock()
        maintainer.embeddings.embed_thumbnail.side_effect = RuntimeError(
            "provider offline"
        )

        with self.assertLogs("frigate.embeddings.maintainer", level="ERROR"):
            maintainer._embed_thumbnail("event-id", b"jpeg")

        maintainer.embeddings.embed_thumbnail.assert_called_once_with(
            "event-id", b"jpeg"
        )

    def test_missing_finalized_thumbnail_is_skipped(self):
        """An event without a thumbnail must not call the embedding backend."""
        maintainer = self._make_maintainer()
        maintainer.config.semantic_search.enabled = True
        maintainer.embeddings = MagicMock()

        maintainer._embed_thumbnail("event-id", None)

        maintainer.embeddings.embed_thumbnail.assert_not_called()

    def test_search_request_skips_an_incomplete_index(self):
        """Chat and API text searches must not query a partial vector space."""
        maintainer = self._make_maintainer()
        maintainer.config.semantic_search.enabled = True
        maintainer.embeddings = MagicMock()
        maintainer.embeddings.index_ready = False
        maintainer.embeddings_responder = MagicMock()

        maintainer._process_requests()

        handler = maintainer.embeddings_responder.check_for_request.call_args.args[0]
        response = handler(
            EmbeddingsRequestEnum.generate_search.value,
            "red car",
        )
        self.assertIsNone(response)
        maintainer.embeddings.embed_description.assert_not_called()

        status = handler(EmbeddingsRequestEnum.index_ready.value, {})
        self.assertEqual(status, {"ready": False, "model_id": None})


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

    def test_embedding_outage_does_not_escape_description_thread(self):
        """A generated description remains saved when its embedding call fails."""
        processor = self._make_processor(enabled=True)
        processor.config.semantic_search.enabled = True
        processor.embeddings = MagicMock()
        processor.embeddings.embed_description.side_effect = RuntimeError(
            "provider offline"
        )
        processor.genai_manager.description_client.generate_object_description.return_value = "A red car"
        processor.semantic_trigger_processor = MagicMock()
        event = SimpleNamespace(id="event-id", camera="front")

        with self.assertLogs(
            "frigate.data_processing.post.object_descriptions", level="ERROR"
        ):
            processor._genai_embed_description(event, [b"jpeg"])

        processor.requestor.send_data.assert_called_once()
        processor.semantic_trigger_processor.process_data.assert_not_called()
