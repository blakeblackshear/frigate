"""Motion search job management with background execution and parallel verification."""

import logging
import os
import threading
from concurrent.futures import Future, ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any, Optional

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
from frigate.models import Recordings
from frigate.types import JobStatusTypesEnum

logger = logging.getLogger(__name__)

# Constants
HEATMAP_GRID_SIZE = 16


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
    frame_skip: int = 5
    parallel: bool = False
    max_results: int = 25

    # Track progress
    total_frames_processed: int = 0

    # Metrics for observability
    metrics: Optional[MotionSearchMetrics] = None

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
    cv2.fillPoly(mask, [motion_points], 255)
    return mask


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
    heatmap: dict[str, int], roi_bbox: tuple[float, float, float, float]
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
    motion = recording.motion
    objects = recording.objects
    regions = recording.regions

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

        if self.job.parallel:
            return self._search_motion_parallel(filtered_recordings, polygon_mask)

        return self._search_motion_sequential(filtered_recordings, polygon_mask)

    def _search_motion_parallel(
        self,
        recordings: list[Recordings],
        polygon_mask: np.ndarray,
    ) -> list[MotionSearchResult]:
        """Search for motion in parallel across segments, streaming results."""
        all_results: list[MotionSearchResult] = []
        total_frames = 0
        next_recording_idx_to_merge = 0

        logger.debug(
            "Motion search job %s: starting motion search with %d workers "
            "across %d segments",
            self.job.id,
            self.max_workers,
            len(recordings),
        )

        # Initialize partial results on the job so they stream to the frontend
        self.job.results = {"results": [], "total_frames_processed": 0}

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures: dict[Future, int] = {}
            completed_segments: dict[int, tuple[list[MotionSearchResult], int]] = {}

            for idx, recording in enumerate(recordings):
                if self._should_stop():
                    break

                future = executor.submit(
                    self._process_recording_for_motion,
                    recording.path,
                    recording.start_time,
                    recording.end_time,
                    self.job.start_time_range,
                    self.job.end_time_range,
                    polygon_mask,
                    self.job.threshold,
                    self.job.min_area,
                    self.job.frame_skip,
                )
                futures[future] = idx

            for future in as_completed(futures):
                if self._should_stop():
                    # Cancel remaining futures
                    for f in futures:
                        f.cancel()
                    break

                recording_idx = futures[future]
                recording = recordings[recording_idx]

                try:
                    results, frames = future.result()
                    self.metrics.segments_processed += 1
                    completed_segments[recording_idx] = (results, frames)

                    while next_recording_idx_to_merge in completed_segments:
                        segment_results, segment_frames = completed_segments.pop(
                            next_recording_idx_to_merge
                        )

                        all_results.extend(segment_results)
                        total_frames += segment_frames
                        self.job.total_frames_processed = total_frames
                        self.metrics.frames_decoded = total_frames

                        if segment_results:
                            deduped = self._deduplicate_results(all_results)
                            self.job.results = {
                                "results": [
                                    r.to_dict() for r in deduped[: self.job.max_results]
                                ],
                                "total_frames_processed": total_frames,
                            }

                        self._broadcast_status()

                        if segment_results and len(deduped) >= self.job.max_results:
                            self.internal_stop_event.set()
                            for pending_future in futures:
                                pending_future.cancel()
                            break

                        next_recording_idx_to_merge += 1

                    if self.internal_stop_event.is_set():
                        break

                except Exception as e:
                    self.metrics.segments_processed += 1
                    self.metrics.segments_with_errors += 1
                    self._broadcast_status()
                    logger.warning(
                        "Error processing segment %s: %s",
                        recording.path,
                        e,
                    )

        self.job.total_frames_processed = total_frames
        self.metrics.frames_decoded = total_frames

        logger.debug(
            "Motion search job %s: motion search complete, "
            "found %d raw results, decoded %d frames, %d segment errors",
            self.job.id,
            len(all_results),
            total_frames,
            self.metrics.segments_with_errors,
        )

        # Sort and deduplicate results
        all_results.sort(key=lambda x: x.timestamp)
        return self._deduplicate_results(all_results)[: self.job.max_results]

    def _search_motion_sequential(
        self,
        recordings: list[Recordings],
        polygon_mask: np.ndarray,
    ) -> list[MotionSearchResult]:
        """Search for motion sequentially across segments, streaming results."""
        all_results: list[MotionSearchResult] = []
        total_frames = 0

        logger.debug(
            "Motion search job %s: starting sequential motion search across %d segments",
            self.job.id,
            len(recordings),
        )

        self.job.results = {"results": [], "total_frames_processed": 0}

        for recording in recordings:
            if self.cancel_event.is_set():
                break

            try:
                results, frames = self._process_recording_for_motion(
                    recording.path,
                    recording.start_time,
                    recording.end_time,
                    self.job.start_time_range,
                    self.job.end_time_range,
                    polygon_mask,
                    self.job.threshold,
                    self.job.min_area,
                    self.job.frame_skip,
                )
                all_results.extend(results)
                total_frames += frames

                self.job.total_frames_processed = total_frames
                self.metrics.frames_decoded = total_frames
                self.metrics.segments_processed += 1

                if results:
                    all_results.sort(key=lambda x: x.timestamp)
                    deduped = self._deduplicate_results(all_results)[
                        : self.job.max_results
                    ]
                    self.job.results = {
                        "results": [r.to_dict() for r in deduped],
                        "total_frames_processed": total_frames,
                    }

                self._broadcast_status()

                if results and len(deduped) >= self.job.max_results:
                    break

            except Exception as e:
                self.metrics.segments_processed += 1
                self.metrics.segments_with_errors += 1
                self._broadcast_status()
                logger.warning("Error processing segment %s: %s", recording.path, e)

        self.job.total_frames_processed = total_frames
        self.metrics.frames_decoded = total_frames

        logger.debug(
            "Motion search job %s: sequential motion search complete, "
            "found %d raw results, decoded %d frames, %d segment errors",
            self.job.id,
            len(all_results),
            total_frames,
            self.metrics.segments_with_errors,
        )

        all_results.sort(key=lambda x: x.timestamp)
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

    def _process_recording_for_motion(
        self,
        recording_path: str,
        recording_start: float,
        recording_end: float,
        search_start: float,
        search_end: float,
        polygon_mask: np.ndarray,
        threshold: int,
        min_area: float,
        frame_skip: int,
    ) -> tuple[list[MotionSearchResult], int]:
        """Process a single recording file for motion detection.

        This method is designed to be called from a thread pool.

        Args:
            min_area: Minimum change area as a percentage of the ROI (0-100).
        """
        results: list[MotionSearchResult] = []
        frames_processed = 0

        if not os.path.exists(recording_path):
            logger.warning("Recording file not found: %s", recording_path)
            return results, frames_processed

        cap = cv2.VideoCapture(recording_path)
        if not cap.isOpened():
            logger.error("Could not open recording: %s", recording_path)
            return results, frames_processed

        try:
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            recording_duration = recording_end - recording_start

            # Calculate frame range
            start_offset = max(0, search_start - recording_start)
            end_offset = min(recording_duration, search_end - recording_start)
            start_frame = int(start_offset * fps)
            end_frame = int(end_offset * fps)
            start_frame = max(0, min(start_frame, total_frames - 1))
            end_frame = max(0, min(end_frame, total_frames))

            if start_frame >= end_frame:
                return results, frames_processed

            cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

            # Get ROI bounding box
            roi_bbox = cv2.boundingRect(polygon_mask)
            roi_x, roi_y, roi_w, roi_h = roi_bbox

            prev_frame_gray = None
            frame_step = max(frame_skip, 1)
            frame_idx = start_frame

            while frame_idx < end_frame:
                if self._should_stop():
                    break

                ret, frame = cap.read()
                if not ret:
                    frame_idx += 1
                    continue

                if (frame_idx - start_frame) % frame_step != 0:
                    frame_idx += 1
                    continue

                frames_processed += 1

                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

                # Handle frame dimension changes
                if gray.shape != polygon_mask.shape:
                    resized_mask = cv2.resize(
                        polygon_mask, (gray.shape[1], gray.shape[0]), cv2.INTER_NEAREST
                    )
                    current_bbox = cv2.boundingRect(resized_mask)
                else:
                    resized_mask = polygon_mask
                    current_bbox = roi_bbox

                roi_x, roi_y, roi_w, roi_h = current_bbox
                cropped_gray = gray[roi_y : roi_y + roi_h, roi_x : roi_x + roi_w]
                cropped_mask = resized_mask[
                    roi_y : roi_y + roi_h, roi_x : roi_x + roi_w
                ]

                cropped_mask_area = np.count_nonzero(cropped_mask)
                if cropped_mask_area == 0:
                    frame_idx += 1
                    continue

                # Convert percentage to pixel count for this ROI
                min_area_pixels = int((min_area / 100.0) * cropped_mask_area)

                masked_gray = cv2.bitwise_and(
                    cropped_gray, cropped_gray, mask=cropped_mask
                )

                if prev_frame_gray is not None:
                    diff = cv2.absdiff(prev_frame_gray, masked_gray)
                    diff_blurred = cv2.GaussianBlur(diff, (3, 3), 0)
                    _, thresh = cv2.threshold(
                        diff_blurred, threshold, 255, cv2.THRESH_BINARY
                    )
                    thresh_dilated = cv2.dilate(thresh, None, iterations=1)
                    thresh_masked = cv2.bitwise_and(
                        thresh_dilated, thresh_dilated, mask=cropped_mask
                    )

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
                            frame_time_offset = (frame_idx - start_frame) / fps
                            timestamp = (
                                recording_start + start_offset + frame_time_offset
                            )
                            change_percentage = (
                                total_change_area / cropped_mask_area
                            ) * 100
                            results.append(
                                MotionSearchResult(
                                    timestamp=timestamp,
                                    change_percentage=round(change_percentage, 2),
                                )
                            )

                prev_frame_gray = masked_gray
                frame_idx += 1

        finally:
            cap.release()

        logger.debug(
            "Motion search segment complete: %s, %d frames processed, %d results found",
            recording_path,
            frames_processed,
            len(results),
        )
        return results, frames_processed


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
    frame_skip: int = 5,
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
        frame_skip=frame_skip,
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
        "frame_skip=%d, parallel=%s, max_results=%d, polygon_points=%d vertices",
        job.id,
        camera_name,
        start_time,
        end_time,
        threshold,
        min_area,
        frame_skip,
        parallel,
        max_results,
        len(polygon_points),
    )
    return job.id


def get_motion_search_job(job_id: str) -> Optional[MotionSearchJob]:
    """Get a motion search job by ID."""
    with _jobs_lock:
        job_entry = _motion_search_jobs.get(job_id)
        if job_entry:
            return job_entry[0]
    # Check completed jobs via manager
    return get_job_by_id("motion_search", job_id)


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

    requestor: Optional[InterProcessRequestor] = None
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
