"""Maintain embeddings in SQLite-vec."""

import base64
import datetime
import logging
import os
import re
import threading
from multiprocessing.synchronize import Event as MpEvent
from pathlib import Path
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
from frigate.const import (
    CLIPS_DIR,
    FRIGATE_LOCALHOST,
    UPDATE_EVENT_DESCRIPTION,
)
from frigate.embeddings.lpr.lpr import LicensePlateRecognition
from frigate.events.types import EventTypeEnum
from frigate.genai import get_genai_client
from frigate.models import Event
from frigate.postprocessing.face_processor import FaceProcessor
from frigate.postprocessing.processor_api import ProcessorApi
from frigate.types import TrackedObjectUpdateTypesEnum
from frigate.util.builtin import serialize
from frigate.util.image import SharedMemoryFrameManager, area, calculate_region

from ..postprocessing.types import PostProcessingMetrics
from .embeddings import Embeddings

logger = logging.getLogger(__name__)

MAX_THUMBNAILS = 10


class EmbeddingMaintainer(threading.Thread):
    """Handle embedding queue and post event updates."""

    def __init__(
        self,
        db: SqliteQueueDatabase,
        config: FrigateConfig,
        metrics: PostProcessingMetrics,
        stop_event: MpEvent,
    ) -> None:
        super().__init__(name="embeddings_maintainer")
        self.config = config
        self.metrics = metrics
        self.embeddings = Embeddings(config, db, metrics)

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
        self.processors: list[ProcessorApi] = []

        if self.config.face_recognition.enabled:
            self.processors.append(FaceProcessor(self.config, metrics))

        # create communication for updating event descriptions
        self.requestor = InterProcessRequestor()
        self.stop_event = stop_event
        self.tracked_events: dict[str, list[any]] = {}
        self.genai_client = get_genai_client(config)

        # set license plate recognition conditions
        self.lpr_config = self.config.lpr
        self.requires_license_plate_detection = (
            "license_plate" not in self.config.objects.all_objects
        )
        self.detected_license_plates: dict[str, dict[str, any]] = {}

        if self.lpr_config.enabled:
            self.license_plate_recognition = LicensePlateRecognition(
                self.lpr_config, self.requestor, self.embeddings
            )

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

        def _handle_request(topic: str, data: dict[str, any]) -> str:
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
                        self.embeddings.embed_description("", data, upsert=False),
                        pack=False,
                    )
                else:
                    for processor in self.processors:
                        resp = processor.handle_request(data)

                        if resp is not None:
                            return resp
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

        # no need to process updated objects if face recognition, lpr, genai are disabled
        if (
            not camera_config.genai.enabled
            and not self.lpr_config.enabled
            and len(self.processors) == 0
        ):
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

        for processor in self.processors:
            processor.process_frame(data, yuv_frame)

        if self.lpr_config.enabled:
            start = datetime.datetime.now().timestamp()
            processed = self._process_license_plate(data, yuv_frame)

            if processed:
                duration = datetime.datetime.now().timestamp() - start
                self.metrics.alpr_pps.value = (
                    self.metrics.alpr_pps.value * 9 + duration
                ) / 10

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

            for processor in self.processors:
                processor.expire_object(event_id)

            if event_id in self.detected_license_plates:
                self.detected_license_plates.pop(event_id)

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

                    num_thumbnails = len(self.tracked_events.get(event_id, []))

                    embed_image = (
                        [snapshot_image]
                        if event.has_snapshot and camera_config.genai.use_snapshot
                        else (
                            [
                                data["thumbnail"]
                                for data in self.tracked_events[event_id]
                            ]
                            if num_thumbnails > 0
                            else [thumbnail]
                        )
                    )

                    if camera_config.genai.debug_save_thumbnails and num_thumbnails > 0:
                        logger.debug(
                            f"Saving {num_thumbnails} thumbnails for event {event.id}"
                        )

                        Path(
                            os.path.join(CLIPS_DIR, f"genai-requests/{event.id}")
                        ).mkdir(parents=True, exist_ok=True)

                        for idx, data in enumerate(self.tracked_events[event_id], 1):
                            jpg_bytes: bytes = data["thumbnail"]

                            if jpg_bytes is None:
                                logger.warning(
                                    f"Unable to save thumbnail {idx} for {event.id}."
                                )
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

    def _detect_license_plate(self, input: np.ndarray) -> tuple[int, int, int, int]:
        """Return the dimensions of the input image as [x, y, width, height]."""
        height, width = input.shape[:2]
        return (0, 0, width, height)

    def _process_license_plate(
        self, obj_data: dict[str, any], frame: np.ndarray
    ) -> bool:
        """Look for license plates in image."""
        id = obj_data["id"]

        # don't run for non car objects
        if obj_data.get("label") != "car":
            logger.debug("Not a processing license plate for non car object.")
            return False

        # don't run for stationary car objects
        if obj_data.get("stationary") == True:
            logger.debug("Not a processing license plate for a stationary car object.")
            return False

        # don't overwrite sub label for objects that have a sub label
        # that is not a license plate
        if obj_data.get("sub_label") and id not in self.detected_license_plates:
            logger.debug(
                f"Not processing license plate due to existing sub label: {obj_data.get('sub_label')}."
            )
            return False

        license_plate: Optional[dict[str, any]] = None

        if self.requires_license_plate_detection:
            logger.debug("Running manual license_plate detection.")
            car_box = obj_data.get("box")

            if not car_box:
                return False

            rgb = cv2.cvtColor(frame, cv2.COLOR_YUV2RGB_I420)
            left, top, right, bottom = car_box
            car = rgb[top:bottom, left:right]
            license_plate = self._detect_license_plate(car)

            if not license_plate:
                logger.debug("Detected no license plates for car object.")
                return False

            license_plate_frame = car[
                license_plate[1] : license_plate[3], license_plate[0] : license_plate[2]
            ]
            license_plate_frame = cv2.cvtColor(license_plate_frame, cv2.COLOR_RGB2BGR)
        else:
            # don't run for object without attributes
            if not obj_data.get("current_attributes"):
                logger.debug("No attributes to parse.")
                return False

            attributes: list[dict[str, any]] = obj_data.get("current_attributes", [])
            for attr in attributes:
                if attr.get("label") != "license_plate":
                    continue

                if license_plate is None or attr.get("score", 0.0) > license_plate.get(
                    "score", 0.0
                ):
                    license_plate = attr

            # no license plates detected in this frame
            if not license_plate:
                return False

            license_plate_box = license_plate.get("box")

            # check that license plate is valid
            if (
                not license_plate_box
                or area(license_plate_box) < self.config.lpr.min_area
            ):
                logger.debug(f"Invalid license plate box {license_plate}")
                return False

            license_plate_frame = cv2.cvtColor(frame, cv2.COLOR_YUV2BGR_I420)
            license_plate_frame = license_plate_frame[
                license_plate_box[1] : license_plate_box[3],
                license_plate_box[0] : license_plate_box[2],
            ]

        # run detection, returns results sorted by confidence, best first
        license_plates, confidences, areas = (
            self.license_plate_recognition.process_license_plate(license_plate_frame)
        )

        logger.debug(f"Text boxes: {license_plates}")
        logger.debug(f"Confidences: {confidences}")
        logger.debug(f"Areas: {areas}")

        if license_plates:
            for plate, confidence, text_area in zip(license_plates, confidences, areas):
                avg_confidence = (
                    (sum(confidence) / len(confidence)) if confidence else 0
                )

                logger.debug(
                    f"Detected text: {plate} (average confidence: {avg_confidence:.2f}, area: {text_area} pixels)"
                )
        else:
            # no plates found
            logger.debug("No text detected")
            return True

        top_plate, top_char_confidences, top_area = (
            license_plates[0],
            confidences[0],
            areas[0],
        )
        avg_confidence = (
            (sum(top_char_confidences) / len(top_char_confidences))
            if top_char_confidences
            else 0
        )

        # Check if we have a previously detected plate for this ID
        if id in self.detected_license_plates:
            prev_plate = self.detected_license_plates[id]["plate"]
            prev_char_confidences = self.detected_license_plates[id]["char_confidences"]
            prev_area = self.detected_license_plates[id]["area"]
            prev_avg_confidence = (
                (sum(prev_char_confidences) / len(prev_char_confidences))
                if prev_char_confidences
                else 0
            )

            # Define conditions for keeping the previous plate
            shorter_than_previous = len(top_plate) < len(prev_plate)
            lower_avg_confidence = avg_confidence <= prev_avg_confidence
            smaller_area = top_area < prev_area

            # Compare character-by-character confidence where possible
            min_length = min(len(top_plate), len(prev_plate))
            char_confidence_comparison = sum(
                1
                for i in range(min_length)
                if top_char_confidences[i] <= prev_char_confidences[i]
            )
            worse_char_confidences = char_confidence_comparison >= min_length / 2

            if (shorter_than_previous or smaller_area) and (
                lower_avg_confidence and worse_char_confidences
            ):
                logger.debug(
                    f"Keeping previous plate. New plate stats: "
                    f"length={len(top_plate)}, avg_conf={avg_confidence:.2f}, area={top_area} "
                    f"vs Previous: length={len(prev_plate)}, avg_conf={prev_avg_confidence:.2f}, area={prev_area}"
                )
                return True

        # Check against minimum confidence threshold
        if avg_confidence < self.lpr_config.threshold:
            logger.debug(
                f"Average confidence {avg_confidence} is less than threshold ({self.lpr_config.threshold})"
            )
            return True

        # Determine subLabel based on known plates, use regex matching
        # Default to the detected plate, use label name if there's a match
        sub_label = next(
            (
                label
                for label, plates in self.lpr_config.known_plates.items()
                if any(re.match(f"^{plate}$", top_plate) for plate in plates)
            ),
            top_plate,
        )

        # Send the result to the API
        resp = requests.post(
            f"{FRIGATE_LOCALHOST}/api/events/{id}/sub_label",
            json={
                "camera": obj_data.get("camera"),
                "subLabel": sub_label,
                "subLabelScore": avg_confidence,
            },
        )

        if resp.status_code == 200:
            self.detected_license_plates[id] = {
                "plate": top_plate,
                "char_confidences": top_char_confidences,
                "area": top_area,
            }

        return True

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
            snapshot_file = os.path.join(CLIPS_DIR, f"{event.camera}-{event.id}.jpg")

            if not os.path.isfile(snapshot_file):
                logger.error(
                    f"Cannot regenerate description for {event.id}, snapshot file not found: {snapshot_file}"
                )
                return

            with open(snapshot_file, "rb") as image_file:
                snapshot_image = image_file.read()
                img = cv2.imdecode(
                    np.frombuffer(snapshot_image, dtype=np.int8), cv2.IMREAD_COLOR
                )

                # crop snapshot based on region before sending off to genai
                # provide full image if region doesn't exist (manual events)
                region = event.data.get("region", [0, 0, 1, 1])
                height, width = img.shape[:2]
                x1_rel, y1_rel, width_rel, height_rel = region

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
                [data["thumbnail"] for data in self.tracked_events[event_id]]
                if len(self.tracked_events.get(event_id, [])) > 0
                else [thumbnail]
            )
        )

        self._embed_description(event, embed_image)
