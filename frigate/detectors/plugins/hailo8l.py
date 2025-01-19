import logging
import os
import queue
import threading
import subprocess
import urllib.request
import numpy as np
from hailo_platform import (
    HEF,
    ConfigureParams,
    FormatType,
    HailoRTException,
    HailoStreamInterface,
    VDevice,
    HailoSchedulingAlgorithm,
    InferVStreams,
    InputVStreamParams,
    OutputVStreamParams
)
from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig
from pydantic import BaseModel, Field
from typing_extensions import Literal
from typing import Optional

logger = logging.getLogger(__name__)

DETECTOR_KEY = "hailo8l"

def get_device_architecture():
    """Get the device architecture from hailortcli."""
    try:
        result = subprocess.run(['hailortcli', 'fw-control', 'identify'], capture_output=True, text=True)
        for line in result.stdout.split('\n'):
            if "Device Architecture" in line:
                return line.split(':')[1].strip().lower()
    except Exception:
        return "unknown"

class ModelConfig(BaseModel):
    path: Optional[str] = Field(default=None, title="Model Path")
    type: str = Field(default="yolov8s", title="Model Type")
    width: int = Field(default=640, title="Model Width")
    height: int = Field(default=640, title="Model Height")
    score_threshold: float = Field(default=0.3, title="Score Threshold")
    max_detections: int = Field(default=30, title="Maximum Detections")
    input_tensor: str = Field(default="input_tensor", title="Input Tensor Name")
    input_pixel_format: str = Field(default="RGB", title="Input Pixel Format")

class HailoDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    device: str = Field(default="PCIe", title="Device Type")
    model: ModelConfig

class HailoAsyncInference:
    def __init__(self, config: HailoDetectorConfig):
        self.config = config
        self.input_queue = queue.Queue()
        self.output_queue = queue.Queue()
        params = VDevice.create_params()
        params.scheduling_algorithm = HailoSchedulingAlgorithm.ROUND_ROBIN
        self.target = VDevice(params)
        self.hef = HEF(self.config.model.path)
        self.infer_model = self.target.create_infer_model(self.config.model.path)
        self.infer_model.set_batch_size(1)

    def infer(self):
        while True:
            batch_data = self.input_queue.get()
            if batch_data is None:
                break

            bindings = []
            for frame in batch_data:
                binding = self.infer_model.create_bindings()
                binding.input().set_buffer(frame)
                bindings.append(binding)

            self.infer_model.run_async(bindings, self._callback, batch_data)

    def _callback(self, completion_info, bindings_list, batch_data):
        if completion_info.exception:
            logger.error(f"Inference error: {completion_info.exception}")
        else:
            results = [binding.output().get_buffer() for binding in bindings_list]
            self.output_queue.put((batch_data, results))

    def stop(self):
        self.input_queue.put(None)

class HailoDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, config: HailoDetectorConfig):
        super().__init__()
        self.async_inference = HailoAsyncInference(config)
        self.worker_thread = threading.Thread(target=self.async_inference.infer)
        self.worker_thread.start()

        # Determine device architecture
        self.device_architecture = get_device_architecture()
        if self.device_architecture not in ["hailo8", "hailo8l"]:
            raise RuntimeError(f"Unsupported device architecture: {self.device_architecture}")
        logger.info(f"Device architecture detected: {self.device_architecture}")

        # Ensure the model is available
        self.cache_dir = "/config/model_cache/h8l_cache"
        self.expected_model_filename = f"{config.model.type}.hef"
        self.check_and_prepare_model()

    def check_and_prepare_model(self):
        # Ensure cache directory exists
        if not os.path.exists(self.cache_dir):
            os.makedirs(self.cache_dir)

        # Check for the expected model file
        model_file_path = os.path.join(self.cache_dir, self.expected_model_filename)
        self.async_inference.config.model.path = model_file_path

        if not os.path.isfile(model_file_path):
            if self.async_inference.config.model.path:
                logger.info(
                    f"A model file was not found at {model_file_path}, Downloading one from the provided URL."
                )
                urllib.request.urlretrieve(self.async_inference.config.model.path, model_file_path)
                logger.info(f"A model file was downloaded to {model_file_path}.")
            else:
                raise RuntimeError("Model file path is missing and no URL is provided.")
        else:
            logger.info(
                f"A model file already exists at {model_file_path} not downloading one."
            )

    def detect_raw(self, tensor_input):
        """
        Perform inference and return raw detection results.
        """
        preprocessed_input = self.preprocess(tensor_input)
        self.async_inference.input_queue.put([preprocessed_input])
        try:
            batch_data, raw_results = self.async_inference.output_queue.get(timeout=5)
            return self.postprocess(raw_results)
        except queue.Empty:
            logger.warning("Inference timed out")
            return np.zeros((20, 6), np.float32)

    def preprocess(self, frame):
        input_shape = (self.async_inference.hef.get_input_vstream_infos()[0].shape)
        resized_frame = np.resize(frame, input_shape)
        return resized_frame / 255.0

    def postprocess(self, raw_output):
        model_type = self.async_inference.config.model.type
        if model_type == "ssd_mobilenet_v1":
            return self._process_ssd(raw_output)
        elif model_type in ["yolov8s", "yolov8m", "yolov6n"]:
            return self._process_yolo(raw_output, version=model_type[-1])
        else:
            logger.error(f"Unsupported model type: {model_type}")
            return []

    def _process_ssd(self, raw_output):
        detections = []
        for detection in raw_output[1]:
            score = detection[4]
            if score >= self.async_inference.config.model.score_threshold:
                ymin, xmin, ymax, xmax = detection[:4]
                detections.append({
                    "bounding_box": [xmin, ymin, xmax, ymax],
                    "score": score,
                    "class": int(detection[5])
                })
        return detections

    def _process_yolo(self, raw_output, version):
        detections = []
        for detection in raw_output[1]:
            confidence = detection[4] if version == "8" else np.max(detection[5:])
            if confidence >= self.async_inference.config.model.score_threshold:
                x, y, w, h = detection[:4]
                ymin, xmin, ymax, xmax = y - h / 2, x - w / 2, y + h / 2, x + w / 2
                class_id = np.argmax(detection[5:])
                detections.append({
                    "bounding_box": [xmin, ymin, xmax, ymax],
                    "score": confidence,
                    "class": class_id
                })
        return detections

    def stop(self):
        self.async_inference.stop()
        self.worker_thread.join()
