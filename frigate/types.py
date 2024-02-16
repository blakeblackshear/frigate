from multiprocessing import Queue
from multiprocessing.context import Process
from multiprocessing.sharedctypes import Synchronized
from multiprocessing.synchronize import Event
from typing import Optional, TypedDict

from frigate.object_detection import ObjectDetectProcess


class CameraMetricsTypes(TypedDict):
    camera_fps: Synchronized
    capture_process: Optional[Process]
    detection_fps: Synchronized
    detection_frame: Synchronized
    ffmpeg_pid: Synchronized
    frame_queue: Queue
    process: Optional[Process]
    process_fps: Synchronized
    read_start: Synchronized
    skipped_fps: Synchronized
    audio_rms: Synchronized
    audio_dBFS: Synchronized


class PTZMetricsTypes(TypedDict):
    ptz_autotracker_enabled: Synchronized
    ptz_tracking_active: Event
    ptz_motor_stopped: Event
    ptz_reset: Event
    ptz_start_time: Synchronized
    ptz_stop_time: Synchronized
    ptz_frame_time: Synchronized
    ptz_zoom_level: Synchronized
    ptz_max_zoom: Synchronized
    ptz_min_zoom: Synchronized


class StatsTrackingTypes(TypedDict):
    camera_metrics: dict[str, CameraMetricsTypes]
    detectors: dict[str, ObjectDetectProcess]
    started: int
    latest_frigate_version: str
    last_updated: int
    processes: dict[str, int]
