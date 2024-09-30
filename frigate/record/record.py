"""Run recording maintainer and cleanup."""

import asyncio
import datetime
import logging

from playhouse.sqliteq import SqliteQueueDatabase

from frigate import util
from frigate.comms.config_updater import ConfigSubscriber
from frigate.comms.detections_updater import DetectionSubscriber, DetectionTypeEnum
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig
from frigate.const import INSERT_MANY_RECORDINGS
from frigate.models import Recordings, ReviewSegment
from frigate.record.maintainer import QUEUE_READ_TIMEOUT, RecordingMaintainer

logger = logging.getLogger(__name__)


class ManageRecordings(util.Process):
    def __init__(self, config: FrigateConfig):
        super().__init__(name="frigate.recording_manager", daemon=True)
        self.config = config

    def run(self):
        db = SqliteQueueDatabase(
            self.config.database.path,
            pragmas={
                "auto_vacuum": "FULL",  # Does not defragment database
                "cache_size": -512 * 1000,  # 512MB of cache
                "synchronous": "NORMAL",  # Safe when using WAL https://www.sqlite.org/pragma.html#pragma_synchronous
            },
            timeout=max(60, sum(10 for c in self.config.cameras.values() if c.enabled)),
        )
        models = [ReviewSegment, Recordings]
        db.bind(models)

        requestor = InterProcessRequestor()
        config_subscriber = ConfigSubscriber("config/record/")
        detection_subscriber = DetectionSubscriber(DetectionTypeEnum.all)

        maintainer = RecordingMaintainer(self.config)

        wait_time = 0
        while not self.stop_event.wait(wait_time):
            run_start = datetime.datetime.now().timestamp()

            # Check if there is an updated config
            while True:
                (
                    updated_topic,
                    updated_record_config,
                ) = config_subscriber.check_for_update()

                if not updated_topic:
                    break

                camera_name = updated_topic.rpartition("/")[-1]
                self.config.cameras[camera_name].record = updated_record_config

            stale_frame_count = 0
            stale_frame_count_threshold = 10

            # Empty the object recordings info queue
            while True:
                (topic, data) = detection_subscriber.check_for_update(
                    timeout=QUEUE_READ_TIMEOUT
                )

                if not topic:
                    break

                if topic == DetectionTypeEnum.video:
                    (
                        camera,
                        frame_time,
                        current_tracked_objects,
                        motion_boxes,
                        regions,
                    ) = data

                    if self.config.cameras[camera].record.enabled:
                        maintainer.object_recordings_info[camera].append(
                            (
                                frame_time,
                                current_tracked_objects,
                                motion_boxes,
                                regions,
                            )
                        )
                elif topic == DetectionTypeEnum.audio:
                    (
                        camera,
                        frame_time,
                        dBFS,
                        audio_detections,
                    ) = data

                    if self.config.cameras[camera].record.enabled:
                        maintainer.audio_recordings_info[camera].append(
                            (
                                frame_time,
                                dBFS,
                                audio_detections,
                            )
                        )
                elif topic == DetectionTypeEnum.api:
                    continue

                if frame_time < run_start - stale_frame_count_threshold:
                    stale_frame_count += 1

            if stale_frame_count > 0:
                logger.debug(f"Found {stale_frame_count} old frames.")

            try:
                recordings = asyncio.run(maintainer.move_files())

                # fire and forget recordings entries
                requestor.send_data(INSERT_MANY_RECORDINGS, recordings)
            except Exception:
                logger.exception(
                    "Error occurred when attempting to maintain recording cache"
                )
            duration = datetime.datetime.now().timestamp() - run_start
            wait_time = max(0, 5 - duration)

        requestor.stop()
        config_subscriber.stop()
        detection_subscriber.stop()
        logger.info("Exiting recording maintenance...")
