import logging
import os
from typing import ClassVar, Literal

from pydantic import ConfigDict, Field

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig

from ..detector_utils import TFLiteDetectionModel

try:
    from tflite_runtime.interpreter import Interpreter, load_delegate
except ModuleNotFoundError:
    from ai_edge_litert.interpreter import Interpreter, load_delegate

logger = logging.getLogger(__name__)

DETECTOR_KEY = "edgetpu"


class EdgeTpuDetectorConfig(BaseDetectorConfig):
    """EdgeTPU detector that runs TensorFlow Lite models compiled for Coral EdgeTPU using the EdgeTPU delegate."""

    model_config = ConfigDict(
        title="EdgeTPU",
    )

    # a TPU can only be opened by one process
    shareable: ClassVar[bool] = False

    type: Literal[DETECTOR_KEY]
    device: str = Field(
        default=None,
        title="Device Type",
        description="The device to use for EdgeTPU inference (e.g. 'usb', 'pci').",
    )


class EdgeTpuTfl(DetectionApi):
    type_key = DETECTOR_KEY
    supported_models = TFLiteDetectionModel.supported_models

    def __init__(self, detector_config: EdgeTpuDetectorConfig):
        device_config = {}
        if detector_config.device is not None:
            device_config = {"device": detector_config.device}

        edge_tpu_delegate = None

        try:
            device_type = (
                device_config["device"] if "device" in device_config else "auto"
            )
            logger.info(f"Attempting to load TPU as {device_type}")
            edge_tpu_delegate = load_delegate("libedgetpu.so.1.0", device_config)
            logger.info("TPU found")
            interpreter = Interpreter(
                model_path=detector_config.model.path,
                experimental_delegates=[edge_tpu_delegate],
            )
        except ValueError:
            _, ext = os.path.splitext(detector_config.model.path)

            if ext and ext != ".tflite":
                logger.error(
                    "Incorrect model used with EdgeTPU. Only .tflite models can be used with a Coral EdgeTPU."
                )
            else:
                logger.error(
                    "No EdgeTPU was detected. If you do not have a Coral device yet, you must configure CPU detectors."
                )

            raise

        self.tflite_model = TFLiteDetectionModel(
            interpreter, detector_config.model, DETECTOR_KEY
        )

    def detect_raw(self, tensor_input):
        return self.tflite_model.detect_raw(tensor_input)
