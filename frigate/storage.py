"""Handle storage retention and usage."""

import logging
from pathlib import Path
import shutil
import threading

from peewee import SqliteDatabase, operator, fn, DoesNotExist

from frigate.config import FrigateConfig
from frigate.const import RECORD_DIR
from frigate.models import Event, Recordings

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
        total_avg_segment = 0.0
        total_avg_hour = 0.0

        for camera in self.config.cameras.keys():
            # get average of non-zero segment sizes to ignore segment with no value
            segment_query = (
                Recordings.select(fn.AVG(Recordings.segment_size))
                .where(Recordings.camera == camera, Recordings.segment_size != 0)
                .scalar()
            )

            # camera has no recordings
            if not segment_query:
                self.avg_segment_sizes[camera] = {
                    "segment": 0,
                    "segment_duration": 0,
                    "hour": 0,
                }
                continue

            avg_segment_size = round(segment_query, 2)

            # get average of an hour using the average segment size
            segment_duration = int(
                Recordings.select(Recordings.duration)
                .where(Recordings.camera == camera)
                .limit(1)
                .scalar()
            )
            avg_hour_size = round((3600 / segment_duration) * avg_segment_size, 2)

            total_avg_segment += avg_segment_size
            total_avg_hour += avg_hour_size
            self.avg_segment_sizes[camera] = {
                "segment": avg_segment_size,
                "segment_duration": segment_duration,
                "hour": avg_hour_size,
            }

        self.avg_segment_sizes["total"] = {
            "segment": total_avg_segment,
            "hour": total_avg_hour,
        }

    def check_storage_needs_cleanup(self) -> bool:
        """Return if storage needs cleanup."""
        # currently runs cleanup if less than 1 hour of space is left
        remaining_storage = round(shutil.disk_usage(RECORD_DIR).free / 1000000, 1)
        logger.debug(
            f"Storage cleanup check: {self.avg_segment_sizes['total']['hour']} hourly with remaining storage: {remaining_storage}"
        )
        return remaining_storage < self.avg_segment_sizes["total"]["hour"]

    def delete_recording_segments(
        self, recordings, retained_events, segment_count: int
    ) -> set[str]:
        """Delete Recording Segments"""
        # loop over recordings and see if they overlap with any retained events
        # TODO: expire segments based on segment stats according to config
        event_start = 0
        deleted_recordings = set()
        for recording in recordings.objects().iterator():
            # check if 2 hours of recordings have been deleted
            if len(deleted_recordings) >= segment_count:
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
                Path(recording.path).unlink(missing_ok=True)
                deleted_recordings.add(recording.id)

        return deleted_recordings

    def reduce_storage_consumption(self) -> None:
        """Cleanup the last 2 hours of recordings."""
        logger.debug("Start all cameras.")
        for camera in self.config.cameras.keys():
            logger.debug(f"Start camera: {camera}.")
            # Get last 24 hours of recordings segments
            segment_count = int(
                7200 / self.avg_segment_sizes[camera]["segment_duration"]
            )
            recordings: Recordings = (
                Recordings.select()
                .where(Recordings.camera == camera)
                .order_by(Recordings.start_time.asc())
                .limit(segment_count * 12)
            )

            # Get retained events to check against
            retained_events: Event = (
                Event.select()
                .where(
                    Event.camera == camera,
                    Event.retain_indefinitely == True,
                    Event.has_clip,
                )
                .order_by(Event.start_time.asc())
                .objects()
            )

            deleted_recordings: set[str] = self.delete_recording_segments(
                recordings, retained_events, segment_count
            )

            # check if 2 hours of segments were deleted from the 24 retrieved
            if len(deleted_recordings) < segment_count:
                logger.debug(
                    f"segment target of {segment_count} > {len(deleted_recordings)}, pulling all non-retained recordings"
                )
                # get the rest of the recording segments to look through
                recordings: Recordings = (
                    Recordings.select()
                    .where(Recordings.camera == camera)
                    .order_by(Recordings.start_time.asc())
                )
                second_run: set[str] = self.delete_recording_segments(
                    recordings, retained_events, segment_count
                )
                deleted_recordings = deleted_recordings.union(second_run)

                # check if still 2 hour quota still not meant
                if len(deleted_recordings) < segment_count:
                    logger.debug(
                        f"segment target of {segment_count} > {len(deleted_recordings)}, pulling all recordings"
                    )
                    recordings: Recordings = (
                        Recordings.select()
                        .where(Recordings.camera == camera)
                        .order_by(Recordings.start_time.asc())
                    )
                    # delete segments including retained events
                    last_run: set[str] = self.delete_recording_segments(
                        recordings, [], segment_count
                    )
                    deleted_recordings = deleted_recordings.union(last_run)

            logger.debug(f"Expiring {len(deleted_recordings)} recordings")
            # delete up to 100,000 at a time
            max_deletes = 100000
            deleted_recordings_list = list(deleted_recordings)
            for i in range(0, len(deleted_recordings_list), max_deletes):
                Recordings.delete().where(
                    Recordings.id << deleted_recordings_list[i : i + max_deletes]
                ).execute()

            logger.debug(f"End camera: {camera}.")

        logger.debug("End all cameras.")
        logger.debug("End storage cleanup.")

    def run(self):
        # Check storage consumption every 5 minutes
        while not self.stop_event.wait(300):

            if not self.avg_segment_sizes:
                self.calculate_camera_segment_sizes()
                logger.debug(f"Default camera segment sizes: {self.avg_segment_sizes}")

            needs_cleanup = self.check_storage_needs_cleanup()

            if needs_cleanup:
                self.reduce_storage_consumption()

        logger.info(f"Exiting storage maintainer...")
