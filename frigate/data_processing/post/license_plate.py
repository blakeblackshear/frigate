"""Handle post processing for license plate recognition."""

import datetime
import logging

import cv2
import numpy as np
from peewee import DoesNotExist
from playhouse.shortcuts import model_to_dict

from frigate.config import FrigateConfig
from frigate.data_processing.common.license_plate.mixin import (
    LicensePlateProcessingMixin,
)
from frigate.data_processing.common.license_plate.model import (
    LicensePlateModelRunner,
)
from frigate.data_processing.types import PostProcessDataEnum
from frigate.models import Event, Recordings
from frigate.util.image import get_image_from_recording

from ..types import DataProcessorMetrics
from .api import PostProcessorApi

logger = logging.getLogger(__name__)


class LicensePlatePostProcessor(PostProcessorApi, LicensePlateProcessingMixin):
    def __init__(
        self,
        config: FrigateConfig,
        metrics: DataProcessorMetrics,
        model_runner: LicensePlateModelRunner,
    ):
        self.model_runner = model_runner
        self.lpr_config = config.lpr
        self.config = config
        super().__init__(config, metrics, model_runner)

    def __update_metrics(self, duration: float) -> None:
        """
        Update inference metrics.
        """
        self.metrics.alpr_pps.value = (self.metrics.alpr_pps.value * 9 + duration) / 10

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
        recordings_available_through = data["recordings_available"]

        start = datetime.datetime.now().timestamp()

        try:
            event: Event = Event.get(Event.id == event_id)
        except DoesNotExist:
            logger.error("License plate event does not exist yet")
            return

        # Skip the event if not an object
        if event.data.get("type") != "object":
            logger.error("Invalid object")
            return

        # TODO: need frame time of best plate from realtime processor
        frame_time = event.end_time - 5

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
                logger.error("Unable to fetch license plate from recording")

            # Convert bytes to numpy array
            image_array = np.frombuffer(image_data, dtype=np.uint8)

            if len(image_array) == 0:
                logger.error("No image")
                return

            image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

            cv2.imwrite(f"debug/frames/lpr_post_{frame_time}.jpg", image)

            frame = cv2.cvtColor(image, cv2.COLOR_BGR2YUV_I420)
            yuv_height, yuv_width = self.config.cameras[camera_name].frame_shape_yuv
            frame_resized = cv2.resize(frame, (yuv_width, yuv_height))

            logger.info("Post processing plate")
            self.lpr_process(model_to_dict(event), frame_resized)
        except DoesNotExist:
            logger.error(
                "Error fetching license plate from recording for postprocessing"
            )

        self.__update_metrics(datetime.datetime.now().timestamp() - start)

    def handle_request(self, topic, request_data) -> dict[str, any] | None:
        return
