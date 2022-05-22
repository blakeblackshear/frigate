from typing import Optional, TypedDict
from multiprocessing.queues import Queue
from multiprocessing.sharedctypes import Synchronized
from multiprocessing.context import Process

from frigate.edgetpu import EdgeTPUProcess


class CameraMetricsTypes(TypedDict):
    camera_fps: Synchronized
    capture_process: Optional[Process]
    detection_enabled: Synchronized
    detection_fps: Synchronized
    detection_frame: Synchronized
    ffmpeg_pid: Synchronized
    frame_queue: Queue
    motion_enabled: Synchronized
    improve_contrast_enabled: Synchronized
    motion_threshold: Synchronized
    motion_contour_area: Synchronized
    process: Optional[Process]
    process_fps: Synchronized
    read_start: Synchronized
    skipped_fps: Synchronized
    birdseye_enabled: Synchronized
    birdseye_mode: Synchronized


class StatsTrackingTypes(TypedDict):
    camera_metrics: dict[str, CameraMetricsTypes]
    detectors: dict[str, EdgeTPUProcess]
    started: int
    latest_frigate_version: str
