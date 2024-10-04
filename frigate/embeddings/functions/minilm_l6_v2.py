"""Embedding function for ONNX MiniLM-L6 model."""

import errno
import logging
import os
from pathlib import Path
from typing import List

import numpy as np
import onnxruntime as ort
import requests
from transformers import AutoTokenizer

from frigate.const import MODEL_CACHE_DIR


class MiniLMEmbedding:
    """Embedding function for ONNX MiniLM-L6 model."""

    DOWNLOAD_PATH = f"{MODEL_CACHE_DIR}/all-MiniLM-L6-v2"
    MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
    IMAGE_MODEL_FILE = "model.onnx"
    TOKENIZER_FILE = "tokenizer"

    def __init__(self, preferred_providers=None):
        """Initialize MiniLM Embedding function."""
        self.tokenizer = self._load_tokenizer()

        model_path = os.path.join(self.DOWNLOAD_PATH, self.IMAGE_MODEL_FILE)
        if not os.path.exists(model_path):
            self._download_model()

        if preferred_providers is None:
            preferred_providers = ["CPUExecutionProvider"]

        self.session = self._load_model(model_path)

    def _load_tokenizer(self):
        """Load the tokenizer from the local path or download it if not available."""
        tokenizer_path = os.path.join(self.DOWNLOAD_PATH, self.TOKENIZER_FILE)
        if os.path.exists(tokenizer_path):
            return AutoTokenizer.from_pretrained(tokenizer_path)
        else:
            return AutoTokenizer.from_pretrained(self.MODEL_NAME)

    def _download_model(self):
        """Download the ONNX model and tokenizer from a remote source if they don't exist."""
        logging.info(f"Downloading {self.MODEL_NAME} ONNX model and tokenizer...")

        # Download the tokenizer
        tokenizer = AutoTokenizer.from_pretrained(self.MODEL_NAME)
        os.makedirs(self.DOWNLOAD_PATH, exist_ok=True)
        tokenizer.save_pretrained(os.path.join(self.DOWNLOAD_PATH, self.TOKENIZER_FILE))

        # Download the ONNX model
        s3_url = f"https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/onnx/{self.IMAGE_MODEL_FILE}"
        model_path = os.path.join(self.DOWNLOAD_PATH, self.IMAGE_MODEL_FILE)
        self._download_from_url(s3_url, model_path)

        logging.info(f"Model and tokenizer saved to {self.DOWNLOAD_PATH}")

    def _download_from_url(self, url: str, save_path: str):
        """Download a file from a URL and save it to a specified path."""
        temporary_filename = Path(save_path).with_name(
            os.path.basename(save_path) + ".part"
        )
        temporary_filename.parent.mkdir(parents=True, exist_ok=True)
        with requests.get(url, stream=True, allow_redirects=True) as r:
            # if the content type is HTML, it's not the actual model file
            if "text/html" in r.headers.get("Content-Type", ""):
                raise ValueError(
                    f"Expected an ONNX file but received HTML from the URL: {url}"
                )

            # Ensure the download is successful
            r.raise_for_status()

            # Write the model to a temporary file first
            with open(temporary_filename, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)

        temporary_filename.rename(save_path)

    def _load_model(self, path: str):
        """Load the ONNX model from a given path."""
        providers = ["CPUExecutionProvider"]
        if os.path.exists(path):
            return ort.InferenceSession(path, providers=providers)
        else:
            raise FileNotFoundError(errno.ENOENT, os.strerror(errno.ENOENT), path)

    def __call__(self, texts: List[str]) -> List[np.ndarray]:
        """Generate embeddings for the given texts."""
        inputs = self.tokenizer(
            texts, padding=True, truncation=True, return_tensors="np"
        )

        input_names = [input.name for input in self.session.get_inputs()]
        onnx_inputs = {name: inputs[name] for name in input_names if name in inputs}

        # Run inference
        outputs = self.session.run(None, onnx_inputs)

        embeddings = outputs[0].mean(axis=1)

        return [embedding for embedding in embeddings]
