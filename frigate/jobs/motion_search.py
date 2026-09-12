"""Motion search job management with background execution and parallel verification."""

import logging
import os
import threading
import time
from collections.abc import Callable, Generator, Iterable
from concurrent.futures import Future, ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any, cast

import cv2
import numpy as np

from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig
from frigate.const import UPDATE_JOB_STATE
from frigate.jobs.job import Job
from frigate.jobs.manager import (
    get_job_by_id,
    set_current_job,
)
from frigate.jobs.motion_search_batch import (
    build_segment_time_map,
    coalesce_runs,
    stream_time_to_absolute,
)
from frigate.jobs.motion_search_decode import (
    iter_vod_frames,
    keyframe_sampling_eligible,
    probe_video_dimensions,
    probe_vod_keyframe_pts,
    resolve_motion_decode_args,
)
from frigate.models import Recordings
from frigate.types import JobStatusTypesEnum

logger = logging.getLogger(__name__)

# Constants
HEATMAP_GRID_SIZE = 16
# Max wall-clock span of one VOD run request (seconds). Bounds per-request size
# and gives streaming/cancel/early-exit granularity.
MAX_RUN_SECONDS = 600.0
# Treat segments within this many seconds end-to-start as time-contiguous.
RUN_GAP_EPSILON = 1.0
# Longest-side pixels for the ROI downscale before motion detection.
SCALE_TARGET = 400
# Minimum wall seconds between intra-run progress broadcasts.
PROGRESS_BROADCAST_INTERVAL = 1.0
# Output frame rate for the fixed-cadence fallback used on long-GOP cameras
# (where keyframe sampling is too sparse). Keyframe cameras ignore this.
FALLBACK_SAMPLE_FPS = 2.0


@dataclass
class MotionSearchMetrics:
    """Metrics collected during motion search execution."""

    segments_scanned: int = 0
    segments_processed: int = 0
    metadata_inactive_segments: int = 0
    heatmap_roi_skip_segments: int = 0
    fallback_full_range_segments: int = 0
    frames_decoded: int = 0
    wall_time_seconds: float = 0.0
    segments_with_errors: int = 0

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class MotionSearchResult:
    """A single search result with timestamp and change info."""

    timestamp: float
    change_percentage: float

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class MotionSearchJob(Job):
    """Job state for motion search operations."""

    job_type: str = "motion_search"
    camera: str = ""
    start_time_range: float = 0.0
    end_time_range: float = 0.0
    polygon_points: list[list[float]] = field(default_factory=list)
    threshold: int = 30
    min_area: float = 5.0
    parallel: bool = False
    max_results: int = 25

    # Track progress
    total_frames_processed: int = 0

    # Live progress (ride the existing to_dict() websocket broadcast)
    scanning_timestamp: float | None = None
    progress: float = 0.0

    # Metrics for observability
    metrics: MotionSearchMetrics | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for WebSocket transmission."""
        d = asdict(self)
        if self.metrics:
            d["metrics"] = self.metrics.to_dict()
        return d


def create_polygon_mask(
    polygon_points: list[list[float]], frame_width: int, frame_height: int
) -> np.ndarray:
    """Create a binary mask from normalized polygon coordinates."""
    motion_points = np.array(
        [[int(p[0] * frame_width), int(p[1] * frame_height)] for p in polygon_points],
        dtype=np.int32,
    )
    mask = np.zeros((frame_height, frame_width), dtype=np.uint8)
    cv2.fillPoly(mask, [motion_points], (255,))
    return mask


def compute_roi_crop_and_scale(
    polygon_points: list[list[float]],
    frame_width: int,
    frame_height: int,
    scale_target: int,
) -> tuple[tuple[int, int, int, int], tuple[int, int]]:
    """Compute the ROI crop box and never-upscale scaled dimensions.

    Returns ((crop_w, crop_h, crop_x, crop_y), (scaled_w, scaled_h)) in pixels.
    The crop is the polygon's bounding box in frame pixels; the scaled size fits
    the crop's longest side to ``scale_target`` without ever enlarging it.
    """
    xs = [p[0] for p in polygon_points]
    ys = [p[1] for p in polygon_points]
    # nv12 (4:2:0) hwdownload requires even crop offsets and even crop/scale
    # dimensions; otherwise ffmpeg rounds the chroma planes and the raw byte
    # stream stops matching the expected frame size. Force even values, and the
    # mask is built from these same values so the two stay aligned.
    crop_x = int(min(xs) * frame_width)
    crop_y = int(min(ys) * frame_height)
    crop_x -= crop_x % 2
    crop_y -= crop_y % 2
    crop_w = max(2, int(max(xs) * frame_width) - crop_x)
    crop_h = max(2, int(max(ys) * frame_height) - crop_y)
    crop_w -= crop_w % 2
    crop_h -= crop_h % 2

    longest = max(crop_w, crop_h)
    factor = min(1.0, scale_target / longest)
    scaled_w = max(2, round(crop_w * factor))
    scaled_h = max(2, round(crop_h * factor))
    scaled_w -= scaled_w % 2
    scaled_h -= scaled_h % 2
    return (crop_w, crop_h, crop_x, crop_y), (scaled_w, scaled_h)


def build_scaled_roi_mask(
    polygon_points: list[list[float]],
    frame_width: int,
    frame_height: int,
    crop: tuple[int, int, int, int],
    scaled: tuple[int, int],
) -> np.ndarray:
    """Rasterize the polygon mask at the scaled ROI size.

    Builds the full-resolution mask, crops it to the ROI box, and nearest-
    neighbor resizes it to the scaled dimensions so it lines up exactly with the
    frames ffmpeg crops and scales.
    """
    crop_w, crop_h, crop_x, crop_y = crop
    scaled_w, scaled_h = scaled
    full_mask = create_polygon_mask(polygon_points, frame_width, frame_height)
    cropped = full_mask[crop_y : crop_y + crop_h, crop_x : crop_x + crop_w]
    return cv2.resize(cropped, (scaled_w, scaled_h), interpolation=cv2.INTER_NEAREST)


def detect_motion_scaled(
    frames: Iterable[tuple[int, np.ndarray]],
    mask: np.ndarray,
    threshold: int,
    min_area: float,
    timestamp_fn: Callable[[int], float],
) -> list[MotionSearchResult]:
    """Detect motion across pre-cropped, pre-scaled gray frames.

    ``frames`` yields (absolute_frame_index, gray_roi_frame); ``mask`` is the
    scaled ROI mask. ``min_area`` is a percentage of the masked ROI. Mirrors the
    full-res detection math (absdiff -> blur -> threshold -> dilate -> contours)
    on the already-reduced frames.
    """
    results: list[MotionSearchResult] = []
    mask_area = np.count_nonzero(mask)
    if mask_area == 0:
        return results
    min_area_pixels = int((min_area / 100.0) * mask_area)

    prev: np.ndarray | None = None
    for frame_idx, gray in frames:
        masked = cv2.bitwise_and(gray, gray, mask=mask)
        if prev is not None:
            diff = cv2.absdiff(prev, masked)
            diff_blurred = cv2.GaussianBlur(diff, (3, 3), 0)
            _, thresh = cv2.threshold(diff_blurred, threshold, 255, cv2.THRESH_BINARY)
            thresh_dilated = cv2.dilate(thresh, None, iterations=1)  # type: ignore[call-overload]
            thresh_masked = cv2.bitwise_and(thresh_dilated, thresh_dilated, mask=mask)
            change_pixels = cv2.countNonZero(thresh_masked)
            if change_pixels > min_area_pixels:
                contours, _ = cv2.findContours(
                    thresh_masked, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
                )
                total_change_area = sum(
                    cv2.contourArea(c)
                    for c in contours
                    if cv2.contourArea(c) >= min_area_pixels
                )
                if total_change_area > 0:
                    change_percentage = (total_change_area / mask_area) * 100
                    results.append(
                        MotionSearchResult(
                            timestamp=timestamp_fn(frame_idx),
                            change_percentage=round(change_percentage, 2),
                        )
                    )
        prev = masked
    return results


def compute_roi_bbox_normalized(
    polygon_points: list[list[float]],
) -> tuple[float, float, float, float]:
    """Compute the bounding box of the ROI in normalized coordinates (0-1).

    Returns (x_min, y_min, x_max, y_max) in normalized coordinates.
    """
    if not polygon_points:
        return (0.0, 0.0, 1.0, 1.0)

    x_coords = [p[0] for p in polygon_points]
    y_coords = [p[1] for p in polygon_points]
    return (min(x_coords), min(y_coords), max(x_coords), max(y_coords))


def heatmap_overlaps_roi(
    heatmap: object, roi_bbox: tuple[float, float, float, float]
) -> bool:
    """Check if a sparse motion heatmap has any overlap with the ROI bounding box.

    Args:
        heatmap: Sparse dict mapping cell index (str) to intensity (1-255).
        roi_bbox: (x_min, y_min, x_max, y_max) in normalized coordinates (0-1).

    Returns:
        True if there is overlap (any active cell in the ROI region).
    """
    if not isinstance(heatmap, dict):
        # Invalid heatmap, assume overlap to be safe
        return True

    x_min, y_min, x_max, y_max = roi_bbox

    # Convert normalized coordinates to grid cells (0-15)
    grid_x_min = max(0, int(x_min * HEATMAP_GRID_SIZE))
    grid_y_min = max(0, int(y_min * HEATMAP_GRID_SIZE))
    grid_x_max = min(HEATMAP_GRID_SIZE - 1, int(x_max * HEATMAP_GRID_SIZE))
    grid_y_max = min(HEATMAP_GRID_SIZE - 1, int(y_max * HEATMAP_GRID_SIZE))

    # Check each cell in the ROI bbox
    for y in range(grid_y_min, grid_y_max + 1):
        for x in range(grid_x_min, grid_x_max + 1):
            idx = str(y * HEATMAP_GRID_SIZE + x)
            if idx in heatmap:
                return True

    return False


def segment_passes_activity_gate(recording: Recordings) -> bool:
    """Check if a segment passes the activity gate.

    Returns True if any of motion, objects, or regions is non-zero/non-null.
    Returns True if all are null (old segments without data).
    """
    motion: Any = recording.motion
    objects: Any = recording.objects
    regions: Any = recording.regions

    # Old segments without metadata - pass through (conservative)
    if motion is None and objects is None and regions is None:
        return True

    # Pass if any activity indicator is positive
    return bool(motion) or bool(objects) or bool(regions)


def segment_passes_heatmap_gate(
    recording: Recordings, roi_bbox: tuple[float, float, float, float]
) -> bool:
    """Check if a segment passes the heatmap overlap gate.

    Returns True if:
    - No heatmap is stored (old segments).
    - The heatmap overlaps with the ROI bbox.
    """
    heatmap = getattr(recording, "motion_heatmap", None)
    if heatmap is None:
        # No heatmap stored, fall back to activity gate
        return True

    return heatmap_overlaps_roi(heatmap, roi_bbox)


def resolve_internal_port(config: FrigateConfig) -> int:
    """Return the unauthenticated internal nginx port for VOD requests."""
    listen = config.networking.listen.internal
    if isinstance(listen, str):
        return int(listen.split(":")[-1])
    return int(listen)


def build_vod_url(internal_port: int, camera: str, start: float, end: float) -> str:
    """Build the internal VOD HLS URL for a camera time range."""
    return (
        f"http://127.0.0.1:{internal_port}/vod/{camera}"
        f"/start/{start}/end/{end}/index.m3u8"
    )


class MotionSearchRunner(threading.Thread):
    """Thread-based runner for motion search jobs with parallel verification."""

    def __init__(
        self,
        job: MotionSearchJob,
        config: FrigateConfig,
        cancel_event: threading.Event,
    ) -> None:
        super().__init__(daemon=True, name=f"motion_search_{job.id}")
        self.job = job
        self.config = config
        self.cancel_event = cancel_event
        self.internal_stop_event = threading.Event()
        self.requestor = InterProcessRequestor()
        self.metrics = MotionSearchMetrics()
        self.job.metrics = self.metrics

        # Worker cap: min(4, cpu_count)
        cpu_count = os.cpu_count() or 1
        self.max_workers = min(4, cpu_count)

        # Resolved once per job in _execute_search
        self.ffmpeg_path: str = "ffmpeg"
        self.ffprobe_path: str = "ffprobe"
        self.decode_args: list[str] = []
        # Keyframe sampling decision, decided once per job from the first run's
        # GOP. The fallback cadence is a fixed rate (see FALLBACK_SAMPLE_FPS).
        self.use_keyframe: bool = True
        self.fps_rate: float = FALLBACK_SAMPLE_FPS
        # ROI crop/scale + scaled mask, computed once from the VOD-stream
        # dimensions (which can differ from the detect resolution).
        self.crop: tuple[int, int, int, int] = (0, 0, 0, 0)
        self.scaled: tuple[int, int] = (0, 0)
        self.scaled_mask: np.ndarray = np.zeros((0, 0), dtype=np.uint8)
        self.channels: int = 1
        self.internal_port: int = 5000
        self._last_progress_broadcast: float = 0.0

    def run(self) -> None:
        """Execute the motion search job."""
        try:
            self.job.status = JobStatusTypesEnum.running
            self.job.start_time = datetime.now().timestamp()
            self._broadcast_status()

            results = self._execute_search()

            if self.cancel_event.is_set():
                self.job.status = JobStatusTypesEnum.cancelled
            else:
                self.job.status = JobStatusTypesEnum.success
                self.job.results = {
                    "results": [r.to_dict() for r in results],
                    "total_frames_processed": self.job.total_frames_processed,
                }

            self.job.end_time = datetime.now().timestamp()
            self.metrics.wall_time_seconds = self.job.end_time - self.job.start_time
            self.job.metrics = self.metrics

            logger.debug(
                "Motion search job %s completed: status=%s, results=%d, frames=%d",
                self.job.id,
                self.job.status,
                len(results),
                self.job.total_frames_processed,
            )
            self._broadcast_status()

        except Exception as e:
            logger.exception("Motion search job %s failed: %s", self.job.id, e)
            self.job.status = JobStatusTypesEnum.failed
            self.job.error_message = str(e)
            self.job.end_time = datetime.now().timestamp()
            self.metrics.wall_time_seconds = self.job.end_time - (
                self.job.start_time or 0
            )
            self.job.metrics = self.metrics
            self._broadcast_status()

        finally:
            if self.requestor:
                self.requestor.stop()

    def _broadcast_status(self) -> None:
        """Broadcast job status update via IPC to WebSocket subscribers."""
        if self.job.status == JobStatusTypesEnum.running and self.job.start_time:
            self.metrics.wall_time_seconds = (
                datetime.now().timestamp() - self.job.start_time
            )

        try:
            self.requestor.send_data(UPDATE_JOB_STATE, self.job.to_dict())
        except Exception as e:
            logger.warning("Failed to broadcast motion search status: %s", e)

    def _should_stop(self) -> bool:
        """Check if processing should stop due to cancellation or internal limits."""
        return self.cancel_event.is_set() or self.internal_stop_event.is_set()

    def _execute_search(self) -> list[MotionSearchResult]:
        """Main search execution logic."""
        camera_name = self.job.camera
        camera_config = self.config.cameras.get(camera_name)
        if not camera_config:
            raise ValueError(f"Camera {camera_name} not found")

        frame_width = camera_config.detect.width
        frame_height = camera_config.detect.height

        if frame_width is None or frame_height is None:
            raise ValueError(f"Camera {camera_name} detect dimensions not configured")

        self.ffmpeg_path = camera_config.ffmpeg.ffmpeg_path
        self.ffprobe_path = camera_config.ffmpeg.ffprobe_path

        # Create polygon mask
        polygon_mask = create_polygon_mask(
            self.job.polygon_points, frame_width, frame_height
        )

        if np.count_nonzero(polygon_mask) == 0:
            logger.warning("Polygon mask is empty for job %s", self.job.id)
            return []

        # Compute ROI bbox in normalized coordinates for heatmap gate
        roi_bbox = compute_roi_bbox_normalized(self.job.polygon_points)

        # Query recordings
        recordings = list(
            Recordings.select()
            .where(
                (
                    Recordings.start_time.between(
                        self.job.start_time_range, self.job.end_time_range
                    )
                )
                | (
                    Recordings.end_time.between(
                        self.job.start_time_range, self.job.end_time_range
                    )
                )
                | (
                    (self.job.start_time_range > Recordings.start_time)
                    & (self.job.end_time_range < Recordings.end_time)
                )
            )
            .where(Recordings.camera == camera_name)
            .order_by(Recordings.start_time.asc())
        )

        if not recordings:
            logger.debug("No recordings found for motion search job %s", self.job.id)
            return []

        logger.debug(
            "Motion search job %s: queried %d recording segments for camera %s "
            "(range %.1f - %.1f)",
            self.job.id,
            len(recordings),
            camera_name,
            self.job.start_time_range,
            self.job.end_time_range,
        )

        self.metrics.segments_scanned = len(recordings)

        # Apply activity and heatmap gates
        filtered_recordings = []
        for recording in recordings:
            if not segment_passes_activity_gate(recording):
                self.metrics.metadata_inactive_segments += 1
                self.metrics.segments_processed += 1
                logger.debug(
                    "Motion search job %s: segment %s skipped by activity gate "
                    "(motion=%s, objects=%s, regions=%s)",
                    self.job.id,
                    recording.id,
                    recording.motion,
                    recording.objects,
                    recording.regions,
                )
                continue
            if not segment_passes_heatmap_gate(recording, roi_bbox):
                self.metrics.heatmap_roi_skip_segments += 1
                self.metrics.segments_processed += 1
                logger.debug(
                    "Motion search job %s: segment %s skipped by heatmap gate "
                    "(heatmap present=%s, roi_bbox=%s)",
                    self.job.id,
                    recording.id,
                    recording.motion_heatmap is not None,
                    roi_bbox,
                )
                continue
            filtered_recordings.append(recording)

        self._broadcast_status()

        # Fallback: if all segments were filtered out, scan all segments
        # This allows motion search to find things the detector missed
        if not filtered_recordings and recordings:
            logger.info(
                "All %d segments filtered by gates, falling back to full scan",
                len(recordings),
            )
            self.metrics.fallback_full_range_segments = len(recordings)
            filtered_recordings = recordings

        logger.debug(
            "Motion search job %s: %d/%d segments passed gates "
            "(activity_skipped=%d, heatmap_skipped=%d)",
            self.job.id,
            len(filtered_recordings),
            len(recordings),
            self.metrics.metadata_inactive_segments,
            self.metrics.heatmap_roi_skip_segments,
        )

        # Resolve decode backend (allowlisted hwaccel or software), coalesce the
        # gate-passing segments into time-contiguous runs, and probe the first
        # run's VOD stream once for dimensions + keyframe layout. VOD output is
        # what we decode, so crop/scale/mask are computed against it.
        self.internal_port = resolve_internal_port(self.config)
        self.decode_args = resolve_motion_decode_args(camera_config)
        ffprobe_path = self.ffprobe_path

        runs = coalesce_runs(filtered_recordings, MAX_RUN_SECONDS, RUN_GAP_EPSILON)
        if not runs:
            return []

        first_run = runs[0]
        first_url = build_vod_url(
            self.internal_port,
            camera_name,
            float(first_run[0].start_time),
            float(first_run[-1].end_time),
        )
        dims = probe_video_dimensions(ffprobe_path, first_url)
        if dims is None:
            raise ValueError(f"Could not probe VOD dimensions for camera {camera_name}")
        rec_width, rec_height, _rec_fps = dims

        self.crop, self.scaled = compute_roi_crop_and_scale(
            self.job.polygon_points, rec_width, rec_height, SCALE_TARGET
        )
        self.scaled_mask = build_scaled_roi_mask(
            self.job.polygon_points, rec_width, rec_height, self.crop, self.scaled
        )
        self.channels = 1  # always gray output

        # Decide keyframe vs fixed-cadence sampling once from the first run's GOP
        # (keyframe structure is a per-camera constant).
        first_pts = probe_vod_keyframe_pts(ffprobe_path, first_url)
        self.use_keyframe = keyframe_sampling_eligible(first_pts)

        logger.debug(
            "Motion search job %s: %d runs, sampling=%s, hwaccel=%s, vod=%dx%d",
            self.job.id,
            len(runs),
            "keyframe" if self.use_keyframe else "cadence",
            bool(self.decode_args),
            rec_width,
            rec_height,
        )

        return self._search_runs(runs)

    def _emit_progress(self, abs_ts: float) -> None:
        """Throttled intra-run progress broadcast (scanning cursor)."""
        now = time.monotonic()
        if now - self._last_progress_broadcast < PROGRESS_BROADCAST_INTERVAL:
            return
        self._last_progress_broadcast = now
        self.job.scanning_timestamp = abs_ts
        self._broadcast_status()

    def _detect_with_progress(
        self,
        indexed_frames: list[tuple[int, np.ndarray]],
        timestamp_fn: Callable[[int], float],
    ) -> list[MotionSearchResult]:
        """Run detection while firing throttled progress as frames are scanned."""

        def _gen() -> Generator[tuple[int, np.ndarray], None, None]:
            for i, frame in indexed_frames:
                if not self._should_stop():
                    self._emit_progress(timestamp_fn(i))
                yield i, frame

        return detect_motion_scaled(
            _gen(),
            self.scaled_mask,
            self.job.threshold,
            self.job.min_area,
            timestamp_fn,
        )

    def _process_run(
        self, run: list[Recordings]
    ) -> tuple[list[MotionSearchResult], int]:
        """Decode one run's VOD stream and detect motion.

        Keyframe mode compares every decoded keyframe (free recall, since they
        are all decoded anyway) paired with its probed PTS; if the decoded and
        probed counts disagree (the decoder ignored ``-skip_frame nokey`` or the
        stream is corrupt) this run re-runs in the fixed-cadence fallback.
        Returns ``(results, frame_count)``.
        """
        run_start: float = run[0].start_time  # type: ignore[assignment]
        run_end: float = run[-1].end_time  # type: ignore[assignment]
        vod_url = build_vod_url(self.internal_port, self.job.camera, run_start, run_end)
        time_map = build_segment_time_map(run)

        if self.use_keyframe:
            kf_pts = probe_vod_keyframe_pts(self.ffprobe_path, vod_url)
            frames = list(
                iter_vod_frames(
                    self.ffmpeg_path,
                    vod_url,
                    self.scaled[0],
                    self.scaled[1],
                    self.channels,
                    self.decode_args,
                    self.crop,
                    self.scaled,
                    True,
                    self._should_stop,
                    skip_nonkey=True,
                    fps_rate=None,
                )
            )
            if kf_pts and len(frames) == len(kf_pts):
                abs_times = [stream_time_to_absolute(time_map, p) for p in kf_pts]
                indexed = list(enumerate(frames))

                def _ts_kf(i: int) -> float:
                    return abs_times[i]

                results = self._detect_with_progress(indexed, _ts_kf)
                return results, len(frames)

            logger.debug(
                "Keyframe count mismatch (%d decoded vs %d probed), using cadence",
                len(frames),
                len(kf_pts),
            )

        return self._process_run_cadence(vod_url, time_map)

    def _process_run_cadence(
        self, vod_url: str, time_map: list[tuple[float, float, float]]
    ) -> tuple[list[MotionSearchResult], int]:
        """Fixed-cadence fallback: fps-filtered VOD decode, evenly spaced times."""
        frames = list(
            iter_vod_frames(
                self.ffmpeg_path,
                vod_url,
                self.scaled[0],
                self.scaled[1],
                self.channels,
                self.decode_args,
                self.crop,
                self.scaled,
                True,
                self._should_stop,
                skip_nonkey=False,
                fps_rate=self.fps_rate,
            )
        )
        indexed = list(enumerate(frames))

        def _ts_fps(i: int) -> float:
            return stream_time_to_absolute(time_map, i / self.fps_rate)

        results = self._detect_with_progress(indexed, _ts_fps)
        return results, len(frames)

    def _merge_run(
        self,
        run: list[Recordings],
        run_results: list[MotionSearchResult],
        frames: int,
        state: dict[str, Any],
    ) -> bool:
        """Fold one run's output into the running results; stream + dedup.

        Returns True once ``max_results`` deduped hits have accumulated.
        """
        state["completed_runs"] += 1
        state["all_results"].extend(run_results)
        state["total_frames"] += frames
        self.job.total_frames_processed = state["total_frames"]
        self.metrics.frames_decoded = state["total_frames"]
        self.metrics.segments_processed += len(run)
        self.job.progress = state["completed_runs"] / state["total_runs"]

        state["all_results"].sort(key=lambda r: r.timestamp)
        deduped = self._deduplicate_results(state["all_results"])[
            : self.job.max_results
        ]
        self.job.results = {
            "results": [r.to_dict() for r in deduped],
            "total_frames_processed": state["total_frames"],
        }
        self._broadcast_status()
        return len(deduped) >= self.job.max_results

    def _search_runs(self, runs: list[list[Recordings]]) -> list[MotionSearchResult]:
        """Decode runs (parallel pool when enabled), merge in order, stream."""
        state: dict[str, Any] = {
            "all_results": [],
            "total_frames": 0,
            "completed_runs": 0,
            "total_runs": len(runs),
        }
        self.job.results = {"results": [], "total_frames_processed": 0}

        logger.debug(
            "Motion search job %s: searching %d runs (parallel=%s, workers=%d)",
            self.job.id,
            len(runs),
            self.job.parallel,
            self.max_workers,
        )

        if self.job.parallel and len(runs) > 1:
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures: dict[Future, int] = {}
                for idx, run in enumerate(runs):
                    if self._should_stop():
                        break
                    futures[executor.submit(self._process_run, run)] = idx

                completed: dict[int, tuple[list[MotionSearchResult], int]] = {}
                next_idx = 0
                for future in as_completed(futures):
                    if self._should_stop():
                        break
                    run_idx = futures[future]
                    try:
                        completed[run_idx] = future.result()
                    except Exception as e:
                        self.metrics.segments_with_errors += 1
                        logger.warning("Error processing run %d: %s", run_idx, e)
                        completed[run_idx] = ([], 0)

                    while next_idx in completed:
                        run_results, frames = completed.pop(next_idx)
                        if self._merge_run(runs[next_idx], run_results, frames, state):
                            self.internal_stop_event.set()
                            for pending in futures:
                                pending.cancel()
                            break
                        next_idx += 1

                    if self.internal_stop_event.is_set():
                        break
        else:
            for run in runs:
                if self._should_stop():
                    break
                try:
                    run_results, frames = self._process_run(run)
                except Exception as e:
                    self.metrics.segments_with_errors += 1
                    self.metrics.segments_processed += len(run)
                    self._broadcast_status()
                    logger.warning("Error processing run: %s", e)
                    continue
                if self._merge_run(run, run_results, frames, state):
                    break

        all_results: list[MotionSearchResult] = state["all_results"]
        self.job.total_frames_processed = state["total_frames"]
        self.metrics.frames_decoded = state["total_frames"]
        self.job.progress = 1.0

        logger.debug(
            "Motion search job %s: complete, %d raw results, %d frames, %d errors",
            self.job.id,
            len(all_results),
            state["total_frames"],
            self.metrics.segments_with_errors,
        )

        all_results.sort(key=lambda r: r.timestamp)
        return self._deduplicate_results(all_results)[: self.job.max_results]

    def _deduplicate_results(
        self, results: list[MotionSearchResult], min_gap: float = 1.0
    ) -> list[MotionSearchResult]:
        """Deduplicate results that are too close together."""
        if not results:
            return results

        deduplicated: list[MotionSearchResult] = []
        last_timestamp = 0.0

        for result in results:
            if result.timestamp - last_timestamp >= min_gap:
                deduplicated.append(result)
                last_timestamp = result.timestamp

        return deduplicated


# Module-level state for managing per-camera jobs
_motion_search_jobs: dict[str, tuple[MotionSearchJob, threading.Event]] = {}
_jobs_lock = threading.Lock()


def stop_all_motion_search_jobs() -> None:
    """Cancel all running motion search jobs for clean shutdown."""
    with _jobs_lock:
        for job_id, (job, cancel_event) in _motion_search_jobs.items():
            if job.status in (JobStatusTypesEnum.queued, JobStatusTypesEnum.running):
                cancel_event.set()
                logger.debug("Signalling motion search job %s to stop", job_id)


def start_motion_search_job(
    config: FrigateConfig,
    camera_name: str,
    start_time: float,
    end_time: float,
    polygon_points: list[list[float]],
    threshold: int = 30,
    min_area: float = 5.0,
    parallel: bool = False,
    max_results: int = 25,
) -> str:
    """Start a new motion search job.

    Returns the job ID.
    """
    job = MotionSearchJob(
        camera=camera_name,
        start_time_range=start_time,
        end_time_range=end_time,
        polygon_points=polygon_points,
        threshold=threshold,
        min_area=min_area,
        parallel=parallel,
        max_results=max_results,
    )

    cancel_event = threading.Event()

    with _jobs_lock:
        _motion_search_jobs[job.id] = (job, cancel_event)

    set_current_job(job)

    runner = MotionSearchRunner(job, config, cancel_event)
    runner.start()

    logger.debug(
        "Started motion search job %s for camera %s: "
        "time_range=%.1f-%.1f, threshold=%d, min_area=%.1f%%, "
        "parallel=%s, max_results=%d, polygon_points=%d vertices",
        job.id,
        camera_name,
        start_time,
        end_time,
        threshold,
        min_area,
        parallel,
        max_results,
        len(polygon_points),
    )
    return job.id


def get_motion_search_job(job_id: str) -> MotionSearchJob | None:
    """Get a motion search job by ID."""
    with _jobs_lock:
        job_entry = _motion_search_jobs.get(job_id)
        if job_entry:
            return job_entry[0]
    # Check completed jobs via manager
    return cast(MotionSearchJob | None, get_job_by_id("motion_search", job_id))


def cancel_motion_search_job(job_id: str) -> bool:
    """Cancel a motion search job.

    Returns True if cancellation was initiated, False if job not found.
    """
    with _jobs_lock:
        job_entry = _motion_search_jobs.get(job_id)
        if not job_entry:
            return False

        job, cancel_event = job_entry

        if job.status not in (JobStatusTypesEnum.queued, JobStatusTypesEnum.running):
            # Already finished
            return True

        cancel_event.set()
        job.status = JobStatusTypesEnum.cancelled
        job_payload = job.to_dict()
        logger.info("Cancelled motion search job %s", job_id)

    requestor: InterProcessRequestor | None = None
    try:
        requestor = InterProcessRequestor()
        requestor.send_data(UPDATE_JOB_STATE, job_payload)
    except Exception as e:
        logger.warning(
            "Failed to broadcast cancelled motion search job %s: %s", job_id, e
        )
    finally:
        if requestor:
            requestor.stop()

    return True
