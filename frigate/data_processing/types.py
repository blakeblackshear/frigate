"""Embeddings types."""

from enum import Enum
from multiprocessing.managers import SyncManager
from multiprocessing.sharedctypes import Synchronized

import sherpa_onnx

from frigate.data_processing.real_time.whisper_online import FasterWhisperASR


class DataProcessorMetrics:
    image_embeddings_speed: Synchronized
    image_embeddings_eps: Synchronized
    text_embeddings_speed: Synchronized
    text_embeddings_eps: Synchronized
    face_rec_speed: Synchronized
    face_rec_fps: Synchronized
    alpr_speed: Synchronized
    alpr_pps: Synchronized
    yolov9_lpr_speed: Synchronized
    yolov9_lpr_pps: Synchronized
    review_desc_speed: Synchronized
    review_desc_dps: Synchronized
    object_desc_speed: Synchronized
    object_desc_dps: Synchronized
    classification_speeds: dict[str, Synchronized]
    classification_cps: dict[str, Synchronized]

    def __init__(self, manager: SyncManager, custom_classification_models: list[str]):
        self.image_embeddings_speed = manager.Value("d", 0.0)
        self.image_embeddings_eps = manager.Value("d", 0.0)
        self.text_embeddings_speed = manager.Value("d", 0.0)
        self.text_embeddings_eps = manager.Value("d", 0.0)
        self.face_rec_speed = manager.Value("d", 0.0)
        self.face_rec_fps = manager.Value("d", 0.0)
        self.alpr_speed = manager.Value("d", 0.0)
        self.alpr_pps = manager.Value("d", 0.0)
        self.yolov9_lpr_speed = manager.Value("d", 0.0)
        self.yolov9_lpr_pps = manager.Value("d", 0.0)
        self.review_desc_speed = manager.Value("d", 0.0)
        self.review_desc_dps = manager.Value("d", 0.0)
        self.object_desc_speed = manager.Value("d", 0.0)
        self.object_desc_dps = manager.Value("d", 0.0)
        self.classification_speeds = manager.dict()
        self.classification_cps = manager.dict()

        if custom_classification_models:
            for key in custom_classification_models:
                self.classification_speeds[key] = manager.Value("d", 0.0)
                self.classification_cps[key] = manager.Value("d", 0.0)


class DataProcessorModelRunner:
    def __init__(self, requestor, device: str = "CPU", model_size: str = "large"):
        self.requestor = requestor
        self.device = device
        self.model_size = model_size


class PostProcessDataEnum(str, Enum):
    recording = "recording"
    review = "review"
    tracked_object = "tracked_object"


AudioTranscriptionModel = FasterWhisperASR | sherpa_onnx.OnlineRecognizer | None
