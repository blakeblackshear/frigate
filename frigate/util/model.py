"""Model Utils"""

import os

import onnxruntime as ort


def get_ort_providers(
    force_cpu: bool = False, openvino_device: str = "AUTO"
) -> tuple[list[str], list[dict[str, any]]]:
    if force_cpu:
        return (["CPUExecutionProvider"], [{}])

    providers = ort.get_available_providers()
    options = []

    for provider in providers:
        if provider == "TensorrtExecutionProvider":
            os.makedirs("/config/model_cache/tensorrt/ort/trt-engines", exist_ok=True)
            options.append(
                {
                    "trt_timing_cache_enable": True,
                    "trt_engine_cache_enable": True,
                    "trt_timing_cache_path": "/config/model_cache/tensorrt/ort",
                    "trt_engine_cache_path": "/config/model_cache/tensorrt/ort/trt-engines",
                }
            )
        elif provider == "OpenVINOExecutionProvider":
            os.makedirs("/config/model_cache/openvino/ort", exist_ok=True)
            options.append(
                {
                    "cache_dir": "/config/model_cache/openvino/ort",
                    "device_type": openvino_device,
                }
            )
        else:
            options.append({})

    return (providers, options)
