"""Model Utils"""

import os
from typing import Any

import onnxruntime as ort

try:
    import openvino as ov
except ImportError:
    # openvino is not included
    pass


def get_ort_providers(
    force_cpu: bool = False, openvino_device: str = "AUTO", requires_fp16: bool = False
) -> tuple[list[str], list[dict[str, any]]]:
    if force_cpu:
        return (
            ["CPUExecutionProvider"],
            [
                {
                    "arena_extend_strategy": "kSameAsRequested",
                }
            ],
        )

    providers = []
    options = []

    for provider in ort.get_available_providers():
        if provider == "CUDAExecutionProvider":
            providers.append(provider)
            options.append(
                {
                    "arena_extend_strategy": "kSameAsRequested",
                }
            )
        elif provider == "TensorrtExecutionProvider":
            # TensorrtExecutionProvider uses too much memory without options to control it
            pass
        elif provider == "OpenVINOExecutionProvider":
            os.makedirs("/config/model_cache/openvino/ort", exist_ok=True)
            providers.append(provider)
            options.append(
                {
                    "arena_extend_strategy": "kSameAsRequested",
                    "cache_dir": "/config/model_cache/openvino/ort",
                    "device_type": openvino_device,
                }
            )
        elif provider == "CPUExecutionProvider":
            providers.append(provider)
            options.append(
                {
                    "arena_extend_strategy": "kSameAsRequested",
                }
            )
        else:
            providers.append(provider)
            options.append({})

    return (providers, options)


class ONNXModelRunner:
    """Run onnx models optimally based on available hardware."""

    def __init__(self, model_path: str, device: str, requires_fp16: bool = False):
        self.model_path = model_path
        self.ort: ort.InferenceSession = None
        self.ov: ov.Core = None
        providers, options = get_ort_providers(device == "CPU", device, requires_fp16)

        if "OpenVINOExecutionProvider" in providers:
            # use OpenVINO directly
            self.type = "ov"
            self.ov = ov.Core()
            self.ov.set_property(
                {ov.properties.cache_dir: "/config/model_cache/openvino"}
            )
            self.interpreter = self.ov.compile_model(
                model=model_path, device_name=device
            )
        else:
            # Use ONNXRuntime
            self.type = "ort"
            self.ort = ort.InferenceSession(
                model_path, providers=providers, provider_options=options
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
