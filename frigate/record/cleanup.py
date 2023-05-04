"""Cleanup recordings that are expired based on retention config."""

import datetime
import itertools
import logging
import os
import threading
from pathlib import Path

from peewee import DoesNotExist
from multiprocessing.synchronize import Event as MpEvent

from frigate.config import RetainModeEnum, FrigateConfig
from frigate.const import RECORD_DIR, SECONDS_IN_DAY
from frigate.models import Event, Recordings, Timeline
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
        # delete any clips more than 5 minutes old
        for p in Path("/tmp/cache").rglob("clip_*.mp4"):
            logger.debug(f"Checking tmp clip {p}.")
            if p.stat().st_mtime < (datetime.datetime.now().timestamp() - 60 * 1):
                logger.debug("Deleting tmp clip.")

                # empty contents of file before unlinking https://github.com/blakeblackshear/frigate/issues/4769
                with open(p, "w"):
                    pass
                p.unlink(missing_ok=True)

    def expire_recordings(self) -> None:
        logger.debug("Start expire recordings (new).")

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
        Recordings.delete().where(Recordings.id << deleted_recordings).execute()
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

                    # delete timeline entries relevant to this recording segment
                    Timeline.delete().where(
                        Timeline.timestamp.between(
                            recording.start_time, recording.end_time
                        ),
                        Timeline.timestamp < expire_date,
                        Timeline.camera == camera,
                    ).execute()

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
        logger.debug("End expire recordings (new).")

    def expire_files(self) -> None:
        logger.debug("Start expire files (legacy).")

        default_expire = (
            datetime.datetime.now().timestamp()
            - SECONDS_IN_DAY * self.config.record.retain.days
        )
        delete_before = {}

        for name, camera in self.config.cameras.items():
            delete_before[name] = (
                datetime.datetime.now().timestamp()
                - SECONDS_IN_DAY * camera.record.retain.days
            )

        # find all the recordings older than the oldest recording in the db
        try:
            oldest_recording = Recordings.select().order_by(Recordings.start_time).get()

            p = Path(oldest_recording.path)
            oldest_timestamp = p.stat().st_mtime - 1
        except DoesNotExist:
            oldest_timestamp = datetime.datetime.now().timestamp()
        except FileNotFoundError:
            logger.warning(f"Unable to find file from recordings database: {p}")
            Recordings.delete().where(Recordings.id == oldest_recording.id).execute()
            return

        logger.debug(f"Oldest recording in the db: {oldest_timestamp}")

        files_to_check = []

        for root, _, files in os.walk(RECORD_DIR):
            for file in files:
                file_path = os.path.join(root, file)
                if os.path.getmtime(file_path) < oldest_timestamp:
                    files_to_check.append(file_path)

        for f in files_to_check:
            p = Path(f)
            try:
                if p.stat().st_mtime < delete_before.get(p.parent.name, default_expire):
                    p.unlink(missing_ok=True)
            except FileNotFoundError:
                logger.warning(f"Attempted to expire missing file: {f}")

        logger.debug("End expire files (legacy).")

    def sync_recordings(self) -> None:
        logger.debug("Start sync recordings.")

        # get all recordings in the db
        recordings: Recordings = Recordings.select()

        # get all recordings files on disk
        files_on_disk = []
        for root, _, files in os.walk(RECORD_DIR):
            for file in files:
                files_on_disk.append(os.path.join(root, file))

        recordings_to_delete = []
        for recording in recordings.objects().iterator():
            if not recording.path in files_on_disk:
                recordings_to_delete.append(recording.id)

        logger.debug(
            f"Deleting {len(recordings_to_delete)} recordings with missing files"
        )
        # delete up to 100,000 at a time
        max_deletes = 100000
        for i in range(0, len(recordings_to_delete), max_deletes):
            Recordings.delete().where(
                Recordings.id << recordings_to_delete[i : i + max_deletes]
            ).execute()

        logger.debug("End sync recordings.")

    def run(self) -> None:
        # on startup sync recordings with disk (disabled due to too much CPU usage)
        # self.sync_recordings()

        # Expire tmp clips every minute, recordings and clean directories every hour.
        for counter in itertools.cycle(range(self.config.record.expire_interval)):
            if self.stop_event.wait(60):
                logger.info(f"Exiting recording cleanup...")
                break
            self.clean_tmp_clips()

            if counter == 0:
                self.expire_recordings()
                self.expire_files()
                remove_empty_directories(RECORD_DIR)
