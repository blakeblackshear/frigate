from enum import Enum
from typing import TypedDict

from frigate.camera import CameraMetrics
from frigate.data_processing.types import DataProcessorMetrics
from frigate.object_detection.base import ObjectDetectProcess


class StatsTrackingTypes(TypedDict):
    camera_metrics: dict[str, CameraMetrics]
    embeddings_metrics: DataProcessorMetrics | None
    detectors: dict[str, ObjectDetectProcess]
    started: int
    latest_frigate_version: str
    last_updated: int
    processes: dict[str, int]


class ModelStatusTypesEnum(str, Enum):
    not_downloaded = "not_downloaded"
    downloading = "downloading"
    downloaded = "downloaded"
    error = "error"
    training = "training"
    complete = "complete"
    failed = "failed"


class JobStatusTypesEnum(str, Enum):
    pending = "pending"
    queued = "queued"
    running = "running"
    success = "success"
    failed = "failed"
    cancelled = "cancelled"


class TrackedObjectUpdateTypesEnum(str, Enum):
    description = "description"
    face = "face"
    lpr = "lpr"
    classification = "classification"
