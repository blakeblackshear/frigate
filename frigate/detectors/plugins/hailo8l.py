import logging
import os
import subprocess
import urllib.request

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
from typing import Dict, Optional, List

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig, ModelTypeEnum, InputTensorEnum, PixelFormatEnum, InputDTypeEnum

# Setup logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
file_handler = logging.FileHandler('hailo_detector_debug.log')
file_handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

# Define the detector key for Hailo
DETECTOR_KEY = "hailo8l"
ARCH = None

def detect_hailo_arch():
    try:
        # Run the hailortcli command to get device information
        result = subprocess.run(['hailortcli', 'fw-control', 'identify'], capture_output=True, text=True)

        # Check if the command was successful
        if result.returncode != 0:
            print(f"Error running hailortcli: {result.stderr}")
            return None

        # Search for the "Device Architecture" line in the output
        for line in result.stdout.split('\n'):
            if "Device Architecture" in line:
                if "HAILO8L" in line:
                    return "hailo8l"
                elif "HAILO8" in line:
                    return "hailo8"

        print("Could not determine Hailo architecture from device information.")
        return None
    except Exception as e:
        print(f"An error occurred while detecting Hailo architecture: {e}")
        return None


# Configuration class for Hailo detector
class HailoDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]  # Type of the detector
    device: str = Field(default="PCIe", title="Device Type")  # Device type (e.g., PCIe)
    url: Optional[str] = Field(default=None, title="Custom Model URL")

# Hailo detector class implementation
class HailoDetector(DetectionApi):
    type_key = DETECTOR_KEY  # Set the type key to the Hailo detector key
    
    def __init__(self, detector_config: HailoDetectorConfig):
        print(f"[INIT] Starting HailoDetector initialization with config: {detector_config}")
        logger.info(f"[INIT] Starting HailoDetector initialization with config: {detector_config}")

        # Set global ARCH variable
        global ARCH
        ARCH = detect_hailo_arch()
        logger.info(f"[INIT] Detected Hailo architecture: {ARCH}")

        supported_models = [
            ModelTypeEnum.ssd,
            ModelTypeEnum.yolov9,
            ModelTypeEnum.hailoyolo,
        ]

        # Initialize device type and model path from the configuration
        self.h8l_device_type = detector_config.device
        self.h8l_model_path = detector_config.model.path
        self.h8l_model_type = detector_config.model.model_type

        # Set configuration based on model type
        self.set_correct_config(self.h8l_model_type)

        # Override with custom URL if provided
        if hasattr(detector_config, "url") and detector_config.url:
            self.model_url = detector_config.url
            self.expected_model_filename = self.model_url.split('/')[-1]

        self.check_and_prepare_model()
        try:
            # Validate device type
            if self.h8l_device_type not in ["PCIe", "M.2"]:
                raise ValueError(f"Unsupported device type: {self.h8l_device_type}")

            # Initialize the Hailo device
            logger.info("[INIT] Creating VDevice instance")
            self.target = VDevice()

            # Load the HEF (Hailo's binary format for neural networks)
            logger.info(f"[INIT] Loading HEF from {self.h8l_model_path}")
            self.hef = HEF(self.h8l_model_path)

            # Create configuration parameters from the HEF
            logger.info("[INIT] Creating configuration parameters")
            self.configure_params = ConfigureParams.create_from_hef(
                hef=self.hef, interface=HailoStreamInterface.PCIe
            )

            # Configure the device with the HEF
            logger.info("[INIT] Configuring device with HEF")
            self.network_groups = self.target.configure(self.hef, self.configure_params)
            self.network_group = self.network_groups[0]
            self.network_group_params = self.network_group.create_params()

            # Create input and output virtual stream parameters
            logger.info("[INIT] Creating input/output stream parameters")
            self.input_vstream_params = InputVStreamParams.make(
                self.network_group,
                format_type=self.hef.get_input_vstream_infos()[0].format.type,
            )
            self.output_vstream_params = OutputVStreamParams.make(
                self.network_group, format_type=getattr(FormatType, self.output_type)
            )

            # Get input and output stream information from the HEF
            self.input_vstream_info = self.hef.get_input_vstream_infos()
            self.output_vstream_info = self.hef.get_output_vstream_infos()

            for i, info in enumerate(self.input_vstream_info):
                logger.info(f"[INIT] Input Stream {i}: Name={info.name}, Format={info.format}, Shape={info.shape}")

            for i, info in enumerate(self.output_vstream_info):
                logger.info(f"[INIT] Output Stream {i}: Name={info.name}, Format={info.format}, Shape={info.shape}")

            logger.info("Hailo device initialized successfully")
        except HailoRTException as e:
            logger.error(f"HailoRTException during initialization: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize Hailo device: {e}")
            raise

    def set_correct_config(self, modelname):
        if modelname == ModelTypeEnum.ssd:
            self.h8l_model_height = 300
            self.h8l_model_width = 300
            self.h8l_tensor_format = InputTensorEnum.nhwc
            self.h8l_pixel_format = PixelFormatEnum.rgb
            self.h8l_input_dtype = InputDTypeEnum.float
            self.cache_dir = "/config/model_cache/h8l_cache"
            self.expected_model_filename = "ssd_mobilenet_v1.hef"
            self.output_type = "FLOAT32"
            
            if ARCH == "hailo8":
                self.model_url = "https://hailo-model-zoo.s3.eu-west-2.amazonaws.com/ModelZoo/Compiled/v2.14.0/hailo8/ssd_mobilenet_v1.hef"
            else:             
                self.model_url = "https://hailo-model-zoo.s3.eu-west-2.amazonaws.com/ModelZoo/Compiled/v2.14.0/hailo8l/ssd_mobilenet_v1.hef"
        else:
            self.h8l_model_height = 640
            self.h8l_model_width = 640
            self.h8l_tensor_format = InputTensorEnum.nhwc
            self.h8l_pixel_format = PixelFormatEnum.rgb  # Default to RGB
            self.h8l_input_dtype = InputDTypeEnum.int
            self.cache_dir = "/config/model_cache/h8l_cache"
            self.output_type = "FLOAT32"
            
            if ARCH == "hailo8":
                self.model_url = "https://hailo-model-zoo.s3.eu-west-2.amazonaws.com/ModelZoo/Compiled/v2.14.0/hailo8/yolov8m.hef"
                self.expected_model_filename = "yolov8m.hef"
            else:             
                self.model_url = "https://hailo-model-zoo.s3.eu-west-2.amazonaws.com/ModelZoo/Compiled/v2.14.0/hailo8l/yolov8s.hef"
                self.expected_model_filename = "yolov8s.hef"
        
    def check_and_prepare_model(self):
        logger.info(f"[CHECK_MODEL] Checking for model at {self.cache_dir}/{self.expected_model_filename}")
        
        # Ensure cache directory exists
        if not os.path.exists(self.cache_dir):
            logger.info(f"[CHECK_MODEL] Creating cache directory: {self.cache_dir}")
            os.makedirs(self.cache_dir)

        # Check for the expected model file
        model_file_path = os.path.join(self.cache_dir, self.expected_model_filename)
        if not os.path.isfile(model_file_path):
            logger.info(f"[CHECK_MODEL] Model not found at {model_file_path}, downloading from {self.model_url}")
            urllib.request.urlretrieve(self.model_url, model_file_path)
            logger.info(f"[CHECK_MODEL] Model downloaded to {model_file_path}")
        else:
            logger.info(f"[CHECK_MODEL] Model already exists at {model_file_path}")

        self.h8l_model_path = model_file_path

    def detect_raw(self, tensor_input):
        logger.info("[DETECT_RAW] Starting detection")

        if tensor_input is None:
            error_msg = "[DETECT_RAW] The 'tensor_input' argument must be provided"
            logger.error(error_msg)
            raise ValueError(error_msg)

        # Log input tensor information
        logger.info(f"[DETECT_RAW] Input tensor type: {type(tensor_input)}")

        if isinstance(tensor_input, np.ndarray):
            logger.info(f"[DETECT_RAW] Input tensor shape: {tensor_input.shape}")
            logger.info(f"[DETECT_RAW] Input tensor dtype: {tensor_input.dtype}")
            logger.info(f"[DETECT_RAW] Input tensor min value: {np.min(tensor_input)}")
            logger.info(f"[DETECT_RAW] Input tensor max value: {np.max(tensor_input)}")
            logger.info(f"[DETECT_RAW] Input tensor mean value: {np.mean(tensor_input)}")

            # Print sample of the tensor (first few elements)
            flat_sample = tensor_input.flatten()[:10]
            logger.info(f"[DETECT_RAW] Input tensor sample: {flat_sample}")
        elif isinstance(tensor_input, list):
            logger.info(f"[DETECT_RAW] Input is a list with length: {len(tensor_input)}")
            tensor_input = np.array(tensor_input)
            logger.info(f"[DETECT_RAW] Converted to array with shape: {tensor_input.shape}, dtype: {tensor_input.dtype}")
        elif isinstance(tensor_input, dict):
            logger.info(f"[DETECT_RAW] Input is a dictionary with keys: {tensor_input.keys()}")

        input_data = tensor_input
        logger.debug("[DETECT_RAW] Input data prepared for inference")

        try:
            logger.info("[DETECT_RAW] Creating inference pipeline")
            with InferVStreams(
                self.network_group,
                self.input_vstream_params,
                self.output_vstream_params,
            ) as infer_pipeline:
                input_dict = {}
                if isinstance(input_data, dict):
                    logger.info("[DETECT_RAW] Input is already a dictionary, using as-is")
                    input_dict = input_data
                elif isinstance(input_data, (list, tuple)):
                    logger.info("[DETECT_RAW] Converting list/tuple to dictionary for inference")
                    for idx, layer_info in enumerate(self.input_vstream_info):
                        input_dict[layer_info.name] = input_data[idx]
                        logger.info(f"[DETECT_RAW] Assigned data to input layer '{layer_info.name}'")
                else:
                    if len(input_data.shape) == 3:
                        logger.info(f"[DETECT_RAW] Adding batch dimension to input with shape {input_data.shape}")
                        input_data = np.expand_dims(input_data, axis=0)
                        logger.info(f"[DETECT_RAW] New input shape after adding batch dimension: {input_data.shape}")
                    input_dict[self.input_vstream_info[0].name] = input_data
                    logger.info(f"[DETECT_RAW] Assigned data to input layer '{self.input_vstream_info[0].name}'")

                logger.info(f"[DETECT_RAW] Final input dictionary keys: {list(input_dict.keys())}")

                # Log details about each input layer
                for key, value in input_dict.items():
                    if isinstance(value, np.ndarray):
                        logger.info(f"[DETECT_RAW] Layer '{key}' has shape: {value.shape}, dtype: {value.dtype}")

                logger.info("[DETECT_RAW] Activating network group")
                with self.network_group.activate(self.network_group_params):
                    logger.info("[DETECT_RAW] Running inference")
                    raw_output = infer_pipeline.infer(input_dict)

                    logger.info(f"[DETECT_RAW] Inference complete, output keys: {list(raw_output.keys())}")

                    # Log details about output structure for debugging
                    for key, value in raw_output.items():
                        logger.info(f"[DETECT_RAW] Output layer '{key}' details:")
                        debug_output_structure(value, prefix="  ")

                    # Process outputs based on model type
                    if self.h8l_model_type in [ModelTypeEnum.hailoyolo, ModelTypeEnum.yolov9, ModelTypeEnum.yolox, ModelTypeEnum.yolonas]:
                        logger.info(f"[DETECT_RAW] Processing YOLO-type output for model type: {self.h8l_model_type}")
                        detections = self.process_yolo_output(raw_output)
                    else:
                        # Default to SSD processing
                        logger.info(f"[DETECT_RAW] Processing SSD output for model type: {self.h8l_model_type}")
                        expected_output_name = self.output_vstream_info[0].name
                        if expected_output_name not in raw_output:
                            error_msg = f"[DETECT_RAW] Missing output stream {expected_output_name} in inference results"
                            logger.error(error_msg)
                            return np.zeros((20, 6), np.float32)
                        detections = self.process_ssd_output(raw_output[expected_output_name])

                    logger.info(f"[DETECT_RAW] Processed detections shape: {detections.shape}")
                    return detections

        except HailoRTException as e:
            logger.error(f"[DETECT_RAW] HailoRTException during inference: {e}")
            return np.zeros((20, 6), np.float32)
        except Exception as e:
            logger.error(f"[DETECT_RAW] Exception during inference: {e}")
            return np.zeros((20, 6), np.float32)
        finally:
            logger.debug("[DETECT_RAW] Exiting function")
            
    def process_yolo_output(self, raw_output):
        """
        Process YOLO outputs to match the expected Frigate detection format.
        Returns detections in the format [class_id, score, ymin, xmin, ymax, xmax]
        """
        logger.info("[PROCESS_YOLO] Processing YOLO output")
        
        # Initialize empty array for our results - match TFLite format
        detections = np.zeros((20, 6), np.float32)
        
        try:
            # Identify output layers for boxes, classes, and scores
            boxes_layer = None
            classes_layer = None
            scores_layer = None
            count_layer = None
            
            # Try to identify layers by name pattern
            for key in raw_output.keys():
                key_lower = key.lower()
                if any(box_term in key_lower for box_term in ['box', 'bbox', 'location']):
                    boxes_layer = key
                elif any(class_term in key_lower for class_term in ['class', 'category', 'label']):
                    classes_layer = key
                elif any(score_term in key_lower for score_term in ['score', 'confidence', 'prob']):
                    scores_layer = key
                elif any(count_term in key_lower for count_term in ['count', 'num', 'detection_count']):
                    count_layer = key
            
            logger.info(f"[PROCESS_YOLO] Identified layers - Boxes: {boxes_layer}, Classes: {classes_layer}, "
                        f"Scores: {scores_layer}, Count: {count_layer}")
            
            # If we found all necessary layers
            if boxes_layer and classes_layer and scores_layer:
                # Extract data from the identified layers
                boxes = raw_output[boxes_layer]
                class_ids = raw_output[classes_layer]
                scores = raw_output[scores_layer]
                
                # If these are lists, extract the first element (batch)
                if isinstance(boxes, list) and len(boxes) > 0:
                    boxes = boxes[0]
                if isinstance(class_ids, list) and len(class_ids) > 0:
                    class_ids = class_ids[0]
                if isinstance(scores, list) and len(scores) > 0:
                    scores = scores[0]
                
                # Get detection count (if available)
                count = 0
                if count_layer:
                    count_val = raw_output[count_layer]
                    if isinstance(count_val, list) and len(count_val) > 0:
                        count_val = count_val[0]
                    count = int(count_val[0] if isinstance(count_val, np.ndarray) else count_val)
                else:
                    # Use the length of scores as count
                    count = len(scores) if hasattr(scores, '__len__') else 0
                
                # Process detections like in the example
                for i in range(count):
                    if i >= 20:  # Limit to 20 detections
                        break
                        
                    if scores[i] < 0.4:  # Use 0.4 threshold as in the example
                        continue
                        
                    # Add detection in the format [class_id, score, ymin, xmin, ymax, xmax]
                    detections[i] = [
                        float(class_ids[i]),
                        float(scores[i]),
                        float(boxes[i][0]),  # ymin
                        float(boxes[i][1]),  # xmin
                        float(boxes[i][2]),  # ymax
                        float(boxes[i][3]),  # xmax
                    ]
            else:
                # Fallback: Try to process output as a combined detection array
                logger.info("[PROCESS_YOLO] Couldn't identify separate output layers, trying unified format")
                
                # Look for a detection array in the output
                detection_layer = None
                for key, value in raw_output.items():
                    if isinstance(value, list) and len(value) > 0:
                        if isinstance(value[0], np.ndarray) and value[0].ndim >= 2:
                            detection_layer = key
                            break
                
                if detection_layer:
                    # Get the detection array
                    detection_array = raw_output[detection_layer]
                    if isinstance(detection_array, list):
                        detection_array = detection_array[0]  # First batch
                    
                    # Process each detection
                    detection_count = 0
                    for i, detection in enumerate(detection_array):
                        if detection_count >= 20:
                            break
                            
                        # Format depends on YOLO variant but typically includes:
                        # class_id, score, box coordinates (could be [x,y,w,h] or [xmin,ymin,xmax,ymax])
                        
                        # Extract elements based on shape
                        if len(detection) >= 6:  # Likely [class_id, score, xmin, ymin, xmax, ymax]
                            class_id = detection[0]
                            score = detection[1]
                            
                            # Check if this is actually [x, y, w, h, conf, class_id]
                            if score > 1.0:  # Score shouldn't be > 1, might be a coordinate
                                # Reorganize assuming [x, y, w, h, conf, class_id] format
                                x, y, w, h, confidence, *class_probs = detection
                                
                                # Get class with highest probability
                                if len(class_probs) > 1:
                                    class_id = np.argmax(class_probs)
                                    score = confidence * class_probs[class_id]
                                else:
                                    class_id = class_probs[0]
                                    score = confidence
                                
                                # Convert [x,y,w,h] to [ymin,xmin,ymax,xmax]
                                xmin = x - w/2
                                ymin = y - h/2
                                xmax = x + w/2
                                ymax = y + h/2
                            else:
                                # Use as is, but verify we have box coordinates
                                xmin, ymin, xmax, ymax = detection[2:6]
                        elif len(detection) >= 4:  # Might be [class_id, score, xmin, ymin]
                            class_id = detection[0]
                            score = detection[1]
                            # For incomplete boxes, assume zeros
                            xmin, ymin = detection[2:4]
                            xmax = xmin + 0.1  # Small default size
                            ymax = ymin + 0.1
                        else:
                            # Skip invalid detections
                            continue
                        
                        # Skip low confidence detections
                        if score < 0.4:
                            continue
                        
                        # Add to detection array
                        detections[detection_count] = [
                            float(class_id),
                            float(score),
                            float(ymin),
                            float(xmin),
                            float(ymax),
                            float(xmax)
                        ]
                        detection_count += 1
                        
            logger.info(f"[PROCESS_YOLO] Processed {np.count_nonzero(detections[:, 1] > 0)} valid detections")
                
        except Exception as e:
            logger.error(f"[PROCESS_YOLO] Error processing YOLO output: {e}")
            # detections already initialized as zeros
            
        return detections

    def process_ssd_output(self, raw_output):
        """
        Process SSD MobileNet v1 output with special handling for jagged arrays
        """
        logger.info("[PROCESS_SSD] Processing SSD output")

        # Initialize empty lists for our results
        all_detections = []

        try:
            if isinstance(raw_output, list) and len(raw_output) > 0:
                # Handle first level of nesting
                raw_detections = raw_output[0]
                logger.debug(f"[PROCESS_SSD] First level output type: {type(raw_detections)}")

                # Process all valid detections
                for i, detection_group in enumerate(raw_detections):
                    # Skip empty arrays or invalid data
                    if not isinstance(detection_group, np.ndarray):
                        continue

                    # Skip empty arrays
                    if detection_group.size == 0:
                        continue

                    # For the arrays with actual detections
                    if detection_group.shape[0] > 0:
                        # Extract the detection data - typical format is (ymin, xmin, ymax, xmax, score)
                        for j in range(detection_group.shape[0]):
                            detection = detection_group[j]

                            # Check if we have 5 values (expected format)
                            if len(detection) == 5:
                                ymin, xmin, ymax, xmax, score = detection
                                class_id = i  # Use index as class ID

                                # Add detection if score is reasonable
                                if 0 <= score <= 1.0 and score > 0.1:  # Basic threshold
                                    all_detections.append([float(class_id), float(score),
                                                        float(ymin), float(xmin),
                                                        float(ymax), float(xmax)])

            # Convert to numpy array if we have valid detections
            if all_detections:
                detections_array = np.array(all_detections, dtype=np.float32)

                # Sort by score (descending)
                sorted_idx = np.argsort(detections_array[:, 1])[::-1]
                detections_array = detections_array[sorted_idx]

                # Take top 20 (or fewer if less available)
                detections_array = detections_array[:20]
            else:
                detections_array = np.zeros((0, 6), dtype=np.float32)

        except Exception as e:
            logger.error(f"[PROCESS_SSD] Error processing SSD output: {e}")
            detections_array = np.zeros((0, 6), dtype=np.float32)

        # Pad to 20 detections if needed
        if len(detections_array) < 20:
            padding = np.zeros((20 - len(detections_array), 6), dtype=np.float32)
            detections_array = np.vstack((detections_array, padding))

        logger.info(f"[PROCESS_SSD] Final output shape: {detections_array.shape}")
        return detections_array

    def process_detections(self, raw_detections, threshold=0.5):
        """
        Legacy detection processing method, kept for compatibility.
        Now redirects to the more robust process_ssd_output method.
        """
        logger.info("[PROCESS] Starting to process detections")
        logger.info(f"[PROCESS] Using threshold: {threshold}")

        # Wrap the raw_detections in a list to match expected format for process_ssd_output
        if not isinstance(raw_detections, list):
            raw_detections = [raw_detections]

        # Process using the more robust method
        return self.process_ssd_output(raw_detections)

    def close(self):
        logger.info("[CLOSE] Closing Hailo device")
        try:
            self.target.close()
            logger.info("Hailo device closed successfully")
        except Exception as e:
            logger.error(f"Failed to close Hailo device: {e}")
            raise