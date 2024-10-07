import logging
import os
from typing import List

import numpy as np
import onnxruntime as ort

# importing this without pytorch or others causes a warning
# https://github.com/huggingface/transformers/issues/27214
# suppressed by setting env TRANSFORMERS_NO_ADVISORY_WARNINGS=1
from transformers import AutoTokenizer

from frigate.const import MODEL_CACHE_DIR, UPDATE_MODEL_STATE
from frigate.types import ModelStatusTypesEnum
from frigate.util.downloader import ModelDownloader

logger = logging.getLogger(__name__)


class MiniLMEmbedding:
    """Embedding function for ONNX MiniLM-L6 model."""

    DOWNLOAD_PATH = f"{MODEL_CACHE_DIR}/all-MiniLM-L6-v2"
    MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
    IMAGE_MODEL_FILE = "model.onnx"
    TOKENIZER_FILE = "tokenizer"

    def __init__(self, preferred_providers=["CPUExecutionProvider"]):
        self.preferred_providers = preferred_providers
        self.tokenizer = None
        self.session = None

        self.downloader = ModelDownloader(
            model_name=self.MODEL_NAME,
            download_path=self.DOWNLOAD_PATH,
            file_names=[self.IMAGE_MODEL_FILE, self.TOKENIZER_FILE],
            download_func=self._download_model,
        )
        self.downloader.ensure_model_files()

    def _download_model(self, path: str):
        try:
            if os.path.basename(path) == self.IMAGE_MODEL_FILE:
                s3_url = f"https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/onnx/{self.IMAGE_MODEL_FILE}"
                ModelDownloader.download_from_url(s3_url, path)
            elif os.path.basename(path) == self.TOKENIZER_FILE:
                logger.info("Downloading MiniLM tokenizer")
                tokenizer = AutoTokenizer.from_pretrained(
                    self.MODEL_NAME, clean_up_tokenization_spaces=True
                )
                tokenizer.save_pretrained(path)

            self.downloader.requestor.send_data(
                UPDATE_MODEL_STATE,
                {
                    "model": f"{self.MODEL_NAME}-{os.path.basename(path)}",
                    "state": ModelStatusTypesEnum.downloaded,
                },
            )
        except Exception:
            self.downloader.requestor.send_data(
                UPDATE_MODEL_STATE,
                {
                    "model": f"{self.MODEL_NAME}-{os.path.basename(path)}",
                    "state": ModelStatusTypesEnum.error,
                },
            )

    def _load_model_and_tokenizer(self):
        if self.tokenizer is None or self.session is None:
            self.downloader.wait_for_download()
            self.tokenizer = self._load_tokenizer()
            self.session = self._load_model(
                os.path.join(self.DOWNLOAD_PATH, self.IMAGE_MODEL_FILE),
                self.preferred_providers,
            )

    def _load_tokenizer(self):
        tokenizer_path = os.path.join(self.DOWNLOAD_PATH, self.TOKENIZER_FILE)
        return AutoTokenizer.from_pretrained(
            tokenizer_path, clean_up_tokenization_spaces=True
        )

    def _load_model(self, path: str, providers: List[str]):
        if os.path.exists(path):
            return ort.InferenceSession(path, providers=providers)
        else:
            logger.warning(f"MiniLM model file {path} not found.")
            return None

    def __call__(self, texts: List[str]) -> List[np.ndarray]:
        self._load_model_and_tokenizer()

        if self.session is None or self.tokenizer is None:
            logger.error("MiniLM model or tokenizer is not loaded.")
            return []

        inputs = self.tokenizer(
            texts, padding=True, truncation=True, return_tensors="np"
        )
        input_names = [input.name for input in self.session.get_inputs()]
        onnx_inputs = {name: inputs[name] for name in input_names if name in inputs}

        outputs = self.session.run(None, onnx_inputs)
        embeddings = outputs[0].mean(axis=1)

        return [embedding for embedding in embeddings]
