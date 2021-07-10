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

from peewee import JOIN

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
            and not d.startswith("tmp_clip")
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
            if f in files_in_use:
                continue

            cache_path = os.path.join(CACHE_DIR, f)
            basename = os.path.splitext(f)[0]
            camera, date = basename.rsplit("-", maxsplit=1)
            start_time = datetime.datetime.strptime(date, "%Y%m%d%H%M%S")

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

            shutil.move(cache_path, file_path)

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

    def expire_recordings(self):
        event_recordings = Recordings.select(
            Recordings.id.alias("recording_id"),
            Recordings.camera,
            Recordings.path,
            Recordings.end_time,
            Event.id.alias("event_id"),
            Event.label,
        ).join(
            Event,
            on=(
                (Recordings.camera == Event.camera)
                & (
                    (Recordings.start_time.between(Event.start_time, Event.end_time))
                    | (Recordings.end_time.between(Event.start_time, Event.end_time))
                ),
            ),
        )

        retain = {}
        for recording in event_recordings:
            # Set default to delete
            if recording.path not in retain:
                retain[recording.path] = False

            # Handle deleted cameras that still have recordings and events
            if recording.camera in self.config.cameras:
                record_config = self.config.cameras[recording.camera].record
            else:
                record_config = self.config.record

            # Check event retention and set to True if within window
            expire_days_event = (
                0
                if not record_config.events.enabled
                else record_config.events.retain.objects.get(
                    recording.event.label, record_config.events.retain.default
                )
            )
            expire_before_event = (
                datetime.datetime.now() - datetime.timedelta(days=expire_days_event)
            ).timestamp()
            if recording.end_time >= expire_before_event:
                retain[recording.path] = True

            # Check recording retention and set to True if within window
            expire_days_record = record_config.retain_days
            expire_before_record = (
                datetime.datetime.now() - datetime.timedelta(days=expire_days_record)
            ).timestamp()
            if recording.end_time > expire_before_record:
                retain[recording.path] = True

        # Actually expire recordings
        delete_paths = [path for path, keep in retain.items() if not keep]
        for path in delete_paths:
            Path(path).unlink(missing_ok=True)
        Recordings.delete().where(Recordings.path << delete_paths).execute()

        # Update Events to reflect deleted recordings
        event_no_recordings = (
            Event.select()
            .join(
                Recordings,
                JOIN.LEFT_OUTER,
                on=(
                    (Recordings.camera == Event.camera)
                    & (
                        (
                            Recordings.start_time.between(
                                Event.start_time, Event.end_time
                            )
                        )
                        | (
                            Recordings.end_time.between(
                                Event.start_time, Event.end_time
                            )
                        )
                    ),
                ),
            )
            .where(Recordings.id.is_null())
        )
        Event.update(has_clip=False).where(Event.id << event_no_recordings).execute()

        event_paths = list(retain.keys())

        # Handle deleted cameras
        no_camera_recordings: Recordings = Recordings.select().where(
            Recordings.camera.not_in(list(self.config.cameras.keys())),
            Recordings.path.not_in(event_paths),
        )

        for recording in no_camera_recordings:
            expire_days = self.config.record.retain_days
            expire_before = (
                datetime.datetime.now() - datetime.timedelta(days=expire_days)
            ).timestamp()
            if recording.end_time < expire_before:
                Path(recording.path).unlink(missing_ok=True)
                Recordings.delete_by_id(recording.id)

        # When deleting recordings without events, we have to keep at LEAST the configured max clip duration
        for camera, config in self.config.cameras.items():
            min_end = (
                datetime.datetime.now()
                - datetime.timedelta(seconds=config.record.events.max_seconds)
            ).timestamp()
            recordings: Recordings = Recordings.select().where(
                Recordings.camera == camera,
                Recordings.path.not_in(event_paths),
                Recordings.end_time < min_end,
            )

            for recording in recordings:
                expire_days = config.record.retain_days
                expire_before = (
                    datetime.datetime.now() - datetime.timedelta(days=expire_days)
                ).timestamp()
                if recording.end_time < expire_before:
                    Path(recording.path).unlink(missing_ok=True)
                    Recordings.delete_by_id(recording.id)

    def expire_files(self):
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

        for p in Path("/media/frigate/recordings").rglob("*.mp4"):
            # Ignore files that have a record in the recordings DB
            if Recordings.select().where(Recordings.path == str(p)).count():
                continue
            if p.stat().st_mtime < delete_before.get(p.parent.name, default_expire):
                p.unlink(missing_ok=True)

    def run(self):
        # only expire events every 10 minutes, but check for new files every 5 seconds
        for counter in itertools.cycle(range(120)):
            if self.stop_event.wait(5):
                logger.info(f"Exiting recording maintenance...")
                break

            if counter % 12 == 0:
                self.expire_recordings()

            if counter == 0:
                self.expire_files()
                remove_empty_directories(RECORD_DIR)

            self.move_files()
