"""JinaV1 Embeddings."""

import logging
import os
import threading
import warnings

from transformers import AutoFeatureExtractor, AutoTokenizer
from transformers.utils.logging import disable_progress_bar

from frigate.comms.inter_process import InterProcessRequestor
from frigate.const import MODEL_CACHE_DIR, UPDATE_MODEL_STATE
from frigate.detectors.detection_runners import BaseModelRunner, get_optimized_runner

# importing this without pytorch or others causes a warning
# https://github.com/huggingface/transformers/issues/27214
# suppressed by setting env TRANSFORMERS_NO_ADVISORY_WARNINGS=1
from frigate.embeddings.types import EnrichmentModelTypeEnum
from frigate.types import ModelStatusTypesEnum
from frigate.util.downloader import ModelDownloader

from .base_embedding import BaseEmbedding

warnings.filterwarnings(
    "ignore",
    category=FutureWarning,
    message="The class CLIPFeatureExtractor is deprecated",
)

# disables the progress bar for downloading tokenizers and feature extractors
disable_progress_bar()
logger = logging.getLogger(__name__)


class JinaV1TextEmbedding(BaseEmbedding):
    def __init__(
        self,
        model_size: str,
        requestor: InterProcessRequestor,
        device: str = "AUTO",
    ):
        HF_ENDPOINT = os.environ.get("HF_ENDPOINT", "https://huggingface.co")
        super().__init__(
            model_name="jinaai/jina-clip-v1",
            model_file="text_model_fp16.onnx",
            download_urls={
                "text_model_fp16.onnx": f"{HF_ENDPOINT}/jinaai/jina-clip-v1/resolve/main/onnx/text_model_fp16.onnx",
            },
        )
        self.tokenizer_file = "tokenizer"
        self.requestor = requestor
        self.model_size = model_size
        self.device = device
        self.download_path = os.path.join(MODEL_CACHE_DIR, self.model_name)
        self.tokenizer = None
        self.feature_extractor = None
        self.runner = None
        self._lock = threading.Lock()
        files_names = list(self.download_urls.keys()) + [self.tokenizer_file]

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

    def _download_model(self, path: str):
        try:
            file_name = os.path.basename(path)

            if file_name in self.download_urls:
                ModelDownloader.download_from_url(self.download_urls[file_name], path)
            elif file_name == self.tokenizer_file:
                if not os.path.exists(path + "/" + self.model_name):
                    logger.info(f"Downloading {self.model_name} tokenizer")

                tokenizer = AutoTokenizer.from_pretrained(
                    self.model_name,
                    trust_remote_code=True,
                    cache_dir=f"{MODEL_CACHE_DIR}/{self.model_name}/tokenizer",
                    clean_up_tokenization_spaces=True,
                )
                tokenizer.save_pretrained(path)

            self.downloader.requestor.send_data(
                UPDATE_MODEL_STATE,
                {
                    "model": f"{self.model_name}-{file_name}",
                    "state": ModelStatusTypesEnum.downloaded,
                },
            )
        except Exception:
            self.downloader.requestor.send_data(
                UPDATE_MODEL_STATE,
                {
                    "model": f"{self.model_name}-{file_name}",
                    "state": ModelStatusTypesEnum.error,
                },
            )

    def _load_model_and_utils(self):
        if self.runner is None:
            if self.downloader:
                self.downloader.wait_for_download()

            tokenizer_path = os.path.join(
                f"{MODEL_CACHE_DIR}/{self.model_name}/tokenizer"
            )
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                cache_dir=tokenizer_path,
                trust_remote_code=True,
                clean_up_tokenization_spaces=True,
            )

            self.runner = get_optimized_runner(
                os.path.join(self.download_path, self.model_file),
                self.device,
                model_type=EnrichmentModelTypeEnum.jina_v1.value,
            )

    def _preprocess_inputs(self, raw_inputs):
        with self._lock:
            max_length = max(len(self.tokenizer.encode(text)) for text in raw_inputs)
            return [
                self.tokenizer(
                    text,
                    padding="max_length",
                    truncation=True,
                    max_length=max_length,
                    return_tensors="np",
                )
                for text in raw_inputs
            ]


class JinaV1ImageEmbedding(BaseEmbedding):
    def __init__(
        self,
        model_size: str,
        requestor: InterProcessRequestor,
        device: str = "AUTO",
    ):
        model_file = (
            "vision_model_fp16.onnx"
            if model_size == "large"
            else "vision_model_quantized.onnx"
        )
        HF_ENDPOINT = os.environ.get("HF_ENDPOINT", "https://huggingface.co")
        super().__init__(
            model_name="jinaai/jina-clip-v1",
            model_file=model_file,
            download_urls={
                model_file: f"{HF_ENDPOINT}/jinaai/jina-clip-v1/resolve/main/onnx/{model_file}",
                "preprocessor_config.json": f"{HF_ENDPOINT}/jinaai/jina-clip-v1/resolve/main/preprocessor_config.json",
            },
        )
        self.requestor = requestor
        self.model_size = model_size
        self.device = device
        self.download_path = os.path.join(MODEL_CACHE_DIR, self.model_name)
        self.feature_extractor = None
        self.runner: BaseModelRunner | None = None
        self._lock = threading.Lock()
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
            # Avoid lazy loading in worker threads: block until downloads complete
            # and load the model on the main thread during initialization.
            self._load_model_and_utils()
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

            self.runner = get_optimized_runner(
                os.path.join(self.download_path, self.model_file),
                self.device,
                model_type=EnrichmentModelTypeEnum.jina_v1.value,
            )

    def _preprocess_inputs(self, raw_inputs):
        with self._lock:
            processed_images = [self._process_image(img) for img in raw_inputs]
            return [
                self.feature_extractor(images=image, return_tensors="np")
                for image in processed_images
            ]
