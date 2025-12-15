"""Base runner implementation for ONNX models."""

import logging
import os
import platform
import threading
from abc import ABC, abstractmethod
from typing import Any

import numpy as np
import onnxruntime as ort

from frigate.util.model import get_ort_providers
from frigate.util.rknn_converter import auto_convert_model, is_rknn_compatible

logger = logging.getLogger(__name__)


def is_arm64_platform() -> bool:
    """Check if we're running on an ARM platform."""
    machine = platform.machine().lower()
    return machine in ("aarch64", "arm64", "armv8", "armv7l")


def get_ort_session_options(
    is_complex_model: bool = False,
) -> ort.SessionOptions | None:
    """Get ONNX Runtime session options with appropriate settings.

    Args:
        is_complex_model: Whether the model needs basic optimization to avoid graph fusion issues.

    Returns:
        SessionOptions with appropriate optimization level, or None for default settings.
    """
    if is_complex_model:
        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = (
            ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
        )
        return sess_options

    return None


# Import OpenVINO only when needed to avoid circular dependencies
try:
    import openvino as ov
except ImportError:
    ov = None


def get_openvino_available_devices() -> list[str]:
    """Get available OpenVINO devices without using ONNX Runtime.

    Returns:
        List of available OpenVINO device names (e.g., ['CPU', 'GPU', 'MYRIAD'])
    """
    if ov is None:
        logger.debug("OpenVINO is not available")
        return []

    try:
        core = ov.Core()
        available_devices = core.available_devices
        logger.debug(f"OpenVINO available devices: {available_devices}")
        return available_devices
    except Exception as e:
        logger.warning(f"Failed to get OpenVINO available devices: {e}")
        return []


def is_openvino_gpu_npu_available() -> bool:
    """Check if OpenVINO GPU or NPU devices are available.

    Returns:
        True if GPU or NPU devices are available, False otherwise
    """
    available_devices = get_openvino_available_devices()
    # Check for GPU, NPU, or other acceleration devices (excluding CPU)
    acceleration_devices = ["GPU", "MYRIAD", "NPU", "GNA", "HDDL"]
    return any(device in available_devices for device in acceleration_devices)


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

    @staticmethod
    def is_cpu_complex_model(model_type: str) -> bool:
        """Check if model needs basic optimization level to avoid graph fusion issues.

        Some models (like Jina-CLIP) have issues with aggressive optimizations like
        SimplifiedLayerNormFusion that create or expect nodes that don't exist.
        """
        # Import here to avoid circular imports
        from frigate.embeddings.types import EnrichmentModelTypeEnum

        return model_type in [
            EnrichmentModelTypeEnum.jina_v1.value,
            EnrichmentModelTypeEnum.jina_v2.value,
        ]

    @staticmethod
    def is_migraphx_complex_model(model_type: str) -> bool:
        # Import here to avoid circular imports
        from frigate.detectors.detector_config import ModelTypeEnum
        from frigate.embeddings.types import EnrichmentModelTypeEnum

        return model_type in [
            EnrichmentModelTypeEnum.paddleocr.value,
            EnrichmentModelTypeEnum.yolov9_license_plate.value,
            EnrichmentModelTypeEnum.jina_v1.value,
            EnrichmentModelTypeEnum.jina_v2.value,
            EnrichmentModelTypeEnum.facenet.value,
            ModelTypeEnum.rfdetr.value,
            ModelTypeEnum.dfine.value,
        ]

    def __init__(self, ort: ort.InferenceSession):
        self.ort = ort

    def get_input_names(self) -> list[str]:
        return [input.name for input in self.ort.get_inputs()]

    def get_input_width(self) -> int:
        """Get the input width of the model."""
        return self.ort.get_inputs()[0].shape[3]

    def run(self, input: dict[str, Any]) -> Any | None:
        return self.ort.run(None, input)


class CudaGraphRunner(BaseModelRunner):
    """Encapsulates CUDA Graph capture and replay using ONNX Runtime IOBinding.

    This runner assumes a single tensor input and binds all model outputs.

    NOTE: CUDA Graphs limit supported model operations, so they are not usable
    for more complex models like CLIP or PaddleOCR.
    """

    @staticmethod
    def is_model_supported(model_type: str) -> bool:
        # Import here to avoid circular imports
        from frigate.detectors.detector_config import ModelTypeEnum
        from frigate.embeddings.types import EnrichmentModelTypeEnum

        return model_type not in [
            ModelTypeEnum.yolonas.value,
            EnrichmentModelTypeEnum.paddleocr.value,
            EnrichmentModelTypeEnum.jina_v1.value,
            EnrichmentModelTypeEnum.jina_v2.value,
            EnrichmentModelTypeEnum.yolov9_license_plate.value,
        ]

    def __init__(self, session: ort.InferenceSession, cuda_device_id: int):
        self._session = session
        self._cuda_device_id = cuda_device_id
        self._captured = False
        self._io_binding: ort.IOBinding | None = None
        self._input_name: str | None = None
        self._output_names: list[str] | None = None
        self._input_ortvalue: ort.OrtValue | None = None
        self._output_ortvalues: ort.OrtValue | None = None

    def get_input_names(self) -> list[str]:
        """Get input names for the model."""
        return [input.name for input in self._session.get_inputs()]

    def get_input_width(self) -> int:
        """Get the input width of the model."""
        return self._session.get_inputs()[0].shape[3]

    def run(self, input: dict[str, Any]):
        # Extract the single tensor input (assuming one input)
        input_name = list(input.keys())[0]
        tensor_input = input[input_name]
        tensor_input = np.ascontiguousarray(tensor_input)

        if not self._captured:
            # Prepare IOBinding with CUDA buffers and let ORT allocate outputs on device
            self._io_binding = self._session.io_binding()
            self._input_name = input_name
            self._output_names = [o.name for o in self._session.get_outputs()]

            self._input_ortvalue = ort.OrtValue.ortvalue_from_numpy(
                tensor_input, "cuda", self._cuda_device_id
            )
            self._io_binding.bind_ortvalue_input(self._input_name, self._input_ortvalue)

            for name in self._output_names:
                # Bind outputs to CUDA and allow ORT to allocate appropriately
                self._io_binding.bind_output(name, "cuda", self._cuda_device_id)

            # First IOBinding run to allocate, execute, and capture CUDA Graph
            ro = ort.RunOptions()
            self._session.run_with_iobinding(self._io_binding, ro)
            self._captured = True
            return self._io_binding.copy_outputs_to_cpu()

        # Replay using updated input, copy results to CPU
        self._input_ortvalue.update_inplace(tensor_input)
        ro = ort.RunOptions()
        self._session.run_with_iobinding(self._io_binding, ro)
        return self._io_binding.copy_outputs_to_cpu()


class OpenVINOModelRunner(BaseModelRunner):
    """OpenVINO model runner that handles inference efficiently."""

    @staticmethod
    def is_complex_model(model_type: str) -> bool:
        # Import here to avoid circular imports
        from frigate.embeddings.types import EnrichmentModelTypeEnum

        return model_type in [
            EnrichmentModelTypeEnum.paddleocr.value,
            EnrichmentModelTypeEnum.jina_v2.value,
        ]

    @staticmethod
    def is_model_npu_supported(model_type: str) -> bool:
        # Import here to avoid circular imports
        from frigate.embeddings.types import EnrichmentModelTypeEnum

        return model_type not in [
            EnrichmentModelTypeEnum.paddleocr.value,
            EnrichmentModelTypeEnum.jina_v1.value,
            EnrichmentModelTypeEnum.jina_v2.value,
            EnrichmentModelTypeEnum.arcface.value,
        ]

    def __init__(self, model_path: str, device: str, model_type: str, **kwargs):
        self.model_path = model_path
        self.device = device
        self.model_type = model_type

        if device == "NPU" and not OpenVINOModelRunner.is_model_npu_supported(
            model_type
        ):
            logger.warning(
                f"OpenVINO model {model_type} is not supported on NPU, using GPU instead"
            )
            device = "GPU"

        self.complex_model = OpenVINOModelRunner.is_complex_model(model_type)

        if not os.path.isfile(model_path):
            raise FileNotFoundError(f"OpenVINO model file {model_path} not found.")

        if ov is None:
            raise ImportError(
                "OpenVINO is not available. Please install openvino package."
            )

        self.ov_core = ov.Core()

        # Apply performance optimization
        self.ov_core.set_property(device, {"PERF_COUNT": "NO"})

        if device in ["GPU", "AUTO"]:
            self.ov_core.set_property(device, {"PERFORMANCE_HINT": "LATENCY"})

        # Compile model
        self.compiled_model = self.ov_core.compile_model(
            model=model_path, device_name=device
        )

        # Create reusable inference request
        self.infer_request = self.compiled_model.create_infer_request()
        self.input_tensor: ov.Tensor | None = None

        # Thread lock to prevent concurrent inference (needed for JinaV2 which shares
        # one runner between text and vision embeddings called from different threads)
        self._inference_lock = threading.Lock()

        if not self.complex_model:
            try:
                input_shape = self.compiled_model.inputs[0].get_shape()
                input_element_type = self.compiled_model.inputs[0].get_element_type()
                self.input_tensor = ov.Tensor(input_element_type, input_shape)
            except RuntimeError:
                # model is complex and has dynamic shape
                pass

    def get_input_names(self) -> list[str]:
        """Get input names for the model."""
        return [input.get_any_name() for input in self.compiled_model.inputs]

    def get_input_width(self) -> int:
        """Get the input width of the model."""
        input_info = self.compiled_model.inputs
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

    def run(self, inputs: dict[str, Any]) -> list[np.ndarray]:
        """Run inference with the model.

        Args:
            inputs: Dictionary mapping input names to input data

        Returns:
            List of output tensors
        """
        # Lock prevents concurrent access to infer_request
        # Needed for JinaV2: genai thread (text) + embeddings thread (vision)
        with self._inference_lock:
            from frigate.embeddings.types import EnrichmentModelTypeEnum

            if self.model_type in [EnrichmentModelTypeEnum.arcface.value]:
                # For face recognition models, create a fresh infer_request
                # for each inference to avoid state pollution that causes incorrect results.
                self.infer_request = self.compiled_model.create_infer_request()

            # Handle single input case for backward compatibility
            if (
                len(inputs) == 1
                and len(self.compiled_model.inputs) == 1
                and self.input_tensor is not None
            ):
                # Single input case - use the pre-allocated tensor for efficiency
                input_data = list(inputs.values())[0]
                np.copyto(self.input_tensor.data, input_data)
                self.infer_request.infer(self.input_tensor)
            else:
                if self.complex_model:
                    try:
                        # This ensures the model starts with a clean state for each sequence
                        # Important for RNN models like PaddleOCR recognition
                        self.infer_request.reset_state()
                    except Exception:
                        # this will raise an exception for models with AUTO set as the device
                        pass

                # Multiple inputs case - set each input by name
                for input_name, input_data in inputs.items():
                    # Find the input by name and its index
                    input_port = None
                    input_index = None
                    for idx, port in enumerate(self.compiled_model.inputs):
                        if port.get_any_name() == input_name:
                            input_port = port
                            input_index = idx
                            break

                    if input_port is None:
                        raise ValueError(f"Input '{input_name}' not found in model")

                    # Create tensor with the correct element type
                    input_element_type = input_port.get_element_type()

                    # Ensure input data matches the expected dtype to prevent type mismatches
                    # that can occur with models like Jina-CLIP v2 running on OpenVINO
                    expected_dtype = input_element_type.to_dtype()
                    if input_data.dtype != expected_dtype:
                        logger.debug(
                            f"Converting input '{input_name}' from {input_data.dtype} to {expected_dtype}"
                        )
                        input_data = input_data.astype(expected_dtype)

                    input_tensor = ov.Tensor(input_element_type, input_data.shape)
                    np.copyto(input_tensor.data, input_data)

                    # Set the input tensor for the specific port index
                    self.infer_request.set_input_tensor(input_index, input_tensor)

                # Run inference
                try:
                    self.infer_request.infer()
                except Exception as e:
                    logger.error(f"Error during OpenVINO inference: {e}")
                    return []

            # Get all output tensors
            outputs = []
            for i in range(len(self.compiled_model.outputs)):
                outputs.append(self.infer_request.get_output_tensor(i).data)

            return outputs


class RKNNModelRunner(BaseModelRunner):
    """Run RKNN models for embeddings."""

    def __init__(self, model_path: str, model_type: str = None, core_mask: int = 0):
        self.model_path = model_path
        self.model_type = model_type
        self.core_mask = core_mask
        self.rknn = None
        self._load_model()

    def _load_model(self):
        """Load the RKNN model."""
        try:
            from rknnlite.api import RKNNLite

            self.rknn = RKNNLite(verbose=False)

            if self.rknn.load_rknn(self.model_path) != 0:
                logger.error(f"Failed to load RKNN model: {self.model_path}")
                raise RuntimeError("Failed to load RKNN model")

            if self.rknn.init_runtime(core_mask=self.core_mask) != 0:
                logger.error("Failed to initialize RKNN runtime")
                raise RuntimeError("Failed to initialize RKNN runtime")

            logger.info(f"Successfully loaded RKNN model: {self.model_path}")

        except ImportError:
            logger.error("RKNN Lite not available")
            raise ImportError("RKNN Lite not available")
        except Exception as e:
            logger.error(f"Error loading RKNN model: {e}")
            raise

    def get_input_names(self) -> list[str]:
        """Get input names for the model."""
        # For detection models, we typically use "input" as the default input name
        # For CLIP models, we need to determine the model type from the path
        model_name = os.path.basename(self.model_path).lower()

        if "vision" in model_name:
            return ["pixel_values"]
        elif "arcface" in model_name:
            return ["data"]
        else:
            # Default fallback - try to infer from model type
            if self.model_type and "jina-clip" in self.model_type:
                if "vision" in self.model_type:
                    return ["pixel_values"]

            # Generic fallback
            return ["input"]

    def get_input_width(self) -> int:
        """Get the input width of the model."""
        # For CLIP vision models, this is typically 224
        model_name = os.path.basename(self.model_path).lower()
        if "vision" in model_name:
            return 224  # CLIP V1 uses 224x224
        elif "arcface" in model_name:
            return 112
        # For detection models, we can't easily determine this from the RKNN model
        # The calling code should provide this information
        return -1

    def run(self, inputs: dict[str, Any]) -> Any:
        """Run inference with the RKNN model."""
        if not self.rknn:
            raise RuntimeError("RKNN model not loaded")

        try:
            input_names = self.get_input_names()
            rknn_inputs = []

            for name in input_names:
                if name in inputs:
                    if name == "pixel_values":
                        # RKNN expects NHWC format, but ONNX typically provides NCHW
                        # Transpose from [batch, channels, height, width] to [batch, height, width, channels]
                        pixel_data = inputs[name]
                        if len(pixel_data.shape) == 4 and pixel_data.shape[1] == 3:
                            # Transpose from NCHW to NHWC
                            pixel_data = np.transpose(pixel_data, (0, 2, 3, 1))
                        rknn_inputs.append(pixel_data)
                    else:
                        rknn_inputs.append(inputs[name])

            outputs = self.rknn.inference(inputs=rknn_inputs)
            return outputs

        except Exception as e:
            logger.error(f"Error during RKNN inference: {e}")
            raise

    def __del__(self):
        """Cleanup when the runner is destroyed."""
        if self.rknn:
            try:
                self.rknn.release()
            except Exception:
                pass


def get_optimized_runner(
    model_path: str, device: str | None, model_type: str, **kwargs
) -> BaseModelRunner:
    """Get an optimized runner for the hardware."""
    device = device or "AUTO"

    if device != "CPU" and is_rknn_compatible(model_path):
        rknn_path = auto_convert_model(model_path)

        if rknn_path:
            return RKNNModelRunner(rknn_path)

    providers, options = get_ort_providers(device == "CPU", device, **kwargs)

    if providers[0] == "CPUExecutionProvider":
        # In the default image, ONNXRuntime is used so we will only get CPUExecutionProvider
        # In other images we will get CUDA / ROCm which are preferred over OpenVINO
        # There is currently no way to prioritize OpenVINO over CUDA / ROCm in these images
        if device != "CPU" and is_openvino_gpu_npu_available():
            return OpenVINOModelRunner(model_path, device, model_type, **kwargs)

    if (
        CudaGraphRunner.is_model_supported(model_type)
        and providers[0] == "CUDAExecutionProvider"
    ):
        options[0] = {
            **options[0],
            "enable_cuda_graph": True,
        }
        return CudaGraphRunner(
            ort.InferenceSession(
                model_path,
                providers=providers,
                provider_options=options,
            ),
            options[0]["device_id"],
        )

    if (
        providers
        and providers[0] == "MIGraphXExecutionProvider"
        and ONNXModelRunner.is_migraphx_complex_model(model_type)
    ):
        # Don't use MIGraphX for models that are not supported
        providers.pop(0)
        options.pop(0)

    return ONNXModelRunner(
        ort.InferenceSession(
            model_path,
            sess_options=get_ort_session_options(
                ONNXModelRunner.is_cpu_complex_model(model_type)
            ),
            providers=providers,
            provider_options=options,
        )
    )
