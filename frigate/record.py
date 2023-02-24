import datetime
import itertools
import logging
import multiprocessing as mp
import os
import queue
import random
import string
import subprocess as sp
import threading
from collections import defaultdict
from pathlib import Path

import psutil
from peewee import JOIN, DoesNotExist

from frigate.config import RetainModeEnum, FrigateConfig
from frigate.const import CACHE_DIR, MAX_SEGMENT_DURATION, RECORD_DIR
from frigate.models import Event, Recordings
from frigate.util import area

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
    def __init__(
        self, config: FrigateConfig, recordings_info_queue: mp.Queue, stop_event
    ):
        threading.Thread.__init__(self)
        self.name = "recording_maint"
        self.config = config
        self.recordings_info_queue = recordings_info_queue
        self.stop_event = stop_event
        self.recordings_info = defaultdict(list)
        self.end_time_cache = {}

    def move_files(self):
        cache_files = sorted(
            [
                d
                for d in os.listdir(CACHE_DIR)
                if os.path.isfile(os.path.join(CACHE_DIR, d))
                and d.endswith(".mp4")
                and not d.startswith("clip_")
            ]
        )

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

        # group recordings by camera
        grouped_recordings = defaultdict(list)
        for f in cache_files:
            # Skip files currently in use
            if f in files_in_use:
                continue

            cache_path = os.path.join(CACHE_DIR, f)
            basename = os.path.splitext(f)[0]
            camera, date = basename.rsplit("-", maxsplit=1)
            start_time = datetime.datetime.strptime(date, "%Y%m%d%H%M%S")

            grouped_recordings[camera].append(
                {
                    "cache_path": cache_path,
                    "start_time": start_time,
                }
            )

        # delete all cached files past the most recent 5
        keep_count = 5
        for camera in grouped_recordings.keys():
            segment_count = len(grouped_recordings[camera])
            if segment_count > keep_count:
                logger.warning(
                    f"Unable to keep up with recording segments in cache for {camera}. Keeping the {keep_count} most recent segments out of {segment_count} and discarding the rest..."
                )
                to_remove = grouped_recordings[camera][:-keep_count]
                for f in to_remove:
                    cache_path = f["cache_path"]
                    Path(cache_path).unlink(missing_ok=True)
                    self.end_time_cache.pop(cache_path, None)
                grouped_recordings[camera] = grouped_recordings[camera][-keep_count:]

        for camera, recordings in grouped_recordings.items():

            # clear out all the recording info for old frames
            while (
                len(self.recordings_info[camera]) > 0
                and self.recordings_info[camera][0][0]
                < recordings[0]["start_time"].timestamp()
            ):
                self.recordings_info[camera].pop(0)

            # get all events with the end time after the start of the oldest cache file
            # or with end_time None
            events: Event = (
                Event.select()
                .where(
                    Event.camera == camera,
                    (Event.end_time == None)
                    | (Event.end_time >= recordings[0]["start_time"].timestamp()),
                    Event.has_clip,
                )
                .order_by(Event.start_time)
            )
            for r in recordings:
                cache_path = r["cache_path"]
                start_time = r["start_time"]

                # Just delete files if recordings are turned off
                if (
                    not camera in self.config.cameras
                    or not self.config.cameras[camera].record.enabled
                ):
                    Path(cache_path).unlink(missing_ok=True)
                    self.end_time_cache.pop(cache_path, None)
                    continue

                if cache_path in self.end_time_cache:
                    end_time, duration = self.end_time_cache[cache_path]
                else:
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
                    if p.returncode == 0 and p.stdout.decode():
                        duration = float(p.stdout.decode().strip())
                    else:
                        duration = -1

                    # ensure duration is within expected length
                    if 0 < duration < MAX_SEGMENT_DURATION:
                        end_time = start_time + datetime.timedelta(seconds=duration)
                        self.end_time_cache[cache_path] = (end_time, duration)
                    else:
                        if duration == -1:
                            logger.warning(
                                f"Failed to probe corrupt segment {cache_path}: {p.returncode} - {p.stderr}"
                            )

                        logger.warning(
                            f"Discarding a corrupt recording segment: {cache_path}"
                        )
                        Path(cache_path).unlink(missing_ok=True)
                        continue

                # if cached file's start_time is earlier than the retain days for the camera
                if start_time <= (
                    (
                        datetime.datetime.now()
                        - datetime.timedelta(
                            days=self.config.cameras[camera].record.retain.days
                        )
                    )
                ):
                    # if the cached segment overlaps with the events:
                    overlaps = False
                    for event in events:
                        # if the event starts in the future, stop checking events
                        # and remove this segment
                        if event.start_time > end_time.timestamp():
                            overlaps = False
                            Path(cache_path).unlink(missing_ok=True)
                            self.end_time_cache.pop(cache_path, None)
                            break

                        # if the event is in progress or ends after the recording starts, keep it
                        # and stop looking at events
                        if (
                            event.end_time is None
                            or event.end_time >= start_time.timestamp()
                        ):
                            overlaps = True
                            break

                    if overlaps:
                        record_mode = self.config.cameras[
                            camera
                        ].record.events.retain.mode
                        # move from cache to recordings immediately
                        self.store_segment(
                            camera,
                            start_time,
                            end_time,
                            duration,
                            cache_path,
                            record_mode,
                        )
                    # if it doesn't overlap with an event, go ahead and drop the segment
                    # if it ends more than the configured pre_capture for the camera
                    else:
                        pre_capture = self.config.cameras[
                            camera
                        ].record.events.pre_capture
                        most_recently_processed_frame_time = self.recordings_info[
                            camera
                        ][-1][0]
                        retain_cutoff = most_recently_processed_frame_time - pre_capture
                        if end_time.timestamp() < retain_cutoff:
                            Path(cache_path).unlink(missing_ok=True)
                            self.end_time_cache.pop(cache_path, None)
                # else retain days includes this segment
                else:
                    record_mode = self.config.cameras[camera].record.retain.mode
                    self.store_segment(
                        camera, start_time, end_time, duration, cache_path, record_mode
                    )

    def segment_stats(self, camera, start_time, end_time):
        active_count = 0
        motion_count = 0
        for frame in self.recordings_info[camera]:
            # frame is after end time of segment
            if frame[0] > end_time.timestamp():
                break
            # frame is before start time of segment
            if frame[0] < start_time.timestamp():
                continue

            active_count += len(
                [
                    o
                    for o in frame[1]
                    if not o["false_positive"] and o["motionless_count"] == 0
                ]
            )

            motion_count += sum([area(box) for box in frame[2]])

        return (motion_count, active_count)

    def store_segment(
        self,
        camera,
        start_time: datetime.datetime,
        end_time: datetime.datetime,
        duration,
        cache_path,
        store_mode: RetainModeEnum,
    ):
        motion_count, active_count = self.segment_stats(camera, start_time, end_time)

        # check if the segment shouldn't be stored
        if (store_mode == RetainModeEnum.motion and motion_count == 0) or (
            store_mode == RetainModeEnum.active_objects and active_count == 0
        ):
            Path(cache_path).unlink(missing_ok=True)
            self.end_time_cache.pop(cache_path, None)
            return

        directory = os.path.join(
            RECORD_DIR,
            start_time.astimezone(tz=datetime.timezone.utc).strftime("%Y-%m-%d/%H"),
            camera,
        )

        if not os.path.exists(directory):
            os.makedirs(directory)

        file_name = (
            f"{start_time.replace(tzinfo=datetime.timezone.utc).strftime('%M.%S.mp4')}"
        )
        file_path = os.path.join(directory, file_name)

        try:
            if not os.path.exists(file_path):
                start_frame = datetime.datetime.now().timestamp()

                # add faststart to kept segments to improve metadata reading
                ffmpeg_cmd = [
                    "ffmpeg",
                    "-y",
                    "-i",
                    cache_path,
                    "-c",
                    "copy",
                    "-movflags",
                    "+faststart",
                    file_path,
                ]

                p = sp.run(
                    ffmpeg_cmd,
                    encoding="ascii",
                    capture_output=True,
                )

                if p.returncode != 0:
                    logger.error(f"Unable to convert {cache_path} to {file_path}")
                    logger.error(p.stderr)
                    return
                else:
                    logger.debug(
                        f"Copied {file_path} in {datetime.datetime.now().timestamp()-start_frame} seconds."
                    )

                try:
                    # get the segment size of the cache file
                    # file without faststart is same size
                    segment_size = round(
                        float(os.path.getsize(cache_path)) / 1000000, 1
                    )
                except OSError:
                    segment_size = 0

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
                    motion=motion_count,
                    # TODO: update this to store list of active objects at some point
                    objects=active_count,
                    segment_size=segment_size,
                )
        except Exception as e:
            logger.error(f"Unable to store recording segment {cache_path}")
            Path(cache_path).unlink(missing_ok=True)
            logger.error(e)

        # clear end_time cache
        self.end_time_cache.pop(cache_path, None)

    def run(self):
        # Check for new files every 5 seconds
        wait_time = 5
        while not self.stop_event.wait(wait_time):
            run_start = datetime.datetime.now().timestamp()

            # empty the recordings info queue
            while True:
                try:
                    (
                        camera,
                        frame_time,
                        current_tracked_objects,
                        motion_boxes,
                        regions,
                    ) = self.recordings_info_queue.get(False)

                    if self.config.cameras[camera].record.enabled:
                        self.recordings_info[camera].append(
                            (
                                frame_time,
                                current_tracked_objects,
                                motion_boxes,
                                regions,
                            )
                        )
                except queue.Empty:
                    break

            try:
                self.move_files()
            except Exception as e:
                logger.error(
                    "Error occurred when attempting to maintain recording cache"
                )
                logger.error(e)
            duration = datetime.datetime.now().timestamp() - run_start
            wait_time = max(0, 5 - duration)

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

                # empty contents of file before unlinking https://github.com/blakeblackshear/frigate/issues/4769
                with open(p, "w"):
                    pass
                p.unlink(missing_ok=True)

    def expire_recordings(self):
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

    def expire_files(self):
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
        process = sp.run(
            ["find", RECORD_DIR, "-type", "f", "!", "-newermt", f"@{oldest_timestamp}"],
            capture_output=True,
            text=True,
        )
        files_to_check = process.stdout.splitlines()

        for f in files_to_check:
            p = Path(f)
            try:
                if p.stat().st_mtime < delete_before.get(p.parent.name, default_expire):
                    p.unlink(missing_ok=True)
            except FileNotFoundError:
                logger.warning(f"Attempted to expire missing file: {f}")

        logger.debug("End expire files (legacy).")

    def sync_recordings(self):
        logger.debug("Start sync recordings.")

        # get all recordings in the db
        recordings: Recordings = Recordings.select()

        # get all recordings files on disk
        process = sp.run(
            ["find", RECORD_DIR, "-type", "f"],
            capture_output=True,
            text=True,
        )
        files_on_disk = process.stdout.splitlines()

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

    def run(self):
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
