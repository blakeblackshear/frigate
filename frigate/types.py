from typing import TypedDict

from frigate.camera import CameraMetrics
from frigate.object_detection import ObjectDetectProcess


class StatsTrackingTypes(TypedDict):
    camera_metrics: dict[str, CameraMetrics]
    detectors: dict[str, ObjectDetectProcess]
    started: int
    latest_frigate_version: str
    last_updated: int
    processes: dict[str, int]
