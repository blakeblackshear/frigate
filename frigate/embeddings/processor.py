"""Create a Chroma vector database for semantic search."""

import base64
import io
import logging
import queue
import threading
from multiprocessing import Queue
from multiprocessing.synchronize import Event as MpEvent
from typing import Optional

import google.generativeai as genai
import numpy as np
from peewee import DoesNotExist
from PIL import Image

from frigate.config import FrigateConfig
from frigate.models import Event

from . import Embeddings, get_metadata

logger = logging.getLogger(__name__)


class EmbeddingProcessor(threading.Thread):
    """Handle gemini queue and post event updates."""

    def __init__(
        self,
        config: FrigateConfig,
        embeddings: Optional[Embeddings],
        queue: Queue,
        stop_event: MpEvent,
    ) -> None:
        threading.Thread.__init__(self)
        self.name = "chroma"
        self.config = config
        self.embeddings = embeddings
        self.queue = queue
        self.stop_event = stop_event
        self.gemini: genai.GenerativeModel = None

    def run(self) -> None:
        """Maintain a Chroma vector database for semantic search."""

        # Exit if disabled
        if self.embeddings is None:
            return

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
            metadata = get_metadata(event)
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
        self.embeddings.thumbnail.upsert(
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
        self.embeddings.description.upsert(
            documents=[description],
            metadatas=[metadata],
            ids=[event.id],
        )

        logger.info("Generated description for %s: %s", event.id, description)
