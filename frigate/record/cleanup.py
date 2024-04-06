"""Cleanup recordings that are expired based on retention config."""

import datetime
import itertools
import logging
import os
import threading
from multiprocessing.synchronize import Event as MpEvent
from pathlib import Path

from playhouse.sqlite_ext import SqliteExtDatabase

from frigate.config import CameraConfig, FrigateConfig, RetainModeEnum
from frigate.const import CACHE_DIR, MAX_WAL_SIZE, RECORD_DIR
from frigate.models import Event, Previews, Recordings, ReviewSegment
from frigate.record.util import remove_empty_directories, sync_recordings
from frigate.util.builtin import clear_and_unlink, get_tomorrow_at_time

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
        for p in Path(CACHE_DIR).rglob("clip_*.mp4"):
            logger.debug(f"Checking tmp clip {p}.")
            if p.stat().st_mtime < (datetime.datetime.now().timestamp() - 60 * 1):
                logger.debug("Deleting tmp clip.")
                clear_and_unlink(p)

    def truncate_wal(self) -> None:
        """check if the WAL needs to be manually truncated."""

        # by default the WAL should be check-pointed automatically
        # however, high levels of activity can prevent an opportunity
        # for the checkpoint to be finished which means the WAL will grow
        # without bound

        # with auto checkpoint most users should never hit this

        if (
            os.stat(f"{self.config.database.path}-wal").st_size / (1024 * 1024)
        ) > MAX_WAL_SIZE:
            db = SqliteExtDatabase(self.config.database.path)
            db.execute_sql("PRAGMA wal_checkpoint(TRUNCATE);")
            db.close()

    def expire_existing_camera_recordings(
        self, expire_date: float, config: CameraConfig, events: Event
    ) -> None:
        """Delete recordings for existing camera based on retention config."""
        # Get the timestamp for cutoff of retained days

        # Get recordings to check for expiration
        recordings: Recordings = (
            Recordings.select(
                Recordings.id,
                Recordings.start_time,
                Recordings.end_time,
                Recordings.path,
                Recordings.objects,
                Recordings.motion,
            )
            .where(
                Recordings.camera == config.name,
                Recordings.end_time < expire_date,
            )
            .order_by(Recordings.start_time)
            .namedtuples()
            .iterator()
        )

        # loop over recordings and see if they overlap with any non-expired events
        # TODO: expire segments based on segment stats according to config
        event_start = 0
        deleted_recordings = set()
        kept_recordings: list[tuple[float, float]] = []
        for recording in recordings:
            keep = False
            # Now look for a reason to keep this recording segment
            for idx in range(event_start, len(events)):
                event: Event = events[idx]

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
                    config.record.events.retain.mode == RetainModeEnum.active_objects
                    and recording.objects == 0
                )
            ):
                Path(recording.path).unlink(missing_ok=True)
                deleted_recordings.add(recording.id)
            else:
                kept_recordings.append((recording.start_time, recording.end_time))

        # expire recordings
        logger.debug(f"Expiring {len(deleted_recordings)} recordings")
        # delete up to 100,000 at a time
        max_deletes = 100000
        deleted_recordings_list = list(deleted_recordings)
        for i in range(0, len(deleted_recordings_list), max_deletes):
            Recordings.delete().where(
                Recordings.id << deleted_recordings_list[i : i + max_deletes]
            ).execute()

        previews: Previews = (
            Previews.select(
                Previews.id,
                Previews.start_time,
                Previews.end_time,
                Previews.path,
            )
            .where(
                Previews.camera == config.name,
                Previews.end_time < expire_date,
            )
            .order_by(Previews.start_time)
            .namedtuples()
            .iterator()
        )

        # expire previews
        recording_start = 0
        deleted_previews = set()
        for preview in previews:
            keep = False
            # look for a reason to keep this preview
            for idx in range(recording_start, len(kept_recordings)):
                start_time, end_time = kept_recordings[idx]

                # if the recording starts in the future, stop checking recordings
                # and let this preview expire
                if start_time > preview.end_time:
                    keep = False
                    break

                # if the recording ends after the preview starts, keep it
                # and stop looking at recordings
                if end_time >= preview.start_time:
                    keep = True
                    break

                # if the recording ends before this preview starts, skip
                # this recording and check the next recording for an overlap.
                # since the kept recordings and previews are sorted, we can skip recordings
                # that end before the current preview started
                if end_time < preview.start_time:
                    recording_start = idx

            # Delete previews without any relevant recordings
            if not keep:
                Path(preview.path).unlink(missing_ok=True)
                deleted_previews.add(preview.id)

        # expire previews
        logger.debug(f"Expiring {len(deleted_previews)} previews")
        # delete up to 100,000 at a time
        max_deletes = 100000
        deleted_previews_list = list(deleted_previews)
        for i in range(0, len(deleted_previews_list), max_deletes):
            Previews.delete().where(
                Previews.id << deleted_previews_list[i : i + max_deletes]
            ).execute()

        review_segments: list[ReviewSegment] = (
            ReviewSegment.select(
                ReviewSegment.id,
                ReviewSegment.start_time,
                ReviewSegment.end_time,
                ReviewSegment.thumb_path,
            )
            .where(
                ReviewSegment.camera == config.name,
                ReviewSegment.end_time < expire_date,
            )
            .order_by(ReviewSegment.start_time)
            .namedtuples()
            .iterator()
        )

        # expire review segments
        recording_start = 0
        deleted_segments = set()
        for segment in review_segments:
            keep = False
            # look for a reason to keep this segment
            for idx in range(recording_start, len(kept_recordings)):
                start_time, end_time = kept_recordings[idx]

                # if the recording starts in the future, stop checking recordings
                # and let this segment expire
                if start_time > segment.end_time:
                    keep = False
                    break

                # if the recording ends after the segment starts, keep it
                # and stop looking at recordings
                if end_time >= segment.start_time:
                    keep = True
                    break

                # if the recording ends before this segment starts, skip
                # this recording and check the next recording for an overlap.
                # since the kept recordings and segments are sorted, we can skip recordings
                # that end before the current segment started
                if end_time < segment.start_time:
                    recording_start = idx

            # Delete segments without any relevant recordings
            if not keep:
                Path(segment.thumb_path).unlink(missing_ok=True)
                deleted_segments.add(segment.id)

        # expire segments
        logger.debug(f"Expiring {len(deleted_segments)} segments")
        # delete up to 100,000 at a time
        max_deletes = 100000
        deleted_segments_list = list(deleted_segments)
        for i in range(0, len(deleted_segments_list), max_deletes):
            ReviewSegment.delete().where(
                ReviewSegment.id << deleted_segments_list[i : i + max_deletes]
            ).execute()

    def expire_recordings(self) -> None:
        """Delete recordings based on retention config."""
        logger.debug("Start expire recordings.")
        logger.debug("Start deleted cameras.")

        # Handle deleted cameras
        expire_days = self.config.record.retain.days
        expire_before = (
            datetime.datetime.now() - datetime.timedelta(days=expire_days)
        ).timestamp()
        no_camera_recordings: Recordings = (
            Recordings.select(
                Recordings.id,
                Recordings.path,
            )
            .where(
                Recordings.camera.not_in(list(self.config.cameras.keys())),
                Recordings.end_time < expire_before,
            )
            .namedtuples()
            .iterator()
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

            expire_days = config.record.retain.days
            expire_date = (
                datetime.datetime.now() - datetime.timedelta(days=expire_days)
            ).timestamp()

            # Get all the events to check against
            events: Event = (
                Event.select(
                    Event.start_time,
                    Event.end_time,
                )
                .where(
                    Event.camera == camera,
                    # need to ensure segments for all events starting
                    # before the expire date are included
                    Event.start_time < expire_date,
                    Event.has_clip,
                )
                .order_by(Event.start_time)
                .namedtuples()
            )

            self.expire_existing_camera_recordings(expire_date, config, events)
            logger.debug(f"End camera: {camera}.")

        logger.debug("End all cameras.")
        logger.debug("End expire recordings.")

    def run(self) -> None:
        # on startup sync recordings with disk if enabled
        if self.config.record.sync_recordings:
            sync_recordings(limited=False)
            next_sync = get_tomorrow_at_time(3)

        # Expire tmp clips every minute, recordings and clean directories every hour.
        for counter in itertools.cycle(range(self.config.record.expire_interval)):
            if self.stop_event.wait(60):
                logger.info("Exiting recording cleanup...")
                break

            self.clean_tmp_clips()

            if (
                self.config.record.sync_recordings
                and datetime.datetime.now().astimezone(datetime.timezone.utc)
                > next_sync
            ):
                sync_recordings(limited=True)
                next_sync = get_tomorrow_at_time(3)

            if counter == 0:
                self.expire_recordings()
                remove_empty_directories(RECORD_DIR)
                self.truncate_wal()
