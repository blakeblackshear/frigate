"""SQLite-vec embeddings database."""

import base64
import io
import logging
import os
import time

from numpy import ndarray
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

        self.text_embedding = GenericONNXEmbedding(
            model_name="jinaai/jina-clip-v1",
            model_file="text_model_fp16.onnx",
            tokenizer_file="tokenizer",
            download_urls={
                "text_model_fp16.onnx": "https://huggingface.co/jinaai/jina-clip-v1/resolve/main/onnx/text_model_fp16.onnx",
            },
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
            model_size=config.model_size,
            model_type="vision",
            requestor=self.requestor,
            device="GPU" if config.model_size == "large" else "CPU",
        )

    def upsert_thumbnail(self, event_id: str, thumbnail: bytes) -> ndarray:
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

    def batch_upsert_thumbnail(self, event_thumbs: dict[str, bytes]) -> list[ndarray]:
        images = [
            Image.open(io.BytesIO(thumb)).convert("RGB")
            for thumb in event_thumbs.values()
        ]
        ids = list(event_thumbs.keys())
        embeddings = self.vision_embedding(images)

        items = []

        for i in range(len(ids)):
            items.append(ids[i])
            items.append(serialize(embeddings[i]))

        self.db.execute_sql(
            """
            INSERT OR REPLACE INTO vec_thumbnails(id, thumbnail_embedding)
            VALUES {}
            """.format(", ".join(["(?, ?)"] * len(ids))),
            items,
        )
        return embeddings

    def upsert_description(self, event_id: str, description: str) -> ndarray:
        embedding = self.text_embedding([description])[0]
        self.db.execute_sql(
            """
            INSERT OR REPLACE INTO vec_descriptions(id, description_embedding)
            VALUES(?, ?)
            """,
            (event_id, serialize(embedding)),
        )

        return embedding

    def batch_upsert_description(self, event_descriptions: dict[str, str]) -> ndarray:
        # upsert embeddings one by one to avoid token limit
        embeddings = []

        for desc in event_descriptions.values():
            embeddings.append(self.text_embedding([desc])[0])

        ids = list(event_descriptions.keys())

        items = []

        for i in range(len(ids)):
            items.append(ids[i])
            items.append(serialize(embeddings[i]))

        self.db.execute_sql(
            """
            INSERT OR REPLACE INTO vec_descriptions(id, description_embedding)
            VALUES {}
            """.format(", ".join(["(?, ?)"] * len(ids))),
            items,
        )

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
        total_events = (
            Event.select()
            .where(
                (Event.has_clip == True | Event.has_snapshot == True)
                & Event.thumbnail.is_null(False)
            )
            .count()
        )

        batch_size = 32
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
            .where(
                (Event.has_clip == True | Event.has_snapshot == True)
                & Event.thumbnail.is_null(False)
            )
            .order_by(Event.start_time.desc())
            .paginate(current_page, batch_size)
        )

        while len(events) > 0:
            event: Event
            batch_thumbs = {}
            batch_descs = {}
            for event in events:
                batch_thumbs[event.id] = base64.b64decode(event.thumbnail)
                totals["thumbnails"] += 1

                if description := event.data.get("description", "").strip():
                    batch_descs[event.id] = description
                    totals["descriptions"] += 1

                totals["processed_objects"] += 1

            # run batch embedding
            self.batch_upsert_thumbnail(batch_thumbs)

            if batch_descs:
                self.batch_upsert_description(batch_descs)

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
            round(time.time() - st, 1),
        )
        totals["status"] = "completed"

        self.requestor.send_data(UPDATE_EMBEDDINGS_REINDEX_PROGRESS, totals)
