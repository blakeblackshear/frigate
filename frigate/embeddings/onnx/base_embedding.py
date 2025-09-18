"""Base class for onnx embedding implementations."""

import logging
import os
from abc import ABC, abstractmethod
from io import BytesIO
from typing import Any

import numpy as np
import requests
from PIL import Image

from frigate.const import UPDATE_MODEL_STATE
from frigate.types import ModelStatusTypesEnum
from frigate.util.downloader import ModelDownloader

logger = logging.getLogger(__name__)


class BaseEmbedding(ABC):
    """Base embedding class."""

    def __init__(self, model_name: str, model_file: str, download_urls: dict[str, str]):
        self.model_name = model_name
        self.model_file = model_file
        self.download_urls = download_urls
        self.downloader: ModelDownloader = None

    def _download_model(self, path: str):
        try:
            file_name = os.path.basename(path)

            if file_name in self.download_urls:
                ModelDownloader.download_from_url(self.download_urls[file_name], path)

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

    @abstractmethod
    def _load_model_and_utils(self):
        pass

    @abstractmethod
    def _preprocess_inputs(self, raw_inputs: Any) -> Any:
        pass

    def _process_image(self, image, output: str = "RGB") -> Image.Image:
        if isinstance(image, str):
            if image.startswith("http"):
                response = requests.get(image)
                image = Image.open(BytesIO(response.content)).convert(output)
        elif isinstance(image, bytes):
            image = Image.open(BytesIO(image)).convert(output)
        elif isinstance(image, np.ndarray):
            image = Image.fromarray(image)

        return image

    def _postprocess_outputs(self, outputs: Any) -> Any:
        return outputs

    def __call__(
        self, inputs: list[str] | list[Image.Image] | list[str]
    ) -> list[np.ndarray]:
        self._load_model_and_utils()
        processed = self._preprocess_inputs(inputs)
        input_names = self.runner.get_input_names()
        onnx_inputs = {name: [] for name in input_names}
        input: dict[str, Any]
        for input in processed:
            for key, value in input.items():
                if key in input_names:
                    onnx_inputs[key].append(value[0])

        for key in input_names:
            if onnx_inputs.get(key):
                onnx_inputs[key] = np.stack(onnx_inputs[key])
            else:
                logger.warning(f"Expected input '{key}' not found in onnx_inputs")

        outputs = self.runner.run(onnx_inputs)[0]
        embeddings = self._postprocess_outputs(outputs)

        return [embedding for embedding in embeddings]
