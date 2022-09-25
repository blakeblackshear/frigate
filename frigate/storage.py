"""Handle storage retention and usage."""

import logging
import threading

from peewee import SqliteDatabase, operator, fn, DoesNotExist

from frigate.config import FrigateConfig
from frigate.models import Recordings

logger = logging.getLogger(__name__)


class StorageMaintainer(threading.Thread):
    """Maintain frigates recording storage."""

    def __init__(self, config: FrigateConfig, stop_event):
        threading.Thread.__init__(self)
        self.name = "recording_cleanup"
        self.config = config
        self.stop_event = stop_event
        self.avg_segment_sizes: dict[str, dict] = {}

    def calculate_camera_segment_sizes(self):
        """Calculate the size of each cameras recording segments."""
        for camera in self.config.cameras.keys():
            if not self.config.cameras[camera].record.enabled:
                continue

            avg_segment_size = round(
                Recordings.select(fn.AVG(Recordings.segment_size))
                .where(Recordings.camera == camera)
                .where(Recordings.segment_size != 0)
                .scalar(),
                2,
            )
            segment_duration = int(
                Recordings.select(Recordings.duration)
                .where(Recordings.camera == camera)
                .scalar()
            )
            self.avg_segment_sizes[camera] = {
                "segment": avg_segment_size,
                "hour": (3600 / segment_duration) * avg_segment_size,
            }

    def run(self):
        # Check storage consumption every 5 minutes
        while not self.stop_event.wait(20):

            if not self.avg_segment_sizes:
                self.calculate_camera_segment_sizes()
                logger.debug(f"Default camera segment sizes: {self.avg_segment_sizes}")

        logger.info(f"Exiting storage maintainer...")
