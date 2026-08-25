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
from typing import Any

import numpy as np
import psutil
from peewee import fn

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
    STREAM_TYPE_MAIN,
    STREAM_TYPE_SUB,
    SUB_CACHE_TAG,
)
from frigate.models import Recordings, ReviewSegment
from frigate.review.types import SeverityEnum
from frigate.util.media import get_keyframe_offsets
from frigate.util.services import get_video_properties

logger = logging.getLogger(__name__)

STALE_RECORDINGS_INFO_TTL = MAX_SEGMENTS_IN_CACHE * MAX_SEGMENT_DURATION * 2

# cache filenames have whole-second resolution, so a contiguous segment's
# parsed start lands up to 1s before the previous segment's true end
SEGMENT_CHAIN_TOLERANCE_S = 1.0

# against an mtime-measured start, disagreement beyond this means
# accumulated probe-duration error and the chain re-anchors on the mtime
SEGMENT_CHAIN_DRIFT_LIMIT_S = 0.5

# probing every cached segment at once starves the camera and detection
# processes, and the probes then blow their own timeouts together, so
# segments get discarded as corrupt and the record watchdog restarts ffmpeg
MAX_CONCURRENT_SEGMENT_PROBES = 4


def parse_cache_segment_name(basename: str) -> tuple[str, str, str] | None:
    """Parse a cache segment basename into (camera, stream_type, date).

    Main segments are named {camera}@{date}; sub segments {camera}@sub@{date}.
    """
    try:
        prefix, date = basename.rsplit("@", maxsplit=1)
    except ValueError:
        return None

    if prefix.endswith(SUB_CACHE_TAG):
        return (prefix[: -len(SUB_CACHE_TAG)], STREAM_TYPE_SUB, date)

    return (prefix, STREAM_TYPE_MAIN, date)


def format_segment_details(cache_path: str, segment_info: dict[str, Any]) -> str:
    """Comma separated facts about a segment, for discard warnings."""
    details: list[str] = []

    duration = segment_info.get("duration", -1)

    if duration != -1:
        details.append(f"duration: {duration:.2f}s")

    try:
        details.append(f"size: {os.path.getsize(cache_path) / 1024:.1f} KB")
    except OSError:
        pass

    details.append(f"video: {segment_info.get('video_codec') or 'none'}")

    if segment_info.get("has_audio"):
        audio = segment_info.get("audio_codec") or "unknown"
        rate = segment_info.get("audio_rate")
        details.append(f"audio: {audio} {rate}Hz" if rate else f"audio: {audio}")
    else:
        details.append("audio: none")

    return ", ".join(details)


def segment_path_time(cache_path: str) -> datetime.datetime | None:
    """Timestamp a segment's recording path is built from, or None if unparsable.

    Recording paths carry one second of resolution, and so does ffmpeg's cache
    segment template, which makes a cache file name unique per camera stream
    and second. Resolved start times are not: a stream cutting segments faster
    than once a second resolves consecutive segments into the same second, and
    building the path from those collides on the unique path index.
    """
    parsed = parse_cache_segment_name(Path(cache_path).stem)

    if parsed is None:
        return None

    try:
        return datetime.datetime.strptime(parsed[2], CACHE_SEGMENT_FORMAT).astimezone(
            datetime.UTC
        )
    except ValueError:
        return None


class SegmentInfo:
    def __init__(
        self,
        motion_count: int,
        active_object_count: int,
        region_count: int,
        average_dBFS: int,
        motion_heatmap: dict[str, int] | None = None,
    ) -> None:
        self.motion_count = motion_count
        self.active_object_count = active_object_count
        self.region_count = region_count
        self.average_dBFS = average_dBFS
        self.motion_heatmap = motion_heatmap

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
    # move_files replaces this per cycle: an asyncio primitive binds to the
    # first event loop that contends it, and every cycle runs in a new loop
    probe_semaphore = asyncio.Semaphore(MAX_CONCURRENT_SEGMENT_PROBES)

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
        # cache_path -> (end_time, duration, has_audio, audio_rate,
        # audio_codec, video_codec, keyframes)
        self.end_time_cache: dict[
            str,
            tuple[
                datetime.datetime,
                float,
                bool | None,
                int | None,
                str | None,
                str | None,
                list[int] | None,
            ],
        ] = {}
        # last known capture end per (camera, stream_type); 0.0 marks a key
        # whose DB seed found no rows
        self.last_segment_end: dict[tuple[str, str], float] = {}
        self.unexpected_cache_files_logged: bool = False

    def _get_last_segment_end(self, camera: str, stream_type: str) -> float | None:
        """Return the last known capture end time for a camera stream.

        Lazily seeds from the most recent stored recording so start-time
        chains survive restarts.
        """
        key = (camera, stream_type)

        if key not in self.last_segment_end:
            last_db_end = (
                Recordings.select(fn.MAX(Recordings.end_time))
                .where(
                    Recordings.camera == camera,
                    Recordings.stream_type == stream_type,
                )
                .scalar()
            )
            # the 0.0 sentinel keeps the seed query from repeating
            self.last_segment_end[key] = last_db_end if last_db_end is not None else 0.0

        return self.last_segment_end[key] or None

    def _resolve_segment_start(
        self,
        camera: str,
        stream_type: str,
        filename_start: datetime.datetime,
        duration: float,
        cache_path: str,
    ) -> datetime.datetime:
        """Resolve a segment's true start time from its cache file.

        Cache filenames carry whole-second resolution, so the parsed start
        sits up to 1s early. The cache file's mtime is the wall clock when
        ffmpeg rolled the segment, so mtime minus the probed duration
        restores the fractional start. Contiguous segments still chain to
        the previous segment's end so rows stay exactly adjacent.
        """
        filename_ts = filename_start.timestamp()

        measured: float | None = None
        try:
            mtime = os.path.getmtime(cache_path)
        except OSError:
            mtime = None
        if mtime is not None:
            candidate = mtime - duration
            # media shorter than its wall span (a stalled stream, an early
            # close) derives a start past the truncation window, where the
            # floored filename start is safer
            if 0 <= candidate - filename_ts < SEGMENT_CHAIN_TOLERANCE_S:
                measured = candidate

        last_end = self._get_last_segment_end(camera, stream_type)

        if measured is not None:
            if (
                last_end is not None
                and abs(last_end - measured) < SEGMENT_CHAIN_DRIFT_LIMIT_S
            ):
                return datetime.datetime.fromtimestamp(last_end, tz=datetime.UTC)
            return datetime.datetime.fromtimestamp(measured, tz=datetime.UTC)

        # no usable mtime: capture is continuous within a run, so a
        # filename start just before the previous end chains to that end
        if (
            last_end is not None
            and 0 <= last_end - filename_ts < SEGMENT_CHAIN_TOLERANCE_S
        ):
            return datetime.datetime.fromtimestamp(last_end, tz=datetime.UTC)

        return filename_start

    async def move_files(self) -> None:
        self.probe_semaphore = asyncio.Semaphore(MAX_CONCURRENT_SEGMENT_PROBES)

        cache_files = [
            d
            for d in os.listdir(CACHE_DIR)
            if os.path.isfile(os.path.join(CACHE_DIR, d))
            and d.endswith(".mp4")
            and not d.startswith("preview_")
        ]

        # publish newest cached segment per camera stream (including in use files)
        newest_cache_segments: dict[tuple[str, str], dict[str, Any]] = {}
        for cache in cache_files:
            cache_path = os.path.join(CACHE_DIR, cache)
            basename = os.path.splitext(cache)[0]
            parsed = parse_cache_segment_name(basename)
            if parsed is None:
                if not self.unexpected_cache_files_logged:
                    logger.warning(f"Skipping unexpected files in cache, e.g. {cache}")
                    self.unexpected_cache_files_logged = True
                continue
            camera, stream_type, date = parsed

            start_time = datetime.datetime.strptime(
                date, CACHE_SEGMENT_FORMAT
            ).astimezone(datetime.UTC)
            key = (camera, stream_type)
            if (
                key not in newest_cache_segments
                or start_time > newest_cache_segments[key]["start_time"]
            ):
                newest_cache_segments[key] = {
                    "start_time": start_time,
                    "cache_path": cache_path,
                }

        for (camera, stream_type), newest in newest_cache_segments.items():
            self.recordings_publisher.publish(
                (
                    camera,
                    stream_type,
                    newest["start_time"].timestamp(),
                    newest["cache_path"],
                ),
                RecordingsDataTypeEnum.latest.value,
            )
        # publish None for streams with no cache files (but only if we know the camera exists)
        for camera_name, camera_config in self.config.cameras.items():
            stream_types = [STREAM_TYPE_MAIN]

            if camera_config.record.sub.enabled:
                stream_types.append(STREAM_TYPE_SUB)

            for stream_type in stream_types:
                if (camera_name, stream_type) not in newest_cache_segments:
                    self.recordings_publisher.publish(
                        (camera_name, stream_type, None, None),
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

        # group recordings by camera and stream type (skip in-use for validation/moving)
        grouped_recordings: defaultdict[tuple[str, str], list[dict[str, Any]]] = (
            defaultdict(list)
        )
        for cache in cache_files:
            # Skip files currently in use
            if cache in files_in_use:
                continue

            cache_path = os.path.join(CACHE_DIR, cache)
            basename = os.path.splitext(cache)[0]
            parsed = parse_cache_segment_name(basename)
            if parsed is None:
                if not self.unexpected_cache_files_logged:
                    logger.warning(f"Skipping unexpected files in cache, e.g. {cache}")
                    self.unexpected_cache_files_logged = True
                continue
            camera, stream_type, date = parsed

            # important that start_time is utc because recordings are stored and compared in utc
            start_time = datetime.datetime.strptime(
                date, CACHE_SEGMENT_FORMAT
            ).astimezone(datetime.UTC)

            grouped_recordings[(camera, stream_type)].append(
                {
                    "cache_path": cache_path,
                    "start_time": start_time,
                    "stream_type": stream_type,
                }
            )

        # delete all cached files past the most recent MAX_SEGMENTS_IN_CACHE
        keep_count = MAX_SEGMENTS_IN_CACHE
        for key in grouped_recordings.keys():
            camera, stream_type = key

            # sort based on start time
            grouped_recordings[key] = sorted(
                grouped_recordings[key], key=lambda s: s["start_time"]
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
                        grouped_recordings[key],
                    )
                )
            )

            # see if the recording mover is too slow and segments need to be deleted
            if processed_segment_count > keep_count:
                logger.warning(
                    f"Unable to keep up with recording segments in cache for {camera}. Keeping the {keep_count} most recent segments out of {processed_segment_count} and discarding the rest..."
                )
                to_remove = grouped_recordings[key][:-keep_count]
                for rec in to_remove:
                    cache_path = rec["cache_path"]
                    Path(cache_path).unlink(missing_ok=True)
                    self.end_time_cache.pop(cache_path, None)
                grouped_recordings[key] = grouped_recordings[key][-keep_count:]

            # see if detection has failed and unprocessed segments need to be deleted
            unprocessed_segment_count = (
                len(grouped_recordings[key]) - processed_segment_count
            )
            if unprocessed_segment_count > keep_count:
                logger.warning(
                    f"Too many unprocessed recording segments in cache for {camera}. This likely indicates an issue with the detect stream, keeping the {keep_count} most recent segments out of {unprocessed_segment_count} and discarding the rest..."
                )
                to_remove = grouped_recordings[key][:-keep_count]
                for rec in to_remove:
                    cache_path = rec["cache_path"]
                    Path(cache_path).unlink(missing_ok=True)
                    self.end_time_cache.pop(cache_path, None)
                grouped_recordings[key] = grouped_recordings[key][-keep_count:]

        # frame stats are shared per camera across stream types, so trimming
        # to one stream's oldest cache would pop frames the other still needs
        min_start_per_camera: dict[str, float] = {}
        for key, recordings in grouped_recordings.items():
            camera, _ = key
            oldest_start = recordings[0]["start_time"].timestamp()
            if (
                camera not in min_start_per_camera
                or oldest_start < min_start_per_camera[camera]
            ):
                min_start_per_camera[camera] = oldest_start

        for camera, min_start in min_start_per_camera.items():
            # clear out all the object recording info for old frames
            while (
                len(self.object_recordings_info[camera]) > 0
                and self.object_recordings_info[camera][0][0] < min_start
            ):
                self.object_recordings_info[camera].pop(0)

            # clear out all the audio recording info for old frames
            while (
                len(self.audio_recordings_info[camera]) > 0
                and self.audio_recordings_info[camera][0][0] < min_start
            ):
                self.audio_recordings_info[camera].pop(0)

        tasks = []
        reviews_by_camera: dict[str, Any] = {}
        for key, recordings in grouped_recordings.items():
            camera, stream_type = key

            # get all reviews with the end time after the start of the oldest
            # cache file or with end_time None; shared across stream types
            if camera not in reviews_by_camera:
                reviews_by_camera[camera] = (
                    ReviewSegment.select(
                        ReviewSegment.start_time,
                        ReviewSegment.end_time,
                        ReviewSegment.severity,
                        ReviewSegment.data,
                    )
                    .where(
                        ReviewSegment.camera == camera,
                        (ReviewSegment.end_time == None)
                        | (ReviewSegment.end_time >= min_start_per_camera[camera]),
                    )
                    .order_by(ReviewSegment.start_time)
                )
            reviews = reviews_by_camera[camera]

            tasks.extend(
                [self.validate_and_move_segment(camera, reviews, r) for r in recordings]
            )

            # publish most recently available recording time and None if disabled
            if stream_type == STREAM_TYPE_MAIN:
                camera_cfg = self.config.cameras.get(camera)
                self.recordings_publisher.publish(
                    (
                        camera,
                        stream_type,
                        recordings[0]["start_time"].timestamp()
                        if camera_cfg and camera_cfg.record.enabled
                        else None,
                        None,
                    ),
                    RecordingsDataTypeEnum.saved.value,
                )

        self._expire_stale_recordings_info(grouped_recordings)

        # one segment must not abort the cycle: an exception propagating out
        # of gather would abandon the other segments' in-flight probes
        results: list[dict[str, Any] | None | BaseException] = await asyncio.gather(
            *tasks, return_exceptions=True
        )

        recordings_to_insert: list[dict[str, Any]] = []

        for result in results:
            if isinstance(result, BaseException):
                logger.error(
                    "Failed to validate and move a recording segment", exc_info=result
                )
                continue

            if result is not None:
                recordings_to_insert.append(result)

        # fire and forget recordings entries
        self.requestor.send_data(INSERT_MANY_RECORDINGS, recordings_to_insert)

    def _expire_stale_recordings_info(
        self, grouped_recordings: defaultdict[tuple[str, str], list[dict[str, Any]]]
    ) -> None:
        expire_before = datetime.datetime.now().timestamp() - STALE_RECORDINGS_INFO_TTL
        # a camera is still active when any of its streams cached segments
        cameras_with_cache = {camera for camera, _ in grouped_recordings}

        for recordings_info in (
            self.object_recordings_info,
            self.audio_recordings_info,
        ):
            for camera in list(recordings_info.keys()):
                if camera in cameras_with_cache:
                    continue
                info = recordings_info[camera]
                while info and info[0][0] < expire_before:
                    info.pop(0)

    def drop_segment(self, cache_path: str) -> None:
        Path(cache_path).unlink(missing_ok=True)
        self.end_time_cache.pop(cache_path, None)

    async def validate_and_move_segment(
        self, camera: str, reviews: Any, recording: dict[str, Any]
    ) -> dict[str, Any] | None:
        cache_path: str = recording["cache_path"]
        start_time: datetime.datetime = recording["start_time"]
        stream_type: str = recording["stream_type"]

        # Just delete files if camera removed or recordings are turned off
        if (
            camera not in self.config.cameras
            or not self.config.cameras[camera].record.enabled
            or (
                stream_type == STREAM_TYPE_SUB
                and not self.config.cameras[camera].record.sub.enabled
            )
        ):
            self.drop_segment(cache_path)
            return None

        if cache_path in self.end_time_cache:
            (
                end_time,
                duration,
                has_audio,
                audio_rate,
                audio_codec,
                video_codec,
                keyframes,
            ) = self.end_time_cache[cache_path]
            # recover the resolved start rather than reusing the truncated
            # filename timestamp
            start_time = end_time - datetime.timedelta(seconds=duration)
        else:
            async with self.probe_semaphore:
                segment_info = await get_video_properties(
                    self.config.ffmpeg, cache_path, get_duration=True
                )

            if not segment_info.get("has_valid_video", False):
                logger.warning(
                    f"Invalid or missing video stream in segment {cache_path} "
                    f"({format_segment_details(cache_path, segment_info)}). Discarding."
                )
                self.recordings_publisher.publish(
                    (camera, stream_type, start_time.timestamp(), cache_path),
                    RecordingsDataTypeEnum.invalid.value,
                )
                self.drop_segment(cache_path)
                return None

            duration = float(segment_info.get("duration", -1))
            has_audio = segment_info.get("has_audio")
            audio_rate = segment_info.get("audio_rate")
            audio_codec = segment_info.get("audio_codec")
            video_codec = segment_info.get("video_codec")

            # ensure duration is within expected length
            if 0 < duration < MAX_SEGMENT_DURATION:
                # playback snaps mid-file entry points against these offsets
                # instead of probing files on demand
                async with self.probe_semaphore:
                    keyframes = await get_keyframe_offsets(cache_path)

                start_time = self._resolve_segment_start(
                    camera, stream_type, start_time, duration, cache_path
                )
                end_time = start_time + datetime.timedelta(seconds=duration)
                self.end_time_cache[cache_path] = (
                    end_time,
                    duration,
                    has_audio,
                    audio_rate,
                    audio_codec,
                    video_codec,
                    keyframes,
                )
                # segments later discarded by retention still advance the
                # chain for the next kept segment
                self.last_segment_end[(camera, stream_type)] = end_time.timestamp()
            else:
                if duration == -1:
                    logger.warning(f"Failed to probe corrupt segment {cache_path}")

                logger.warning(
                    f"Discarding a corrupt recording segment: {cache_path} "
                    f"({format_segment_details(cache_path, segment_info)})"
                )
                self.recordings_publisher.publish(
                    (camera, stream_type, start_time.timestamp(), cache_path),
                    RecordingsDataTypeEnum.invalid.value,
                )
                self.drop_segment(cache_path)
                return None

            # this segment has a valid duration and has video data, so publish an update
            self.recordings_publisher.publish(
                (camera, stream_type, start_time.timestamp(), cache_path),
                RecordingsDataTypeEnum.valid.value,
            )

        record_config = self.config.cameras[camera].record

        # sub's alerts/detections carry the retain mode directly, unlike
        # main's nested retain config
        if stream_type == STREAM_TYPE_SUB:
            continuous_days = record_config.sub.continuous.days
            motion_days = record_config.sub.motion.days
            alerts_retain_mode = record_config.sub.alerts.mode
            detections_retain_mode = record_config.sub.detections.mode
        else:
            continuous_days = record_config.continuous.days
            motion_days = record_config.motion.days
            alerts_retain_mode = record_config.alerts.retain.mode
            detections_retain_mode = record_config.detections.retain.mode

        segment_stats: SegmentInfo | None = None
        highest = None

        if continuous_days > 0:
            highest = "continuous"
        elif motion_days > 0:
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
                ).astimezone(datetime.UTC)
                >= end_time
            ):
                record_mode = (
                    RetainModeEnum.all
                    if highest == "continuous"
                    else RetainModeEnum.motion
                )
                segment_stats = self.segment_stats(camera, start_time, end_time)

                # Here we only check if we should move the segment based on non-object recording retention
                # we will always want to check for overlapping review items below before dropping the segment
                if not segment_stats.should_discard_segment(record_mode):
                    return await self.move_segment(
                        camera,
                        stream_type,
                        start_time,
                        end_time,
                        duration,
                        cache_path,
                        segment_stats,
                        has_audio,
                        audio_rate,
                        audio_codec,
                        video_codec,
                        keyframes,
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
                alerts_retain_mode
                if review.severity == "alert"
                else detections_retain_mode
            )

            if segment_stats is None:
                segment_stats = self.segment_stats(camera, start_time, end_time)

            if not segment_stats.should_discard_segment(record_mode):
                # move from cache to recordings immediately
                return await self.move_segment(
                    camera,
                    stream_type,
                    start_time,
                    end_time,
                    duration,
                    cache_path,
                    segment_stats,
                    has_audio,
                    audio_rate,
                    audio_codec,
                    video_codec,
                    keyframes,
                )
            else:
                self.drop_segment(cache_path)
                return None

        # if it doesn't overlap with a review item, drop the segment once it
        # ends more than event_pre_capture before the most recently processed
        # frame. at this point we've already decided not to keep it for
        # continuous/motion retention (either disabled or segment_stats said
        # discard), so waiting longer just fills the cache.
        else:
            camera_info = self.object_recordings_info[camera]
            most_recently_processed_frame_time = (
                camera_info[-1][0] if len(camera_info) > 0 else 0
            )
            retain_cutoff = datetime.datetime.fromtimestamp(
                most_recently_processed_frame_time - record_config.event_pre_capture
            ).astimezone(datetime.UTC)

            if end_time < retain_cutoff:
                self.drop_segment(cache_path)

        return None

    def _compute_motion_heatmap(
        self, camera: str, motion_boxes: list[tuple[int, int, int, int]]
    ) -> dict[str, int] | None:
        """Compute a 16x16 motion intensity heatmap from motion boxes.

        Returns a sparse dict mapping cell index (as string) to intensity (1-255).
        Only cells with motion are included.

        Args:
            camera: Camera name to get detect dimensions from.
            motion_boxes: List of (x1, y1, x2, y2) pixel coordinates.

        Returns:
            Sparse dict like {"45": 3, "46": 5}, or None if no boxes.
        """
        if not motion_boxes:
            return None

        camera_config = self.config.cameras.get(camera)
        if not camera_config:
            return None

        frame_width = camera_config.detect.width
        frame_height = camera_config.detect.height

        if not frame_width or frame_width <= 0 or not frame_height or frame_height <= 0:
            return None

        GRID_SIZE = 16
        counts: dict[int, int] = {}

        for box in motion_boxes:
            if len(box) < 4:
                continue
            x1, y1, x2, y2 = box

            # Convert pixel coordinates to grid cells
            grid_x1 = max(0, int((x1 / frame_width) * GRID_SIZE))
            grid_y1 = max(0, int((y1 / frame_height) * GRID_SIZE))
            grid_x2 = min(GRID_SIZE - 1, int((x2 / frame_width) * GRID_SIZE))
            grid_y2 = min(GRID_SIZE - 1, int((y2 / frame_height) * GRID_SIZE))

            for y in range(grid_y1, grid_y2 + 1):
                for x in range(grid_x1, grid_x2 + 1):
                    idx = y * GRID_SIZE + x
                    counts[idx] = min(255, counts.get(idx, 0) + 1)

        if not counts:
            return None

        # Convert to string keys for JSON storage
        return {str(k): v for k, v in counts.items()}

    def segment_stats(
        self, camera: str, start_time: datetime.datetime, end_time: datetime.datetime
    ) -> SegmentInfo:
        video_frame_count = 0
        active_count = 0
        region_count = 0
        motion_count = 0
        all_motion_boxes: list[tuple[int, int, int, int]] = []

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
            # Collect motion boxes for heatmap computation
            all_motion_boxes.extend(frame[2])

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

        motion_heatmap = self._compute_motion_heatmap(camera, all_motion_boxes)

        return SegmentInfo(
            motion_count,
            active_count,
            region_count,
            round(average_dBFS),
            motion_heatmap,
        )

    async def move_segment(
        self,
        camera: str,
        stream_type: str,
        start_time: datetime.datetime,
        end_time: datetime.datetime,
        duration: float,
        cache_path: str,
        segment_info: SegmentInfo,
        has_audio: bool | None = None,
        audio_rate: int | None = None,
        audio_codec: str | None = None,
        video_codec: str | None = None,
        keyframes: list[int] | None = None,
    ) -> dict[str, Any] | None:
        path_time = segment_path_time(cache_path) or start_time

        # directory will be in utc due to path_time being in utc
        # sub segments get a tagged directory to avoid filename collisions
        directory = os.path.join(
            RECORD_DIR,
            path_time.strftime("%Y-%m-%d/%H"),
            camera if stream_type == STREAM_TYPE_MAIN else f"{camera}{SUB_CACHE_TAG}",
        )

        os.makedirs(directory, exist_ok=True)

        # file will be in utc due to path_time being in utc
        file_name = f"{path_time.strftime('%M.%S.mp4')}"
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
                    "-metadata",
                    f"creation_time={start_time.strftime('%Y-%m-%dT%H:%M:%S.%fZ')}",
                    file_path,
                    stderr=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.DEVNULL,
                )
                await p.wait()

                if p.returncode != 0:
                    logger.error(f"Unable to convert {cache_path} to {file_path}")
                    if p.stderr:
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
                    Recordings.stream_type.name: stream_type,
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
                    Recordings.motion_heatmap.name: segment_info.motion_heatmap,
                    Recordings.has_audio.name: has_audio,
                    Recordings.audio_rate.name: audio_rate,
                    Recordings.audio_codec.name: audio_codec,
                    Recordings.video_codec.name: video_codec,
                    Recordings.keyframes.name: keyframes,
                }
        except Exception:
            logger.exception(f"Unable to store recording segment {cache_path}")
            Path(cache_path).unlink(missing_ok=True)

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
                result = self.detection_subscriber.check_for_update(
                    timeout=FAST_QUEUE_TIMEOUT
                )

                if not result:
                    break

                topic, data = result

                if not topic or not data:
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

                    camera_config = self.config.cameras.get(camera)

                    if camera_config is not None and camera_config.record.enabled:
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

                    camera_config = self.config.cameras.get(camera)

                    if camera_config is not None and camera_config.record.enabled:
                        self.audio_recordings_info[camera].append(
                            (
                                frame_time,
                                dBFS,
                                audio_detections,
                            )
                        )
                elif (
                    topic == DetectionTypeEnum.api.value
                    or topic == DetectionTypeEnum.lpr.value
                ):
                    continue

                if frame_time < run_start - stale_frame_count_threshold:
                    stale_frame_count += 1

            if stale_frame_count > 0:
                logger.debug(f"Found {stale_frame_count} old frames.")

            try:
                asyncio.run(self.move_files())
            except Exception:
                logger.exception(
                    "Error occurred when attempting to maintain recording cache"
                )
            duration = datetime.datetime.now().timestamp() - run_start
            wait_time = max(0, 5 - duration)

        self.requestor.stop()
        self.config_subscriber.stop()
        self.detection_subscriber.stop()
        self.recordings_publisher.stop()
        logger.info("Exiting recording maintenance...")
