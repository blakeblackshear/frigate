"""Convenience runner for onnx models."""

import logging
from typing import Any

import onnxruntime as ort

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
                    {ov.properties.cache_dir: "/config/model_cache/openvino"}
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

    def run(self, input: dict[str, Any]) -> Any:
        if self.type == "ov":
            infer_request = self.interpreter.create_infer_request()
            input_tensor = list(input.values())

            if len(input_tensor) == 1:
                input_tensor = ov.Tensor(array=input_tensor[0])
            else:
                input_tensor = ov.Tensor(array=input_tensor)

            infer_request.infer(input_tensor)
            return [infer_request.get_output_tensor().data]
        elif self.type == "ort":
            return self.ort.run(None, input)
