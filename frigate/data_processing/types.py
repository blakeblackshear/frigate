"""Embeddings types."""

import multiprocessing as mp
from enum import Enum
from multiprocessing.sharedctypes import Synchronized


class DataProcessorMetrics:
    image_embeddings_speed: Synchronized
    text_embeddings_speed: Synchronized
    face_rec_speed: Synchronized
    alpr_speed: Synchronized
    yolov9_lpr_speed: Synchronized

    def __init__(self):
        self.image_embeddings_speed = mp.Value("d", 0.01)
        self.text_embeddings_speed = mp.Value("d", 0.01)
        self.face_rec_speed = mp.Value("d", 0.01)
        self.alpr_speed = mp.Value("d", 0.01)
        self.yolov9_lpr_speed = mp.Value("d", 0.01)


class DataProcessorModelRunner:
    def __init__(self, requestor, device: str = "CPU", model_size: str = "large"):
        self.requestor = requestor
        self.device = device
        self.model_size = model_size


class PostProcessDataEnum(str, Enum):
    recording = "recording"
    review = "review"
    tracked_object = "tracked_object"
