import logging
import os
import warnings

# importing this without pytorch or others causes a warning
# https://github.com/huggingface/transformers/issues/27214
# suppressed by setting env TRANSFORMERS_NO_ADVISORY_WARNINGS=1
from transformers import AutoFeatureExtractor
from transformers.utils.logging import disable_progress_bar

from frigate.comms.inter_process import InterProcessRequestor
from frigate.const import MODEL_CACHE_DIR
from frigate.types import ModelStatusTypesEnum
from frigate.util.downloader import ModelDownloader

from ..onnx.runner import ONNXModelRunner
from .base_embedding import BaseEmbedding

warnings.filterwarnings(
    "ignore",
    category=FutureWarning,
    message="The class CLIPFeatureExtractor is deprecated",
)

# disables the progress bar for downloading tokenizers and feature extractors
disable_progress_bar()
logger = logging.getLogger(__name__)


class ImageEmbedding(BaseEmbedding):
    def __init__(
        self,
        model_size: str,
        requestor: InterProcessRequestor,
        device: str = "AUTO",
    ):
        super().__init__(
            "jinaai/jina-clip-v1",
            (
                "vision_model_fp16.onnx"
                if model_size == "large"
                else "vision_model_quantized.onnx"
            ),
            {
                self.model_file: f"https://huggingface.co/jinaai/jina-clip-v1/resolve/main/onnx/{self.model_file}",
                "preprocessor_config.json": "https://huggingface.co/jinaai/jina-clip-v1/resolve/main/preprocessor_config.json",
            },
        )
        self.requestor = requestor
        self.model_size = model_size
        self.device = device
        self.download_path = os.path.join(MODEL_CACHE_DIR, self.model_name)
        self.feature_extractor = None
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

            self.feature_extractor = AutoFeatureExtractor.from_pretrained(
                f"{MODEL_CACHE_DIR}/{self.model_name}",
            )

            self.runner = ONNXModelRunner(
                os.path.join(self.download_path, self.model_file),
                self.device,
                self.model_size,
            )

    def _preprocess_inputs(self, raw_inputs):
        processed_images = [self._process_image(img) for img in raw_inputs]
        return [
            self.feature_extractor(images=image, return_tensors="np")
            for image in processed_images
        ]
