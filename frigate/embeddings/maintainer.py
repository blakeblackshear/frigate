"""Maintain embeddings in SQLite-vec."""

import base64
import logging
import os
import threading
from multiprocessing.synchronize import Event as MpEvent
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from peewee import DoesNotExist
from playhouse.sqliteq import SqliteQueueDatabase

from frigate.comms.embeddings_updater import EmbeddingsRequestEnum, EmbeddingsResponder
from frigate.comms.event_metadata_updater import (
    EventMetadataSubscriber,
    EventMetadataTypeEnum,
)
from frigate.comms.events_updater import EventEndSubscriber, EventUpdateSubscriber
from frigate.comms.inter_process import InterProcessRequestor
from frigate.comms.recordings_updater import (
    RecordingsDataSubscriber,
    RecordingsDataTypeEnum,
)
from frigate.config import FrigateConfig
from frigate.const import (
    CLIPS_DIR,
    UPDATE_EVENT_DESCRIPTION,
)
from frigate.data_processing.common.license_plate.model import (
    LicensePlateModelRunner,
)
from frigate.data_processing.post.api import PostProcessorApi
from frigate.data_processing.post.license_plate import (
    LicensePlatePostProcessor,
)
from frigate.data_processing.real_time.api import RealTimeProcessorApi
from frigate.data_processing.real_time.bird import BirdRealTimeProcessor
from frigate.data_processing.real_time.face import FaceRealTimeProcessor
from frigate.data_processing.real_time.license_plate import (
    LicensePlateRealTimeProcessor,
)
from frigate.data_processing.types import DataProcessorMetrics, PostProcessDataEnum
from frigate.events.types import EventTypeEnum
from frigate.genai import get_genai_client
from frigate.models import Event
from frigate.types import TrackedObjectUpdateTypesEnum
from frigate.util.builtin import serialize
from frigate.util.image import (
    SharedMemoryFrameManager,
    calculate_region,
    ensure_jpeg_bytes,
)
from frigate.util.path import get_event_thumbnail_bytes

from .embeddings import Embeddings

logger = logging.getLogger(__name__)

MAX_THUMBNAILS = 10


class EmbeddingMaintainer(threading.Thread):
    """Handle embedding queue and post event updates."""

    def __init__(
        self,
        db: SqliteQueueDatabase,
        config: FrigateConfig,
        metrics: DataProcessorMetrics,
        stop_event: MpEvent,
    ) -> None:
        super().__init__(name="embeddings_maintainer")
        self.config = config
        self.metrics = metrics
        self.embeddings = None

        if config.semantic_search.enabled:
            self.embeddings = Embeddings(config, db, metrics)

            # Check if we need to re-index events
            if config.semantic_search.reindex:
                self.embeddings.reindex()

        # create communication for updating event descriptions
        self.requestor = InterProcessRequestor()

        self.event_subscriber = EventUpdateSubscriber()
        self.event_end_subscriber = EventEndSubscriber()
        self.event_metadata_subscriber = EventMetadataSubscriber(
            EventMetadataTypeEnum.regenerate_description
        )
        self.recordings_subscriber = RecordingsDataSubscriber(
            RecordingsDataTypeEnum.recordings_available_through
        )
        self.embeddings_responder = EmbeddingsResponder()
        self.frame_manager = SharedMemoryFrameManager()

        self.detected_license_plates: dict[str, dict[str, any]] = {}

        # model runners to share between realtime and post processors
        if self.config.lpr.enabled:
            lpr_model_runner = LicensePlateModelRunner(self.requestor)

        # realtime processors
        self.realtime_processors: list[RealTimeProcessorApi] = []

        if self.config.face_recognition.enabled:
            self.realtime_processors.append(FaceRealTimeProcessor(self.config, metrics))

        if self.config.classification.bird.enabled:
            self.realtime_processors.append(BirdRealTimeProcessor(self.config, metrics))

        if self.config.lpr.enabled:
            self.realtime_processors.append(
                LicensePlateRealTimeProcessor(
                    self.config, metrics, lpr_model_runner, self.detected_license_plates
                )
            )

        # post processors
        self.post_processors: list[PostProcessorApi] = []

        if self.config.lpr.enabled:
            self.post_processors.append(
                LicensePlatePostProcessor(
                    self.config, metrics, lpr_model_runner, self.detected_license_plates
                )
            )

        self.stop_event = stop_event
        self.tracked_events: dict[str, list[any]] = {}
        self.early_request_sent: dict[str, bool] = {}
        self.genai_client = get_genai_client(config)

        # recordings data
        self.recordings_available_through: dict[str, float] = {}

    def run(self) -> None:
        """Maintain a SQLite-vec database for semantic search."""
        while not self.stop_event.is_set():
            self._process_requests()
            self._process_updates()
            self._process_recordings_updates()
            self._process_finalized()
            self._process_event_metadata()

        self.event_subscriber.stop()
        self.event_end_subscriber.stop()
        self.recordings_subscriber.stop()
        self.event_metadata_subscriber.stop()
        self.embeddings_responder.stop()
        self.requestor.stop()
        logger.info("Exiting embeddings maintenance...")

    def _process_requests(self) -> None:
        """Process embeddings requests"""

        def _handle_request(topic: str, data: dict[str, any]) -> str:
            try:
                # First handle the embedding-specific topics when semantic search is enabled
                if self.config.semantic_search.enabled:
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
                            self.embeddings.embed_description("", data, upsert=False),
                            pack=False,
                        )
                processors = [self.realtime_processors, self.post_processors]
                for processor_list in processors:
                    for processor in processor_list:
                        resp = processor.handle_request(topic, data)
                        if resp is not None:
                            return resp
            except Exception as e:
                logger.error(f"Unable to handle embeddings request {e}", exc_info=True)

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

        # no need to process updated objects if face recognition, lpr, genai are disabled
        if not camera_config.genai.enabled and len(self.realtime_processors) == 0:
            return

        # Create our own thumbnail based on the bounding box and the frame time
        try:
            yuv_frame = self.frame_manager.get(
                frame_name, camera_config.frame_shape_yuv
            )
        except FileNotFoundError:
            pass

        if yuv_frame is None:
            logger.debug(
                "Unable to process object update because frame is unavailable."
            )
            return

        for processor in self.realtime_processors:
            processor.process_frame(data, yuv_frame)

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

        # check if we're configured to send an early request after a minimum number of updates received
        if (
            self.genai_client is not None
            and camera_config.genai.send_triggers.after_significant_updates
        ):
            if (
                len(self.tracked_events.get(data["id"], []))
                >= camera_config.genai.send_triggers.after_significant_updates
                and data["id"] not in self.early_request_sent
            ):
                if data["has_clip"] and data["has_snapshot"]:
                    event: Event = Event.get(Event.id == data["id"])

                    if (
                        not camera_config.genai.objects
                        or event.label in camera_config.genai.objects
                    ) and (
                        not camera_config.genai.required_zones
                        or set(data["entered_zones"])
                        & set(camera_config.genai.required_zones)
                    ):
                        logger.debug(f"{camera} sending early request to GenAI")

                        self.early_request_sent[data["id"]] = True
                        threading.Thread(
                            target=self._genai_embed_description,
                            name=f"_genai_embed_description_{event.id}",
                            daemon=True,
                            args=(
                                event,
                                [
                                    data["thumbnail"]
                                    for data in self.tracked_events[data["id"]]
                                ],
                            ),
                        ).start()

        self.frame_manager.close(frame_name)

    def _process_finalized(self) -> None:
        """Process the end of an event."""
        while True:
            ended = self.event_end_subscriber.check_for_update(timeout=0.01)

            if ended == None:
                break

            event_id, camera, updated_db = ended
            camera_config = self.config.cameras[camera]

            # call any defined post processors
            for processor in self.post_processors:
                if isinstance(processor, LicensePlatePostProcessor):
                    recordings_available = self.recordings_available_through.get(camera)
                    if (
                        recordings_available is not None
                        and event_id in self.detected_license_plates
                    ):
                        processor.process_data(
                            {
                                "event_id": event_id,
                                "camera": camera,
                                "recordings_available": self.recordings_available_through[
                                    camera
                                ],
                                "obj_data": self.detected_license_plates[event_id][
                                    "obj_data"
                                ],
                            },
                            PostProcessDataEnum.recording,
                        )
                else:
                    processor.process_data(event_id, PostProcessDataEnum.event_id)

            # expire in realtime processors
            for processor in self.realtime_processors:
                processor.expire_object(event_id)

            if updated_db:
                try:
                    event: Event = Event.get(Event.id == event_id)
                except DoesNotExist:
                    continue

                # Skip the event if not an object
                if event.data.get("type") != "object":
                    continue

                # Extract valid thumbnail
                thumbnail = get_event_thumbnail_bytes(event)

                # Embed the thumbnail
                self._embed_thumbnail(event_id, thumbnail)

                # Run GenAI
                if (
                    camera_config.genai.enabled
                    and camera_config.genai.send_triggers.tracked_object_end
                    and self.genai_client is not None
                    and (
                        not camera_config.genai.objects
                        or event.label in camera_config.genai.objects
                    )
                    and (
                        not camera_config.genai.required_zones
                        or set(event.zones) & set(camera_config.genai.required_zones)
                    )
                ):
                    self._process_genai_description(event, camera_config, thumbnail)

            # Delete tracked events based on the event_id
            if event_id in self.tracked_events:
                del self.tracked_events[event_id]

    def _process_recordings_updates(self) -> None:
        """Process recordings updates."""
        while True:
            recordings_data = self.recordings_subscriber.check_for_update(timeout=0.01)

            if recordings_data == None:
                break

            camera, recordings_available_through_timestamp = recordings_data

            self.recordings_available_through[camera] = (
                recordings_available_through_timestamp
            )

            logger.debug(
                f"{camera} now has recordings available through {recordings_available_through_timestamp}"
            )

    def _process_event_metadata(self):
        # Check for regenerate description requests
        (topic, event_id, source) = self.event_metadata_subscriber.check_for_update(
            timeout=0.01
        )

        if topic is None:
            return

        if event_id:
            self.handle_regenerate_description(event_id, source)

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
        if not self.config.semantic_search.enabled:
            return

        self.embeddings.embed_thumbnail(event_id, thumbnail)

    def _process_genai_description(self, event, camera_config, thumbnail) -> None:
        if event.has_snapshot and camera_config.genai.use_snapshot:
            snapshot_image = self._read_and_crop_snapshot(event, camera_config)
            if not snapshot_image:
                return

        num_thumbnails = len(self.tracked_events.get(event.id, []))

        # ensure we have a jpeg to pass to the model
        thumbnail = ensure_jpeg_bytes(thumbnail)

        embed_image = (
            [snapshot_image]
            if event.has_snapshot and camera_config.genai.use_snapshot
            else (
                [data["thumbnail"] for data in self.tracked_events[event.id]]
                if num_thumbnails > 0
                else [thumbnail]
            )
        )

        if camera_config.genai.debug_save_thumbnails and num_thumbnails > 0:
            logger.debug(f"Saving {num_thumbnails} thumbnails for event {event.id}")

            Path(os.path.join(CLIPS_DIR, f"genai-requests/{event.id}")).mkdir(
                parents=True, exist_ok=True
            )

            for idx, data in enumerate(self.tracked_events[event.id], 1):
                jpg_bytes: bytes = data["thumbnail"]

                if jpg_bytes is None:
                    logger.warning(f"Unable to save thumbnail {idx} for {event.id}.")
                else:
                    with open(
                        os.path.join(
                            CLIPS_DIR,
                            f"genai-requests/{event.id}/{idx}.jpg",
                        ),
                        "wb",
                    ) as j:
                        j.write(jpg_bytes)

        # Generate the description. Call happens in a thread since it is network bound.
        threading.Thread(
            target=self._genai_embed_description,
            name=f"_genai_embed_description_{event.id}",
            daemon=True,
            args=(
                event,
                embed_image,
            ),
        ).start()

    def _genai_embed_description(self, event: Event, thumbnails: list[bytes]) -> None:
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
        if self.config.semantic_search.enabled:
            self.embeddings.embed_description(event.id, description)

        logger.debug(
            "Generated description for %s (%d images): %s",
            event.id,
            len(thumbnails),
            description,
        )

    def _read_and_crop_snapshot(self, event: Event, camera_config) -> bytes | None:
        """Read, decode, and crop the snapshot image."""

        snapshot_file = os.path.join(CLIPS_DIR, f"{event.camera}-{event.id}.jpg")

        if not os.path.isfile(snapshot_file):
            logger.error(
                f"Cannot load snapshot for {event.id}, file not found: {snapshot_file}"
            )
            return None

        try:
            with open(snapshot_file, "rb") as image_file:
                snapshot_image = image_file.read()

                img = cv2.imdecode(
                    np.frombuffer(snapshot_image, dtype=np.int8),
                    cv2.IMREAD_COLOR,
                )

                # Crop snapshot based on region
                # provide full image if region doesn't exist (manual events)
                height, width = img.shape[:2]
                x1_rel, y1_rel, width_rel, height_rel = event.data.get(
                    "region", [0, 0, 1, 1]
                )
                x1, y1 = int(x1_rel * width), int(y1_rel * height)

                cropped_image = img[
                    y1 : y1 + int(height_rel * height),
                    x1 : x1 + int(width_rel * width),
                ]

                _, buffer = cv2.imencode(".jpg", cropped_image)

                return buffer.tobytes()
        except Exception:
            return None

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

        thumbnail = get_event_thumbnail_bytes(event)

        # ensure we have a jpeg to pass to the model
        thumbnail = ensure_jpeg_bytes(thumbnail)

        logger.debug(
            f"Trying {source} regeneration for {event}, has_snapshot: {event.has_snapshot}"
        )

        if event.has_snapshot and source == "snapshot":
            snapshot_image = self._read_and_crop_snapshot(event, camera_config)
            if not snapshot_image:
                return

        embed_image = (
            [snapshot_image]
            if event.has_snapshot and source == "snapshot"
            else (
                [data["thumbnail"] for data in self.tracked_events[event_id]]
                if len(self.tracked_events.get(event_id, [])) > 0
                else [thumbnail]
            )
        )

        self._genai_embed_description(event, embed_image)
