"""Convenience runner for onnx models."""

import logging
import os.path
from typing import Any

import numpy as np
import onnxruntime as ort

from frigate.const import MODEL_CACHE_DIR
from frigate.util.model import get_ort_providers
from frigate.util.rknn_converter import is_rknn_compatible, auto_convert_model

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
        self.rknn = None
        self.type = "ort"

        try:
            if device != "CPU" and is_rknn_compatible(model_path):
                # Try to auto-convert to RKNN format
                rknn_path = auto_convert_model(model_path)
                if rknn_path:
                    try:
                        self.rknn = RKNNModelRunner(rknn_path, device)
                        self.type = "rknn"
                        logger.info(f"Using RKNN model: {rknn_path}")
                        return
                    except Exception as e:
                        logger.debug(
                            f"Failed to load RKNN model, falling back to ONNX: {e}"
                        )
                        self.rknn = None
        except ImportError:
            pass

        # Fall back to standard ONNX providers
        providers, options = get_ort_providers(
            device == "CPU",
            device,
            requires_fp16,
        )
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
        if self.type == "rknn":
            return self.rknn.get_input_names()
        elif self.type == "ov":
            input_names = []

            for input in self.interpreter.inputs:
                input_names.extend(input.names)

            return input_names
        elif self.type == "ort":
            return [input.name for input in self.ort.get_inputs()]

    def get_input_width(self):
        """Get the input width of the model regardless of backend."""
        if self.type == "rknn":
            return self.rknn.get_input_width()
        elif self.type == "ort":
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

    def run(self, input: dict[str, Any]) -> Any | None:
        if self.type == "rknn":
            return self.rknn.run(input)
        elif self.type == "ov":
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


class RKNNModelRunner:
    """Run RKNN models for embeddings."""

    def __init__(self, model_path: str, device: str = "AUTO", model_type: str = None):
        self.model_path = model_path
        self.device = device
        self.model_type = model_type
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

            if self.rknn.init_runtime() != 0:
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
        # For CLIP models, we need to determine the model type from the path
        model_name = os.path.basename(self.model_path).lower()

        if "vision" in model_name:
            return ["pixel_values"]
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
                else:
                    logger.warning(f"Input '{name}' not found in inputs, using default")

                    if name == "pixel_values":
                        batch_size = 1
                        if inputs:
                            for val in inputs.values():
                                if hasattr(val, "shape") and len(val.shape) > 0:
                                    batch_size = val.shape[0]
                                    break
                        # Create default in NHWC format as expected by RKNN
                        rknn_inputs.append(
                            np.zeros((batch_size, 224, 224, 3), dtype=np.float32)
                        )
                    else:
                        batch_size = 1
                        if inputs:
                            for val in inputs.values():
                                if hasattr(val, "shape") and len(val.shape) > 0:
                                    batch_size = val.shape[0]
                                    break
                        rknn_inputs.append(np.zeros((batch_size, 1), dtype=np.float32))

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
            except:
                pass
