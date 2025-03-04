import logging
import os
import subprocess
import urllib.request
import numpy as np
import queue
import threading
from functools import partial
from typing import Dict, Optional, List, Tuple
import cv2

try:
    from hailo_platform import (
        HEF,
        ConfigureParams,
        FormatType,
        HailoRTException,
        HailoStreamInterface,
        InputVStreamParams,
        OutputVStreamParams,
        VDevice,
        HailoSchedulingAlgorithm,
    )
except ModuleNotFoundError:
    pass

from pydantic import BaseModel, Field
from typing_extensions import Literal

from frigate.const import MODEL_CACHE_DIR
from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig, ModelTypeEnum, InputTensorEnum, PixelFormatEnum, InputDTypeEnum
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)


# ----------------- Inline Utility Functions ----------------- #


def preprocess_tensor(image: np.ndarray, model_w: int, model_h: int) -> np.ndarray:
    """
    Resize a NumPy array image with unchanged aspect ratio using padding.
    Optimized for the case where the image is 320x320 and the target is 640x640.
    Assumes the input image is of shape (H, W, 3).
    """
    # Remove batch dimension if present (assumes batch size of 1)
    if image.ndim == 4 and image.shape[0] == 1:
        image = image[0]

    h, w = image.shape[:2]

    # Fast path: if image is 320x320 and target is 640x640, simply double the size quickly.
    if (w, h) == (320, 320) and (model_w, model_h) == (640, 640):
        return cv2.resize(image, (model_w, model_h), interpolation=cv2.INTER_LINEAR)

    # Standard processing: calculate scaling factor to maintain aspect ratio.
    scale = min(model_w / w, model_h / h)
    new_w, new_h = int(w * scale), int(h * scale)

    # Resize with high-quality bicubic interpolation
    resized_image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

    # Create a new image with the target size filled with the padding color 114
    padded_image = np.full((model_h, model_w, 3), 114, dtype=image.dtype)

    # Calculate the center position for the resized image
    x_offset = (model_w - new_w) // 2
    y_offset = (model_h - new_h) // 2
    padded_image[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized_image

    return padded_image



def extract_detections(input_data: list, threshold: float = 0.5) -> dict:
    """
    (Legacy extraction function; not used by detect_raw below.)
    Extract detections from raw inference output.
    """
    boxes, scores, classes = [], [], []
    num_detections = 0
    for i, detection in enumerate(input_data):
        if len(detection) == 0:
            continue
        for det in detection:
            bbox, score = det[:4], det[4]
            if score >= threshold:
                boxes.append(bbox)
                scores.append(score)
                classes.append(i)
                num_detections += 1
    return {
        'detection_boxes': boxes,
        'detection_classes': classes,
        'detection_scores': scores,
        'num_detections': num_detections
    }
# ----------------- End of Utility Functions ----------------- #

# Global constants and default URLs
DETECTOR_KEY = "hailo8l"
ARCH = None
H8_DEFAULT_MODEL = "yolov6n.hef"
H8L_DEFAULT_MODEL = "yolov6n.hef"
H8_DEFAULT_URL = "https://hailo-model-zoo.s3.eu-west-2.amazonaws.com/ModelZoo/Compiled/v2.14.0/hailo8/yolov6n.hef"
H8L_DEFAULT_URL = "https://hailo-model-zoo.s3.eu-west-2.amazonaws.com/ModelZoo/Compiled/v2.14.0/hailo8l/yolov6n.hef"

def detect_hailo_arch():
    try:
        result = subprocess.run(['hailortcli', 'fw-control', 'identify'], capture_output=True, text=True)
        if result.returncode != 0:
            logger.error(f"Inference error: {result.stderr}")
            return None
        for line in result.stdout.split('\n'):
            if "Device Architecture" in line:
                if "HAILO8L" in line:
                    return "hailo8l"
                elif "HAILO8" in line:
                    return "hailo8"
        logger.error(f"Inference error: Could not determine Hailo architecture from device information.")
        return None
    except Exception as e:
        logger.error(f"Inference error: {e}")
        return None

# ----------------- Inline Asynchronous Inference Class ----------------- #
class HailoAsyncInference:
    def __init__(
        self,
        hef_path: str,
        input_queue: queue.Queue,
        output_queue: queue.Queue,
        batch_size: int = 1,
        input_type: Optional[str] = None,
        output_type: Optional[Dict[str, str]] = None,
        send_original_frame: bool = False,
    ) -> None:
        self.input_queue = input_queue
        self.output_queue = output_queue

        # Create VDevice parameters with round-robin scheduling
        params = VDevice.create_params()
        params.scheduling_algorithm = HailoSchedulingAlgorithm.ROUND_ROBIN

        # Load HEF and create the infer model
        self.hef = HEF(hef_path)
        self.target = VDevice(params)
        self.infer_model = self.target.create_infer_model(hef_path)
        self.infer_model.set_batch_size(batch_size)
        if input_type is not None:
            self._set_input_type(input_type)
        if output_type is not None:
            self._set_output_type(output_type)
        self.output_type = output_type
        self.send_original_frame = send_original_frame

    def _set_input_type(self, input_type: Optional[str] = None) -> None:
        self.infer_model.input().set_format_type(getattr(FormatType, input_type))

    def _set_output_type(self, output_type_dict: Optional[Dict[str, str]] = None) -> None:
        for output_name, output_type in output_type_dict.items():
            self.infer_model.output(output_name).set_format_type(getattr(FormatType, output_type))

    def callback(self, completion_info, bindings_list: List, input_batch: List):
        if completion_info.exception:
            logging.error(f"Inference error: {completion_info.exception}")
        else:
            for i, bindings in enumerate(bindings_list):
                if len(bindings._output_names) == 1:
                    result = bindings.output().get_buffer()
                else:
                    result = {
                        name: np.expand_dims(bindings.output(name).get_buffer(), axis=0)
                        for name in bindings._output_names
                    }
                self.output_queue.put((input_batch[i], result))

    def _create_bindings(self, configured_infer_model) -> object:
        if self.output_type is None:
            output_buffers = {
                output_info.name: np.empty(
                    self.infer_model.output(output_info.name).shape,
                    dtype=getattr(np, str(output_info.format.type).split(".")[1].lower())
                )
                for output_info in self.hef.get_output_vstream_infos()
            }
        else:
            output_buffers = {
                name: np.empty(
                    self.infer_model.output(name).shape,
                    dtype=getattr(np, self.output_type[name].lower())
                )
                for name in self.output_type
            }
        return configured_infer_model.create_bindings(output_buffers=output_buffers)

    def get_input_shape(self) -> Tuple[int, ...]:
        return self.hef.get_input_vstream_infos()[0].shape

    def run(self) -> None:
        # Configure the infer model once and reuse vstream settings via run_async
        with self.infer_model.configure() as configured_infer_model:
            while True:
                batch_data = self.input_queue.get()
                if batch_data is None:
                    break  # Sentinel to exit loop
                if self.send_original_frame:
                    original_batch, preprocessed_batch = batch_data
                else:
                    preprocessed_batch = batch_data
                bindings_list = []
                for frame in preprocessed_batch:
                    bindings = self._create_bindings(configured_infer_model)
                    bindings.input().set_buffer(np.array(frame))
                    bindings_list.append(bindings)
                configured_infer_model.wait_for_async_ready(timeout_ms=10000)
                job = configured_infer_model.run_async(
                    bindings_list,
                    partial(
                        self.callback,
                        input_batch=original_batch if self.send_original_frame else preprocessed_batch,
                        bindings_list=bindings_list,
                    )
                )
            job.wait(10000)  # Wait for the last job to complete
# ----------------- End of Async Class ----------------- #

# ----------------- HailoDetector Class ----------------- #
class HailoDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: 'HailoDetectorConfig'):
        global ARCH
        ARCH = detect_hailo_arch()
        self.cache_dir = MODEL_CACHE_DIR
        self.device_type = detector_config.device
        # Model attributes should be provided in detector_config.model
        self.model_path = detector_config.model.path if hasattr(detector_config.model, "path") else None
        self.model_height = detector_config.model.height if hasattr(detector_config.model, "height") else None
        self.model_width = detector_config.model.width if hasattr(detector_config.model, "width") else None
        self.model_type = detector_config.model.model_type if hasattr(detector_config.model, "model_type") else None
        self.tensor_format = detector_config.model.input_tensor if hasattr(detector_config.model, "input_tensor") else None
        self.pixel_format = detector_config.model.input_pixel_format if hasattr(detector_config.model, "input_pixel_format") else None
        self.input_dtype = detector_config.model.input_dtype if hasattr(detector_config.model, "input_dtype") else None
        self.url = detector_config.url
        self.output_type = "FLOAT32"
        self.working_model_path = self.check_and_prepare()

        # Set up asynchronous inference
        self.batch_size = 1
        self.input_queue = queue.Queue()
        self.output_queue = queue.Queue()
        try:
            logging.debug(f"[INIT] Loading HEF model from {self.working_model_path}")
            self.inference_engine = HailoAsyncInference(
                self.working_model_path,
                self.input_queue,
                self.output_queue,
                self.batch_size
            )
            self.input_shape = self.inference_engine.get_input_shape()
            logging.debug(f"[INIT] Model input shape: {self.input_shape}")
        except Exception as e:
            logging.error(f"[INIT] Failed to initialize HailoAsyncInference: {e}")
            raise

    @staticmethod
    def extract_model_name(path: str = None, url: str = None) -> str:
        model_name = None
        if path and path.endswith(".hef"):
            model_name = os.path.basename(path)
        elif url and url.endswith(".hef"):
            model_name = os.path.basename(url)
        else:
            print("Model name not found in path or URL. Checking default settings...")
            if ARCH == "hailo8":
                model_name = H8_DEFAULT_MODEL
            else:
                model_name = H8L_DEFAULT_MODEL
            print(f"Using default model: {model_name}")
        return model_name

    @staticmethod
    def download_model(url: str, destination: str):
        if not url.endswith(".hef"):
            raise ValueError("Invalid model URL. Only .hef files are supported.")
        try:
            urllib.request.urlretrieve(url, destination)
            print(f"Downloaded model to {destination}")
        except Exception as e:
            raise RuntimeError(f"Failed to download model from {url}: {str(e)}")

    def check_and_prepare(self) -> str:
        if not os.path.exists(self.cache_dir):
            os.makedirs(self.cache_dir)
        model_name = self.extract_model_name(self.model_path, self.url)
        model_path = os.path.join(self.cache_dir, model_name)
        if not self.model_path and not self.url:
            if os.path.exists(model_path):
                print(f"Model found in cache: {model_path}")
                return model_path
            else:
                print(f"Downloading default model: {model_name}")
                if ARCH == "hailo8":
                    self.download_model(H8_DEFAULT_URL, model_path)
                else:
                    self.download_model(H8L_DEFAULT_URL, model_path)
        elif self.model_path and self.url:
            if os.path.exists(self.model_path):
                print(f"Model found at path: {self.model_path}")
                return self.model_path
            else:
                print(f"Model not found at path. Downloading from URL: {self.url}")
                self.download_model(self.url, model_path)
        elif self.url:
            print(f"Downloading model from URL: {self.url}")
            self.download_model(self.url, model_path)
        elif self.model_path:
            if os.path.exists(self.model_path):
                print(f"Using existing model at: {self.model_path}")
                return self.model_path
            else:
                raise FileNotFoundError(f"Model file not found at: {self.model_path}")
        return model_path

    def detect_raw(self, tensor_input):
        logging.debug("[DETECT_RAW] Starting detection")

        # Pre process the input tensor
        logger.debug(f"[DETECT_RAW] Starting pre processing")
        tensor_input = self.preprocess(tensor_input)

        # Ensure tensor_input has a batch dimension
        if isinstance(tensor_input, np.ndarray) and len(tensor_input.shape) == 3:
            tensor_input = np.expand_dims(tensor_input, axis=0)
            logging.debug(f"[DETECT_RAW] Expanded input shape to {tensor_input.shape}")

        # Enqueue input and a sentinel value
        self.input_queue.put(tensor_input)
        self.input_queue.put(None)  # Sentinel value

        # Run the inference engine
        self.inference_engine.run()
        result = self.output_queue.get()
        if result is None:
            logging.error("[DETECT_RAW] No inference result received")
            return np.zeros((20, 6), dtype=np.float32)

        original_input, infer_results = result
        logging.debug("[DETECT_RAW] Inference completed.")

        # If infer_results is a single-element list, unwrap it.
        if isinstance(infer_results, list) and len(infer_results) == 1:
            infer_results = infer_results[0]

        # Set your threshold (adjust as needed)
        threshold = 0.4
        all_detections = []

    # Use the outer loop index to determine the class
        for class_id, detection_set in enumerate(infer_results):
            if not isinstance(detection_set, np.ndarray) or detection_set.size == 0:
                continue

            logging.debug(f"[DETECT_RAW] Processing detection set {class_id} with shape {detection_set.shape}")
            for det in detection_set:
                # Expect at least 5 elements: [ymin, xmin, ymax, xmax, confidence]
                if det.shape[0] < 5:
                    continue
                score = float(det[4])
                if score < threshold:
                    continue
                if hasattr(self, "labels") and self.labels:
                    logging.debug(f"[DETECT_RAW] Detected class id: {class_id} -> {self.labels[class_id]}")
                else:
                    logging.debug(f"[DETECT_RAW] Detected class id: {class_id}")

                all_detections.append([class_id, score, det[0], det[1], det[2], det[3]])


        if len(all_detections) == 0:
            return np.zeros((20, 6), dtype=np.float32)

        detections_array = np.array(all_detections, dtype=np.float32)

        # Pad or truncate to exactly 20 rows
        if detections_array.shape[0] > 20:
            detections_array = detections_array[:20, :]
        elif detections_array.shape[0] < 20:
            pad = np.zeros((20 - detections_array.shape[0], 6), dtype=np.float32)
            detections_array = np.vstack((detections_array, pad))


        logging.debug(f"[DETECT_RAW] Processed detections: {detections_array}")
        return detections_array

    # Preprocess method using inline utility
    def preprocess(self, image):
        if isinstance(image, np.ndarray):
            # Process the tensor input and reintroduce the batch dimension.
            processed = preprocess_tensor(image, self.input_shape[1], self.input_shape[0])
            return np.expand_dims(processed, axis=0)
        else:
            raise ValueError("Unsupported image format for preprocessing")


    # Close the Hailo device
    def close(self):
        logging.debug("[CLOSE] Closing HailoDetector")
        try:
            self.inference_engine.hef.close()
            logging.debug("Hailo device closed successfully")
        except Exception as e:
            logging.error(f"Failed to close Hailo device: {e}")
            raise

# ----------------- Configuration Class ----------------- #
class HailoDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    device: str = Field(default="PCIe", title="Device Type")
    url: Optional[str] = Field(default=None, title="Custom Model URL")
