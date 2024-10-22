"""Maintain embeddings in SQLite-vec."""

import base64
import logging
import os
import threading
from multiprocessing.synchronize import Event as MpEvent
from typing import Optional

import cv2
import numpy as np
import requests
from peewee import DoesNotExist
from playhouse.sqliteq import SqliteQueueDatabase

from frigate.comms.embeddings_updater import EmbeddingsRequestEnum, EmbeddingsResponder
from frigate.comms.event_metadata_updater import (
    EventMetadataSubscriber,
    EventMetadataTypeEnum,
)
from frigate.comms.events_updater import EventEndSubscriber, EventUpdateSubscriber
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig
from frigate.const import CLIPS_DIR, FRIGATE_LOCALHOST, UPDATE_EVENT_DESCRIPTION
from frigate.events.types import EventTypeEnum
from frigate.genai import get_genai_client
from frigate.models import Event
from frigate.types import TrackedObjectUpdateTypesEnum
from frigate.util.builtin import serialize
from frigate.util.image import SharedMemoryFrameManager, area, calculate_region

from .embeddings import Embeddings

logger = logging.getLogger(__name__)

MAX_THUMBNAILS = 10


class EmbeddingMaintainer(threading.Thread):
    """Handle embedding queue and post event updates."""

    def __init__(
        self,
        db: SqliteQueueDatabase,
        config: FrigateConfig,
        stop_event: MpEvent,
    ) -> None:
        super().__init__(name="embeddings_maintainer")
        self.config = config
        self.embeddings = Embeddings(config.semantic_search, db)

        # Check if we need to re-index events
        if config.semantic_search.reindex:
            self.embeddings.reindex()

        self.event_subscriber = EventUpdateSubscriber()
        self.event_end_subscriber = EventEndSubscriber()
        self.event_metadata_subscriber = EventMetadataSubscriber(
            EventMetadataTypeEnum.regenerate_description
        )
        self.embeddings_responder = EmbeddingsResponder()
        self.frame_manager = SharedMemoryFrameManager()

        # set face recognition conditions
        self.face_recognition_enabled = (
            self.config.semantic_search.face_recognition.enabled
        )
        self.requires_face_detection = "face" not in self.config.model.all_attributes

        # create communication for updating event descriptions
        self.requestor = InterProcessRequestor()
        self.stop_event = stop_event
        self.tracked_events: dict[str, list[any]] = {}
        self.genai_client = get_genai_client(config)

    def run(self) -> None:
        """Maintain a SQLite-vec database for semantic search."""
        while not self.stop_event.is_set():
            self._process_requests()
            self._process_updates()
            self._process_finalized()
            self._process_event_metadata()

        self.event_subscriber.stop()
        self.event_end_subscriber.stop()
        self.event_metadata_subscriber.stop()
        self.embeddings_responder.stop()
        self.requestor.stop()
        logger.info("Exiting embeddings maintenance...")

    def _process_requests(self) -> None:
        """Process embeddings requests"""

        def _handle_request(topic: str, data: str) -> str:
            try:
                if topic == EmbeddingsRequestEnum.embed_description.value:
                    return serialize(
                        self.embeddings.embed_description(
                            data["id"], data["description"]
                        ),
                        pack=False,
                    )
                elif topic == EmbeddingsRequestEnum.embed_thumbnail.value:
                    thumbnail = base64.b64decode(data["thumbnail"])
                    return serialize(
                        self.embeddings.embed_thumbnail(data["id"], thumbnail),
                        pack=False,
                    )
                elif topic == EmbeddingsRequestEnum.generate_search.value:
                    return serialize(
                        self.embeddings.text_embedding([data])[0], pack=False
                    )
                elif topic == EmbeddingsRequestEnum.register_face.value:
                    self.embeddings.embed_face(
                        data["face_name"],
                        base64.b64decode(data["image"]),
                        upsert=True,
                    )
                    return None
            except Exception as e:
                logger.error(f"Unable to handle embeddings request {e}")

        self.embeddings_responder.check_for_request(_handle_request)

    def _process_updates(self) -> None:
        """Process event updates"""
        update = self.event_subscriber.check_for_update(timeout=0.01)

        if update is None:
            return

        source_type, _, camera, frame_name, data = update

        if not camera or source_type != EventTypeEnum.tracked_object:
            return

        camera_config = self.config.cameras[camera]

        # no need to process updated objects if face recognition and genai are disabled
        if not camera_config.genai.enabled and not self.face_recognition_enabled:
            return

        # Create our own thumbnail based on the bounding box and the frame time
        try:
            yuv_frame = self.frame_manager.get(frame_name, camera_config.frame_shape_yuv)
        except FileNotFoundError:
            pass

        if yuv_frame is None:
            logger.debug(
                "Unable to process object update because frame is unavailable."
            )
            return

        if self.face_recognition_enabled:
            self._process_face(data, yuv_frame)

        # no need to save our own thumbnails if genai is not enabled
        # or if the object has become stationary
        if self.genai_client is not None and not data["stationary"]:
            if data["id"] not in self.tracked_events:
                self.tracked_events[data["id"]] = []

            data["thumbnail"] = self._create_thumbnail(yuv_frame, data["box"])

            # Limit the number of thumbnails saved
            if len(self.tracked_events[data["id"]]) >= MAX_THUMBNAILS:
                # Always keep the first thumbnail for the event
                self.tracked_events[data["id"]].pop(1)

            self.tracked_events[data["id"]].append(data)

        self.frame_manager.close(frame_name)

    def _process_finalized(self) -> None:
        """Process the end of an event."""
        while True:
            ended = self.event_end_subscriber.check_for_update(timeout=0.01)

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

                # Extract valid thumbnail
                thumbnail = base64.b64decode(event.thumbnail)

                # Embed the thumbnail
                self._embed_thumbnail(event_id, thumbnail)

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
                    if event.has_snapshot and camera_config.genai.use_snapshot:
                        with open(
                            os.path.join(CLIPS_DIR, f"{event.camera}-{event.id}.jpg"),
                            "rb",
                        ) as image_file:
                            snapshot_image = image_file.read()

                            img = cv2.imdecode(
                                np.frombuffer(snapshot_image, dtype=np.int8),
                                cv2.IMREAD_COLOR,
                            )

                            # crop snapshot based on region before sending off to genai
                            height, width = img.shape[:2]
                            x1_rel, y1_rel, width_rel, height_rel = event.data["region"]

                            x1, y1 = int(x1_rel * width), int(y1_rel * height)
                            cropped_image = img[
                                y1 : y1 + int(height_rel * height),
                                x1 : x1 + int(width_rel * width),
                            ]

                            _, buffer = cv2.imencode(".jpg", cropped_image)
                            snapshot_image = buffer.tobytes()

                    embed_image = (
                        [snapshot_image]
                        if event.has_snapshot and camera_config.genai.use_snapshot
                        else (
                            [thumbnail for data in self.tracked_events[event_id]]
                            if len(self.tracked_events.get(event_id, [])) > 0
                            else [thumbnail]
                        )
                    )

                    # Generate the description. Call happens in a thread since it is network bound.
                    threading.Thread(
                        target=self._embed_description,
                        name=f"_embed_description_{event.id}",
                        daemon=True,
                        args=(
                            event,
                            embed_image,
                        ),
                    ).start()

            # Delete tracked events based on the event_id
            if event_id in self.tracked_events:
                del self.tracked_events[event_id]

    def _process_event_metadata(self):
        # Check for regenerate description requests
        (topic, event_id, source) = self.event_metadata_subscriber.check_for_update(
            timeout=0.01
        )

        if topic is None:
            return

        if event_id:
            self.handle_regenerate_description(event_id, source)

    def _search_face(self, query_embedding: bytes) -> list:
        """Search for the face most closely matching the embedding."""
        sql_query = """
            SELECT
                id,
                distance
            FROM vec_faces
            WHERE face_embedding MATCH ?
                AND k = 10 ORDER BY distance
        """
        return self.embeddings.db.execute_sql(sql_query, [query_embedding]).fetchall()

    def _process_face(self, obj_data: dict[str, any], frame: np.ndarray) -> None:
        """Look for faces in image."""
        # don't run for non person objects
        if obj_data.get("label") != "person":
            logger.debug("Not a processing face for non person object.")
            return

        # don't overwrite sub label for objects that have one
        if obj_data.get("sub_label"):
            logger.debug(
                f"Not processing face due to existing sub label: {obj_data.get('sub_label')}."
            )
            return

        face: Optional[dict[str, any]] = None

        if self.requires_face_detection:
            # TODO run cv2 face detection
            pass
        else:
            # don't run for object without attributes
            if not obj_data.get("current_attributes"):
                logger.debug("No attributes to parse.")
                return

            attributes: list[dict[str, any]] = obj_data.get("current_attributes", [])
            for attr in attributes:
                if attr.get("label") != "face":
                    continue

                if face is None or attr.get("score", 0.0) > face.get("score", 0.0):
                    face = attr

        # no faces detected in this frame
        if not face:
            return

        face_box = face.get("box")

        # check that face is valid
        if (
            not face_box
            or area(face_box) < self.config.semantic_search.face_recognition.min_area
        ):
            logger.debug(f"Invalid face box {face}")
            return

        face_frame = cv2.cvtColor(frame, cv2.COLOR_YUV2BGR_I420)
        face_frame = face_frame[face_box[1] : face_box[3], face_box[0] : face_box[2]]
        ret, jpg = cv2.imencode(
            ".webp", face_frame, [int(cv2.IMWRITE_WEBP_QUALITY), 100]
        )

        if not ret:
            logger.debug("Not processing face due to error creating cropped image.")
            return

        embedding = self.embeddings.embed_face("unknown", jpg.tobytes(), upsert=False)
        query_embedding = serialize(embedding)
        best_faces = self._search_face(query_embedding)
        logger.debug(f"Detected best faces for person as: {best_faces}")

        if not best_faces:
            return

        sub_label = str(best_faces[0][0]).split("-")[0]
        score = 1.0 - best_faces[0][1]

        if score < self.config.semantic_search.face_recognition.threshold:
            return None

        requests.post(
            f"{FRIGATE_LOCALHOST}/api/events/{obj_data['id']}/sub_label",
            json={"subLabel": sub_label, "subLabelScore": score},
        )

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

    def _embed_thumbnail(self, event_id: str, thumbnail: bytes) -> None:
        """Embed the thumbnail for an event."""
        self.embeddings.embed_thumbnail(event_id, thumbnail)

    def _embed_description(self, event: Event, thumbnails: list[bytes]) -> None:
        """Embed the description for an event."""
        camera_config = self.config.cameras[event.camera]

        description = self.genai_client.generate_description(
            camera_config, thumbnails, event
        )

        if not description:
            logger.debug("Failed to generate description for %s", event.id)
            return

        # fire and forget description update
        self.requestor.send_data(
            UPDATE_EVENT_DESCRIPTION,
            {
                "type": TrackedObjectUpdateTypesEnum.description,
                "id": event.id,
                "description": description,
            },
        )

        # Embed the description
        self.embeddings.embed_description(event.id, description)

        logger.debug(
            "Generated description for %s (%d images): %s",
            event.id,
            len(thumbnails),
            description,
        )

    def handle_regenerate_description(self, event_id: str, source: str) -> None:
        try:
            event: Event = Event.get(Event.id == event_id)
        except DoesNotExist:
            logger.error(f"Event {event_id} not found for description regeneration")
            return

        camera_config = self.config.cameras[event.camera]
        if not camera_config.genai.enabled or self.genai_client is None:
            logger.error(f"GenAI not enabled for camera {event.camera}")
            return

        thumbnail = base64.b64decode(event.thumbnail)

        logger.debug(
            f"Trying {source} regeneration for {event}, has_snapshot: {event.has_snapshot}"
        )

        if event.has_snapshot and source == "snapshot":
            with open(
                os.path.join(CLIPS_DIR, f"{event.camera}-{event.id}.jpg"),
                "rb",
            ) as image_file:
                snapshot_image = image_file.read()
                img = cv2.imdecode(
                    np.frombuffer(snapshot_image, dtype=np.int8), cv2.IMREAD_COLOR
                )

                # crop snapshot based on region before sending off to genai
                height, width = img.shape[:2]
                x1_rel, y1_rel, width_rel, height_rel = event.data["region"]

                x1, y1 = int(x1_rel * width), int(y1_rel * height)
                cropped_image = img[
                    y1 : y1 + int(height_rel * height), x1 : x1 + int(width_rel * width)
                ]

                _, buffer = cv2.imencode(".jpg", cropped_image)
                snapshot_image = buffer.tobytes()

        embed_image = (
            [snapshot_image]
            if event.has_snapshot and source == "snapshot"
            else (
                [thumbnail for data in self.tracked_events[event_id]]
                if len(self.tracked_events.get(event_id, [])) > 0
                else [thumbnail]
            )
        )

        self._embed_description(event, embed_image)
