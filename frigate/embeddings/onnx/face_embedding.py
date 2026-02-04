"""Facenet Embeddings."""

import logging
import os

import numpy as np

from frigate.const import MODEL_CACHE_DIR
from frigate.detectors.detection_runners import get_optimized_runner
from frigate.embeddings.types import EnrichmentModelTypeEnum
from frigate.log import suppress_stderr_during
from frigate.util.downloader import ModelDownloader

from ...config import FaceRecognitionConfig
from .base_embedding import BaseEmbedding

try:
    from tflite_runtime.interpreter import Interpreter
except ModuleNotFoundError:
    from ai_edge_litert.interpreter import Interpreter

logger = logging.getLogger(__name__)

ARCFACE_INPUT_SIZE = 112
FACENET_INPUT_SIZE = 160


class FaceNetEmbedding(BaseEmbedding):
    def __init__(self):
        GITHUB_ENDPOINT = os.environ.get("GITHUB_ENDPOINT", "https://github.com")
        super().__init__(
            model_name="facedet",
            model_file="facenet.tflite",
            download_urls={
                "facenet.tflite": f"{GITHUB_ENDPOINT}/NickM-27/facenet-onnx/releases/download/v1.0/facenet.tflite",
            },
        )
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

            # Suppress TFLite delegate creation messages that bypass Python logging
            with suppress_stderr_during("tflite_interpreter_init"):
                self.runner = Interpreter(
                    model_path=os.path.join(MODEL_CACHE_DIR, "facedet/facenet.tflite"),
                    num_threads=2,
                )
                self.runner.allocate_tensors()
            self.tensor_input_details = self.runner.get_input_details()
            self.tensor_output_details = self.runner.get_output_details()

    def _preprocess_inputs(self, raw_inputs):
        pil = self._process_image(raw_inputs[0])

        # handle images larger than input size
        width, height = pil.size
        if width != FACENET_INPUT_SIZE or height != FACENET_INPUT_SIZE:
            if width > height:
                new_height = int(((height / width) * FACENET_INPUT_SIZE) // 4 * 4)
                pil = pil.resize((FACENET_INPUT_SIZE, new_height))
            else:
                new_width = int(((width / height) * FACENET_INPUT_SIZE) // 4 * 4)
                pil = pil.resize((new_width, FACENET_INPUT_SIZE))

        og = np.array(pil).astype(np.float32)

        # Image must be FACE_EMBEDDING_SIZExFACE_EMBEDDING_SIZE
        og_h, og_w, channels = og.shape
        frame = np.zeros(
            (FACENET_INPUT_SIZE, FACENET_INPUT_SIZE, channels), dtype=np.float32
        )

        # compute center offset
        x_center = (FACENET_INPUT_SIZE - og_w) // 2
        y_center = (FACENET_INPUT_SIZE - og_h) // 2

        # copy img image into center of result image
        frame[y_center : y_center + og_h, x_center : x_center + og_w] = og

        # run facenet normalization
        frame = (frame / 127.5) - 1.0

        frame = np.expand_dims(frame, axis=0)
        return frame

    def __call__(self, inputs):
        self._load_model_and_utils()
        processed = self._preprocess_inputs(inputs)
        self.runner.set_tensor(self.tensor_input_details[0]["index"], processed)
        self.runner.invoke()
        return self.runner.get_tensor(self.tensor_output_details[0]["index"])


class ArcfaceEmbedding(BaseEmbedding):
    def __init__(self, config: FaceRecognitionConfig):
        GITHUB_ENDPOINT = os.environ.get("GITHUB_ENDPOINT", "https://github.com")
        super().__init__(
            model_name="facedet",
            model_file="arcface.onnx",
            download_urls={
                "arcface.onnx": f"{GITHUB_ENDPOINT}/NickM-27/facenet-onnx/releases/download/v1.0/arcface.onnx",
            },
        )
        self.config = config
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

            self.runner = get_optimized_runner(
                os.path.join(self.download_path, self.model_file),
                device=self.config.device or "GPU",
                model_type=EnrichmentModelTypeEnum.arcface.value,
            )

    def _preprocess_inputs(self, raw_inputs):
        pil = self._process_image(raw_inputs[0])

        # handle images larger than input size
        width, height = pil.size
        if width != ARCFACE_INPUT_SIZE or height != ARCFACE_INPUT_SIZE:
            if width > height:
                new_height = int(((height / width) * ARCFACE_INPUT_SIZE) // 4 * 4)
                pil = pil.resize((ARCFACE_INPUT_SIZE, new_height))
            else:
                new_width = int(((width / height) * ARCFACE_INPUT_SIZE) // 4 * 4)
                pil = pil.resize((new_width, ARCFACE_INPUT_SIZE))

        og = np.array(pil).astype(np.float32)

        # Image must be FACE_EMBEDDING_SIZExFACE_EMBEDDING_SIZE
        og_h, og_w, channels = og.shape
        frame = np.zeros(
            (ARCFACE_INPUT_SIZE, ARCFACE_INPUT_SIZE, channels), dtype=np.float32
        )

        # compute center offset
        x_center = (ARCFACE_INPUT_SIZE - og_w) // 2
        y_center = (ARCFACE_INPUT_SIZE - og_h) // 2

        # copy img image into center of result image
        frame[y_center : y_center + og_h, x_center : x_center + og_w] = og

        # run arcface normalization
        frame = (frame / 127.5) - 1.0

        frame = np.transpose(frame, (2, 0, 1))
        frame = np.expand_dims(frame, axis=0)
        return [{"data": frame}]
