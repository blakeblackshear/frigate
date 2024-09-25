from multiprocessing.sharedctypes import Synchronized
from multiprocessing.synchronize import Event
from typing import TypedDict

from frigate.camera import CameraMetrics
from frigate.object_detection import ObjectDetectProcess


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
    camera_metrics: dict[str, CameraMetrics]
    detectors: dict[str, ObjectDetectProcess]
    started: int
    latest_frigate_version: str
    last_updated: int
    processes: dict[str, int]
