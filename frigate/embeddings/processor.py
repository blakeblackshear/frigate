"""Create a Chroma vector database for semantic search."""

import base64
import io
import logging
import queue
import threading
from multiprocessing import Queue
from multiprocessing.synchronize import Event as MpEvent

import google.generativeai as genai
import numpy as np
from chromadb import Collection
from chromadb import HttpClient as ChromaClient
from chromadb.config import Settings
from peewee import DoesNotExist
from PIL import Image
from playhouse.shortcuts import model_to_dict

from frigate.config import FrigateConfig
from frigate.models import Event

from .functions.clip import ClipEmbedding
from .functions.minilm_l6_v2 import MiniLMEmbedding

logger = logging.getLogger(__name__)


class EmbeddingProcessor(threading.Thread):
    """Handle gemini queue and post event updates."""

    def __init__(
        self,
        config: FrigateConfig,
        queue: Queue,
        stop_event: MpEvent,
    ) -> None:
        threading.Thread.__init__(self)
        self.name = "chroma"
        self.config = config
        self.queue = queue
        self.stop_event = stop_event
        self.chroma: ChromaClient = None
        self.thumbnail: Collection = None
        self.description: Collection = None
        self.gemini: genai.GenerativeModel = None

    def run(self) -> None:
        """Maintain a Chroma vector database for semantic search."""

        # Exit if disabled
        if not self.config.semantic_search.enabled:
            return

        # Create the database
        self.chroma = ChromaClient(settings=Settings(anonymized_telemetry=False))

        # Create/Load the collection(s)
        self.thumbnail = self.chroma.get_or_create_collection(
            name="event_thumbnail", embedding_function=ClipEmbedding()
        )
        self.description = self.chroma.get_or_create_collection(
            name="event_description", embedding_function=MiniLMEmbedding()
        )

        ## Initialize Gemini
        if self.config.gemini.enabled:
            genai.configure(api_key=self.config.gemini.api_key)
            self.gemini = genai.GenerativeModel("gemini-pro-vision")

        # Process events
        while not self.stop_event.is_set():
            try:
                (
                    event_id,
                    camera,
                ) = self.queue.get(timeout=1)
            except queue.Empty:
                continue

            camera_config = self.config.cameras[camera]

            try:
                event: Event = Event.get(Event.id == event_id)
            except DoesNotExist:
                continue

            # Extract valid event metadata
            metadata = {
                k: v
                for k, v in model_to_dict(event).items()
                if k not in ["id", "thumbnail"]
                and v is not None
                and isinstance(v, (str, int, float, bool))
            }
            thumbnail = base64.b64decode(event.thumbnail)

            # Encode the thumbnail
            self._embed_thumbnail(event.id, thumbnail, metadata)

            # Skip if we aren't generating descriptions with Gemini
            if not camera_config.gemini.enabled or (
                not camera_config.gemini.override_existing
                and event.data.get("description") is not None
            ):
                continue

            # Generate the description. Call happens in a thread since it is network bound.
            threading.Thread(
                target=self._embed_description,
                name=f"_embed_description_{event.id}",
                daemon=True,
                args=(
                    event,
                    thumbnail,
                    metadata,
                ),
            ).start()

    def _embed_thumbnail(self, event_id: str, thumbnail: bytes, metadata: dict) -> None:
        """Embed the thumbnail for an event."""

        # Encode the thumbnail
        img = np.array(Image.open(io.BytesIO(thumbnail)).convert("RGB"))
        self.thumbnail.add(
            images=[img],
            metadatas=[metadata],
            ids=[event_id],
        )

    def _embed_description(
        self, event: Event, thumbnail: bytes, metadata: dict
    ) -> None:
        """Embed the description for an event."""

        content = {
            "mime_type": "image/jpeg",
            "data": thumbnail,
        }

        # Fetch the prompt from the config and format the string replacing variables from the event
        prompt = self.config.gemini.object_prompts.get(
            event.label, self.config.gemini.prompt
        ).format(**metadata)

        response = self.gemini.generate_content(
            [content, prompt],
            generation_config=genai.types.GenerationConfig(
                candidate_count=1,
            ),
        )

        try:
            description = response.text.strip()
        except ValueError:
            # No description was generated
            return

        # Update the event to add the description
        event.data["description"] = description
        event.save()

        # Encode the description
        self.description.add(
            documents=[description],
            metadatas=[metadata],
            ids=[event.id],
        )

        logger.info("Generated description for %s: %s", event.id, description)
