"""SQLite-vec embeddings database."""

import base64
import io
import logging
import os
import time

from PIL import Image
from playhouse.shortcuts import model_to_dict

from frigate.comms.inter_process import InterProcessRequestor
from frigate.config.semantic_search import SemanticSearchConfig
from frigate.const import (
    CONFIG_DIR,
    UPDATE_EMBEDDINGS_REINDEX_PROGRESS,
    UPDATE_MODEL_STATE,
)
from frigate.db.sqlitevecq import SqliteVecQueueDatabase
from frigate.models import Event
from frigate.types import ModelStatusTypesEnum
from frigate.util.builtin import serialize

from .functions.onnx import GenericONNXEmbedding

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
        self, config: SemanticSearchConfig, db: SqliteVecQueueDatabase
    ) -> None:
        self.config = config
        self.db = db
        self.requestor = InterProcessRequestor()

        # Create tables if they don't exist
        self.db.create_embeddings_tables()

        models = [
            "jinaai/jina-clip-v1-text_model_fp16.onnx",
            "jinaai/jina-clip-v1-tokenizer",
            "jinaai/jina-clip-v1-vision_model_fp16.onnx"
            if config.model_size == "large"
            else "jinaai/jina-clip-v1-vision_model_quantized.onnx",
            "jinaai/jina-clip-v1-preprocessor_config.json",
        ]

        for model in models:
            self.requestor.send_data(
                UPDATE_MODEL_STATE,
                {
                    "model": model,
                    "state": ModelStatusTypesEnum.not_downloaded,
                },
            )

        def jina_text_embedding_function(outputs):
            return outputs[0]

        def jina_vision_embedding_function(outputs):
            return outputs[0]

        self.text_embedding = GenericONNXEmbedding(
            model_name="jinaai/jina-clip-v1",
            model_file="text_model_fp16.onnx",
            tokenizer_file="tokenizer",
            download_urls={
                "text_model_fp16.onnx": "https://huggingface.co/jinaai/jina-clip-v1/resolve/main/onnx/text_model_fp16.onnx",
            },
            embedding_function=jina_text_embedding_function,
            model_size=config.model_size,
            model_type="text",
            requestor=self.requestor,
            device="CPU",
        )

        model_file = (
            "vision_model_fp16.onnx"
            if self.config.model_size == "large"
            else "vision_model_quantized.onnx"
        )

        download_urls = {
            model_file: f"https://huggingface.co/jinaai/jina-clip-v1/resolve/main/onnx/{model_file}",
            "preprocessor_config.json": "https://huggingface.co/jinaai/jina-clip-v1/resolve/main/preprocessor_config.json",
        }

        self.vision_embedding = GenericONNXEmbedding(
            model_name="jinaai/jina-clip-v1",
            model_file=model_file,
            download_urls=download_urls,
            embedding_function=jina_vision_embedding_function,
            model_size=config.model_size,
            model_type="vision",
            requestor=self.requestor,
            device="GPU" if config.model_size == "large" else "CPU",
        )

    def upsert_thumbnail(self, event_id: str, thumbnail: bytes):
        # Convert thumbnail bytes to PIL Image
        image = Image.open(io.BytesIO(thumbnail)).convert("RGB")
        embedding = self.vision_embedding([image])[0]

        self.db.execute_sql(
            """
            INSERT OR REPLACE INTO vec_thumbnails(id, thumbnail_embedding)
            VALUES(?, ?)
            """,
            (event_id, serialize(embedding)),
        )

        return embedding

    def upsert_description(self, event_id: str, description: str):
        embedding = self.text_embedding([description])[0]
        self.db.execute_sql(
            """
            INSERT OR REPLACE INTO vec_descriptions(id, description_embedding)
            VALUES(?, ?)
            """,
            (event_id, serialize(embedding)),
        )

        return embedding

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
        totals = {
            "thumbnails": 0,
            "descriptions": 0,
            "processed_objects": 0,
            "total_objects": 0,
            "time_remaining": 0,
        }

        self.requestor.send_data(UPDATE_EMBEDDINGS_REINDEX_PROGRESS, totals)

        # Get total count of events to process
        total_events = (
            Event.select()
            .where(
                (Event.has_clip == True | Event.has_snapshot == True)
                & Event.thumbnail.is_null(False)
            )
            .count()
        )
        totals["total_objects"] = total_events

        batch_size = 100
        current_page = 1
        processed_events = 0

        events = (
            Event.select()
            .where(
                (Event.has_clip == True | Event.has_snapshot == True)
                & Event.thumbnail.is_null(False)
            )
            .order_by(Event.start_time.desc())
            .paginate(current_page, batch_size)
        )

        while len(events) > 0:
            event: Event
            for event in events:
                thumbnail = base64.b64decode(event.thumbnail)
                self.upsert_thumbnail(event.id, thumbnail)
                totals["thumbnails"] += 1

                if description := event.data.get("description", "").strip():
                    totals["descriptions"] += 1
                    self.upsert_description(event.id, description)

                totals["processed_objects"] += 1

                # report progress every 10 events so we don't spam the logs
                if (totals["processed_objects"] % 10) == 0:
                    progress = (processed_events / total_events) * 100
                    logger.debug(
                        "Processed %d/%d events (%.2f%% complete) | Thumbnails: %d, Descriptions: %d",
                        processed_events,
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
                .where(
                    (Event.has_clip == True | Event.has_snapshot == True)
                    & Event.thumbnail.is_null(False)
                )
                .order_by(Event.start_time.desc())
                .paginate(current_page, batch_size)
            )

        logger.info(
            "Embedded %d thumbnails and %d descriptions in %s seconds",
            totals["thumbnails"],
            totals["descriptions"],
            time.time() - st,
        )
        self.requestor.send_data(UPDATE_EMBEDDINGS_REINDEX_PROGRESS, totals)
