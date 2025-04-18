"""Convenience runner for onnx models."""

import logging
import os.path
from typing import Any

import onnxruntime as ort

from frigate.const import MODEL_CACHE_DIR
from frigate.util.model import get_ort_providers

try:
    import openvino as ov
except ImportError:
    # openvino is not included
    pass

logger = logging.getLogger(__name__)


class ONNXModelRunner:
    """Run onnx models optimally based on available hardware."""

    def __init__(self, model_path: str, device: str, requires_fp16: bool = False):
        self.model_path = model_path
        self.ort: ort.InferenceSession = None
        self.ov: ov.Core = None
        providers, options = get_ort_providers(device == "CPU", device, requires_fp16)
        self.interpreter = None

        if "OpenVINOExecutionProvider" in providers:
            try:
                # use OpenVINO directly
                self.type = "ov"
                self.ov = ov.Core()
                self.ov.set_property(
                    {ov.properties.cache_dir: os.path.join(MODEL_CACHE_DIR, "openvino")}
                )
                self.interpreter = self.ov.compile_model(
                    model=model_path, device_name=device
                )
            except Exception as e:
                logger.warning(
                    f"OpenVINO failed to build model, using CPU instead: {e}"
                )
                self.interpreter = None

        # Use ONNXRuntime
        if self.interpreter is None:
            self.type = "ort"
            self.ort = ort.InferenceSession(
                model_path,
                providers=providers,
                provider_options=options,
            )

    def get_input_names(self) -> list[str]:
        if self.type == "ov":
            input_names = []

            for input in self.interpreter.inputs:
                input_names.extend(input.names)

            return input_names
        elif self.type == "ort":
            return [input.name for input in self.ort.get_inputs()]

    def get_input_width(self):
        """Get the input width of the model regardless of backend."""
        if self.type == "ort":
            return self.ort.get_inputs()[0].shape[3]
        elif self.type == "ov":
            input_info = self.interpreter.inputs
            first_input = input_info[0]

            try:
                partial_shape = first_input.get_partial_shape()
                # width dimension
                if len(partial_shape) >= 4 and partial_shape[3].is_static:
                    return partial_shape[3].get_length()

                # If width is dynamic or we can't determine it
                return -1
            except Exception:
                try:
                    # gemini says some ov versions might still allow this
                    input_shape = first_input.shape
                    return input_shape[3] if len(input_shape) >= 4 else -1
                except Exception:
                    return -1
        return -1

    def run(self, input: dict[str, Any]) -> Any:
        if self.type == "ov":
            infer_request = self.interpreter.create_infer_request()

            try:
                # This ensures the model starts with a clean state for each sequence
                # Important for RNN models like PaddleOCR recognition
                infer_request.reset_state()
            except Exception:
                # this will raise an exception for models with AUTO set as the device
                pass

            outputs = infer_request.infer(input)

            return outputs
        elif self.type == "ort":
            return self.ort.run(None, input)
