"""Maintain embeddings in Chroma."""

import base64
import io
import threading
from typing import Optional

import cv2
import numpy as np
from peewee import DoesNotExist
from PIL import Image
from playhouse.sqliteq import SqliteQueueDatabase

from frigate import util
from frigate.comms.event_metadata_updater import (
    EventMetadataSubscriber,
    EventMetadataTypeEnum,
)
from frigate.comms.events_updater import EventEndSubscriber, EventUpdateSubscriber
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig
from frigate.const import UPDATE_EVENT_DESCRIPTION
from frigate.events.types import EventTypeEnum
from frigate.genai import get_genai_client
from frigate.models import Event
from frigate.util.image import SharedMemoryFrameManager, calculate_region

from .embeddings import Embeddings, get_metadata


class EmbeddingsMaintainer(util.Process):
    """Maintain a Chroma vector database for semantic search."""

    def __init__(self, config: FrigateConfig):
        super().__init__(name="frigate.embeddings_manager", daemon=True)
        self.config = config

    def run(self):
        # Only initialize embeddings if semantic search is enabled
        if not self.config.semantic_search.enabled:
            return

        # Configure Frigate DB
        db = SqliteQueueDatabase(
            self.config.database.path,
            pragmas={
                "auto_vacuum": "FULL",  # Does not defragment database
                "cache_size": -512 * 1000,  # 512MB of cache
                "synchronous": "NORMAL",  # Safe when using WAL https://www.sqlite.org/pragma.html#pragma_synchronous
            },
            timeout=max(60, sum(10 for c in self.config.cameras.values() if c.enabled)),
        )
        models = [Event]
        db.bind(models)

        embeddings = Embeddings()

        # Check if we need to re-index events
        if self.config.semantic_search.reindex:
            embeddings.reindex()

        self.embeddings = Embeddings()
        self.event_subscriber = EventUpdateSubscriber()
        self.event_end_subscriber = EventEndSubscriber()
        self.event_metadata_subscriber = EventMetadataSubscriber(
            EventMetadataTypeEnum.regenerate_description
        )
        self.frame_manager = SharedMemoryFrameManager()
        # create communication for updating event descriptions
        self.requestor = InterProcessRequestor()
        self.tracked_events = {}
        self.genai_client = get_genai_client(self.config.genai)

        while not self.stop_event.is_set():
            self._process_updates()
            self._process_finalized()
            self._process_event_metadata()

        self.event_subscriber.stop()
        self.event_end_subscriber.stop()
        self.event_metadata_subscriber.stop()
        self.requestor.stop()
        self.logger.info("Exiting embeddings maintenance...")

    def _process_updates(self) -> None:
        """Process event updates"""
        update = self.event_subscriber.check_for_update()

        if update is None:
            return

        source_type, _, camera, data = update

        if not camera or source_type != EventTypeEnum.tracked_object:
            return

        camera_config = self.config.cameras[camera]
        if data["id"] not in self.tracked_events:
            self.tracked_events[data["id"]] = []

        # Create our own thumbnail based on the bounding box and the frame time
        try:
            frame_id = f"{camera}{data['frame_time']}"
            yuv_frame = self.frame_manager.get(frame_id, camera_config.frame_shape_yuv)

            if yuv_frame is not None:
                data["thumbnail"] = self._create_thumbnail(yuv_frame, data["box"])
                self.tracked_events[data["id"]].append(data)
                self.frame_manager.close(frame_id)
        except FileNotFoundError:
            pass

    def _process_finalized(self) -> None:
        """Process the end of an event."""
        while True:
            ended = self.event_end_subscriber.check_for_update()

            if ended == None:
                break

            event_id, camera, updated_db = ended
            camera_config = self.config.cameras[camera]

            if updated_db:
                try:
                    event: Event = Event.get(Event.id == event_id)
                except DoesNotExist:
                    continue

                # Skip the event if not an object
                if event.data.get("type") != "object":
                    continue

                # Extract valid event metadata
                metadata = get_metadata(event)
                thumbnail = base64.b64decode(event.thumbnail)

                # Embed the thumbnail
                self._embed_thumbnail(event_id, thumbnail, metadata)

                if (
                    camera_config.genai.enabled
                    and self.genai_client is not None
                    and event.data.get("description") is None
                    and (
                        not camera_config.genai.objects
                        or event.label in camera_config.genai.objects
                    )
                    and (
                        not camera_config.genai.required_zones
                        or set(event.zones) & set(camera_config.genai.required_zones)
                    )
                ):
                    # Generate the description. Call happens in a thread since it is network bound.
                    threading.Thread(
                        target=self._embed_description,
                        name=f"_embed_description_{event.id}",
                        daemon=True,
                        args=(
                            event,
                            [
                                data["thumbnail"]
                                for data in self.tracked_events[event_id]
                            ]
                            if len(self.tracked_events.get(event_id, [])) > 0
                            else [thumbnail],
                            metadata,
                        ),
                    ).start()

            # Delete tracked events based on the event_id
            if event_id in self.tracked_events:
                del self.tracked_events[event_id]

    def _process_event_metadata(self):
        # Check for regenerate description requests
        (topic, event_id) = self.event_metadata_subscriber.check_for_update(timeout=1)

        if topic is None:
            return

        if event_id:
            self.handle_regenerate_description(event_id)

    def _create_thumbnail(self, yuv_frame, box, height=500) -> Optional[bytes]:
        """Return jpg thumbnail of a region of the frame."""
        frame = cv2.cvtColor(yuv_frame, cv2.COLOR_YUV2BGR_I420)
        region = calculate_region(
            frame.shape, box[0], box[1], box[2], box[3], height, multiplier=1.4
        )
        frame = frame[region[1] : region[3], region[0] : region[2]]
        width = int(height * frame.shape[1] / frame.shape[0])
        frame = cv2.resize(frame, dsize=(width, height), interpolation=cv2.INTER_AREA)
        ret, jpg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 100])

        if ret:
            return jpg.tobytes()

        return None

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
        self, event: Event, thumbnails: list[bytes], metadata: dict
    ) -> None:
        """Embed the description for an event."""
        camera_config = self.config.cameras[event.camera]

        description = self.genai_client.generate_description(
            camera_config, thumbnails, metadata
        )

        if not description:
            self.logger.debug("Failed to generate description for %s", event.id)
            return

        # fire and forget description update
        self.requestor.send_data(
            UPDATE_EVENT_DESCRIPTION,
            {"id": event.id, "description": description},
        )

        # Encode the description
        self.embeddings.description.upsert(
            documents=[description],
            metadatas=[metadata],
            ids=[event.id],
        )

        self.logger.debug(
            "Generated description for %s (%d images): %s",
            event.id,
            len(thumbnails),
            description,
        )

    def handle_regenerate_description(self, event_id: str) -> None:
        try:
            event: Event = Event.get(Event.id == event_id)
        except DoesNotExist:
            self.logger.error(
                f"Event {event_id} not found for description regeneration"
            )
            return

        camera_config = self.config.cameras[event.camera]
        if not camera_config.genai.enabled or self.genai_client is None:
            self.logger.error(f"GenAI not enabled for camera {event.camera}")
            return

        metadata = get_metadata(event)
        thumbnail = base64.b64decode(event.thumbnail)

        self._embed_description(event, [thumbnail], metadata)
