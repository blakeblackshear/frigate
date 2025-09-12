import logging

import numpy as np
import onnxruntime as ort
from pydantic import Field
from typing_extensions import Literal

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import (
    BaseDetectorConfig,
    ModelTypeEnum,
)
from frigate.util.model import (
    get_ort_providers,
    post_process_dfine,
    post_process_rfdetr,
    post_process_yolo,
    post_process_yolox,
)

logger = logging.getLogger(__name__)

DETECTOR_KEY = "onnx"


class CudaGraphRunner:
    """Encapsulates CUDA Graph capture and replay using ONNX Runtime IOBinding.

    This runner assumes a single tensor input and binds all model outputs.
    """

    def __init__(self, session: ort.InferenceSession, cuda_device_id: int):
        self._session = session
        self._cuda_device_id = cuda_device_id
        self._captured = False
        self._io_binding: ort.IOBinding | None = None
        self._input_name: str | None = None
        self._output_names: list[str] | None = None
        self._input_ortvalue: ort.OrtValue | None = None
        self._output_ortvalues: ort.OrtValue | None = None

    def run(self, input_name: str, tensor_input: np.ndarray):
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


class ONNXDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    device: str = Field(default="AUTO", title="Device Type")


class ONNXDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: ONNXDetectorConfig):
        super().__init__(detector_config)

        path = detector_config.model.path
        logger.info(f"ONNX: loading {detector_config.model.path}")

        providers, options = get_ort_providers(
            detector_config.device == "CPU", detector_config.device
        )

        # Enable CUDA Graphs only for supported models when using CUDA EP
        if "CUDAExecutionProvider" in providers:
            cuda_idx = providers.index("CUDAExecutionProvider")
            # mutate only this call's provider options
            options[cuda_idx] = {
                **options[cuda_idx],
                "enable_cuda_graph": True,
            }

        self.model = ort.InferenceSession(
            path, providers=providers, provider_options=options
        )

        self.onnx_model_type = detector_config.model.model_type
        self.onnx_model_px = detector_config.model.input_pixel_format
        self.onnx_model_shape = detector_config.model.input_tensor
        path = detector_config.model.path

        if self.onnx_model_type == ModelTypeEnum.yolox:
            self.calculate_grids_strides()

        self._cuda_device_id = 0
        self._cg_runner: CudaGraphRunner | None = None

        try:
            if "CUDAExecutionProvider" in providers:
                cuda_idx = providers.index("CUDAExecutionProvider")
                self._cuda_device_id = options[cuda_idx].get("device_id", 0)

                if options[cuda_idx].get("enable_cuda_graph"):
                    self._cg_runner = CudaGraphRunner(self.model, self._cuda_device_id)
        except Exception:
            pass

        logger.info(f"ONNX: {path} loaded")

    def detect_raw(self, tensor_input: np.ndarray):
        if self.onnx_model_type == ModelTypeEnum.dfine:
            tensor_output = self.model.run(
                None,
                {
                    "images": tensor_input,
                    "orig_target_sizes": np.array(
                        [[self.height, self.width]], dtype=np.int64
                    ),
                },
            )
            return post_process_dfine(tensor_output, self.width, self.height)

        model_input_name = self.model.get_inputs()[0].name

        if self._cg_runner is not None:
            try:
                # Run using CUDA graphs if available
                tensor_output = self._cg_runner.run(model_input_name, tensor_input)
            except Exception as e:
                logger.warning(f"CUDA Graphs failed, falling back to regular run: {e}")
                self._cg_runner = None
                tensor_output = self.model.run(None, {model_input_name: tensor_input})
        else:
            # Use regular run if CUDA graphs are not available
            tensor_output = self.model.run(None, {model_input_name: tensor_input})

        if self.onnx_model_type == ModelTypeEnum.rfdetr:
            return post_process_rfdetr(tensor_output)
        elif self.onnx_model_type == ModelTypeEnum.yolonas:
            predictions = tensor_output[0]

            detections = np.zeros((20, 6), np.float32)

            for i, prediction in enumerate(predictions):
                if i == 20:
                    break
                (_, x_min, y_min, x_max, y_max, confidence, class_id) = prediction
                # when running in GPU mode, empty predictions in the output have class_id of -1
                if class_id < 0:
                    break
                detections[i] = [
                    class_id,
                    confidence,
                    y_min / self.height,
                    x_min / self.width,
                    y_max / self.height,
                    x_max / self.width,
                ]
            return detections
        elif self.onnx_model_type == ModelTypeEnum.yologeneric:
            return post_process_yolo(tensor_output, self.width, self.height)
        elif self.onnx_model_type == ModelTypeEnum.yolox:
            return post_process_yolox(
                tensor_output[0],
                self.width,
                self.height,
                self.grids,
                self.expanded_strides,
            )
        else:
            raise Exception(
                f"{self.onnx_model_type} is currently not supported for onnx. See the docs for more info on supported models."
            )
