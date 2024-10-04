"""SQLite-vec embeddings database."""

import base64
import io
import logging
import struct
import time
from typing import List, Tuple, Union

from PIL import Image
from playhouse.shortcuts import model_to_dict

from frigate.embeddings.sqlitevecq import SqliteVecQueueDatabase
from frigate.models import Event

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

        # Create tables if they don't exist
        self._create_tables()

        self.clip_embedding = ClipEmbedding(model="ViT-B/32")
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
        self, query: Union[Event, str], limit=10
    ) -> List[Tuple[str, float]]:
        if isinstance(query, Event):
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
                # If no embedding found, generate it
                thumbnail = base64.b64decode(query.thumbnail)
                self.upsert_thumbnail(query.id, thumbnail)
                image = Image.open(io.BytesIO(thumbnail)).convert("RGB")
                query = self.clip_embedding([image])[0]

        query_embedding = self.clip_embedding([query])[0]

        results = self.db.execute_sql(
            """
            SELECT
                vec_thumbnails.id,
                distance
            FROM vec_thumbnails
            WHERE thumbnail_embedding MATCH ?
                AND k = ?
            ORDER BY distance
            """,
            (serialize(query_embedding), limit),
        ).fetchall()

        return results

    def search_description(self, query_text: str, limit=10) -> List[Tuple[str, float]]:
        query_embedding = self.minilm_embedding([query_text])[0]
        results = self.db.execute_sql(
            """
            SELECT
                vec_descriptions.id,
                distance
            FROM vec_descriptions
            WHERE description_embedding MATCH ?
                AND k = ?
            ORDER BY distance
            """,
            (serialize(query_embedding), limit),
        ).fetchall()

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
