"""Facenet Embeddings."""

import logging
import os

import numpy as np

from frigate.const import MODEL_CACHE_DIR
from frigate.util.downloader import ModelDownloader

from .base_embedding import BaseEmbedding
from .runner import ONNXModelRunner

logger = logging.getLogger(__name__)

FACE_EMBEDDING_SIZE = 112


class ArcfaceEmbedding(BaseEmbedding):
    def __init__(
        self,
        device: str = "AUTO",
    ):
        super().__init__(
            model_name="facedet",
            model_file="arcface.onnx",
            download_urls={
                "arcface.onnx": "https://github.com/NickM-27/facenet-onnx/releases/download/v1.0/arcface.onnx",
            },
        )
        self.device = device
        self.download_path = os.path.join(MODEL_CACHE_DIR, self.model_name)
        self.tokenizer = None
        self.feature_extractor = None
        self.runner = None
        files_names = list(self.download_urls.keys())

        if not all(
            os.path.exists(os.path.join(self.download_path, n)) for n in files_names
        ):
            logger.debug(f"starting model download for {self.model_name}")
            self.downloader = ModelDownloader(
                model_name=self.model_name,
                download_path=self.download_path,
                file_names=files_names,
                download_func=self._download_model,
            )
            self.downloader.ensure_model_files()
        else:
            self.downloader = None
            self._load_model_and_utils()
            logger.debug(f"models are already downloaded for {self.model_name}")

    def _load_model_and_utils(self):
        if self.runner is None:
            if self.downloader:
                self.downloader.wait_for_download()

            self.runner = ONNXModelRunner(
                os.path.join(self.download_path, self.model_file),
                self.device,
            )

    def _preprocess_inputs(self, raw_inputs):
        pil = self._process_image(raw_inputs[0])

        # handle images larger than input size
        width, height = pil.size
        if width != FACE_EMBEDDING_SIZE or height != FACE_EMBEDDING_SIZE:
            if width > height:
                new_height = int(((height / width) * FACE_EMBEDDING_SIZE) // 4 * 4)
                pil = pil.resize((FACE_EMBEDDING_SIZE, new_height))
            else:
                new_width = int(((width / height) * FACE_EMBEDDING_SIZE) // 4 * 4)
                pil = pil.resize((new_width, FACE_EMBEDDING_SIZE))

        og = np.array(pil).astype(np.float32)

        # Image must be FACE_EMBEDDING_SIZExFACE_EMBEDDING_SIZE
        og_h, og_w, channels = og.shape
        frame = np.zeros(
            (FACE_EMBEDDING_SIZE, FACE_EMBEDDING_SIZE, channels), dtype=np.float32
        )

        # compute center offset
        x_center = (FACE_EMBEDDING_SIZE - og_w) // 2
        y_center = (FACE_EMBEDDING_SIZE - og_h) // 2

        # copy img image into center of result image
        frame[y_center : y_center + og_h, x_center : x_center + og_w] = og

        # run arcface normalization
        frame = (frame / 127.5) - 1.0

        frame = np.transpose(frame, (2, 0, 1))
        frame = np.expand_dims(frame, axis=0)
        return [{"data": frame}]
