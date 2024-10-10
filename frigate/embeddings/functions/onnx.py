import logging
import os
import warnings
from io import BytesIO
from typing import Callable, Dict, List, Optional, Union

import numpy as np
import onnxruntime as ort
import requests
from PIL import Image

# importing this without pytorch or others causes a warning
# https://github.com/huggingface/transformers/issues/27214
# suppressed by setting env TRANSFORMERS_NO_ADVISORY_WARNINGS=1
from transformers import AutoFeatureExtractor, AutoTokenizer
from transformers.utils.logging import disable_progress_bar

from frigate.comms.inter_process import InterProcessRequestor
from frigate.const import MODEL_CACHE_DIR, UPDATE_MODEL_STATE
from frigate.types import ModelStatusTypesEnum
from frigate.util.downloader import ModelDownloader
from frigate.util.model import get_ort_providers

warnings.filterwarnings(
    "ignore",
    category=FutureWarning,
    message="The class CLIPFeatureExtractor is deprecated",
)

# disables the progress bar for downloading tokenizers and feature extractors
disable_progress_bar()
logger = logging.getLogger(__name__)


class GenericONNXEmbedding:
    """Generic embedding function for ONNX models (text and vision)."""

    def __init__(
        self,
        model_name: str,
        model_file: str,
        download_urls: Dict[str, str],
        embedding_function: Callable[[List[np.ndarray]], np.ndarray],
        model_type: str,
        requestor: InterProcessRequestor,
        tokenizer_file: Optional[str] = None,
        device: str = "AUTO",
    ):
        self.model_name = model_name
        self.model_file = model_file
        self.tokenizer_file = tokenizer_file
        self.requestor = requestor
        self.download_urls = download_urls
        self.embedding_function = embedding_function
        self.model_type = model_type  # 'text' or 'vision'
        self.providers, self.provider_options = get_ort_providers(
            force_cpu=device == "CPU", requires_fp16=True, openvino_device=device
        )

        self.download_path = os.path.join(MODEL_CACHE_DIR, self.model_name)
        self.tokenizer = None
        self.feature_extractor = None
        self.session = None
        files_names = list(self.download_urls.keys()) + (
            [self.tokenizer_file] if self.tokenizer_file else []
        )

        if not all(
            os.path.exists(os.path.join(self.download_path, n)) for n in files_names
        ):
            logger.debug(f"starting model download for {self.model_name}")
            self.downloader = ModelDownloader(
                model_name=self.model_name,
                download_path=self.download_path,
                file_names=files_names,
                requestor=self.requestor,
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
            self._load_model_and_tokenizer()
            logger.debug(f"models are already downloaded for {self.model_name}")

    def _download_model(self, path: str):
        try:
            file_name = os.path.basename(path)
            if file_name in self.download_urls:
                ModelDownloader.download_from_url(self.download_urls[file_name], path)
            elif file_name == self.tokenizer_file and self.model_type == "text":
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

    def _load_model_and_tokenizer(self):
        if self.session is None:
            if self.downloader:
                self.downloader.wait_for_download()
            if self.model_type == "text":
                self.tokenizer = self._load_tokenizer()
            else:
                self.feature_extractor = self._load_feature_extractor()
            self.session = self._load_model(
                os.path.join(self.download_path, self.model_file)
            )

    def _load_tokenizer(self):
        tokenizer_path = os.path.join(f"{MODEL_CACHE_DIR}/{self.model_name}/tokenizer")
        return AutoTokenizer.from_pretrained(
            self.model_name,
            cache_dir=tokenizer_path,
            trust_remote_code=True,
            clean_up_tokenization_spaces=True,
        )

    def _load_feature_extractor(self):
        return AutoFeatureExtractor.from_pretrained(
            f"{MODEL_CACHE_DIR}/{self.model_name}",
        )

    def _load_model(self, path: str) -> Optional[ort.InferenceSession]:
        if os.path.exists(path):
            return ort.InferenceSession(
                path, providers=self.providers, provider_options=self.provider_options
            )
        else:
            return None

    def _process_image(self, image):
        if isinstance(image, str):
            if image.startswith("http"):
                response = requests.get(image)
                image = Image.open(BytesIO(response.content)).convert("RGB")

        return image

    def __call__(
        self, inputs: Union[List[str], List[Image.Image], List[str]]
    ) -> List[np.ndarray]:
        self._load_model_and_tokenizer()

        if self.session is None or (
            self.tokenizer is None and self.feature_extractor is None
        ):
            logger.error(
                f"{self.model_name} model or tokenizer/feature extractor is not loaded."
            )
            return []

        if self.model_type == "text":
            processed_inputs = self.tokenizer(
                inputs, padding=True, truncation=True, return_tensors="np"
            )
        else:
            processed_images = [self._process_image(img) for img in inputs]
            processed_inputs = self.feature_extractor(
                images=processed_images, return_tensors="np"
            )

        input_names = [input.name for input in self.session.get_inputs()]
        onnx_inputs = {
            name: processed_inputs[name]
            for name in input_names
            if name in processed_inputs
        }

        outputs = self.session.run(None, onnx_inputs)
        embeddings = self.embedding_function(outputs)

        return [embedding for embedding in embeddings]
