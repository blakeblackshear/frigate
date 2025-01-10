"""Embeddings types."""

import multiprocessing as mp
from multiprocessing.sharedctypes import Synchronized


class PostProcessingMetrics:
    image_embeddings_fps: Synchronized
    text_embeddings_sps: Synchronized
    face_rec_fps: Synchronized
    alpr_pps: Synchronized

    def __init__(self):
        self.image_embeddings_fps = mp.Value("d", 0.01)
        self.text_embeddings_sps = mp.Value("d", 0.01)
        self.face_rec_fps = mp.Value("d", 0.01)
        self.alpr_pps = mp.Value("d", 0.01)
