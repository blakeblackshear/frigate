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

from frigate.comms.detections_updater import DetectionSubscriber, DetectionTypeEnum
from frigate.comms.inter_process import InterProcessRequestor
from frigate.comms.recordings_updater import (
    RecordingsDataPublisher,
    RecordingsDataTypeEnum,
)
from frigate.config import FrigateConfig, RetainModeEnum
from frigate.config.camera.updater import (
    CameraConfigUpdateEnum,
    CameraConfigUpdateSubscriber,
)
from frigate.const import (
    CACHE_DIR,
    CACHE_SEGMENT_FORMAT,
    FAST_QUEUE_TIMEOUT,
    INSERT_MANY_RECORDINGS,
    MAX_SEGMENT_DURATION,
    MAX_SEGMENTS_IN_CACHE,
    RECORD_DIR,
)
from frigate.models import Recordings, ReviewSegment
from frigate.review.types import SeverityEnum
from frigate.util.services import get_video_properties

logger = logging.getLogger(__name__)


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
        keep = False

        # all mode should never discard
        if retain_mode == RetainModeEnum.all:
            keep = True

        # motion mode should keep if motion or audio is detected
        if (
            not keep
            and retain_mode == RetainModeEnum.motion
            and (self.motion_count > 0 or self.average_dBFS != 0)
        ):
            keep = True

        # active objects mode should keep if any active objects are detected
        if not keep and self.active_object_count > 0:
            keep = True

        return not keep


class RecordingMaintainer(threading.Thread):
    def __init__(self, config: FrigateConfig, stop_event: MpEvent):
        super().__init__(name="recording_maintainer")
        self.config = config

        # create communication for retained recordings
        self.requestor = InterProcessRequestor()
        self.config_subscriber = CameraConfigUpdateSubscriber(
            self.config,
            self.config.cameras,
            [CameraConfigUpdateEnum.add, CameraConfigUpdateEnum.record],
        )
        self.detection_subscriber = DetectionSubscriber(DetectionTypeEnum.all.value)
        self.recordings_publisher = RecordingsDataPublisher()

        self.stop_event = stop_event
        self.object_recordings_info: dict[str, list] = defaultdict(list)
        self.audio_recordings_info: dict[str, list] = defaultdict(list)
        self.end_time_cache: dict[str, Tuple[datetime.datetime, float]] = {}
        self.unexpected_cache_files_logged: bool = False

    async def move_files(self) -> None:
        cache_files = [
            d
            for d in os.listdir(CACHE_DIR)
            if os.path.isfile(os.path.join(CACHE_DIR, d))
            and d.endswith(".mp4")
            and not d.startswith("preview_")
        ]

        # publish newest cached segment per camera (including in use files)
        newest_cache_segments: dict[str, dict[str, Any]] = {}
        for cache in cache_files:
            cache_path = os.path.join(CACHE_DIR, cache)
            basename = os.path.splitext(cache)[0]
            try:
                camera, date = basename.rsplit("@", maxsplit=1)
            except ValueError:
                if not self.unexpected_cache_files_logged:
                    logger.warning("Skipping unexpected files in cache")
                    self.unexpected_cache_files_logged = True
                continue

            start_time = datetime.datetime.strptime(
                date, CACHE_SEGMENT_FORMAT
            ).astimezone(datetime.timezone.utc)
            if (
                camera not in newest_cache_segments
                or start_time > newest_cache_segments[camera]["start_time"]
            ):
                newest_cache_segments[camera] = {
                    "start_time": start_time,
                    "cache_path": cache_path,
                }

        for camera, newest in newest_cache_segments.items():
            self.recordings_publisher.publish(
                (
                    camera,
                    newest["start_time"].timestamp(),
                    newest["cache_path"],
                ),
                RecordingsDataTypeEnum.latest.value,
            )
        # publish None for cameras with no cache files (but only if we know the camera exists)
        for camera_name in self.config.cameras:
            if camera_name not in newest_cache_segments:
                self.recordings_publisher.publish(
                    (camera_name, None, None),
                    RecordingsDataTypeEnum.latest.value,
                )

        files_in_use = []
        for process in psutil.process_iter():
            try:
                if process.name() != "ffmpeg":
                    continue
                file_list = process.open_files()
                if file_list:
                    for nt in file_list:
                        if nt.path.startswith(CACHE_DIR):
                            files_in_use.append(nt.path.split("/")[-1])
            except psutil.Error:
                continue

        # group recordings by camera (skip in-use for validation/moving)
        grouped_recordings: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
        for cache in cache_files:
            # Skip files currently in use
            if cache in files_in_use:
                continue

            cache_path = os.path.join(CACHE_DIR, cache)
            basename = os.path.splitext(cache)[0]
            try:
                camera, date = basename.rsplit("@", maxsplit=1)
            except ValueError:
                if not self.unexpected_cache_files_logged:
                    logger.warning("Skipping unexpected files in cache")
                    self.unexpected_cache_files_logged = True
                continue

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

            camera_info = self.object_recordings_info[camera]
            most_recently_processed_frame_time = (
                camera_info[-1][0] if len(camera_info) > 0 else 0
            )

            processed_segment_count = len(
                list(
                    filter(
                        lambda r: (
                            r["start_time"].timestamp()
                            < most_recently_processed_frame_time
                        ),
                        grouped_recordings[camera],
                    )
                )
            )

            # see if the recording mover is too slow and segments need to be deleted
            if processed_segment_count > keep_count:
                logger.warning(
                    f"Unable to keep up with recording segments in cache for {camera}. Keeping the {keep_count} most recent segments out of {processed_segment_count} and discarding the rest..."
                )
                to_remove = grouped_recordings[camera][:-keep_count]
                for rec in to_remove:
                    cache_path = rec["cache_path"]
                    Path(cache_path).unlink(missing_ok=True)
                    self.end_time_cache.pop(cache_path, None)
                grouped_recordings[camera] = grouped_recordings[camera][-keep_count:]

            # see if detection has failed and unprocessed segments need to be deleted
            unprocessed_segment_count = (
                len(grouped_recordings[camera]) - processed_segment_count
            )
            if unprocessed_segment_count > keep_count:
                logger.warning(
                    f"Too many unprocessed recording segments in cache for {camera}. This likely indicates an issue with the detect stream, keeping the {keep_count} most recent segments out of {unprocessed_segment_count} and discarding the rest..."
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

            # get all reviews with the end time after the start of the oldest cache file
            # or with end_time None
            reviews: ReviewSegment = (
                ReviewSegment.select(
                    ReviewSegment.start_time,
                    ReviewSegment.end_time,
                    ReviewSegment.severity,
                    ReviewSegment.data,
                )
                .where(
                    ReviewSegment.camera == camera,
                    (ReviewSegment.end_time == None)
                    | (
                        ReviewSegment.end_time
                        >= recordings[0]["start_time"].timestamp()
                    ),
                )
                .order_by(ReviewSegment.start_time)
            )

            tasks.extend(
                [self.validate_and_move_segment(camera, reviews, r) for r in recordings]
            )

            # publish most recently available recording time and None if disabled
            self.recordings_publisher.publish(
                (
                    camera,
                    recordings[0]["start_time"].timestamp()
                    if self.config.cameras[camera].record.enabled
                    else None,
                    None,
                ),
                RecordingsDataTypeEnum.saved.value,
            )

        recordings_to_insert: list[Optional[Recordings]] = await asyncio.gather(*tasks)

        # fire and forget recordings entries
        self.requestor.send_data(
            INSERT_MANY_RECORDINGS,
            [r for r in recordings_to_insert if r is not None],
        )

    def drop_segment(self, cache_path: str) -> None:
        Path(cache_path).unlink(missing_ok=True)
        self.end_time_cache.pop(cache_path, None)

    async def validate_and_move_segment(
        self, camera: str, reviews: list[ReviewSegment], recording: dict[str, Any]
    ) -> Optional[Recordings]:
        cache_path: str = recording["cache_path"]
        start_time: datetime.datetime = recording["start_time"]
        record_config = self.config.cameras[camera].record

        # Just delete files if recordings are turned off
        if (
            camera not in self.config.cameras
            or not self.config.cameras[camera].record.enabled
        ):
            self.drop_segment(cache_path)
            return None

        if cache_path in self.end_time_cache:
            end_time, duration = self.end_time_cache[cache_path]
        else:
            segment_info = await get_video_properties(
                self.config.ffmpeg, cache_path, get_duration=True
            )

            if not segment_info.get("has_valid_video", False):
                logger.warning(
                    f"Invalid or missing video stream in segment {cache_path}. Discarding."
                )
                self.recordings_publisher.publish(
                    (camera, start_time.timestamp(), cache_path),
                    RecordingsDataTypeEnum.invalid.value,
                )
                self.drop_segment(cache_path)
                return None

            duration = float(segment_info.get("duration", -1))

            # ensure duration is within expected length
            if 0 < duration < MAX_SEGMENT_DURATION:
                end_time = start_time + datetime.timedelta(seconds=duration)
                self.end_time_cache[cache_path] = (end_time, duration)
            else:
                if duration == -1:
                    logger.warning(f"Failed to probe corrupt segment {cache_path}")

                logger.warning(f"Discarding a corrupt recording segment: {cache_path}")
                self.recordings_publisher.publish(
                    (camera, start_time.timestamp(), cache_path),
                    RecordingsDataTypeEnum.invalid.value,
                )
                self.drop_segment(cache_path)
                return None

            # this segment has a valid duration and has video data, so publish an update
            self.recordings_publisher.publish(
                (camera, start_time.timestamp(), cache_path),
                RecordingsDataTypeEnum.valid.value,
            )

        record_config = self.config.cameras[camera].record
        highest = None

        if record_config.continuous.days > 0:
            highest = "continuous"
        elif record_config.motion.days > 0:
            highest = "motion"

        # if we have continuous or motion recording enabled
        # we should first just check if this segment matches that
        # and avoid any DB calls
        if highest is not None:
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
                record_mode = (
                    RetainModeEnum.all
                    if highest == "continuous"
                    else RetainModeEnum.motion
                )
                return await self.move_segment(
                    camera, start_time, end_time, duration, cache_path, record_mode
                )

        # we fell through the continuous / motion check, so we need to check the review items
        # if the cached segment overlaps with the review items:
        overlaps = False
        for review in reviews:
            severity = SeverityEnum[review.severity]

            # if the review item starts in the future, stop checking review items
            # and remove this segment
            if (
                review.start_time - record_config.get_review_pre_capture(severity)
            ) > end_time.timestamp():
                overlaps = False
                break

            # if the review item is in progress or ends after the recording starts, keep it
            # and stop looking at review items
            if (
                review.end_time is None
                or (review.end_time + record_config.get_review_post_capture(severity))
                >= start_time.timestamp()
            ):
                overlaps = True
                break

        if overlaps:
            record_mode = (
                record_config.alerts.retain.mode
                if review.severity == "alert"
                else record_config.detections.retain.mode
            )
            # move from cache to recordings immediately
            return await self.move_segment(
                camera,
                start_time,
                end_time,
                duration,
                cache_path,
                record_mode,
            )
        # if it doesn't overlap with an review item, go ahead and drop the segment
        # if it ends more than the configured pre_capture for the camera
        # BUT only if continuous/motion is NOT enabled (otherwise wait for processing)
        elif highest is None:
            camera_info = self.object_recordings_info[camera]
            most_recently_processed_frame_time = (
                camera_info[-1][0] if len(camera_info) > 0 else 0
            )
            retain_cutoff = datetime.datetime.fromtimestamp(
                most_recently_processed_frame_time - record_config.event_pre_capture
            ).astimezone(datetime.timezone.utc)
            if end_time < retain_cutoff:
                self.drop_segment(cache_path)

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
    ) -> Optional[Recordings]:
        segment_info = self.segment_stats(camera, start_time, end_time)

        # check if the segment shouldn't be stored
        if segment_info.should_discard_segment(store_mode):
            self.drop_segment(cache_path)
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
                    self.config.ffmpeg.ffmpeg_path,
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
                        f"Copied {file_path} in {datetime.datetime.now().timestamp() - start_frame} seconds."
                    )

                try:
                    # get the segment size of the cache file
                    # file without faststart is same size
                    segment_size = round(
                        float(os.path.getsize(cache_path)) / pow(2, 20), 2
                    )
                except OSError:
                    segment_size = 0

                os.remove(cache_path)

                rand_id = "".join(
                    random.choices(string.ascii_lowercase + string.digits, k=6)
                )

                return {
                    Recordings.id.name: f"{start_time.timestamp()}-{rand_id}",
                    Recordings.camera.name: camera,
                    Recordings.path.name: file_path,
                    Recordings.start_time.name: start_time.timestamp(),
                    Recordings.end_time.name: end_time.timestamp(),
                    Recordings.duration.name: duration,
                    Recordings.motion.name: segment_info.motion_count,
                    # TODO: update this to store list of active objects at some point
                    Recordings.objects.name: segment_info.active_object_count,
                    Recordings.regions.name: segment_info.region_count,
                    Recordings.dBFS.name: segment_info.average_dBFS,
                    Recordings.segment_size.name: segment_size,
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
            self.config_subscriber.check_for_updates()

            stale_frame_count = 0
            stale_frame_count_threshold = 10
            # empty the object recordings info queue
            while True:
                (topic, data) = self.detection_subscriber.check_for_update(
                    timeout=FAST_QUEUE_TIMEOUT
                )

                if not topic:
                    break

                if topic == DetectionTypeEnum.video.value:
                    (
                        camera,
                        _,
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
                elif topic == DetectionTypeEnum.audio.value:
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
                elif (
                    topic == DetectionTypeEnum.api.value or DetectionTypeEnum.lpr.value
                ):
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
        self.recordings_publisher.stop()
        logger.info("Exiting recording maintenance...")
