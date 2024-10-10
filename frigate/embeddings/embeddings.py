"""SQLite-vec embeddings database."""

import base64
import io
import logging
import time

from PIL import Image
from playhouse.shortcuts import model_to_dict

from frigate.comms.inter_process import InterProcessRequestor
from frigate.config.semantic_search import SemanticSearchConfig
from frigate.const import UPDATE_MODEL_STATE
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
        self._create_tables()

        models = [
            "jinaai/jina-clip-v1-text_model_fp16.onnx",
            "jinaai/jina-clip-v1-tokenizer",
            "jinaai/jina-clip-v1-vision_model_fp16.onnx",
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
            model_type="text",
            device="CPU",
        )

        self.vision_embedding = GenericONNXEmbedding(
            model_name="jinaai/jina-clip-v1",
            model_file="vision_model_fp16.onnx",
            download_urls={
                "vision_model_fp16.onnx": "https://huggingface.co/jinaai/jina-clip-v1/resolve/main/onnx/vision_model_fp16.onnx",
                "preprocessor_config.json": "https://huggingface.co/jinaai/jina-clip-v1/resolve/main/preprocessor_config.json",
            },
            embedding_function=jina_vision_embedding_function,
            model_type="vision",
            device=self.config.device,
        )

    def _create_tables(self):
        # Create vec0 virtual table for thumbnail embeddings
        self.db.execute_sql("""
            CREATE VIRTUAL TABLE IF NOT EXISTS vec_thumbnails USING vec0(
                id TEXT PRIMARY KEY,
                thumbnail_embedding FLOAT[768]
            );
        """)

        # Create vec0 virtual table for description embeddings
        self.db.execute_sql("""
            CREATE VIRTUAL TABLE IF NOT EXISTS vec_descriptions USING vec0(
                id TEXT PRIMARY KEY,
                description_embedding FLOAT[768]
            );
        """)

    def _drop_tables(self):
        self.db.execute_sql("""
            DROP TABLE vec_descriptions;
        """)
        self.db.execute_sql("""
            DROP TABLE vec_thumbnails;
        """)

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
        logger.info("Indexing event embeddings...")

        self._drop_tables()
        self._create_tables()

        st = time.time()
        totals = {
            "thumb": 0,
            "desc": 0,
        }

        batch_size = 100
        current_page = 1
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
                totals["thumb"] += 1
                if description := event.data.get("description", "").strip():
                    totals["desc"] += 1
                    self.upsert_description(event.id, description)

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
            totals["thumb"],
            totals["desc"],
            time.time() - st,
        )
