import logging
import os
import urllib.request
from typing import Optional

import numpy as np

try:
    from hailo_platform import (
        HEF,
        ConfigureParams,
        FormatType,
        HailoRTException,
        HailoStreamInterface,
        InferVStreams,
        InputVStreamParams,
        OutputVStreamParams,
        VDevice,
    )
except ModuleNotFoundError:
    pass

from pydantic import BaseModel, Field
from typing_extensions import Literal

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig

# Set up logging
logger = logging.getLogger(__name__)

# Define the detector key for Hailo
DETECTOR_KEY = "hailo8l"

# Configuration class for model settings
class ModelConfig(BaseModel):
    path: Optional[str] = Field(default=None, title="Model Path")
    type: str = Field(default="ssd_mobilenet_v1", title="Model Type")
    url: str = Field(default="", title="Model URL")
    width: int = Field(default=300, title="Model Width")
    height: int = Field(default=300, title="Model Height")
    score_threshold: float = Field(default=0.3, title="Score Threshold")
    max_detections: int = Field(default=30, title="Maximum Detections")
    input_tensor: str = Field(default="input_tensor", title="Input Tensor Name")
    input_pixel_format: str = Field(default="RGB", title="Input Pixel Format")

# Configuration class for Hailo detector
class HailoDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    device: str = Field(default="PCIe", title="Device Type")
    model: ModelConfig

# Hailo detector class implementation
class HailoDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: HailoDetectorConfig):
        # Initialize base configuration
        self.h8l_device_type = detector_config.device
        self.h8l_model_path = detector_config.model.path
        self.h8l_model_height = detector_config.model.height
        self.h8l_model_width = detector_config.model.width
        self.h8l_model_type = detector_config.model.type
        self.h8l_tensor_format = detector_config.model.input_tensor
        self.h8l_pixel_format = detector_config.model.input_pixel_format
        self.model_url = detector_config.model.url
        self.score_threshold = detector_config.model.score_threshold
        self.max_detections = detector_config.model.max_detections
        
        self.cache_dir = "/config/model_cache/h8l_cache"

        logger.info(f"Initializing Hailo device as {self.h8l_device_type}")
        self.check_and_prepare_model()

        try:
            # Validate device type
            if self.h8l_device_type not in ["PCIe", "M.2"]:
                raise ValueError(f"Unsupported device type: {self.h8l_device_type}")

            # Initialize the Hailo device
            self.target = VDevice()
            # Load the HEF (Hailo's binary format for neural networks)
            self.hef = HEF(self.h8l_model_path)
            # Create configuration parameters from the HEF
            self.configure_params = ConfigureParams.create_from_hef(
                hef=self.hef, interface=HailoStreamInterface.PCIe
            )
            # Configure the device with the HEF
            self.network_groups = self.target.configure(self.hef, self.configure_params)
            self.network_group = self.network_groups[0]
            self.network_group_params = self.network_group.create_params()

            # Create input and output virtual stream parameters
            self.input_vstream_params = InputVStreamParams.make(
                self.network_group,
                format_type=self.hef.get_input_vstream_infos()[0].format.type,
            )
            self.output_vstream_params = OutputVStreamParams.make(
                self.network_group,
                format_type=FormatType.FLOAT32
            )

            # Get input and output stream information from the HEF
            self.input_vstream_info = self.hef.get_input_vstream_infos()
            self.output_vstream_info = self.hef.get_output_vstream_infos()

            logger.info("Hailo device initialized successfully")
            logger.debug(f"[__init__] Model Path: {self.h8l_model_path}")
            logger.debug(f"[__init__] Input Tensor Format: {self.h8l_tensor_format}")
            logger.debug(f"[__init__] Input Pixel Format: {self.h8l_pixel_format}")
            logger.debug(f"[__init__] Input VStream Info: {self.input_vstream_info[0]}")
            logger.debug(f"[__init__] Output VStream Info: {self.output_vstream_info[0]}")
            
        except HailoRTException as e:
            logger.error(f"HailoRTException during initialization: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize Hailo device: {e}")
            raise

    def check_and_prepare_model(self):
        """Download and prepare the model if necessary"""
        if not os.path.exists(self.cache_dir):
            os.makedirs(self.cache_dir)

        model_filename = f"{self.h8l_model_type}.hef"
        model_file_path = os.path.join(self.cache_dir, model_filename)
        self.h8l_model_path = model_file_path

        if not os.path.isfile(model_file_path):
            logger.info(
                f"A model file was not found at {model_file_path}, Downloading one from {self.model_url}."
            )
            urllib.request.urlretrieve(self.model_url, model_file_path)
            logger.info(f"A model file was downloaded to {model_file_path}.")
        else:
            logger.info(
                f"A model file already exists at {model_file_path} not downloading one."
            )

    def detect_raw(self, tensor_input):
        logger.debug("[detect_raw] Entering function")
        logger.debug(
            f"[detect_raw] The `tensor_input` = {tensor_input} tensor_input shape = {tensor_input.shape}"
        )

        if tensor_input is None:
            raise ValueError("[detect_raw] The 'tensor_input' argument must be provided")

        # Ensure tensor_input is a numpy array
        if isinstance(tensor_input, list):
            tensor_input = np.array(tensor_input)
            logger.debug(
                f"[detect_raw] Converted tensor_input to numpy array: shape {tensor_input.shape}"
            )

        input_data = tensor_input
        logger.debug(
            f"[detect_raw] Input data for inference shape: {tensor_input.shape}, dtype: {tensor_input.dtype}"
        )

        try:
            with InferVStreams(
                self.network_group,
                self.input_vstream_params,
                self.output_vstream_params,
            ) as infer_pipeline:
                input_dict = {}
                if isinstance(input_data, dict):
                    input_dict = input_data
                    logger.debug("[detect_raw] it a dictionary.")
                elif isinstance(input_data, (list, tuple)):
                    for idx, layer_info in enumerate(self.input_vstream_info):
                        input_dict[layer_info.name] = input_data[idx]
                        logger.debug("[detect_raw] converted from list/tuple.")
                else:
                    if len(input_data.shape) == 3:
                        input_data = np.expand_dims(input_data, axis=0)
                        logger.debug("[detect_raw] converted from an array.")
                    input_dict[self.input_vstream_info[0].name] = input_data

                logger.debug(
                    f"[detect_raw] Input dictionary for inference keys: {input_dict.keys()}"
                )

                with self.network_group.activate(self.network_group_params):
                    raw_output = infer_pipeline.infer(input_dict)
                    logger.debug(f"[detect_raw] Raw inference output: {raw_output}")

                    if self.output_vstream_info[0].name not in raw_output:
                        logger.error(
                            f"[detect_raw] Missing output stream {self.output_vstream_info[0].name} in inference results"
                        )
                        return np.zeros((self.max_detections, 6), np.float32)

                    raw_output = raw_output[self.output_vstream_info[0].name][0]
                    logger.debug(
                        f"[detect_raw] Raw output for stream {self.output_vstream_info[0].name}: {raw_output}"
                    )

            # Process the raw output based on model type
            detections = self.process_detections(raw_output)
            if len(detections) == 0:
                logger.debug(
                    "[detect_raw] No detections found after processing. Setting default values."
                )
                return np.zeros((self.max_detections, 6), np.float32)
            else:
                return detections

        except HailoRTException as e:
            logger.error(f"[detect_raw] HailoRTException during inference: {e}")
            return np.zeros((self.max_detections, 6), np.float32)
        except Exception as e:
            logger.error(f"[detect_raw] Exception during inference: {e}")
            return np.zeros((self.max_detections, 6), np.float32)
        finally:
            logger.debug("[detect_raw] Exiting function")

    def process_detections(self, raw_detections, threshold=None):
        """Process detections based on model type"""
        if threshold is None:
            threshold = self.score_threshold

        if self.h8l_model_type == "ssd_mobilenet_v1":
            return self._process_ssd_detections(raw_detections, threshold)
        elif self.h8l_model_type == "yolov8s":
            return self._process_yolo_detections(raw_detections, threshold, version=8)
        elif self.h8l_model_type == "yolov6n":
            return self._process_yolo_detections(raw_detections, threshold, version=6)
        else:
            logger.error(f"Unsupported model type: {self.h8l_model_type}")
            return np.zeros((self.max_detections, 6), np.float32)

    def _process_ssd_detections(self, raw_detections, threshold):
        """Process SSD MobileNet detections"""
        boxes, scores, classes = [], [], []
        num_detections = 0

        try:
            for detection_set in raw_detections:
                if not isinstance(detection_set, np.ndarray) or detection_set.size == 0:
                    continue

                for detection in detection_set:
                    if detection.shape[0] == 0:
                        continue

                    ymin, xmin, ymax, xmax = detection[:4]
                    score = np.clip(detection[4], 0, 1)

                    if score < threshold:
                        continue

                    boxes.append([ymin, xmin, ymax, xmax])
                    scores.append(score)
                    classes.append(int(detection[5]))
                    num_detections += 1

            return self._format_output(boxes, scores, classes)

        except Exception as e:
            logger.error(f"Error processing SSD detections: {e}")
            return np.zeros((self.max_detections, 6), np.float32)

    def _process_yolo_detections(self, raw_detections, threshold, version):
        """Process YOLO detections (v6 and v8)"""
        boxes, scores, classes = [], [], []
        
        try:
            detections = raw_detections[0]
            
            for detection in detections:
                if version == 8:
                    confidence = detection[4]
                    if confidence < threshold:
                        continue
                    class_scores = detection[5:]
                else:  # YOLOv6
                    class_scores = detection[4:]
                    confidence = np.max(class_scores)
                    if confidence < threshold:
                        continue

                x, y, w, h = detection[:4]
                
                # Convert to corner format
                ymin = y - h/2
                xmin = x - w/2
                ymax = y + h/2
                xmax = x + w/2
                
                class_id = np.argmax(class_scores)
                
                boxes.append([ymin, xmin, ymax, xmax])
                scores.append(confidence)
                classes.append(class_id)

            return self._format_output(boxes, scores, classes)

        except Exception as e:
            logger.error(f"Error processing YOLO detections: {e}")
            return np.zeros((self.max_detections, 6), np.float32)

    def _format_output(self, boxes, scores, classes):
        """Format detections to standard output format"""
        if not boxes:
            return np.zeros((self.max_detections, 6), np.float32)
            
        combined = np.hstack((
            np.array(classes)[:, np.newaxis],
            np.array(scores)[:, np.newaxis],
            np.array(boxes)
        ))
        
        if combined.shape[0] < self.max_detections:
            padding = np.zeros((self.max_detections - combined.shape[0], 6), dtype=np.float32)
            combined = np.vstack((combined, padding))
        else:
            combined = combined[:self.max_detections]
            
        return combined