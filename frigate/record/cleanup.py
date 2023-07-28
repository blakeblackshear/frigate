"""Cleanup recordings that are expired based on retention config."""

import datetime
import itertools
import logging
import os
import threading
from multiprocessing.synchronize import Event as MpEvent
from pathlib import Path

from peewee import DatabaseError, chunked

from frigate.config import FrigateConfig, RetainModeEnum
from frigate.const import RECORD_DIR
from frigate.models import Event, Recordings, RecordingsToDelete
from frigate.record.util import remove_empty_directories

logger = logging.getLogger(__name__)


class RecordingCleanup(threading.Thread):
    """Cleanup existing recordings based on retention config."""

    def __init__(self, config: FrigateConfig, stop_event: MpEvent) -> None:
        threading.Thread.__init__(self)
        self.name = "recording_cleanup"
        self.config = config
        self.stop_event = stop_event

    def clean_tmp_clips(self) -> None:
        """delete any clips in the cache that are more than 5 minutes old."""
        for p in Path("/tmp/cache").rglob("clip_*.mp4"):
            logger.debug(f"Checking tmp clip {p}.")
            if p.stat().st_mtime < (datetime.datetime.now().timestamp() - 60 * 1):
                logger.debug("Deleting tmp clip.")

                # empty contents of file before unlinking https://github.com/blakeblackshear/frigate/issues/4769
                with open(p, "w"):
                    pass
                p.unlink(missing_ok=True)

    def expire_recordings(self) -> None:
        """Delete recordings based on retention config."""
        logger.debug("Start expire recordings.")
        logger.debug("Start deleted cameras.")
        # Handle deleted cameras
        expire_days = self.config.record.retain.days
        expire_before = (
            datetime.datetime.now() - datetime.timedelta(days=expire_days)
        ).timestamp()
        no_camera_recordings: Recordings = Recordings.select().where(
            Recordings.camera.not_in(list(self.config.cameras.keys())),
            Recordings.end_time < expire_before,
        )

        deleted_recordings = set()
        for recording in no_camera_recordings:
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
        logger.debug("End deleted cameras.")

        logger.debug("Start all cameras.")
        for camera, config in self.config.cameras.items():
            logger.debug(f"Start camera: {camera}.")
            # Get the timestamp for cutoff of retained days
            expire_days = config.record.retain.days
            expire_date = (
                datetime.datetime.now() - datetime.timedelta(days=expire_days)
            ).timestamp()

            # Get recordings to check for expiration
            recordings: Recordings = (
                Recordings.select()
                .where(
                    Recordings.camera == camera,
                    Recordings.end_time < expire_date,
                )
                .order_by(Recordings.start_time)
            )

            # Get all the events to check against
            events: Event = (
                Event.select()
                .where(
                    Event.camera == camera,
                    # need to ensure segments for all events starting
                    # before the expire date are included
                    Event.start_time < expire_date,
                    Event.has_clip,
                )
                .order_by(Event.start_time)
                .objects()
            )

            # loop over recordings and see if they overlap with any non-expired events
            # TODO: expire segments based on segment stats according to config
            event_start = 0
            deleted_recordings = set()
            for recording in recordings.objects().iterator():
                keep = False
                # Now look for a reason to keep this recording segment
                for idx in range(event_start, len(events)):
                    event = events[idx]

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

                # Delete recordings outside of the retention window or based on the retention mode
                if (
                    not keep
                    or (
                        config.record.events.retain.mode == RetainModeEnum.motion
                        and recording.motion == 0
                    )
                    or (
                        config.record.events.retain.mode
                        == RetainModeEnum.active_objects
                        and recording.objects == 0
                    )
                ):
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

            logger.debug(f"End camera: {camera}.")

        logger.debug("End all cameras.")
        logger.debug("End expire recordings.")

    def sync_recordings(self) -> None:
        """Check the db for stale recordings entries that don't exist in the filesystem."""
        logger.debug("Start sync recordings.")

        # get all recordings in the db
        recordings = Recordings.select(Recordings.id, Recordings.path)

        # get all recordings files on disk and put them in a set
        files_on_disk = {
            os.path.join(root, file)
            for root, _, files in os.walk(RECORD_DIR)
            for file in files
        }

        # Use pagination to process records in chunks
        page_size = 1000
        num_pages = (recordings.count() + page_size - 1) // page_size
        recordings_to_delete = set()

        for page in range(num_pages):
            for recording in recordings.paginate(page, page_size):
                if recording.path not in files_on_disk:
                    recordings_to_delete.add(recording.id)

        # convert back to list of dictionaries for insertion
        recordings_to_delete = [
            {"id": recording_id} for recording_id in recordings_to_delete
        ]

        if len(recordings_to_delete) / max(1, recordings.count()) > 0.5:
            logger.debug(
                f"Deleting {(len(recordings_to_delete) / recordings.count()):2f}% of recordings could be due to configuration error. Aborting..."
            )
            return

        logger.debug(
            f"Deleting {len(recordings_to_delete)} recordings with missing files"
        )

        # create a temporary table for deletion
        RecordingsToDelete.create_table(temporary=True)

        # insert ids to the temporary table
        max_inserts = 1000
        for batch in chunked(recordings_to_delete, max_inserts):
            RecordingsToDelete.insert_many(batch).execute()

        try:
            # delete records in the main table that exist in the temporary table
            query = Recordings.delete().where(
                Recordings.id.in_(RecordingsToDelete.select(RecordingsToDelete.id))
            )
            query.execute()
        except DatabaseError as e:
            logger.error(f"Database error during delete: {e}")

        logger.debug("End sync recordings.")

    def run(self) -> None:
        # on startup sync recordings with disk if enabled
        if self.config.record.sync_on_startup:
            self.sync_recordings()

        # Expire tmp clips every minute, recordings and clean directories every hour.
        for counter in itertools.cycle(range(self.config.record.expire_interval)):
            if self.stop_event.wait(60):
                logger.info("Exiting recording cleanup...")
                break
            self.clean_tmp_clips()

            if counter == 0:
                self.expire_recordings()
                remove_empty_directories(RECORD_DIR)
