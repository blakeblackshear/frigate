from multiprocessing.context import Process
from multiprocessing.sharedctypes import Synchronized
from typing import Optional, TypedDict

from faster_fifo import Queue

from frigate.object_detection import ObjectDetectProcess


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


class RecordMetricsTypes(TypedDict):
    record_enabled: Synchronized


class StatsTrackingTypes(TypedDict):
    camera_metrics: dict[str, CameraMetricsTypes]
    detectors: dict[str, ObjectDetectProcess]
    started: int
    latest_frigate_version: str
    last_updated: int
    processes: dict[str, int]
