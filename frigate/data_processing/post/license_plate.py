"""Handle post processing for license plate recognition."""

import datetime
import logging

import cv2
import numpy as np
from peewee import DoesNotExist

from frigate.comms.embeddings_updater import EmbeddingsRequestEnum
from frigate.comms.event_metadata_updater import EventMetadataPublisher
from frigate.config import FrigateConfig
from frigate.data_processing.common.license_plate.mixin import (
    WRITE_DEBUG_IMAGES,
    LicensePlateProcessingMixin,
)
from frigate.data_processing.common.license_plate.model import (
    LicensePlateModelRunner,
)
from frigate.data_processing.types import PostProcessDataEnum
from frigate.models import Recordings
from frigate.util.image import get_image_from_recording

from ..types import DataProcessorMetrics
from .api import PostProcessorApi

logger = logging.getLogger(__name__)


class LicensePlatePostProcessor(LicensePlateProcessingMixin, PostProcessorApi):
    def __init__(
        self,
        config: FrigateConfig,
        sub_label_publisher: EventMetadataPublisher,
        metrics: DataProcessorMetrics,
        model_runner: LicensePlateModelRunner,
        detected_license_plates: dict[str, dict[str, any]],
    ):
        self.detected_license_plates = detected_license_plates
        self.model_runner = model_runner
        self.lpr_config = config.lpr
        self.config = config
        self.sub_label_publisher = sub_label_publisher
        super().__init__(config, metrics, model_runner)

    def process_data(
        self, data: dict[str, any], data_type: PostProcessDataEnum
    ) -> None:
        """Look for license plates in recording stream image
        Args:
            data (dict): containing data about the input.
            data_type (enum): Describing the data that is being processed.

        Returns:
            None.
        """
        event_id = data["event_id"]
        camera_name = data["camera"]

        if data_type == PostProcessDataEnum.recording:
            obj_data = data["obj_data"]
            frame_time = obj_data["frame_time"]
            recordings_available_through = data["recordings_available"]

            if frame_time > recordings_available_through:
                logger.debug(
                    f"LPR post processing: No recordings available for this frame time {frame_time}, available through {recordings_available_through}"
                )

        elif data_type == PostProcessDataEnum.tracked_object:
            # non-functional, need to think about snapshot time
            obj_data = data["event"]["data"]
            obj_data["id"] = data["event"]["id"]
            obj_data["camera"] = data["event"]["camera"]
            # TODO: snapshot time?
            frame_time = data["event"]["start_time"]

        else:
            logger.error("No data type passed to LPR postprocessing")
            return

        recording_query = (
            Recordings.select(
                Recordings.path,
                Recordings.start_time,
            )
            .where(
                (
                    (frame_time >= Recordings.start_time)
                    & (frame_time <= Recordings.end_time)
                )
            )
            .where(Recordings.camera == camera_name)
            .order_by(Recordings.start_time.desc())
            .limit(1)
        )

        try:
            recording: Recordings = recording_query.get()
            time_in_segment = frame_time - recording.start_time
            codec = "mjpeg"

            image_data = get_image_from_recording(
                self.config.ffmpeg, recording.path, time_in_segment, codec, None
            )

            if not image_data:
                logger.debug(
                    "LPR post processing: Unable to fetch license plate from recording"
                )

            # Convert bytes to numpy array
            image_array = np.frombuffer(image_data, dtype=np.uint8)

            if len(image_array) == 0:
                logger.debug("LPR post processing: No image")
                return

            image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

        except DoesNotExist:
            logger.debug("Error fetching license plate for postprocessing")
            return

        if WRITE_DEBUG_IMAGES:
            cv2.imwrite(
                f"debug/frames/lpr_post_{datetime.datetime.now().timestamp()}.jpg",
                image,
            )

        # convert to yuv for processing
        frame = cv2.cvtColor(image, cv2.COLOR_BGR2YUV_I420)

        detect_width = self.config.cameras[camera_name].detect.width
        detect_height = self.config.cameras[camera_name].detect.height

        # Scale the boxes based on detect dimensions
        scale_x = image.shape[1] / detect_width
        scale_y = image.shape[0] / detect_height

        # Determine which box to enlarge based on detection mode
        if "license_plate" not in self.config.cameras[camera_name].objects.track:
            # Scale and enlarge the car box
            box = obj_data.get("box")
            if not box:
                return

            # Scale original car box to detection dimensions
            left = int(box[0] * scale_x)
            top = int(box[1] * scale_y)
            right = int(box[2] * scale_x)
            bottom = int(box[3] * scale_y)
            box = [left, top, right, bottom]
        else:
            # Get the license plate box from attributes
            if not obj_data.get("current_attributes"):
                return

            license_plate = None
            for attr in obj_data["current_attributes"]:
                if attr.get("label") != "license_plate":
                    continue
                if license_plate is None or attr.get("score", 0.0) > license_plate.get(
                    "score", 0.0
                ):
                    license_plate = attr

            if not license_plate or not license_plate.get("box"):
                return

            # Scale license plate box to detection dimensions
            orig_box = license_plate["box"]
            left = int(orig_box[0] * scale_x)
            top = int(orig_box[1] * scale_y)
            right = int(orig_box[2] * scale_x)
            bottom = int(orig_box[3] * scale_y)
            box = [left, top, right, bottom]

        width_box = right - left
        height_box = bottom - top

        # Enlarge box slightly to account for drift in detect vs recording stream
        enlarge_factor = 0.3
        new_left = max(0, int(left - (width_box * enlarge_factor / 2)))
        new_top = max(0, int(top - (height_box * enlarge_factor / 2)))
        new_right = min(image.shape[1], int(right + (width_box * enlarge_factor / 2)))
        new_bottom = min(
            image.shape[0], int(bottom + (height_box * enlarge_factor / 2))
        )

        keyframe_obj_data = obj_data.copy()
        if "license_plate" not in self.config.cameras[camera_name].objects.track:
            # car box
            keyframe_obj_data["box"] = [new_left, new_top, new_right, new_bottom]
        else:
            # Update the license plate box in the attributes
            new_attributes = []
            for attr in obj_data["current_attributes"]:
                if attr.get("label") == "license_plate":
                    new_attr = attr.copy()
                    new_attr["box"] = [new_left, new_top, new_right, new_bottom]
                    new_attributes.append(new_attr)
                else:
                    new_attributes.append(attr)
            keyframe_obj_data["current_attributes"] = new_attributes

        # run the frame through lpr processing
        logger.debug(f"Post processing plate: {event_id}, {frame_time}")
        self.lpr_process(keyframe_obj_data, frame)

    def handle_request(self, topic, request_data) -> dict[str, any] | None:
        if topic == EmbeddingsRequestEnum.reprocess_plate.value:
            event = request_data["event"]

            self.process_data(
                {
                    "event_id": event["id"],
                    "camera": event["camera"],
                    "event": event,
                },
                PostProcessDataEnum.tracked_object,
            )

            return {
                "message": "Successfully requested reprocessing of license plate.",
                "success": True,
            }
