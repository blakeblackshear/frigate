"""SQLite-vec embeddings database."""

import base64
import io
import logging
import struct
import time
from typing import List, Tuple, Union

from PIL import Image
from playhouse.shortcuts import model_to_dict

from frigate.comms.inter_process import InterProcessRequestor
from frigate.const import UPDATE_MODEL_STATE
from frigate.db.sqlitevecq import SqliteVecQueueDatabase
from frigate.models import Event
from frigate.types import ModelStatusTypesEnum

from .functions.clip import ClipEmbedding
from .functions.minilm_l6_v2 import MiniLMEmbedding

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


def serialize(vector: List[float]) -> bytes:
    """Serializes a list of floats into a compact "raw bytes" format"""
    return struct.pack("%sf" % len(vector), *vector)


def deserialize(bytes_data: bytes) -> List[float]:
    """Deserializes a compact "raw bytes" format into a list of floats"""
    return list(struct.unpack("%sf" % (len(bytes_data) // 4), bytes_data))


class Embeddings:
    """SQLite-vec embeddings database."""

    def __init__(self, db: SqliteVecQueueDatabase) -> None:
        self.db = db
        self.requestor = InterProcessRequestor()

        # Create tables if they don't exist
        self._create_tables()

        models = [
            "sentence-transformers/all-MiniLM-L6-v2-model.onnx",
            "sentence-transformers/all-MiniLM-L6-v2-tokenizer",
            "clip-clip_image_model_vitb32.onnx",
            "clip-clip_text_model_vitb32.onnx",
        ]

        for model in models:
            self.requestor.send_data(
                UPDATE_MODEL_STATE,
                {
                    "model": model,
                    "state": ModelStatusTypesEnum.not_downloaded,
                },
            )

        self.clip_embedding = ClipEmbedding(
            preferred_providers=["CPUExecutionProvider"]
        )
        self.minilm_embedding = MiniLMEmbedding(
            preferred_providers=["CPUExecutionProvider"],
        )

    def _create_tables(self):
        # Create vec0 virtual table for thumbnail embeddings
        self.db.execute_sql("""
            CREATE VIRTUAL TABLE IF NOT EXISTS vec_thumbnails USING vec0(
                id TEXT PRIMARY KEY,
                thumbnail_embedding FLOAT[512]
            );
        """)

        # Create vec0 virtual table for description embeddings
        self.db.execute_sql("""
            CREATE VIRTUAL TABLE IF NOT EXISTS vec_descriptions USING vec0(
                id TEXT PRIMARY KEY,
                description_embedding FLOAT[384]
            );
        """)

    def upsert_thumbnail(self, event_id: str, thumbnail: bytes):
        # Convert thumbnail bytes to PIL Image
        image = Image.open(io.BytesIO(thumbnail)).convert("RGB")
        # Generate embedding using CLIP
        embedding = self.clip_embedding([image])[0]

        self.db.execute_sql(
            """
            INSERT OR REPLACE INTO vec_thumbnails(id, thumbnail_embedding)
            VALUES(?, ?)
            """,
            (event_id, serialize(embedding)),
        )

        return embedding

    def upsert_description(self, event_id: str, description: str):
        # Generate embedding using MiniLM
        embedding = self.minilm_embedding([description])[0]

        self.db.execute_sql(
            """
            INSERT OR REPLACE INTO vec_descriptions(id, description_embedding)
            VALUES(?, ?)
            """,
            (event_id, serialize(embedding)),
        )

        return embedding

    def delete_thumbnail(self, event_ids: List[str]) -> None:
        ids = ",".join(["?" for _ in event_ids])
        self.db.execute_sql(
            f"DELETE FROM vec_thumbnails WHERE id IN ({ids})", event_ids
        )

    def delete_description(self, event_ids: List[str]) -> None:
        ids = ",".join(["?" for _ in event_ids])
        self.db.execute_sql(
            f"DELETE FROM vec_descriptions WHERE id IN ({ids})", event_ids
        )

    def search_thumbnail(
        self, query: Union[Event, str], event_ids: List[str] = None
    ) -> List[Tuple[str, float]]:
        if query.__class__ == Event:
            cursor = self.db.execute_sql(
                """
                SELECT thumbnail_embedding FROM vec_thumbnails WHERE id = ?
                """,
                [query.id],
            )

            row = cursor.fetchone() if cursor else None

            if row:
                query_embedding = deserialize(
                    row[0]
                )  # Deserialize the thumbnail embedding
            else:
                # If no embedding found, generate it and return it
                thumbnail = base64.b64decode(query.thumbnail)
                query_embedding = self.upsert_thumbnail(query.id, thumbnail)
        else:
            query_embedding = self.clip_embedding([query])[0]

        sql_query = """
            SELECT
                id,
                distance
            FROM vec_thumbnails
            WHERE thumbnail_embedding MATCH ?
                AND k = 100
        """

        # Add the IN clause if event_ids is provided and not empty
        # this is the only filter supported by sqlite-vec as of 0.1.3
        # but it seems to be broken in this version
        if event_ids:
            sql_query += " AND id IN ({})".format(",".join("?" * len(event_ids)))

        # order by distance DESC is not implemented in this version of sqlite-vec
        # when it's implemented, we can use cosine similarity
        sql_query += " ORDER BY distance"

        parameters = (
            [serialize(query_embedding)] + event_ids
            if event_ids
            else [serialize(query_embedding)]
        )

        results = self.db.execute_sql(sql_query, parameters).fetchall()

        return results

    def search_description(
        self, query_text: str, event_ids: List[str] = None
    ) -> List[Tuple[str, float]]:
        query_embedding = self.minilm_embedding([query_text])[0]

        # Prepare the base SQL query
        sql_query = """
            SELECT
                id,
                distance
            FROM vec_descriptions
            WHERE description_embedding MATCH ?
                AND k = 100
        """

        # Add the IN clause if event_ids is provided and not empty
        # this is the only filter supported by sqlite-vec as of 0.1.3
        # but it seems to be broken in this version
        if event_ids:
            sql_query += " AND id IN ({})".format(",".join("?" * len(event_ids)))

        # order by distance DESC is not implemented in this version of sqlite-vec
        # when it's implemented, we can use cosine similarity
        sql_query += " ORDER BY distance"

        parameters = (
            [serialize(query_embedding)] + event_ids
            if event_ids
            else [serialize(query_embedding)]
        )

        results = self.db.execute_sql(sql_query, parameters).fetchall()

        return results

    def reindex(self) -> None:
        logger.info("Indexing event embeddings...")

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
