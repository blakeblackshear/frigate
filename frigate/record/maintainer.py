"""Maintain recording segments in cache."""

import datetime
import logging
import multiprocessing as mp
import os
import queue
import random
import string
import subprocess as sp
import threading
from collections import defaultdict
from multiprocessing.synchronize import Event as MpEvent
from pathlib import Path
from typing import Any, Tuple

import psutil

from frigate.config import FrigateConfig, RetainModeEnum
from frigate.const import CACHE_DIR, MAX_SEGMENT_DURATION, RECORD_DIR
from frigate.models import Event, Recordings
from frigate.types import RecordMetricsTypes
from frigate.util import area

logger = logging.getLogger(__name__)


class RecordingMaintainer(threading.Thread):
    def __init__(
        self,
        config: FrigateConfig,
        recordings_info_queue: mp.Queue,
        process_info: dict[str, RecordMetricsTypes],
        stop_event: MpEvent,
    ):
        threading.Thread.__init__(self)
        self.name = "recording_maintainer"
        self.config = config
        self.recordings_info_queue = recordings_info_queue
        self.process_info = process_info
        self.stop_event = stop_event
        self.recordings_info: dict[str, Any] = defaultdict(list)
        self.end_time_cache: dict[str, Tuple[datetime.datetime, float]] = {}

    def move_files(self) -> None:
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
            except psutil.Error:
                continue

        # group recordings by camera
        grouped_recordings: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
        for cache in cache_files:
            # Skip files currently in use
            if cache in files_in_use:
                continue

            cache_path = os.path.join(CACHE_DIR, cache)
            basename = os.path.splitext(cache)[0]
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
                for rec in to_remove:
                    cache_path = rec["cache_path"]
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
                    (Event.end_time is None)
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
                    camera not in self.config.cameras
                    or not self.process_info[camera]["record_enabled"].value
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
                                f"Failed to probe corrupt segment {cache_path} : {p.returncode} - {str(p.stderr)}"
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

    def segment_stats(
        self, camera: str, start_time: datetime.datetime, end_time: datetime.datetime
    ) -> Tuple[int, int]:
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
        camera: str,
        start_time: datetime.datetime,
        end_time: datetime.datetime,
        duration: float,
        cache_path: str,
        store_mode: RetainModeEnum,
    ) -> None:
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

    def run(self) -> None:
        # Check for new files every 5 seconds
        wait_time = 5.0
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

                    if self.process_info[camera]["record_enabled"].value:
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

        logger.info("Exiting recording maintenance...")
