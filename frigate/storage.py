"""Handle storage retention and usage."""

import logging
import shutil
import threading
from pathlib import Path

from peewee import fn

from frigate.config import FrigateConfig
from frigate.const import RECORD_DIR
from frigate.models import Event, Recordings
from frigate.util.builtin import clear_and_unlink

logger = logging.getLogger(__name__)
bandwidth_equation = Recordings.segment_size / (
    Recordings.end_time - Recordings.start_time
)

MAX_CALCULATED_BANDWIDTH = 10000  # 10Gb/hr


class StorageMaintainer(threading.Thread):
    """Maintain frigates recording storage."""

    def __init__(self, config: FrigateConfig, stop_event) -> None:
        super().__init__(name="storage_maintainer")
        self.config = config
        self.stop_event = stop_event
        self.camera_storage_stats: dict[str, dict] = {}

    def calculate_camera_bandwidth(self) -> None:
        """Calculate an average MB/hr for each camera."""
        for camera in self.config.cameras.keys():
            # cameras with < 50 segments should be refreshed to keep size accurate
            # when few segments are available
            if self.camera_storage_stats.get(camera, {}).get("needs_refresh", True):
                self.camera_storage_stats[camera] = {
                    "needs_refresh": (
                        Recordings.select(fn.COUNT("*"))
                        .where(Recordings.camera == camera, Recordings.segment_size > 0)
                        .scalar()
                        < 50
                    )
                }

                # calculate MB/hr
                try:
                    bandwidth = round(
                        Recordings.select(fn.AVG(bandwidth_equation))
                        .where(Recordings.camera == camera, Recordings.segment_size > 0)
                        .limit(100)
                        .scalar()
                        * 3600,
                        2,
                    )

                    if bandwidth > MAX_CALCULATED_BANDWIDTH:
                        logger.warning(
                            f"{camera} has a bandwidth of {bandwidth} MB/hr which exceeds the expected maximum. This typically indicates an issue with the cameras recordings."
                        )
                        bandwidth = MAX_CALCULATED_BANDWIDTH
                except TypeError:
                    bandwidth = 0

                self.camera_storage_stats[camera]["bandwidth"] = bandwidth
                logger.debug(f"{camera} has a bandwidth of {bandwidth} MiB/hr.")

    def calculate_camera_usages(self) -> dict[str, dict]:
        """Calculate the storage usage of each camera."""
        usages: dict[str, dict] = {}

        for camera in self.config.cameras.keys():
            camera_storage = (
                Recordings.select(fn.SUM(Recordings.segment_size))
                .where(Recordings.camera == camera, Recordings.segment_size != 0)
                .scalar()
            )

            usages[camera] = {
                "usage": camera_storage,
                "bandwidth": self.camera_storage_stats.get(camera, {}).get(
                    "bandwidth", 0
                ),
            }

        return usages

    def calculate_storage_recovery_target(self) -> int:
        hourly_bandwidth = sum(
            [b["bandwidth"] for b in self.camera_storage_stats.values()]
        )
        target_space_recording_time = (
            hourly_bandwidth / 60
        ) * self.config.record.cleanup.target_minutes
        target_space_minimum = self.config.record.cleanup.target_space
        cleanup_target = round(
            max(target_space_recording_time, target_space_minimum), 1
        )
        remaining_storage = round(shutil.disk_usage(RECORD_DIR).free / pow(2, 20), 1)
        # The target is the total free space, so need to consider what is already free on disk
        space_to_clean = cleanup_target - remaining_storage
        logger.debug(
            f"Will attempt to remove {space_to_clean} MB of recordings (target of {cleanup_target} MB - currently free {remaining_storage} MB). Config: {target_space_minimum} MB by space, {target_space_recording_time} MB by recording time ({self.config.record.cleanup.target_minutes} minutes)"
        )
        return space_to_clean

    def check_storage_needs_cleanup(self) -> bool:
        """Return if storage needs cleanup."""
        # disk_usage should not spin up disks
        hourly_bandwidth = sum(
            [b["bandwidth"] for b in self.camera_storage_stats.values()]
        )
        trigger_recording_space = (
            hourly_bandwidth / 60
        ) * self.config.record.cleanup.trigger_minutes
        trigger_space_min = self.config.record.cleanup.trigger_space
        free_storage_target = round(max(trigger_recording_space, trigger_space_min), 1)
        remaining_storage = round(shutil.disk_usage(RECORD_DIR).free / pow(2, 20), 1)
        needs_cleanup = remaining_storage < free_storage_target
        logger.debug(
            f"Storage cleanup needed: {needs_cleanup}. {free_storage_target} MB to trigger cleanup (recording time: {hourly_bandwidth} MB * {self.config.record.cleanup.trigger_minutes} minutes = {trigger_recording_space}, min space: {trigger_space_min}) with remaining storage: {remaining_storage} MB."
        )
        return needs_cleanup

    def reduce_storage_consumption(self) -> None:
        """Remove oldest recordings to meet cleanup target."""
        logger.debug("Starting storage cleanup.")
        deleted_segments_size = 0
        storage_clear_target = self.calculate_storage_recovery_target()

        recordings: Recordings = (
            Recordings.select(
                Recordings.id,
                Recordings.start_time,
                Recordings.end_time,
                Recordings.segment_size,
                Recordings.path,
            )
            .order_by(Recordings.start_time.asc())
            .namedtuples()
            .iterator()
        )

        retained_events: Event = (
            Event.select(
                Event.start_time,
                Event.end_time,
            )
            .where(
                Event.retain_indefinitely == True,
                Event.has_clip,
            )
            .order_by(Event.start_time.asc())
            .namedtuples()
        )

        event_start = 0
        deleted_recordings = set()
        for recording in recordings:
            # check if sufficient storage has been reclaimed
            if deleted_segments_size > storage_clear_target:
                break

            keep = False

            # Now look for a reason to keep this recording segment
            for idx in range(event_start, len(retained_events)):
                event = retained_events[idx]

                # if the event starts in the future, stop checking events
                # and let this recording segment expire
                if event.start_time > recording.end_time:
                    keep = False
                    break

                # if the event is in progress or ends after the recording starts, keep it
                # and stop looking at events
                if event.end_time is None or event.end_time >= recording.start_time:
                    keep = True
                    break

                # if the event ends before this recording segment starts, skip
                # this event and check the next event for an overlap.
                # since the events and recordings are sorted, we can skip events
                # that end before the previous recording segment started on future segments
                if event.end_time < recording.start_time:
                    event_start = idx

            # Delete recordings not retained indefinitely
            if not keep:
                try:
                    clear_and_unlink(Path(recording.path), missing_ok=False)
                    deleted_recordings.add(recording.id)
                    deleted_segments_size += recording.segment_size
                except FileNotFoundError:
                    # this file was not found so we must assume no space was cleaned up
                    pass

        # check if need to delete retained segments
        if deleted_segments_size < storage_clear_target:
            logger.error(
                f"Could not clear {storage_clear_target} MB, currently {deleted_segments_size} MB have been cleared. Retained recordings must be deleted."
            )
            recordings = (
                Recordings.select(
                    Recordings.id,
                    Recordings.path,
                    Recordings.segment_size,
                )
                .order_by(Recordings.start_time.asc())
                .namedtuples()
                .iterator()
            )

            for recording in recordings:
                if deleted_segments_size > storage_clear_target:
                    break

                try:
                    clear_and_unlink(Path(recording.path), missing_ok=False)
                    deleted_segments_size += recording.segment_size
                    deleted_recordings.add(recording.id)
                except FileNotFoundError:
                    # this file was not found so we must assume no space was cleaned up
                    pass
        else:
            logger.info(
                f"Cleaned up {round(deleted_segments_size, 1)} MB of recordings (target was {storage_clear_target} MB)"
            )

        logger.debug(f"Expiring {len(deleted_recordings)} recordings")
        # delete up to 100,000 at a time
        max_deletes = 100000
        deleted_recordings_list = list(deleted_recordings)
        for i in range(0, len(deleted_recordings_list), max_deletes):
            Recordings.delete().where(
                Recordings.id << deleted_recordings_list[i : i + max_deletes]
            ).execute()

    def run(self):
        """Check every 5 minutes if storage needs to be cleaned up."""
        self.calculate_camera_bandwidth()
        while not self.stop_event.wait(300):
            if not self.camera_storage_stats or True in [
                r["needs_refresh"] for r in self.camera_storage_stats.values()
            ]:
                self.calculate_camera_bandwidth()
                logger.debug(f"Default camera bandwidths: {self.camera_storage_stats}.")

            if self.check_storage_needs_cleanup():
                logger.info(
                    "Less than desired recording space left, running storage maintenance..."
                )
                self.reduce_storage_consumption()

        logger.info("Exiting storage maintainer...")
