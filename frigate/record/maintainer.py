"""Maintain recording segments in cache."""

import asyncio
import datetime
import logging
import os
import random
import string
import threading
import time
from collections import defaultdict
from multiprocessing.synchronize import Event as MpEvent
from pathlib import Path
from typing import Any, Optional, Tuple

import numpy as np
import psutil

from frigate.comms.config_updater import ConfigSubscriber
from frigate.comms.detections_updater import DetectionSubscriber, DetectionTypeEnum
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig, RetainModeEnum
from frigate.const import (
    CACHE_DIR,
    CACHE_SEGMENT_FORMAT,
    INSERT_MANY_RECORDINGS,
    MAX_SEGMENT_DURATION,
    MAX_SEGMENTS_IN_CACHE,
    RECORD_DIR,
)
from frigate.models import Event, Recordings
from frigate.util.services import get_video_properties

logger = logging.getLogger(__name__)

QUEUE_READ_TIMEOUT = 0.00001  # seconds


class SegmentInfo:
    def __init__(
        self,
        motion_count: int,
        active_object_count: int,
        region_count: int,
        average_dBFS: int,
    ) -> None:
        self.motion_count = motion_count
        self.active_object_count = active_object_count
        self.region_count = region_count
        self.average_dBFS = average_dBFS

    def should_discard_segment(self, retain_mode: RetainModeEnum) -> bool:
        return (
            retain_mode == RetainModeEnum.motion
            and self.motion_count == 0
            and self.average_dBFS == 0
        ) or (
            retain_mode == RetainModeEnum.active_objects
            and self.active_object_count == 0
        )


class RecordingMaintainer(threading.Thread):
    def __init__(self, config: FrigateConfig, stop_event: MpEvent):
        threading.Thread.__init__(self)
        self.name = "recording_maintainer"
        self.config = config

        # create communication for retained recordings
        self.requestor = InterProcessRequestor()
        self.config_subscriber = ConfigSubscriber("config/record/")
        self.detection_subscriber = DetectionSubscriber(DetectionTypeEnum.all)

        self.stop_event = stop_event
        self.object_recordings_info: dict[str, list] = defaultdict(list)
        self.audio_recordings_info: dict[str, list] = defaultdict(list)
        self.end_time_cache: dict[str, Tuple[datetime.datetime, float]] = {}

    async def move_files(self) -> None:
        cache_files = [
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
            camera, date = basename.rsplit("@", maxsplit=1)

            # important that start_time is utc because recordings are stored and compared in utc
            start_time = datetime.datetime.strptime(
                date, CACHE_SEGMENT_FORMAT
            ).astimezone(datetime.timezone.utc)

            grouped_recordings[camera].append(
                {
                    "cache_path": cache_path,
                    "start_time": start_time,
                }
            )

        # delete all cached files past the most recent MAX_SEGMENTS_IN_CACHE
        keep_count = MAX_SEGMENTS_IN_CACHE
        for camera in grouped_recordings.keys():
            # sort based on start time
            grouped_recordings[camera] = sorted(
                grouped_recordings[camera], key=lambda s: s["start_time"]
            )

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

        tasks = []
        for camera, recordings in grouped_recordings.items():
            # clear out all the object recording info for old frames
            while (
                len(self.object_recordings_info[camera]) > 0
                and self.object_recordings_info[camera][0][0]
                < recordings[0]["start_time"].timestamp()
            ):
                self.object_recordings_info[camera].pop(0)

            # clear out all the audio recording info for old frames
            while (
                len(self.audio_recordings_info[camera]) > 0
                and self.audio_recordings_info[camera][0][0]
                < recordings[0]["start_time"].timestamp()
            ):
                self.audio_recordings_info[camera].pop(0)

            # get all events with the end time after the start of the oldest cache file
            # or with end_time None
            events: Event = (
                Event.select(
                    Event.start_time,
                    Event.end_time,
                    Event.data,
                )
                .where(
                    Event.camera == camera,
                    (Event.end_time == None)
                    | (Event.end_time >= recordings[0]["start_time"].timestamp()),
                    Event.has_clip,
                )
                .order_by(Event.start_time)
            )

            tasks.extend(
                [self.validate_and_move_segment(camera, events, r) for r in recordings]
            )

        recordings_to_insert: list[Optional[Recordings]] = await asyncio.gather(*tasks)

        # fire and forget recordings entries
        self.requestor.send_data(
            INSERT_MANY_RECORDINGS,
            [r for r in recordings_to_insert if r is not None],
        )

    async def validate_and_move_segment(
        self, camera: str, events: list[Event], recording: dict[str, any]
    ) -> None:
        cache_path = recording["cache_path"]
        start_time = recording["start_time"]

        # Just delete files if recordings are turned off
        if (
            camera not in self.config.cameras
            or not self.config.cameras[camera].record.enabled
        ):
            Path(cache_path).unlink(missing_ok=True)
            self.end_time_cache.pop(cache_path, None)
            return

        if cache_path in self.end_time_cache:
            end_time, duration = self.end_time_cache[cache_path]
        else:
            segment_info = await get_video_properties(cache_path, get_duration=True)

            if segment_info["duration"]:
                duration = float(segment_info["duration"])
            else:
                duration = -1

            # ensure duration is within expected length
            if 0 < duration < MAX_SEGMENT_DURATION:
                end_time = start_time + datetime.timedelta(seconds=duration)
                self.end_time_cache[cache_path] = (end_time, duration)
            else:
                if duration == -1:
                    logger.warning(f"Failed to probe corrupt segment {cache_path}")

                logger.warning(f"Discarding a corrupt recording segment: {cache_path}")
                Path(cache_path).unlink(missing_ok=True)
                return

        # if cached file's start_time is earlier than the retain days for the camera
        if start_time <= (
            datetime.datetime.now().astimezone(datetime.timezone.utc)
            - datetime.timedelta(days=self.config.cameras[camera].record.retain.days)
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
                if event.end_time is None or event.end_time >= start_time.timestamp():
                    overlaps = True
                    break

            if overlaps:
                record_mode = self.config.cameras[camera].record.events.retain.mode
                # move from cache to recordings immediately
                return await self.move_segment(
                    camera,
                    start_time,
                    end_time,
                    duration,
                    cache_path,
                    record_mode,
                    event.data["type"] == "api",
                )
            # if it doesn't overlap with an event, go ahead and drop the segment
            # if it ends more than the configured pre_capture for the camera
            else:
                pre_capture = self.config.cameras[camera].record.events.pre_capture
                camera_info = self.object_recordings_info[camera]
                most_recently_processed_frame_time = (
                    camera_info[-1][0] if len(camera_info) > 0 else 0
                )
                retain_cutoff = datetime.datetime.fromtimestamp(
                    most_recently_processed_frame_time - pre_capture
                ).astimezone(datetime.timezone.utc)
                if end_time < retain_cutoff:
                    Path(cache_path).unlink(missing_ok=True)
                    self.end_time_cache.pop(cache_path, None)
        # else retain days includes this segment
        else:
            # assume that empty means the relevant recording info has not been received yet
            camera_info = self.object_recordings_info[camera]
            most_recently_processed_frame_time = (
                camera_info[-1][0] if len(camera_info) > 0 else 0
            )

            # ensure delayed segment info does not lead to lost segments
            if (
                datetime.datetime.fromtimestamp(
                    most_recently_processed_frame_time
                ).astimezone(datetime.timezone.utc)
                >= end_time
            ):
                record_mode = self.config.cameras[camera].record.retain.mode
                return await self.move_segment(
                    camera, start_time, end_time, duration, cache_path, record_mode
                )

    def segment_stats(
        self, camera: str, start_time: datetime.datetime, end_time: datetime.datetime
    ) -> SegmentInfo:
        video_frame_count = 0
        active_count = 0
        region_count = 0
        motion_count = 0
        for frame in self.object_recordings_info[camera]:
            # frame is after end time of segment
            if frame[0] > end_time.timestamp():
                break
            # frame is before start time of segment
            if frame[0] < start_time.timestamp():
                continue

            video_frame_count += 1
            active_count += len(
                [
                    o
                    for o in frame[1]
                    if not o["false_positive"] and o["motionless_count"] == 0
                ]
            )
            motion_count += len(frame[2])
            region_count += len(frame[3])

        audio_values = []
        for frame in self.audio_recordings_info[camera]:
            # frame is after end time of segment
            if frame[0] > end_time.timestamp():
                break

            # frame is before start time of segment
            if frame[0] < start_time.timestamp():
                continue

            # add active audio label count to count of active objects
            active_count += len(frame[2])

            # add sound level to audio values
            audio_values.append(frame[1])

        average_dBFS = 0 if not audio_values else np.average(audio_values)

        return SegmentInfo(
            motion_count, active_count, region_count, round(average_dBFS)
        )

    async def move_segment(
        self,
        camera: str,
        start_time: datetime.datetime,
        end_time: datetime.datetime,
        duration: float,
        cache_path: str,
        store_mode: RetainModeEnum,
        manual_event: bool = False,  # if this segment is being moved due to a manual event
    ) -> Optional[Recordings]:
        segment_info = self.segment_stats(camera, start_time, end_time)

        # check if the segment shouldn't be stored
        if not manual_event and segment_info.should_discard_segment(store_mode):
            Path(cache_path).unlink(missing_ok=True)
            self.end_time_cache.pop(cache_path, None)
            return

        # directory will be in utc due to start_time being in utc
        directory = os.path.join(
            RECORD_DIR,
            start_time.strftime("%Y-%m-%d/%H"),
            camera,
        )

        if not os.path.exists(directory):
            os.makedirs(directory)

        # file will be in utc due to start_time being in utc
        file_name = f"{start_time.strftime('%M.%S.mp4')}"
        file_path = os.path.join(directory, file_name)

        try:
            if not os.path.exists(file_path):
                start_frame = datetime.datetime.now().timestamp()

                # add faststart to kept segments to improve metadata reading
                p = await asyncio.create_subprocess_exec(
                    "ffmpeg",
                    "-hide_banner",
                    "-y",
                    "-i",
                    cache_path,
                    "-c",
                    "copy",
                    "-movflags",
                    "+faststart",
                    file_path,
                    stderr=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.DEVNULL,
                )
                await p.wait()

                if p.returncode != 0:
                    logger.error(f"Unable to convert {cache_path} to {file_path}")
                    logger.error((await p.stderr.read()).decode("ascii"))
                    return None
                else:
                    logger.debug(
                        f"Copied {file_path} in {datetime.datetime.now().timestamp()-start_frame} seconds."
                    )

                try:
                    # get the segment size of the cache file
                    # file without faststart is same size
                    segment_size = round(
                        float(os.path.getsize(cache_path)) / pow(2, 20), 1
                    )
                except OSError:
                    segment_size = 0

                os.remove(cache_path)

                rand_id = "".join(
                    random.choices(string.ascii_lowercase + string.digits, k=6)
                )

                return {
                    Recordings.id: f"{start_time.timestamp()}-{rand_id}",
                    Recordings.camera: camera,
                    Recordings.path: file_path,
                    Recordings.start_time: start_time.timestamp(),
                    Recordings.end_time: end_time.timestamp(),
                    Recordings.duration: duration,
                    Recordings.motion: segment_info.motion_count,
                    # TODO: update this to store list of active objects at some point
                    Recordings.objects: segment_info.active_object_count
                    + (1 if manual_event else 0),
                    Recordings.regions: segment_info.region_count,
                    Recordings.dBFS: segment_info.average_dBFS,
                    Recordings.segment_size: segment_size,
                }
        except Exception as e:
            logger.error(f"Unable to store recording segment {cache_path}")
            Path(cache_path).unlink(missing_ok=True)
            logger.error(e)

        # clear end_time cache
        self.end_time_cache.pop(cache_path, None)
        return None

    def run(self) -> None:
        # Check for new files every 5 seconds
        wait_time = 0.0
        while not self.stop_event.is_set():
            time.sleep(wait_time)

            if self.stop_event.is_set():
                break

            run_start = datetime.datetime.now().timestamp()

            # check if there is an updated config
            while True:
                (
                    updated_topic,
                    updated_record_config,
                ) = self.config_subscriber.check_for_update()

                if not updated_topic:
                    break

                camera_name = updated_topic.rpartition("/")[-1]
                self.config.cameras[camera_name].record = updated_record_config

            stale_frame_count = 0
            stale_frame_count_threshold = 10
            # empty the object recordings info queue
            while True:
                (topic, data) = self.detection_subscriber.get_data(
                    timeout=QUEUE_READ_TIMEOUT
                )

                if not topic:
                    break

                if topic == DetectionTypeEnum.video:
                    (
                        camera,
                        frame_time,
                        current_tracked_objects,
                        motion_boxes,
                        regions,
                    ) = data

                    if self.config.cameras[camera].record.enabled:
                        self.object_recordings_info[camera].append(
                            (
                                frame_time,
                                current_tracked_objects,
                                motion_boxes,
                                regions,
                            )
                        )
                elif topic == DetectionTypeEnum.audio:
                    (
                        camera,
                        frame_time,
                        dBFS,
                        audio_detections,
                    ) = data

                    if self.config.cameras[camera].record.enabled:
                        self.audio_recordings_info[camera].append(
                            (
                                frame_time,
                                dBFS,
                                audio_detections,
                            )
                        )
                elif topic == DetectionTypeEnum.api:
                    continue

                if frame_time < run_start - stale_frame_count_threshold:
                    stale_frame_count += 1

            if stale_frame_count > 0:
                logger.debug(f"Found {stale_frame_count} old frames.")

            try:
                asyncio.run(self.move_files())
            except Exception as e:
                logger.error(
                    "Error occurred when attempting to maintain recording cache"
                )
                logger.error(e)
            duration = datetime.datetime.now().timestamp() - run_start
            wait_time = max(0, 5 - duration)

        self.requestor.stop()
        self.config_subscriber.stop()
        self.detection_subscriber.stop()
        logger.info("Exiting recording maintenance...")
