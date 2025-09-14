"""Base runner implementation for ONNX models."""

from abc import ABC, abstractmethod
from typing import Any

class BaseModelRunner(ABC):
    """Abstract base class for model runners."""

    def __init__(self, model_path: str, device: str, **kwargs):
        self.model_path = model_path
        self.device = device

    @abstractmethod
    def get_input_names(self) -> list[str]:
        """Get input names for the model."""
        pass

    @abstractmethod
    def get_input_width(self) -> int:
        """Get the input width of the model."""
        pass

    @abstractmethod
    def run(self, input: dict[str, Any]) -> Any | None:
        """Run inference with the model."""
        pass