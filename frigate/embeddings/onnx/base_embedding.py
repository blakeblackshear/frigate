"""Base class for onnx embedding implementations."""

import logging
from abc import ABC, abstractmethod
from enum import Enum
from io import BytesIO

import numpy as np
import requests
from PIL import Image

logger = logging.getLogger(__name__)


class EmbeddingTypeEnum(str, Enum):
    thumbnail = "thumbnail"
    description = "description"


class BaseEmbedding(ABC):
    """Base embedding class."""

    @abstractmethod
    def _download_model(self, path: str):
        pass

    @abstractmethod
    def _load_model_and_utils(self):
        pass

    @abstractmethod
    def _preprocess_inputs(self, raw_inputs: any) -> any:
        pass

    def _process_image(self, image, output: str = "RGB") -> Image.Image:
        if isinstance(image, str):
            if image.startswith("http"):
                response = requests.get(image)
                image = Image.open(BytesIO(response.content)).convert(output)
        elif isinstance(image, bytes):
            image = Image.open(BytesIO(image)).convert(output)

        return image

    def __call__(
        self, inputs: list[str] | list[Image.Image] | list[str]
    ) -> list[np.ndarray]:
        self._load_model_and_utils()
        processed = self._preprocess_inputs(inputs)
        input_names = self.runner.get_input_names()
        onnx_inputs = {name: [] for name in input_names}
        input: dict[str, any]
        for input in processed:
            for key, value in input.items():
                if key in input_names:
                    onnx_inputs[key].append(value[0])

        for key in input_names:
            if onnx_inputs.get(key):
                onnx_inputs[key] = np.stack(onnx_inputs[key])
            else:
                logger.warning(f"Expected input '{key}' not found in onnx_inputs")

        embeddings = self.runner.run(onnx_inputs)[0]
        return [embedding for embedding in embeddings]
