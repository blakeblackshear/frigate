import logging
import os
import warnings

import cv2
import numpy as np

from frigate.comms.inter_process import InterProcessRequestor
from frigate.const import MODEL_CACHE_DIR
from frigate.types import ModelStatusTypesEnum
from frigate.util.downloader import ModelDownloader

from .base_embedding import BaseEmbedding
from .runner import ONNXModelRunner

warnings.filterwarnings(
    "ignore",
    category=FutureWarning,
    message="The class CLIPFeatureExtractor is deprecated",
)

logger = logging.getLogger(__name__)

LPR_EMBEDDING_SIZE = 256


class PaddleOCRDetection(BaseEmbedding):
    def __init__(
        self,
        model_size: str,
        requestor: InterProcessRequestor,
        device: str = "AUTO",
    ):
        super().__init__(
            model_name="paddleocr-onnx",
            model_file="detection.onnx",
            download_urls={
                "detection.onnx": "https://github.com/hawkeye217/paddleocr-onnx/raw/refs/heads/master/models/detection.onnx"
            },
        )
        self.requestor = requestor
        self.model_size = model_size
        self.device = device
        self.download_path = os.path.join(MODEL_CACHE_DIR, self.model_name)
        self.runner: ONNXModelRunner | None = None
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
            ModelDownloader.mark_files_state(
                self.requestor,
                self.model_name,
                files_names,
                ModelStatusTypesEnum.downloaded,
            )
            self._load_model_and_utils()
            logger.debug(f"models are already downloaded for {self.model_name}")

    def _load_model_and_utils(self):
        if self.runner is None:
            if self.downloader:
                self.downloader.wait_for_download()

            self.runner = ONNXModelRunner(
                os.path.join(self.download_path, self.model_file),
                self.device,
                self.model_size,
            )

    def _preprocess_inputs(self, raw_inputs):
        preprocessed = []
        for x in raw_inputs:
            preprocessed.append(x)
        return [{"x": preprocessed[0]}]


class PaddleOCRClassification(BaseEmbedding):
    def __init__(
        self,
        model_size: str,
        requestor: InterProcessRequestor,
        device: str = "AUTO",
    ):
        super().__init__(
            model_name="paddleocr-onnx",
            model_file="classification.onnx",
            download_urls={
                "classification.onnx": "https://github.com/hawkeye217/paddleocr-onnx/raw/refs/heads/master/models/classification.onnx"
            },
        )
        self.requestor = requestor
        self.model_size = model_size
        self.device = device
        self.download_path = os.path.join(MODEL_CACHE_DIR, self.model_name)
        self.runner: ONNXModelRunner | None = None
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
            ModelDownloader.mark_files_state(
                self.requestor,
                self.model_name,
                files_names,
                ModelStatusTypesEnum.downloaded,
            )
            self._load_model_and_utils()
            logger.debug(f"models are already downloaded for {self.model_name}")

    def _load_model_and_utils(self):
        if self.runner is None:
            if self.downloader:
                self.downloader.wait_for_download()

            self.runner = ONNXModelRunner(
                os.path.join(self.download_path, self.model_file),
                self.device,
                self.model_size,
            )

    def _preprocess_inputs(self, raw_inputs):
        processed = []
        for img in raw_inputs:
            processed.append({"x": img})
        return processed


class PaddleOCRRecognition(BaseEmbedding):
    def __init__(
        self,
        model_size: str,
        requestor: InterProcessRequestor,
        device: str = "AUTO",
    ):
        super().__init__(
            model_name="paddleocr-onnx",
            model_file="recognition.onnx",
            download_urls={
                "recognition.onnx": "https://github.com/hawkeye217/paddleocr-onnx/raw/refs/heads/master/models/recognition.onnx"
            },
        )
        self.requestor = requestor
        self.model_size = model_size
        self.device = device
        self.download_path = os.path.join(MODEL_CACHE_DIR, self.model_name)
        self.runner: ONNXModelRunner | None = None
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
            ModelDownloader.mark_files_state(
                self.requestor,
                self.model_name,
                files_names,
                ModelStatusTypesEnum.downloaded,
            )
            self._load_model_and_utils()
            logger.debug(f"models are already downloaded for {self.model_name}")

    def _load_model_and_utils(self):
        if self.runner is None:
            if self.downloader:
                self.downloader.wait_for_download()

            self.runner = ONNXModelRunner(
                os.path.join(self.download_path, self.model_file),
                self.device,
                self.model_size,
            )

    def _preprocess_inputs(self, raw_inputs):
        processed = []
        for img in raw_inputs:
            processed.append({"x": img})
        return processed


class LicensePlateDetector(BaseEmbedding):
    def __init__(
        self,
        model_size: str,
        requestor: InterProcessRequestor,
        device: str = "AUTO",
    ):
        super().__init__(
            model_name="yolov9_license_plate",
            model_file="yolov9-256-license-plates.onnx",
            download_urls={
                "yolov9-256-license-plates.onnx": "https://github.com/hawkeye217/yolov9-license-plates/raw/refs/heads/master/models/yolov9-256-license-plates.onnx"
            },
        )

        self.requestor = requestor
        self.model_size = model_size
        self.device = device
        self.download_path = os.path.join(MODEL_CACHE_DIR, self.model_name)
        self.runner: ONNXModelRunner | None = None
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
            ModelDownloader.mark_files_state(
                self.requestor,
                self.model_name,
                files_names,
                ModelStatusTypesEnum.downloaded,
            )
            self._load_model_and_utils()
            logger.debug(f"models are already downloaded for {self.model_name}")

    def _load_model_and_utils(self):
        if self.runner is None:
            if self.downloader:
                self.downloader.wait_for_download()

            self.runner = ONNXModelRunner(
                os.path.join(self.download_path, self.model_file),
                self.device,
                self.model_size,
            )

    def _preprocess_inputs(self, raw_inputs):
        if isinstance(raw_inputs, list):
            raise ValueError("License plate embedding does not support batch inputs.")
        # Get image as numpy array
        img = self._process_image(raw_inputs)
        height, width, channels = img.shape

        # Resize maintaining aspect ratio
        if width > height:
            new_height = int(((height / width) * LPR_EMBEDDING_SIZE) // 4 * 4)
            img = cv2.resize(img, (LPR_EMBEDDING_SIZE, new_height))
        else:
            new_width = int(((width / height) * LPR_EMBEDDING_SIZE) // 4 * 4)
            img = cv2.resize(img, (new_width, LPR_EMBEDDING_SIZE))

        # Get new dimensions after resize
        og_h, og_w, channels = img.shape

        # Create black square frame
        frame = np.full(
            (LPR_EMBEDDING_SIZE, LPR_EMBEDDING_SIZE, channels),
            (0, 0, 0),
            dtype=np.float32,
        )

        # Center the resized image in the square frame
        x_center = (LPR_EMBEDDING_SIZE - og_w) // 2
        y_center = (LPR_EMBEDDING_SIZE - og_h) // 2
        frame[y_center : y_center + og_h, x_center : x_center + og_w] = img

        # Normalize to 0-1
        frame = frame / 255.0

        # Convert from HWC to CHW format and add batch dimension
        frame = np.transpose(frame, (2, 0, 1))
        frame = np.expand_dims(frame, axis=0)
        return [{"images": frame}]
