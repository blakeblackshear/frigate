"""Embeddings types."""

import multiprocessing as mp
from enum import Enum
from multiprocessing.sharedctypes import Synchronized


class DataProcessorMetrics:
    image_embeddings_fps: Synchronized
    text_embeddings_sps: Synchronized
    face_rec_fps: Synchronized
    alpr_pps: Synchronized

    def __init__(self):
        self.image_embeddings_fps = mp.Value("d", 0.01)
        self.text_embeddings_sps = mp.Value("d", 0.01)
        self.face_rec_fps = mp.Value("d", 0.01)
        self.alpr_pps = mp.Value("d", 0.01)


class PostProcessDataEnum(str, Enum):
    recording = "recording"
    review = "review"
    tracked_object = "tracked_object"
