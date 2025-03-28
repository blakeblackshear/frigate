"""SQLite-vec embeddings database."""

import datetime
import logging
import os
import threading
import time

from numpy import ndarray
from playhouse.shortcuts import model_to_dict

from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig
from frigate.config.classification import SemanticSearchModelEnum
from frigate.const import (
    CONFIG_DIR,
    UPDATE_EMBEDDINGS_REINDEX_PROGRESS,
    UPDATE_MODEL_STATE,
)
from frigate.data_processing.types import DataProcessorMetrics
from frigate.db.sqlitevecq import SqliteVecQueueDatabase
from frigate.models import Event
from frigate.types import ModelStatusTypesEnum
from frigate.util.builtin import EventsPerSecond, serialize
from frigate.util.path import get_event_thumbnail_bytes

from .onnx.jina_v1_embedding import JinaV1ImageEmbedding, JinaV1TextEmbedding
from .onnx.jina_v2_embedding import JinaV2Embedding

logger = logging.getLogger(__name__)


def get_metadata(event: Event) -> dict:
    """Extract valid event metadata."""
    event_dict = model_to_dict(event)
    return (
        {
            k: v
            for k, v in event_dict.items()
            if k not in ["thumbnail"]
            and v is not None
            and isinstance(v, (str, int, float, bool))
        }
        | {
            k: v
            for k, v in event_dict["data"].items()
            if k not in ["description"]
            and v is not None
            and isinstance(v, (str, int, float, bool))
        }
        | {
            # Metadata search doesn't support $contains
            # and an event can have multiple zones, so
            # we need to create a key for each zone
            f"{k}_{x}": True
            for k, v in event_dict.items()
            if isinstance(v, list) and len(v) > 0
            for x in v
            if isinstance(x, str)
        }
    )


class Embeddings:
    """SQLite-vec embeddings database."""

    def __init__(
        self,
        config: FrigateConfig,
        db: SqliteVecQueueDatabase,
        metrics: DataProcessorMetrics,
    ) -> None:
        self.config = config
        self.db = db
        self.metrics = metrics
        self.requestor = InterProcessRequestor()

        self.image_eps = EventsPerSecond()
        self.image_eps.start()
        self.text_eps = EventsPerSecond()
        self.text_eps.start()

        self.reindex_lock = threading.Lock()
        self.reindex_thread = None
        self.reindex_running = False

        # Create tables if they don't exist
        self.db.create_embeddings_tables()

        models = self.get_model_definitions()

        for model in models:
            self.requestor.send_data(
                UPDATE_MODEL_STATE,
                {
                    "model": model,
                    "state": ModelStatusTypesEnum.not_downloaded,
                },
            )

        if self.config.semantic_search.model == SemanticSearchModelEnum.jinav2:
            # Single JinaV2Embedding instance for both text and vision
            self.embedding = JinaV2Embedding(
                model_size=self.config.semantic_search.model_size,
                requestor=self.requestor,
                device="GPU"
                if self.config.semantic_search.model_size == "large"
                else "CPU",
            )
            self.text_embedding = lambda input_data: self.embedding(
                input_data, embedding_type="text"
            )
            self.vision_embedding = lambda input_data: self.embedding(
                input_data, embedding_type="vision"
            )
        else:  # Default to jinav1
            self.text_embedding = JinaV1TextEmbedding(
                model_size=config.semantic_search.model_size,
                requestor=self.requestor,
                device="CPU",
            )
            self.vision_embedding = JinaV1ImageEmbedding(
                model_size=config.semantic_search.model_size,
                requestor=self.requestor,
                device="GPU" if config.semantic_search.model_size == "large" else "CPU",
            )

    def update_stats(self) -> None:
        self.metrics.image_embeddings_eps = self.image_eps.eps()
        self.metrics.text_embeddings_eps = self.text_eps.eps()

    def get_model_definitions(self):
        # Version-specific models
        if self.config.semantic_search.model == SemanticSearchModelEnum.jinav2:
            models = [
                "jinaai/jina-clip-v2-tokenizer",
                "jinaai/jina-clip-v2-model_fp16.onnx"
                if self.config.semantic_search.model_size == "large"
                else "jinaai/jina-clip-v2-model_quantized.onnx",
                "jinaai/jina-clip-v2-preprocessor_config.json",
            ]
        else:  # Default to jinav1
            models = [
                "jinaai/jina-clip-v1-text_model_fp16.onnx",
                "jinaai/jina-clip-v1-tokenizer",
                "jinaai/jina-clip-v1-vision_model_fp16.onnx"
                if self.config.semantic_search.model_size == "large"
                else "jinaai/jina-clip-v1-vision_model_quantized.onnx",
                "jinaai/jina-clip-v1-preprocessor_config.json",
            ]

        # Add common models
        models.extend(
            [
                "facenet-facenet.onnx",
                "paddleocr-onnx-detection.onnx",
                "paddleocr-onnx-classification.onnx",
                "paddleocr-onnx-recognition.onnx",
            ]
        )

        return models

    def embed_thumbnail(
        self, event_id: str, thumbnail: bytes, upsert: bool = True
    ) -> ndarray:
        """Embed thumbnail and optionally insert into DB.

        @param: event_id in Events DB
        @param: thumbnail bytes in jpg format
        @param: upsert If embedding should be upserted into vec DB
        """
        start = datetime.datetime.now().timestamp()
        # Convert thumbnail bytes to PIL Image
        embedding = self.vision_embedding([thumbnail])[0]

        if upsert:
            self.db.execute_sql(
                """
                INSERT OR REPLACE INTO vec_thumbnails(id, thumbnail_embedding)
                VALUES(?, ?)
                """,
                (event_id, serialize(embedding)),
            )

        duration = datetime.datetime.now().timestamp() - start
        self.metrics.image_embeddings_speed.value = (
            self.metrics.image_embeddings_speed.value * 9 + duration
        ) / 10
        self.image_eps.update()

        return embedding

    def batch_embed_thumbnail(
        self, event_thumbs: dict[str, bytes], upsert: bool = True
    ) -> list[ndarray]:
        """Embed thumbnails and optionally insert into DB.

        @param: event_thumbs Map of Event IDs in DB to thumbnail bytes in jpg format
        @param: upsert If embedding should be upserted into vec DB
        """
        start = datetime.datetime.now().timestamp()
        ids = list(event_thumbs.keys())
        embeddings = self.vision_embedding(list(event_thumbs.values()))

        if upsert:
            items = []

            for i in range(len(ids)):
                items.append(ids[i])
                items.append(serialize(embeddings[i]))
                self.image_eps.update()

            self.db.execute_sql(
                """
                INSERT OR REPLACE INTO vec_thumbnails(id, thumbnail_embedding)
                VALUES {}
                """.format(", ".join(["(?, ?)"] * len(ids))),
                items,
            )

        duration = datetime.datetime.now().timestamp() - start
        self.metrics.text_embeddings_speed.value = (
            self.metrics.text_embeddings_speed.value * 9 + (duration / len(ids))
        ) / 10

        return embeddings

    def embed_description(
        self, event_id: str, description: str, upsert: bool = True
    ) -> ndarray:
        start = datetime.datetime.now().timestamp()
        embedding = self.text_embedding([description])[0]

        if upsert:
            self.db.execute_sql(
                """
                INSERT OR REPLACE INTO vec_descriptions(id, description_embedding)
                VALUES(?, ?)
                """,
                (event_id, serialize(embedding)),
            )

        duration = datetime.datetime.now().timestamp() - start
        self.metrics.text_embeddings_speed.value = (
            self.metrics.text_embeddings_speed.value * 9 + duration
        ) / 10
        self.text_eps.update()

        return embedding

    def batch_embed_description(
        self, event_descriptions: dict[str, str], upsert: bool = True
    ) -> ndarray:
        start = datetime.datetime.now().timestamp()
        # upsert embeddings one by one to avoid token limit
        embeddings = []

        for desc in event_descriptions.values():
            embeddings.append(self.text_embedding([desc])[0])

        if upsert:
            ids = list(event_descriptions.keys())
            items = []

            for i in range(len(ids)):
                items.append(ids[i])
                items.append(serialize(embeddings[i]))
                self.text_eps.update()

            self.db.execute_sql(
                """
                INSERT OR REPLACE INTO vec_descriptions(id, description_embedding)
                VALUES {}
                """.format(", ".join(["(?, ?)"] * len(ids))),
                items,
            )

        duration = datetime.datetime.now().timestamp() - start
        self.metrics.text_embeddings_speed.value = (
            self.metrics.text_embeddings_speed.value * 9 + (duration / len(ids))
        ) / 10

        return embeddings

    def reindex(self) -> None:
        logger.info("Indexing tracked object embeddings...")

        self.db.drop_embeddings_tables()
        logger.debug("Dropped embeddings tables.")
        self.db.create_embeddings_tables()
        logger.debug("Created embeddings tables.")

        # Delete the saved stats file
        if os.path.exists(os.path.join(CONFIG_DIR, ".search_stats.json")):
            os.remove(os.path.join(CONFIG_DIR, ".search_stats.json"))

        st = time.time()

        # Get total count of events to process
        total_events = Event.select().count()

        batch_size = (
            4
            if self.config.semantic_search.model == SemanticSearchModelEnum.jinav2
            else 32
        )
        current_page = 1

        totals = {
            "thumbnails": 0,
            "descriptions": 0,
            "processed_objects": total_events - 1 if total_events < batch_size else 0,
            "total_objects": total_events,
            "time_remaining": 0 if total_events < batch_size else -1,
            "status": "indexing",
        }

        self.requestor.send_data(UPDATE_EMBEDDINGS_REINDEX_PROGRESS, totals)

        events = (
            Event.select()
            .order_by(Event.start_time.desc())
            .paginate(current_page, batch_size)
        )

        while len(events) > 0:
            event: Event
            batch_thumbs = {}
            batch_descs = {}
            for event in events:
                thumbnail = get_event_thumbnail_bytes(event)

                if thumbnail is None:
                    continue

                batch_thumbs[event.id] = thumbnail
                totals["thumbnails"] += 1

                if description := event.data.get("description", "").strip():
                    batch_descs[event.id] = description
                    totals["descriptions"] += 1

                totals["processed_objects"] += 1

            # run batch embedding
            self.batch_embed_thumbnail(batch_thumbs)

            if batch_descs:
                self.batch_embed_description(batch_descs)

            # report progress every batch so we don't spam the logs
            progress = (totals["processed_objects"] / total_events) * 100
            logger.debug(
                "Processed %d/%d events (%.2f%% complete) | Thumbnails: %d, Descriptions: %d",
                totals["processed_objects"],
                total_events,
                progress,
                totals["thumbnails"],
                totals["descriptions"],
            )

            # Calculate time remaining
            elapsed_time = time.time() - st
            avg_time_per_event = elapsed_time / totals["processed_objects"]
            remaining_events = total_events - totals["processed_objects"]
            time_remaining = avg_time_per_event * remaining_events
            totals["time_remaining"] = int(time_remaining)

            self.requestor.send_data(UPDATE_EMBEDDINGS_REINDEX_PROGRESS, totals)

            # Move to the next page
            current_page += 1
            events = (
                Event.select()
                .order_by(Event.start_time.desc())
                .paginate(current_page, batch_size)
            )

        logger.info(
            "Embedded %d thumbnails and %d descriptions in %s seconds",
            totals["thumbnails"],
            totals["descriptions"],
            round(time.time() - st, 1),
        )
        totals["status"] = "completed"

        self.requestor.send_data(UPDATE_EMBEDDINGS_REINDEX_PROGRESS, totals)

    def start_reindex(self) -> bool:
        """Start reindexing in a separate thread if not already running."""
        with self.reindex_lock:
            if self.reindex_running:
                logger.warning("Reindex embeddings is already running.")
                return False

            # Mark as running and start the thread
            self.reindex_running = True
            self.reindex_thread = threading.Thread(
                target=self._reindex_wrapper, daemon=True
            )
            self.reindex_thread.start()
            return True

    def _reindex_wrapper(self) -> None:
        """Wrapper to run reindex and reset running flag when done."""
        try:
            self.reindex()
        finally:
            with self.reindex_lock:
                self.reindex_running = False
                self.reindex_thread = None
