"""Base class for onnx embedding implementations."""

from abc import ABC, abstractmethod
from enum import Enum

from numpy import ndarray
from PIL import Image


class EmbeddingTypeEnum(str, Enum):
    thumbnail = "thumbnail"
    description = "description"


class BaseEmbedding(ABC):
    """Base embedding class."""

    @abstractmethod
    def _load_model_and_utils(self):
        pass

    @abstractmethod
    def _preprocess_inputs(self, raw_inputs: any) -> any:
        pass

    @abstractmethod
    def run_inference(self, inputs: any) -> list[ndarray]:
        pass

    def __call__(
        self, inputs: list[str] | list[Image.Image] | list[str]
    ) -> list[ndarray]:
        self._load_model_and_utils()
        processed = self._preprocess_inputs(inputs)
        return self.run_inference(processed)
