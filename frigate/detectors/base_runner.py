"""Base runner implementation for ONNX models."""

from abc import ABC, abstractmethod
from typing import Any

import onnxruntime as ort

from frigate.detectors.plugins.openvino import OpenVINOModelRunner
from frigate.detectors.plugins.rknn import RKNNModelRunner
from frigate.util.model import get_ort_providers
from frigate.util.rknn_converter import auto_convert_model, is_rknn_compatible


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


class ONNXModelRunner(BaseModelRunner):
    """Run ONNX models using ONNX Runtime."""

    def __init__(self, ort: ort.InferenceSession):
        self.ort = ort

    def get_input_names(self) -> list[str]:
        return [input.name for input in self.ort.get_inputs()]

    def get_input_width(self) -> int:
        """Get the input width of the model."""
        return self.ort.get_inputs()[0].shape[3]

    def run(self, input: dict[str, Any]) -> Any | None:
        return self.ort.run(None, input)


def get_optimized_runner(model_path: str, device: str, **kwargs) -> BaseModelRunner:
    """Get an optimized runner for the hardware."""
    if device == "CPU":
        return ONNXModelRunner(model_path, device, **kwargs)

    if is_rknn_compatible(model_path):
        rknn_path = auto_convert_model(model_path)

        if rknn_path:
            return RKNNModelRunner(rknn_path)

    providers, options = get_ort_providers(device == "CPU", device, **kwargs)

    if "OpenVINOExecutionProvider" in providers:
        return OpenVINOModelRunner(model_path, device, **kwargs)

    ort = ort.InferenceSession(
        model_path,
        providers=providers,
        provider_options=options,
    )

    return ONNXModelRunner(model_path, device, **kwargs)
