"""Handle storage retention and usage."""

import logging
from pathlib import Path
import shutil
import threading

from peewee import fn

from frigate.config import FrigateConfig
from frigate.const import RECORD_DIR
from frigate.models import Event, Recordings

logger = logging.getLogger(__name__)
bandwidth_equation = Recordings.segment_size / (
    Recordings.end_time - Recordings.start_time
)


class StorageMaintainer(threading.Thread):
    """Maintain frigates recording storage."""

    def __init__(self, config: FrigateConfig, stop_event) -> None:
        threading.Thread.__init__(self)
        self.name = "storage_maintainer"
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
                        Recordings.select(fn.COUNT(Recordings.id))
                        .where(
                            Recordings.camera == camera, Recordings.segment_size != 0
                        )
                        .scalar()
                        < 50
                    )
                }

            # calculate MB/hr
            try:
                bandwidth = round(
                    Recordings.select(fn.AVG(bandwidth_equation))
                    .where(Recordings.camera == camera, Recordings.segment_size != 0)
                    .limit(100)
                    .scalar()
                    * 3600,
                    2,
                )
            except TypeError:
                bandwidth = 0

            self.camera_storage_stats[camera]["bandwidth"] = bandwidth
            logger.debug(f"{camera} has a bandwidth of {bandwidth} MB/hr.")

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

    def check_storage_needs_cleanup(self) -> bool:
        """Return if storage needs cleanup."""
        # currently runs cleanup if less than 1 hour of space is left
        # disk_usage should not spin up disks
        hourly_bandwidth = sum(
            [b["bandwidth"] for b in self.camera_storage_stats.values()]
        )
        remaining_storage = round(shutil.disk_usage(RECORD_DIR).free / 1000000, 1)
        logger.debug(
            f"Storage cleanup check: {hourly_bandwidth} hourly with remaining storage: {remaining_storage}."
        )
        return remaining_storage < hourly_bandwidth

    def reduce_storage_consumption(self) -> None:
        """Remove oldest hour of recordings."""
        logger.debug("Starting storage cleanup.")
        deleted_segments_size = 0
        hourly_bandwidth = sum(
            [b["bandwidth"] for b in self.camera_storage_stats.values()]
        )

        recordings: Recordings = Recordings.select().order_by(
            Recordings.start_time.asc()
        )
        retained_events: Event = (
            Event.select()
            .where(
                Event.retain_indefinitely == True,
                Event.has_clip,
            )
            .order_by(Event.start_time.asc())
            .objects()
        )

        event_start = 0
        deleted_recordings = set()
        for recording in recordings.objects().iterator():
            # check if 1 hour of storage has been reclaimed
            if deleted_segments_size > hourly_bandwidth:
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
                deleted_segments_size += recording.segment_size
                Path(recording.path).unlink(missing_ok=True)
                deleted_recordings.add(recording.id)

        # check if need to delete retained segments
        if deleted_segments_size < hourly_bandwidth:
            logger.error(
                f"Could not clear {hourly_bandwidth} currently {deleted_segments_size}, retained recordings must be deleted."
            )
            recordings = Recordings.select().order_by(Recordings.start_time.asc())

            for recording in recordings.objects().iterator():
                if deleted_segments_size > hourly_bandwidth:
                    break

                deleted_segments_size += recording.segment_size
                Path(recording.path).unlink(missing_ok=True)
                deleted_recordings.add(recording.id)

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
        while not self.stop_event.wait(300):

            if not self.camera_storage_stats or True in [
                r["needs_refresh"] for r in self.camera_storage_stats.values()
            ]:
                self.calculate_camera_bandwidth()
                logger.debug(f"Default camera bandwidths: {self.camera_storage_stats}.")

            if self.check_storage_needs_cleanup():
                self.reduce_storage_consumption()

        logger.info(f"Exiting storage maintainer...")
