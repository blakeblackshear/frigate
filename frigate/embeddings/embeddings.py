"""ChromaDB embeddings database."""

import base64
import io
import logging
import sys
import time

import numpy as np
from PIL import Image
from playhouse.shortcuts import model_to_dict

from frigate.models import Event

# Squelch posthog logging
logging.getLogger("chromadb.telemetry.product.posthog").setLevel(logging.CRITICAL)

# Hotsawp the sqlite3 module for Chroma compatibility
try:
    from chromadb import Collection
    from chromadb import HttpClient as ChromaClient
    from chromadb.config import Settings

    from .functions.clip import ClipEmbedding
    from .functions.minilm_l6_v2 import MiniLMEmbedding
except RuntimeError:
    __import__("pysqlite3")
    sys.modules["sqlite3"] = sys.modules.pop("pysqlite3")
    from chromadb import Collection
    from chromadb import HttpClient as ChromaClient
    from chromadb.config import Settings

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
            if k not in ["id", "thumbnail"]
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
    """ChromaDB embeddings database."""

    def __init__(self) -> None:
        self.client: ChromaClient = ChromaClient(
            host="127.0.0.1",
            settings=Settings(anonymized_telemetry=False),
        )

    @property
    def thumbnail(self) -> Collection:
        return self.client.get_or_create_collection(
            name="event_thumbnail", embedding_function=ClipEmbedding()
        )

    @property
    def description(self) -> Collection:
        return self.client.get_or_create_collection(
            name="event_description", embedding_function=MiniLMEmbedding()
        )

    def reindex(self) -> None:
        """Reindex all event embeddings."""
        logger.info("Indexing event embeddings...")
        self.client.reset()

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
            thumbnails = {"ids": [], "images": [], "metadatas": []}
            descriptions = {"ids": [], "documents": [], "metadatas": []}

            event: Event
            for event in events:
                metadata = get_metadata(event)
                thumbnail = base64.b64decode(event.thumbnail)
                img = np.array(Image.open(io.BytesIO(thumbnail)).convert("RGB"))
                thumbnails["ids"].append(event.id)
                thumbnails["images"].append(img)
                thumbnails["metadatas"].append(metadata)
                if event.data.get("description") is not None:
                    descriptions["ids"].append(event.id)
                    descriptions["documents"].append(event.data["description"])
                    descriptions["metadatas"].append(metadata)

            if len(thumbnails["ids"]) > 0:
                totals["thumb"] += len(thumbnails["ids"])
                self.thumbnail.upsert(
                    images=thumbnails["images"],
                    metadatas=thumbnails["metadatas"],
                    ids=thumbnails["ids"],
                )

            if len(descriptions["ids"]) > 0:
                totals["desc"] += len(descriptions["ids"])
                self.description.upsert(
                    documents=descriptions["documents"],
                    metadatas=descriptions["metadatas"],
                    ids=descriptions["ids"],
                )

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
