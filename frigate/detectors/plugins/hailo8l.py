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

class ModelConfig(BaseModel):
    path: str = Field(default=None, title="Model Path")


class HailoDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    device: str = Field(default="PCIe", title="Device Type")
    url: Optional[str] = Field(default=None, title="Model URL")
    dir: Optional[str] = Field(default=None, title="Model Directory")
    model: ModelConfig

class HailoAsyncInference:
    def __init__(self, config: HailoDetectorConfig):
        self.config = config
        self.input_queue = queue.Queue()
        self.output_queue = queue.Queue()
        params = VDevice.create_params()
        params.scheduling_algorithm = HailoSchedulingAlgorithm.ROUND_ROBIN
        self.target = VDevice(params)

        # Initialize HEF
        self.hef = HEF(self.model_path)
        self.infer_model = self.target.create_infer_model(self.model_path)
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
    DEFAULT_CACHE_DIR = "/config/model_cache/"


    def __init__(self, detector_config: HailoDetectorConfig):
        super().__init__(detector_config)
        self.config = detector_config
        
        # Get the model path
        model_path = self.check_and_prepare_model()
        
        # Initialize async inference with the correct model path
        self.async_inference = HailoAsyncInference(detector_config)
        self.async_inference.config.model.path = model_path
        self.worker_thread = threading.Thread(target=self.async_inference.infer)
        self.worker_thread.start()


    def check_and_prepare_model(self) -> str:
        """
        Check if model exists at specified path, download from URL if needed.
        Returns the final model path to use.
        """
        # Ensure cache directory exists
        if not os.path.exists(self.DEFAULT_CACHE_DIR):
            os.makedirs(self.DEFAULT_CACHE_DIR)

        model_path = self.config.dir # the directory path of the model
        model_url = self.config.url # the url of the model 

        if (model_path and os.path.isfile(model_path)):
            return model_path
        
        if (model_url):
            model_filename = os.path.basename(model_url)
            model_file_path = os.path.join(self.DEFAULT_CACHE_DIR, model_filename)
            if os.path.isfile(model_file_path):
                return model_file_path
            else:
                logger.info(f"Downloading model from URL: {model_url}")
            try:
                urllib.request.urlretrieve(model_url, model_file_path)
                logger.info(f"Model downloaded successfully to: {model_file_path}")
                return model_file_path
            except Exception as e:
                logger.error(f"Failed to download model: {str(e)}")
                raise RuntimeError(f"Failed to download model from {model_url}")
        raise RuntimeError("No valid model path or URL provided")

            
        

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
            confidence = detection[4]
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
