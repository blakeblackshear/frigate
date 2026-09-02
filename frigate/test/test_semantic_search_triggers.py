"""Tests for semantic search trigger synchronization."""

import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Lock
from types import SimpleNamespace
from unittest.mock import MagicMock, call, patch

import numpy as np

import frigate.embeddings as embeddings_package
from frigate.data_processing.post.semantic_trigger import SemanticTriggerProcessor
from frigate.embeddings.embeddings import Embeddings
from frigate.embeddings.util import ZScoreNormalization, get_semantic_search_model_id
from frigate.util.builtin import serialize

EmbeddingsContext = embeddings_package.EmbeddingsContext


class TestSemanticSearchTriggerSync(unittest.TestCase):
    def test_stale_background_embedding_retries_before_upsert(self):
        embeddings = Embeddings.__new__(Embeddings)
        embeddings._embedding_state_lock = Lock()
        embeddings._embedding_generation = 1
        embeddings._index_ready = True
        embeddings.reindex_running = False
        embeddings.db = MagicMock()
        embeddings.text_inference_speed = MagicMock()
        embeddings.text_eps = MagicMock()

        stale_vector = np.array([1.0, 0.0], dtype=np.float32)
        current_vector = np.array([0.0, 1.0], dtype=np.float32)
        current_embedding = MagicMock(return_value=[current_vector])

        def finish_stale_request(_):
            with embeddings._embedding_state_lock:
                embeddings._embedding_generation += 1
                embeddings.text_embedding = current_embedding
            return [stale_vector]

        stale_embedding = MagicMock(side_effect=finish_stale_request)
        embeddings.text_embedding = stale_embedding

        result = embeddings.embed_description("event-id", "A red car")

        np.testing.assert_array_equal(result, current_vector)
        stale_embedding.assert_called_once_with(["A red car"])
        current_embedding.assert_called_once_with(["A red car"])
        self.assertEqual(
            embeddings.db.execute_sql.call_args.args[1],
            ("event-id", serialize(current_vector)),
        )

    def test_incremental_upsert_is_blocked_for_an_invalid_index(self):
        embeddings = Embeddings.__new__(Embeddings)
        embeddings._embedding_state_lock = Lock()
        embeddings._index_ready = False
        embeddings.reindex_running = False

        with self.assertRaisesRegex(RuntimeError, "complete a full reindex"):
            embeddings.embed_description("event-id", "A red car")

    def test_reindex_embedding_is_allowed_while_index_is_invalid(self):
        embeddings = Embeddings.__new__(Embeddings)
        embeddings._embedding_state_lock = Lock()
        embeddings._index_ready = False
        embeddings.reindex_running = False
        embeddings.db = MagicMock()
        embeddings.text_inference_speed = MagicMock()
        embeddings.text_eps = MagicMock()
        vector = np.array([1.0, 0.0], dtype=np.float32)
        embedding_function = MagicMock(return_value=[vector])

        result = embeddings.embed_description(
            "event-id",
            "A red car",
            embedding_function=embedding_function,
        )

        np.testing.assert_array_equal(result, vector)
        embedding_function.assert_called_once_with(["A red car"])

    def test_searches_skip_an_incomplete_index(self):
        context = EmbeddingsContext.__new__(EmbeddingsContext)
        context.requestor = MagicMock()
        context.requestor.send_data.return_value = False
        context.db = MagicMock()

        self.assertEqual(context.search_thumbnail("red car"), [])
        self.assertEqual(context.search_description("red car"), [])

        context.db.execute_sql.assert_not_called()

    def test_search_stats_reset_when_ready_model_changes(self):
        context = EmbeddingsContext.__new__(EmbeddingsContext)
        context.requestor = MagicMock()
        context.requestor.send_data.return_value = {
            "ready": True,
            "model_id": "vllm:new-model",
        }
        context._stats_lock = Lock()
        context._stats_model_id = "jinav2"
        context.thumb_stats = ZScoreNormalization()
        context.desc_stats = ZScoreNormalization()
        context.thumb_stats._update([0.1, 0.2, 0.3])
        context.desc_stats._update([0.4, 0.5, 0.6])

        self.assertTrue(context._is_index_ready())
        self.assertEqual(context._stats_model_id, "vllm:new-model")
        self.assertEqual(context.thumb_stats.n, 0)
        self.assertEqual(context.desc_stats.n, 0)

    def test_search_stats_are_preserved_for_matching_ready_model(self):
        context = EmbeddingsContext.__new__(EmbeddingsContext)
        context.requestor = MagicMock()
        context.requestor.send_data.return_value = {
            "ready": True,
            "model_id": "vllm:same-model",
        }
        context._stats_lock = Lock()
        context._stats_model_id = "vllm:same-model"
        context.thumb_stats = ZScoreNormalization()
        context.desc_stats = ZScoreNormalization()
        context.thumb_stats._update([0.1, 0.2, 0.3])

        self.assertTrue(context._is_index_ready())
        self.assertEqual(context.thumb_stats.n, 3)

    def test_legacy_search_stats_without_model_id_are_ignored(self):
        with TemporaryDirectory() as config_dir:
            Path(config_dir, ".search_stats.json").write_text(
                json.dumps(
                    {
                        "thumb_stats": {"n": 3, "mean": 0.2, "m2": 0.02},
                        "desc_stats": {"n": 3, "mean": 0.4, "m2": 0.02},
                    }
                ),
                encoding="utf-8",
            )
            with (
                patch("frigate.embeddings.CONFIG_DIR", config_dir),
                patch("frigate.embeddings.EmbeddingsRequestor"),
            ):
                context = EmbeddingsContext(MagicMock())

        self.assertIsNone(context._stats_model_id)
        self.assertEqual(context.thumb_stats.n, 0)
        self.assertEqual(context.desc_stats.n, 0)

    def test_matching_fingerprinted_search_stats_are_loaded(self):
        with TemporaryDirectory() as config_dir:
            Path(config_dir, ".search_stats.json").write_text(
                json.dumps(
                    {
                        "model_id": "vllm:same-model",
                        "thumb_stats": {"n": 3, "mean": 0.2, "m2": 0.02},
                        "desc_stats": {"n": 4, "mean": 0.4, "m2": 0.03},
                    }
                ),
                encoding="utf-8",
            )
            with (
                patch("frigate.embeddings.CONFIG_DIR", config_dir),
                patch("frigate.embeddings.EmbeddingsRequestor"),
            ):
                context = EmbeddingsContext(MagicMock())

        self.assertEqual(context._stats_model_id, "vllm:same-model")
        self.assertEqual(context.thumb_stats.n, 3)
        self.assertEqual(context.desc_stats.n, 4)

    def test_manual_reindex_resynchronizes_triggers(self):
        embeddings = Embeddings.__new__(Embeddings)
        embeddings.reindex = MagicMock(return_value=True)
        embeddings.reindex_lock = Lock()
        embeddings.reindex_running = True
        embeddings.reindex_thread = MagicMock()
        embeddings._reindex_restart_requested = False

        embeddings._reindex_wrapper()

        embeddings.reindex.assert_called_once_with()
        self.assertFalse(embeddings.reindex_running)
        self.assertIsNone(embeddings.reindex_thread)

    def test_manual_reindex_restarts_after_provider_change(self):
        embeddings = Embeddings.__new__(Embeddings)
        embeddings.reindex = MagicMock(side_effect=[False, True])
        embeddings.reindex_lock = Lock()
        embeddings.reindex_running = True
        embeddings.reindex_thread = MagicMock()
        embeddings._reindex_restart_requested = False

        embeddings._reindex_wrapper()

        self.assertEqual(embeddings.reindex.call_count, 2)
        self.assertFalse(embeddings.reindex_running)
        self.assertIsNone(embeddings.reindex_thread)

    def test_queued_reindex_runs_another_pass(self):
        embeddings = Embeddings.__new__(Embeddings)
        embeddings.reindex = MagicMock(return_value=True)
        embeddings.reindex_lock = Lock()
        embeddings.reindex_running = True
        embeddings.reindex_thread = MagicMock()
        embeddings._reindex_restart_requested = True

        embeddings._reindex_wrapper()

        self.assertEqual(embeddings.reindex.call_count, 2)
        self.assertFalse(embeddings.reindex_running)
        self.assertIsNone(embeddings.reindex_thread)

    def test_reindex_failure_is_logged_and_clears_thread_state(self):
        embeddings = Embeddings.__new__(Embeddings)
        embeddings.reindex = MagicMock(side_effect=RuntimeError("provider offline"))
        embeddings.reindex_lock = Lock()
        embeddings.reindex_running = True
        embeddings.reindex_thread = MagicMock()
        embeddings._reindex_restart_requested = False

        with self.assertLogs("frigate.embeddings.embeddings", level="ERROR") as logs:
            embeddings._reindex_wrapper()

        self.assertIn("Embeddings reindex failed", "\n".join(logs.output))
        self.assertFalse(embeddings.reindex_running)
        self.assertIsNone(embeddings.reindex_thread)

    def test_incomplete_index_state_survives_process_restart(self):
        embeddings = Embeddings.__new__(Embeddings)

        with (
            TemporaryDirectory() as config_dir,
            patch("frigate.embeddings.embeddings.CONFIG_DIR", config_dir),
        ):
            embeddings._persist_index_state(False, "vllm:model")

            self.assertFalse(embeddings._load_index_ready("vllm:model"))
            self.assertFalse(embeddings._load_index_ready("vllm:other-model"))

            embeddings._persist_index_state(True, "vllm:model")

            self.assertTrue(embeddings._load_index_ready("vllm:model"))
            self.assertFalse(embeddings._load_index_ready("vllm:other-model"))
            self.assertFalse(embeddings._load_index_ready("vllm:model"))

    def test_missing_index_state_preserves_legacy_index(self):
        embeddings = Embeddings.__new__(Embeddings)

        with (
            TemporaryDirectory() as config_dir,
            patch("frigate.embeddings.embeddings.CONFIG_DIR", config_dir),
        ):
            self.assertTrue(embeddings._load_index_ready("jinav2"))
            self.assertFalse(embeddings._load_index_ready("vllm:new-model"))
            self.assertFalse(embeddings._load_index_ready("jinav2"))

    def test_missing_index_state_requires_reindex_for_new_vllm_provider(self):
        embeddings = Embeddings.__new__(Embeddings)

        with (
            TemporaryDirectory() as config_dir,
            patch("frigate.embeddings.embeddings.CONFIG_DIR", config_dir),
        ):
            self.assertFalse(embeddings._load_index_ready("vllm:new-model"))
            state = json.loads(
                Path(config_dir, ".search_index_state.json").read_text(encoding="utf-8")
            )

        self.assertEqual(state, {"ready": False, "model_id": "vllm:new-model"})

    def test_reindex_does_not_complete_when_provider_changes_during_sync(self):
        embeddings = Embeddings.__new__(Embeddings)
        embeddings.config = SimpleNamespace(
            semantic_search=SimpleNamespace(model="qwen")
        )
        embeddings.db = MagicMock()
        embeddings.requestor = MagicMock()
        embeddings._embedding_state_lock = Lock()
        embeddings._embedding_generation = 1
        embeddings._embedding_model_id = "qwen"
        embeddings._index_ready = True
        embeddings._persist_index_state = MagicMock()
        embeddings.text_embedding = MagicMock()
        embeddings.vision_embedding = MagicMock()
        embeddings.sync_triggers = MagicMock(
            side_effect=lambda **_: embeddings.mark_embedding_config_update()
        )

        count_query = MagicMock()
        count_query.where.return_value.count.return_value = 0
        events_query = MagicMock()
        events_query.where.return_value.order_by.return_value.limit.return_value = []

        with (
            patch(
                "frigate.embeddings.embeddings.Event.select",
                side_effect=[count_query, events_query],
            ),
            patch("frigate.embeddings.embeddings.os.path.exists", return_value=False),
            self.assertLogs("frigate.embeddings.embeddings", level="WARNING"),
        ):
            completed = embeddings.reindex()

        self.assertFalse(completed)
        embeddings.sync_triggers.assert_called_once_with(
            text_embedding=embeddings.text_embedding,
            vision_embedding=embeddings.vision_embedding,
            model_id="qwen",
            force=True,
        )
        statuses = [
            call.args[1]["status"]
            for call in embeddings.requestor.send_data.call_args_list
        ]
        self.assertEqual(statuses, ["indexing"])
        self.assertFalse(embeddings.index_ready)
        self.assertNotIn(
            call(True, "qwen"), embeddings._persist_index_state.call_args_list
        )

    def test_reindex_handles_event_inserted_after_zero_count(self):
        embeddings = Embeddings.__new__(Embeddings)
        embeddings.config = SimpleNamespace(
            semantic_search=SimpleNamespace(model="qwen")
        )
        embeddings.db = MagicMock()
        embeddings.requestor = MagicMock()
        embeddings._embedding_state_lock = Lock()
        embeddings._embedding_generation = 1
        embeddings._embedding_model_id = "qwen"
        embeddings._index_ready = True
        embeddings._persist_index_state = MagicMock()
        embeddings.text_embedding = MagicMock()
        embeddings.vision_embedding = MagicMock()
        embeddings.sync_triggers = MagicMock()

        event = SimpleNamespace(id="event-id", start_time=100.0, data={})

        count_query = MagicMock()
        count_query.where.return_value.count.return_value = 0

        first_page_query = MagicMock()
        first_page = first_page_query.where.return_value
        first_page.order_by.return_value.limit.return_value = [event]

        final_page_query = MagicMock()
        final_page = final_page_query.where.return_value
        keyset_page = final_page.where.return_value
        keyset_page.order_by.return_value.limit.return_value = []

        with (
            patch(
                "frigate.embeddings.embeddings.Event.select",
                side_effect=[count_query, first_page_query, final_page_query],
            ),
            patch("frigate.embeddings.embeddings.os.path.exists", return_value=False),
            patch(
                "frigate.embeddings.embeddings.get_event_thumbnail_bytes",
                return_value=None,
            ),
        ):
            completed = embeddings.reindex()

        self.assertTrue(completed)
        final_page.where.assert_called_once()
        progress = embeddings.requestor.send_data.call_args.args[1]
        self.assertEqual(progress["processed_objects"], 1)
        self.assertEqual(progress["total_objects"], 1)
        self.assertEqual(progress["time_remaining"], 0)
        self.assertEqual(progress["status"], "completed")
        embeddings._persist_index_state.assert_has_calls(
            [call(False, "qwen"), call(True, "qwen")]
        )

    def test_semantic_triggers_skip_an_incomplete_vector_space(self):
        processor = SemanticTriggerProcessor.__new__(SemanticTriggerProcessor)
        processor.embeddings = SimpleNamespace(index_ready=False)
        processor.config = SimpleNamespace(
            semantic_search=SimpleNamespace(model="qwen_embeddings"),
            genai={},
        )
        processor._stats_model_id = "jinav1"
        processor.thumb_stats = ZScoreNormalization()
        processor.desc_stats = ZScoreNormalization()
        processor.thumb_stats._update([0.1, 0.2, 0.3])

        with patch(
            "frigate.data_processing.post.semantic_trigger.Trigger.select"
        ) as select:
            processor.process_data(
                {"event_id": "event-id", "camera": "front", "type": "image"},
                MagicMock(),
            )

        select.assert_not_called()
        self.assertEqual(processor._stats_model_id, "jinav1")
        self.assertEqual(processor.thumb_stats.n, 3)

    def test_semantic_trigger_stats_reset_after_model_change(self):
        processor = SemanticTriggerProcessor.__new__(SemanticTriggerProcessor)
        processor.embeddings = SimpleNamespace(index_ready=True)
        processor.config = SimpleNamespace(
            semantic_search=SimpleNamespace(model="qwen_embeddings"),
            genai={},
            cameras={
                "front": SimpleNamespace(semantic_search=SimpleNamespace(triggers=None))
            },
        )
        processor._stats_model_id = "jinav1"
        processor.thumb_stats = ZScoreNormalization()
        processor.desc_stats = ZScoreNormalization()
        processor.thumb_stats._update([0.1, 0.2, 0.3])
        processor.desc_stats._update([0.4, 0.5, 0.6])

        processor.process_data(
            {"event_id": "event-id", "camera": "front", "type": "image"},
            MagicMock(),
        )

        self.assertEqual(processor._stats_model_id, "qwen_embeddings")
        self.assertEqual(processor.thumb_stats.n, 0)
        self.assertEqual(processor.desc_stats.n, 0)

    def test_semantic_triggers_skip_a_stale_model_fingerprint(self):
        configured_trigger = SimpleNamespace(enabled=True)
        processor = SemanticTriggerProcessor.__new__(SemanticTriggerProcessor)
        processor.embeddings = SimpleNamespace(index_ready=True)
        processor.config = SimpleNamespace(
            semantic_search=SimpleNamespace(model="qwen_embeddings"),
            genai={},
            cameras={
                "front": SimpleNamespace(
                    semantic_search=SimpleNamespace(
                        triggers={"red_car": configured_trigger}
                    )
                )
            },
        )
        processor.db = MagicMock()
        processor._stats_model_id = "qwen_embeddings"
        processor.thumb_stats = ZScoreNormalization()
        processor.desc_stats = ZScoreNormalization()

        query = MagicMock()
        query.where.return_value.dicts.return_value.iterator.return_value = [
            {
                "camera": "front",
                "name": "red_car",
                "type": "description",
                "data": "red car",
                "embedding": b"old",
                "threshold": 0.8,
                "model": "jinav1",
            }
        ]

        with (
            patch(
                "frigate.data_processing.post.semantic_trigger.Trigger.select",
                return_value=query,
            ),
            self.assertLogs(
                "frigate.data_processing.post.semantic_trigger", level="DEBUG"
            ),
        ):
            processor.process_data(
                {"event_id": "event-id", "camera": "front", "type": "image"},
                MagicMock(),
            )

        processor.db.execute_sql.assert_not_called()

    def test_model_change_recalculates_existing_embedding(self):
        configured_trigger = SimpleNamespace(
            type="description",
            data="red car",
            threshold=0.8,
        )
        camera = SimpleNamespace(
            name="front",
            semantic_search=SimpleNamespace(triggers={"red_car": configured_trigger}),
        )
        existing_trigger = SimpleNamespace(
            name="red_car",
            type="description",
            data="red car",
            threshold=0.8,
            model="jinav1",
            embedding=b"old",
            save=MagicMock(),
        )

        embeddings = Embeddings.__new__(Embeddings)
        embeddings.config = SimpleNamespace(
            cameras={"front": camera},
            semantic_search=SimpleNamespace(model="qwen_embeddings"),
            genai={},
        )
        embeddings._calculate_trigger_embedding = MagicMock(return_value=b"new")

        query = MagicMock()
        query.where.return_value = [existing_trigger]
        with patch("frigate.embeddings.embeddings.Trigger.select", return_value=query):
            embeddings.sync_triggers()

        self.assertEqual(existing_trigger.model, "qwen_embeddings")
        self.assertEqual(existing_trigger.embedding, b"new")
        embeddings._calculate_trigger_embedding.assert_called_once_with(
            configured_trigger, "red_car", "front", None, None
        )
        existing_trigger.save.assert_called_once_with()

    def test_force_reindex_recalculates_saved_thumbnail_without_source_event(self):
        configured_trigger = SimpleNamespace(
            type="thumbnail",
            data="expired-event",
            threshold=0.8,
        )
        camera = SimpleNamespace(
            name="front",
            semantic_search=SimpleNamespace(triggers={"red_car": configured_trigger}),
        )
        existing_trigger = SimpleNamespace(
            name="red_car",
            type="thumbnail",
            data="expired-event",
            threshold=0.8,
            model="jinav1",
            embedding=b"old",
            save=MagicMock(),
        )

        embeddings = Embeddings.__new__(Embeddings)
        embeddings.config = SimpleNamespace(
            cameras={"front": camera},
            semantic_search=SimpleNamespace(model="jinav1"),
            genai={},
        )
        embeddings._calculate_trigger_embedding = MagicMock(return_value=b"new")

        query = MagicMock()
        query.where.return_value = [existing_trigger]
        with (
            patch("frigate.embeddings.embeddings.Trigger.select", return_value=query),
            patch("frigate.embeddings.embeddings.os.path.exists", return_value=True),
            patch("frigate.embeddings.embeddings.Event.get") as event_get,
        ):
            embeddings.sync_triggers(force=True)

        event_get.assert_not_called()
        self.assertEqual(existing_trigger.embedding, b"new")
        embeddings._calculate_trigger_embedding.assert_called_once_with(
            configured_trigger, "red_car", "front", None, None
        )
        existing_trigger.save.assert_called_once_with()

    def test_provider_model_change_changes_model_id(self):
        provider_config = SimpleNamespace(
            provider=SimpleNamespace(value="vllm"),
            model="Qwen/Qwen3-VL-Embedding-2B",
            provider_options={},
        )
        config = SimpleNamespace(
            semantic_search=SimpleNamespace(model="qwen_embeddings"),
            genai={"qwen_embeddings": provider_config},
        )
        first_id = get_semantic_search_model_id(config)

        provider_config.model = "Qwen/Qwen3-VL-Embedding-8B"

        self.assertNotEqual(first_id, get_semantic_search_model_id(config))
        self.assertLessEqual(len(first_id), 30)


if __name__ == "__main__":
    unittest.main()
