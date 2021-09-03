import datetime
import itertools
import logging
import os
import random
import shutil
import string
import subprocess as sp
import threading
from pathlib import Path

import psutil
from peewee import JOIN, DoesNotExist

from frigate.config import FrigateConfig
from frigate.const import CACHE_DIR, RECORD_DIR
from frigate.models import Event, Recordings

logger = logging.getLogger(__name__)

SECONDS_IN_DAY = 60 * 60 * 24


def remove_empty_directories(directory):
    # list all directories recursively and sort them by path,
    # longest first
    paths = sorted(
        [x[0] for x in os.walk(RECORD_DIR)],
        key=lambda p: len(str(p)),
        reverse=True,
    )
    for path in paths:
        # don't delete the parent
        if path == RECORD_DIR:
            continue
        if len(os.listdir(path)) == 0:
            os.rmdir(path)


class RecordingMaintainer(threading.Thread):
    def __init__(self, config: FrigateConfig, stop_event):
        threading.Thread.__init__(self)
        self.name = "recording_maint"
        self.config = config
        self.stop_event = stop_event

    def move_files(self):
        recordings = [
            d
            for d in os.listdir(CACHE_DIR)
            if os.path.isfile(os.path.join(CACHE_DIR, d))
            and d.endswith(".mp4")
            and not d.startswith("clip_")
        ]

        files_in_use = []
        for process in psutil.process_iter():
            try:
                if process.name() != "ffmpeg":
                    continue
                flist = process.open_files()
                if flist:
                    for nt in flist:
                        if nt.path.startswith(CACHE_DIR):
                            files_in_use.append(nt.path.split("/")[-1])
            except:
                continue

        for f in recordings:
            # Skip files currently in use
            if f in files_in_use:
                continue

            cache_path = os.path.join(CACHE_DIR, f)
            basename = os.path.splitext(f)[0]
            camera, date = basename.rsplit("-", maxsplit=1)
            start_time = datetime.datetime.strptime(date, "%Y%m%d%H%M%S")

            # Just delete files if recordings are turned off
            if (
                not camera in self.config.cameras
                or not self.config.cameras[camera].record.enabled
            ):
                Path(cache_path).unlink(missing_ok=True)
                continue

            ffprobe_cmd = [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                f"{cache_path}",
            ]
            p = sp.run(ffprobe_cmd, capture_output=True)
            if p.returncode == 0:
                duration = float(p.stdout.decode().strip())
                end_time = start_time + datetime.timedelta(seconds=duration)
            else:
                logger.info(f"bad file: {f}")
                Path(cache_path).unlink(missing_ok=True)
                continue

            directory = os.path.join(
                RECORD_DIR, start_time.strftime("%Y-%m/%d/%H"), camera
            )

            if not os.path.exists(directory):
                os.makedirs(directory)

            file_name = f"{start_time.strftime('%M.%S.mp4')}"
            file_path = os.path.join(directory, file_name)

            # copy then delete is required when recordings are stored on some network drives
            shutil.copyfile(cache_path, file_path)
            os.remove(cache_path)

            rand_id = "".join(
                random.choices(string.ascii_lowercase + string.digits, k=6)
            )
            Recordings.create(
                id=f"{start_time.timestamp()}-{rand_id}",
                camera=camera,
                path=file_path,
                start_time=start_time.timestamp(),
                end_time=end_time.timestamp(),
                duration=duration,
            )

    def run(self):
        # Check for new files every 5 seconds
        while not self.stop_event.wait(5):
            self.move_files()

        logger.info(f"Exiting recording maintenance...")


class RecordingCleanup(threading.Thread):
    def __init__(self, config: FrigateConfig, stop_event):
        threading.Thread.__init__(self)
        self.name = "recording_cleanup"
        self.config = config
        self.stop_event = stop_event

    def clean_tmp_clips(self):
        # delete any clips more than 5 minutes old
        for p in Path("/tmp/cache").rglob("clip_*.mp4"):
            logger.debug(f"Checking tmp clip {p}.")
            if p.stat().st_mtime < (datetime.datetime.now().timestamp() - 60 * 1):
                logger.debug("Deleting tmp clip.")
                p.unlink(missing_ok=True)

    def expire_recordings(self):
        logger.debug("Start expire recordings (new).")

        logger.debug("Start deleted cameras.")
        # Handle deleted cameras
        expire_days = self.config.record.retain_days
        expire_before = (
            datetime.datetime.now() - datetime.timedelta(days=expire_days)
        ).timestamp()
        no_camera_recordings: Recordings = Recordings.select().where(
            Recordings.camera.not_in(list(self.config.cameras.keys())),
            Recordings.end_time < expire_before,
        )

        for recording in no_camera_recordings:
            Path(recording.path).unlink(missing_ok=True)
            Recordings.delete_by_id(recording.id)
        logger.debug("End deleted cameras.")

        logger.debug("Start all cameras.")
        for camera, config in self.config.cameras.items():
            logger.debug(f"Start camera: {camera}.")
            # When deleting recordings without events, we have to keep at LEAST the configured max clip duration
            min_end = (
                datetime.datetime.now()
                - datetime.timedelta(seconds=config.record.events.max_seconds)
            ).timestamp()
            expire_days = config.record.retain_days
            expire_before = (
                datetime.datetime.now() - datetime.timedelta(days=expire_days)
            ).timestamp()
            expire_date = min(min_end, expire_before)

            # Get recordings to check for expiration
            recordings: Recordings = (
                Recordings.select()
                .where(
                    Recordings.camera == camera,
                    Recordings.end_time < expire_date,
                )
                .order_by(Recordings.start_time.desc())
            )

            # Get all the events to check against
            events: Event = (
                Event.select()
                .where(
                    Event.camera == camera, Event.end_time < expire_date, Event.has_clip
                )
                .order_by(Event.start_time.desc())
                .objects()
            )

            # loop over recordings and see if they overlap with any non-expired events
            event_start = 0
            deleted_recordings = set()
            for recording in recordings.objects().iterator():
                keep = False
                # since the events and recordings are sorted, we can skip events
                # that start after the previous recording segment ended
                for idx in range(event_start, len(events)):
                    event = events[idx]

                    # if the next event ends before this segment starts, break
                    if event.end_time < recording.start_time:
                        break

                    # if the next event starts after the current segment ends, skip it
                    if event.start_time > recording.end_time:
                        event_start = idx
                        continue

                    keep = True

                # Delete recordings outside of the retention window
                if not keep:
                    Path(recording.path).unlink(missing_ok=True)
                    deleted_recordings.add(recording.id)

            logger.debug(f"Expiring {len(deleted_recordings)} recordings")
            (Recordings.delete().where(Recordings.id << deleted_recordings).execute())

            logger.debug(f"End camera: {camera}.")

        logger.debug("End all cameras.")
        logger.debug("End expire recordings (new).")

    def expire_files(self):
        logger.debug("Start expire files (legacy).")

        default_expire = (
            datetime.datetime.now().timestamp()
            - SECONDS_IN_DAY * self.config.record.retain_days
        )
        delete_before = {}

        for name, camera in self.config.cameras.items():
            delete_before[name] = (
                datetime.datetime.now().timestamp()
                - SECONDS_IN_DAY * camera.record.retain_days
            )

        # find all the recordings older than the oldest recording in the db
        try:
            oldest_recording = (
                Recordings.select().order_by(Recordings.start_time.desc()).get()
            )

            oldest_timestamp = oldest_recording.start_time
        except DoesNotExist:
            oldest_timestamp = datetime.datetime.now().timestamp()

        logger.debug(f"Oldest recording in the db: {oldest_timestamp}")
        process = sp.run(
            ["find", RECORD_DIR, "-type", "f", "-newermt", f"@{oldest_timestamp}"],
            capture_output=True,
            text=True,
        )
        files_to_check = process.stdout.splitlines()

        for f in files_to_check:
            p = Path(f)
            if p.stat().st_mtime < delete_before.get(p.parent.name, default_expire):
                p.unlink(missing_ok=True)

        logger.debug("End expire files (legacy).")

    def run(self):
        # Expire recordings every minute, clean directories every hour.
        for counter in itertools.cycle(range(60)):
            if self.stop_event.wait(60):
                logger.info(f"Exiting recording cleanup...")
                break

            self.expire_recordings()
            self.clean_tmp_clips()

            if counter == 0:
                self.expire_files()
                remove_empty_directories(RECORD_DIR)
