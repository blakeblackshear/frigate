import logging
import threading
from multiprocessing.synchronize import Event as MpEvent
from typing import Optional

import cv2
import numpy as np
from peewee import DoesNotExist
from playhouse.sqliteq import SqliteQueueDatabase

from frigate.comms.events_updater import EventEndSubscriber, EventUpdateSubscriber
from frigate.comms.recordings_updater import (
    RecordingsDataSubscriber,
    RecordingsDataTypeEnum,
)
from frigate.config import FrigateConfig
from frigate.embeddings.functions.embeddings_mixin import (
    EmbeddingsMixin,
)
from frigate.events.types import EventTypeEnum
from frigate.models import Recordings
from frigate.util.image import get_image_from_recording

from .embeddings import Embeddings

logger = logging.getLogger(__name__)


class ClassificationMaintainer(threading.Thread, EmbeddingsMixin):
    """Classify tracked objects via recordings snapshot API."""

    def __init__(
        self,
        db: SqliteQueueDatabase,
        config: FrigateConfig,
        stop_event: MpEvent,
        embeddings: Embeddings,
        face_detector: cv2.FaceDetectorYN = None,
        license_plate_recognition=None,
    ) -> None:
        threading.Thread.__init__(self, name="classification_maintainer")
        self.config = config
        self.embeddings = embeddings
        self.stop_event = stop_event
        self.event_subscriber = EventUpdateSubscriber()
        self.event_end_subscriber = EventEndSubscriber()
        self.recordings_subscriber = RecordingsDataSubscriber(
            RecordingsDataTypeEnum.recordings_available_through
        )

        # recordings data
        self.recordings_available_through: dict[str, float] = {}

        # Share required attributes and objects
        self.face_detector = face_detector
        self.face_recognition_enabled = config.face_recognition.enabled
        self.requires_face_detection = "face" not in config.objects.all_objects
        self.detected_faces = {}

        # LPR related attributes
        self.lpr_config = config.lpr
        self.requires_license_plate_detection = (
            "license_plate" not in config.objects.all_objects
        )
        self.detected_license_plates = {}
        self.license_plate_recognition = license_plate_recognition

    def run(self) -> None:
        """Run classification for finalized events."""
        while not self.stop_event.is_set():
            self._process_recordings_updates()
            self._process_event_updates()

        self.event_subscriber.stop()
        self.event_end_subscriber.stop()
        self.recordings_subscriber.stop()
        logger.info("Exiting classification maintainer...")

    def _fetch_cropped_recording_snapshot(
        self, obj_data: dict[str, any]
    ) -> Optional[bytes]:
        camera_config = self.config.cameras[obj_data["camera"]]
        annotation_offset = camera_config.detect.annotation_offset

        recording_query = (
            Recordings.select(
                Recordings.path,
                Recordings.start_time,
            )
            .where(
                (
                    (
                        obj_data["frame_time"] + annotation_offset
                        >= Recordings.start_time
                    )
                    & (
                        obj_data["frame_time"] + annotation_offset
                        <= Recordings.end_time
                    )
                )
            )
            .where(Recordings.camera == obj_data["camera"])
            .order_by(Recordings.start_time.desc())
            .limit(1)
        )

        try:
            recording: Recordings = recording_query.get()
            time_in_segment = (
                obj_data["frame_time"] + annotation_offset - recording.start_time
            )

            image_data = get_image_from_recording(
                self.config.ffmpeg, recording.path, time_in_segment, "mjpeg", None
            )
        except DoesNotExist:
            logger.debug(
                f"Recording does not exist for {obj_data['camera']} at {obj_data['frame_time']+annotation_offset}, can't fetch recording snapshot"
            )
            return

        img = cv2.imdecode(np.frombuffer(image_data, dtype=np.int8), cv2.IMREAD_COLOR)

        height, width = img.shape[:2]

        detect_width = camera_config.detect.width
        detect_height = camera_config.detect.height

        x1, y1, x2, y2 = obj_data["box"]

        x1 = int(x1 * width / detect_width)
        y1 = int(y1 * height / detect_height)
        x2 = int(x2 * width / detect_width)
        y2 = int(y2 * height / detect_height)

        cropped_image = img[y1:y2, x1:x2]

        yuv_image = cv2.cvtColor(cropped_image, cv2.COLOR_BGR2YUV)

        return yuv_image.tobytes()

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

    def _process_event_updates(self) -> None:
        """Process events."""
        # TODO: check new topic for last recording time
        update = self.event_subscriber.check_for_update(timeout=0.01)

        if update is None:
            return

        source_type, _, camera, data = update

        if not camera or source_type != EventTypeEnum.tracked_object:
            return

        # TODO: limit classification by camera
        camera_config = self.config.cameras[camera]

        # no need to process updated objects if recording, face recognition, or lpr are disabled
        if (
            not self.face_recognition_enabled
            and not self.lpr_config.enabled
            and not camera_config.record.enabled
        ):
            return

        if data["stationary"] == False:
            logger.debug("Not classifying object due to not being stationary")
            return

        try:
            yuv_frame = self._fetch_cropped_recording_snapshot(data)

            if yuv_frame is not None:
                if self.face_recognition_enabled:
                    self._process_face(data, yuv_frame)

                if self.lpr_config.enabled:
                    logger.debug(f"Classifying license plate for {data} {yuv_frame}")
                    self._process_license_plate(data, yuv_frame)

        except FileNotFoundError:
            pass
