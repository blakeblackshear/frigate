import glob
import logging
import os
import shutil
import urllib.request
import zipfile
from queue import Queue

import cv2
import numpy as np
from pydantic import BaseModel, ConfigDict, Field
from typing_extensions import Literal

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import (
    BaseDetectorConfig,
    ModelTypeEnum,
)
from frigate.util.file import FileLock

logger = logging.getLogger(__name__)

DETECTOR_KEY = "memryx"


# Configuration class for model settings
class ModelConfig(BaseModel):
    path: str = Field(default=None, title="Model Path")  # Path to the DFP file
    labelmap_path: str = Field(default=None, title="Path to Label Map")


class MemryXDetectorConfig(BaseDetectorConfig):
    """MemryX MX3 detector that runs compiled DFP models on MemryX accelerators."""

    model_config = ConfigDict(
        title="MemryX",
    )

    type: Literal[DETECTOR_KEY]
    device: str = Field(
        default="PCIe",
        title="Device Path",
        description="The device to use for MemryX inference (e.g. 'PCIe').",
    )


class MemryXDetector(DetectionApi):
    type_key = DETECTOR_KEY  # Set the type key
    supported_models = [
        ModelTypeEnum.ssd,
        ModelTypeEnum.yolonas,
        ModelTypeEnum.yologeneric,  # Treated as yolov9 in MemryX implementation
        ModelTypeEnum.yolox,
    ]

    def __init__(self, detector_config):
        """Initialize MemryX detector with the provided configuration."""
        try:
            # Import MemryX SDK
            from memryx import AsyncAccl
        except ModuleNotFoundError:
            raise ImportError(
                "MemryX SDK is not installed. Install it and set up MIX environment."
            )
            return

        # Initialize stop_event as None, will be set later by set_stop_event()
        self.stop_event = None

        model_cfg = getattr(detector_config, "model", None)

        # Check if model_type was explicitly set by the user
        if "model_type" in getattr(model_cfg, "__fields_set__", set()):
            detector_config.model.model_type = model_cfg.model_type
        else:
            logger.info(
                "model_type not set in config — defaulting to yolonas for MemryX."
            )
            detector_config.model.model_type = ModelTypeEnum.yolonas

        self.capture_queue = Queue(maxsize=10)
        self.output_queue = Queue(maxsize=10)
        self.capture_id_queue = Queue(maxsize=10)
        self.logger = logger

        self.memx_model_path = detector_config.model.path  # Path to .dfp file
        self.memx_post_model = None  # Path to .post file
        self.expected_post_model = None

        self.memx_device_path = detector_config.device  # Device path
        # Parse the device string to split PCIe:<index>
        device_str = self.memx_device_path
        self.device_id = []
        self.device_id.append(int(device_str.split(":")[1]))

        self.memx_model_height = detector_config.model.height
        self.memx_model_width = detector_config.model.width
        self.memx_model_type = detector_config.model.model_type

        self.cache_dir = "/memryx_models"

        if self.memx_model_type == ModelTypeEnum.yologeneric:
            model_mapping = {
                (640, 640): (
                    "https://developer.memryx.com/example_files/2p0_frigate/yolov9_640.zip",
                    "yolov9_640",
                ),
                (320, 320): (
                    "https://developer.memryx.com/example_files/2p0_frigate/yolov9_320.zip",
                    "yolov9_320",
                ),
            }
            self.model_url, self.model_folder = model_mapping.get(
                (self.memx_model_height, self.memx_model_width),
                (
                    "https://developer.memryx.com/example_files/2p0_frigate/yolov9_320.zip",
                    "yolov9_320",
                ),
            )
            self.expected_dfp_model = "YOLO_v9_small_onnx.dfp"

        elif self.memx_model_type == ModelTypeEnum.yolonas:
            model_mapping = {
                (640, 640): (
                    "https://developer.memryx.com/example_files/2p0_frigate/yolonas_640.zip",
                    "yolonas_640",
                ),
                (320, 320): (
                    "https://developer.memryx.com/example_files/2p0_frigate/yolonas_320.zip",
                    "yolonas_320",
                ),
            }
            self.model_url, self.model_folder = model_mapping.get(
                (self.memx_model_height, self.memx_model_width),
                (
                    "https://developer.memryx.com/example_files/2p0_frigate/yolonas_320.zip",
                    "yolonas_320",
                ),
            )
            self.expected_dfp_model = "yolo_nas_s.dfp"
            self.expected_post_model = "yolo_nas_s_post.onnx"

        elif self.memx_model_type == ModelTypeEnum.yolox:
            self.model_folder = "yolox"
            self.model_url = (
                "https://developer.memryx.com/example_files/2p0_frigate/yolox.zip"
            )
            self.expected_dfp_model = "YOLOX_640_640_3_onnx.dfp"
            self.set_strides_grids()

        elif self.memx_model_type == ModelTypeEnum.ssd:
            self.model_folder = "ssd"
            self.model_url = (
                "https://developer.memryx.com/example_files/2p0_frigate/ssd.zip"
            )
            self.expected_dfp_model = "SSDlite_MobileNet_v2_320_320_3_onnx.dfp"
            self.expected_post_model = "SSDlite_MobileNet_v2_320_320_3_onnx_post.onnx"

        self.check_and_prepare_model()
        logger.info(
            f"Initializing MemryX with model: {self.memx_model_path} on device {self.memx_device_path}"
        )

        try:
            # Load MemryX Model
            logger.info(f"dfp path: {self.memx_model_path}")

            # Initialization code
            # Load MemryX Model with a device target
            self.accl = AsyncAccl(
                self.memx_model_path,
                device_ids=self.device_id,  # AsyncAccl device ids
                local_mode=True,
            )

            # Models that use cropped post-processing sections (YOLO-NAS and SSD)
            # --> These will be moved to pure numpy in the future to improve performance on low-end CPUs
            if self.memx_post_model:
                self.accl.set_postprocessing_model(self.memx_post_model, model_idx=0)

            self.accl.connect_input(self.process_input)
            self.accl.connect_output(self.process_output)

            logger.info(
                f"Loaded MemryX model from {self.memx_model_path} and {self.memx_post_model}"
            )

        except Exception as e:
            logger.error(f"Failed to initialize MemryX model: {e}")
            raise

    def check_and_prepare_model(self):
        if not os.path.exists(self.cache_dir):
            os.makedirs(self.cache_dir, exist_ok=True)

        lock_path = os.path.join(self.cache_dir, f".{self.model_folder}.lock")
        lock = FileLock(lock_path, timeout=60)

        with lock:
            # ---------- CASE 1: user provided a custom model path ----------
            if self.memx_model_path:
                if not self.memx_model_path.endswith(".zip"):
                    raise ValueError(
                        f"Invalid model path: {self.memx_model_path}. "
                        "Only .zip files are supported. Please provide a .zip model archive."
                    )
                if not os.path.exists(self.memx_model_path):
                    raise FileNotFoundError(
                        f"Custom model zip not found: {self.memx_model_path}"
                    )

                logger.info(f"User provided zip model: {self.memx_model_path}")

                # Extract custom zip into a separate area so it never clashes with MemryX cache
                custom_dir = os.path.join(
                    self.cache_dir, "custom_models", self.model_folder
                )
                if os.path.isdir(custom_dir):
                    shutil.rmtree(custom_dir)
                os.makedirs(custom_dir, exist_ok=True)

                with zipfile.ZipFile(self.memx_model_path, "r") as zip_ref:
                    zip_ref.extractall(custom_dir)
                logger.info(f"Custom model extracted to {custom_dir}.")

                # Find .dfp and optional *_post.onnx recursively
                dfp_candidates = glob.glob(
                    os.path.join(custom_dir, "**", "*.dfp"), recursive=True
                )
                post_candidates = glob.glob(
                    os.path.join(custom_dir, "**", "*_post.onnx"), recursive=True
                )

                if not dfp_candidates:
                    raise FileNotFoundError(
                        "No .dfp file found in custom model zip after extraction."
                    )

                self.memx_model_path = dfp_candidates[0]

                # Handle post model requirements by model type
                if self.memx_model_type in [
                    ModelTypeEnum.yolonas,
                    ModelTypeEnum.ssd,
                ]:
                    if not post_candidates:
                        raise FileNotFoundError(
                            f"No *_post.onnx file found in custom model zip for {self.memx_model_type.name}."
                        )
                    self.memx_post_model = post_candidates[0]
                elif self.memx_model_type in [
                    ModelTypeEnum.yolox,
                    ModelTypeEnum.yologeneric,
                ]:
                    # Explicitly ignore any post model even if present
                    self.memx_post_model = None
                else:
                    # Future model types can optionally use post if present
                    self.memx_post_model = (
                        post_candidates[0] if post_candidates else None
                    )

                logger.info(f"Using custom model: {self.memx_model_path}")
                return

            # ---------- CASE 2: no custom model path -> use MemryX cached models ----------
            model_subdir = os.path.join(self.cache_dir, self.model_folder)
            dfp_path = os.path.join(model_subdir, self.expected_dfp_model)
            post_path = (
                os.path.join(model_subdir, self.expected_post_model)
                if self.expected_post_model
                else None
            )

            dfp_exists = os.path.exists(dfp_path)
            post_exists = os.path.exists(post_path) if post_path else True

            if dfp_exists and post_exists:
                logger.info("Using cached models.")
                self.memx_model_path = dfp_path
                self.memx_post_model = post_path
                return

            # ---------- CASE 3: download MemryX model (no cache) ----------
            logger.info(
                f"Model files not found locally. Downloading from {self.model_url}..."
            )
            zip_path = os.path.join(self.cache_dir, f"{self.model_folder}.zip")

            try:
                if not os.path.exists(zip_path):
                    urllib.request.urlretrieve(self.model_url, zip_path)
                    logger.info(f"Model ZIP downloaded to {zip_path}. Extracting...")

                if not os.path.exists(model_subdir):
                    with zipfile.ZipFile(zip_path, "r") as zip_ref:
                        zip_ref.extractall(self.cache_dir)
                    logger.info(f"Model extracted to {self.cache_dir}.")

                # Re-assign model paths after extraction
                self.memx_model_path = os.path.join(
                    model_subdir, self.expected_dfp_model
                )
                self.memx_post_model = (
                    os.path.join(model_subdir, self.expected_post_model)
                    if self.expected_post_model
                    else None
                )

            finally:
                if os.path.exists(zip_path):
                    try:
                        os.remove(zip_path)
                        logger.info("Cleaned up ZIP file after extraction.")
                    except Exception as e:
                        logger.warning(
                            f"Failed to remove downloaded zip {zip_path}: {e}"
                        )

    def send_input(self, connection_id, tensor_input: np.ndarray):
        """Pre-process (if needed) and send frame to MemryX input queue"""
        if tensor_input is None:
            raise ValueError("[send_input] No image data provided for inference")

        if self.memx_model_type == ModelTypeEnum.yolonas:
            if tensor_input.ndim == 4 and tensor_input.shape[1:] == (320, 320, 3):
                logger.debug("Transposing tensor from NHWC to NCHW for YOLO-NAS")
                tensor_input = np.transpose(
                    tensor_input, (0, 3, 1, 2)
                )  # (1, H, W, C) → (1, C, H, W)
                tensor_input = tensor_input.astype(np.float32)
                tensor_input /= 255

        if self.memx_model_type == ModelTypeEnum.yolox:
            # Remove batch dim → (3, 640, 640)
            tensor_input = tensor_input.squeeze(0)

            # Convert CHW to HWC for OpenCV
            tensor_input = np.transpose(tensor_input, (1, 2, 0))  # (640, 640, 3)

            padded_img = np.ones((640, 640, 3), dtype=np.uint8) * 114

            scale = min(
                640 / float(tensor_input.shape[0]), 640 / float(tensor_input.shape[1])
            )
            sx, sy = (
                int(tensor_input.shape[1] * scale),
                int(tensor_input.shape[0] * scale),
            )

            resized_img = cv2.resize(
                tensor_input, (sx, sy), interpolation=cv2.INTER_LINEAR
            )
            padded_img[:sy, :sx] = resized_img.astype(np.uint8)

            # Step 4: Slice the padded image into 4 quadrants and concatenate them into 12 channels
            x0 = padded_img[0::2, 0::2, :]  # Top-left
            x1 = padded_img[1::2, 0::2, :]  # Bottom-left
            x2 = padded_img[0::2, 1::2, :]  # Top-right
            x3 = padded_img[1::2, 1::2, :]  # Bottom-right

            # Step 5: Concatenate along the channel dimension (axis 2)
            concatenated_img = np.concatenate([x0, x1, x2, x3], axis=2)
            tensor_input = concatenated_img.astype(np.float32)
            # Convert to CHW format (12, 320, 320)
            tensor_input = np.transpose(tensor_input, (2, 0, 1))

            # Add batch dimension → (1, 12, 320, 320)
            tensor_input = np.expand_dims(tensor_input, axis=0)

        # Send frame to MemryX for processing
        self.capture_queue.put(tensor_input)
        self.capture_id_queue.put(connection_id)

    def process_input(self):
        """Input callback function: wait for frames in the input queue, preprocess, and send to MX3 (return)"""
        while True:
            # Check if shutdown is requested
            if self.stop_event and self.stop_event.is_set():
                logger.debug("[process_input] Stop event detected, returning None")
                return None
            try:
                # Wait for a frame from the queue with timeout to check stop_event periodically
                frame = self.capture_queue.get(block=True, timeout=0.5)

                return frame

            except Exception as e:
                # Silently handle queue.Empty timeouts (expected during normal operation)
                # Log any other unexpected exceptions
                if "Empty" not in str(type(e).__name__):
                    logger.warning(f"[process_input] Unexpected error: {e}")
                # Loop continues and will check stop_event at the top

    def receive_output(self):
        """Retrieve processed results from MemryX output queue + a copy of the original frame"""
        try:
            # Get connection ID with timeout
            connection_id = self.capture_id_queue.get(
                block=True, timeout=1.0
            )  # Get the corresponding connection ID
            detections = self.output_queue.get()  # Get detections from MemryX

            return connection_id, detections

        except Exception as e:
            # On timeout or stop event, return None
            if self.stop_event and self.stop_event.is_set():
                logger.debug("[receive_output] Stop event detected, exiting")
            # Silently handle queue.Empty timeouts, they're expected during normal operation
            elif "Empty" not in str(type(e).__name__):
                logger.warning(f"[receive_output] Error receiving output: {e}")

            return None, None

    def post_process_yolonas(self, output):
        predictions = output[0]

        detections = np.zeros((20, 6), np.float32)

        for i, prediction in enumerate(predictions):
            if i == 20:
                break

            (_, x_min, y_min, x_max, y_max, confidence, class_id) = prediction

            if class_id < 0:
                break

            detections[i] = [
                class_id,
                confidence,
                y_min / self.memx_model_height,
                x_min / self.memx_model_width,
                y_max / self.memx_model_height,
                x_max / self.memx_model_width,
            ]

        # Return the list of final detections
        self.output_queue.put(detections)

    def process_yolo(self, class_id, conf, pos):
        """
        Takes in class ID, confidence score, and array of [x, y, w, h] that describes detection position,
        returns an array that's easily passable back to Frigate.
        """
        return [
            class_id,  # class ID
            conf,  # confidence score
            (pos[1] - (pos[3] / 2)) / self.memx_model_height,  # y_min
            (pos[0] - (pos[2] / 2)) / self.memx_model_width,  # x_min
            (pos[1] + (pos[3] / 2)) / self.memx_model_height,  # y_max
            (pos[0] + (pos[2] / 2)) / self.memx_model_width,  # x_max
        ]

    def set_strides_grids(self):
        grids = []
        expanded_strides = []

        strides = [8, 16, 32]

        hsize_list = [self.memx_model_height // stride for stride in strides]
        wsize_list = [self.memx_model_width // stride for stride in strides]

        for hsize, wsize, stride in zip(hsize_list, wsize_list, strides):
            xv, yv = np.meshgrid(np.arange(wsize), np.arange(hsize))
            grid = np.stack((xv, yv), 2).reshape(1, -1, 2)
            grids.append(grid)
            shape = grid.shape[:2]
            expanded_strides.append(np.full((*shape, 1), stride))
        self.grids = np.concatenate(grids, 1)
        self.expanded_strides = np.concatenate(expanded_strides, 1)

    def sigmoid(self, x: np.ndarray) -> np.ndarray:
        return 1 / (1 + np.exp(-x))

    def onnx_concat(self, inputs: list, axis: int) -> np.ndarray:
        # Ensure all inputs are numpy arrays
        if not all(isinstance(x, np.ndarray) for x in inputs):
            raise TypeError("All inputs must be numpy arrays.")

        # Ensure shapes match on non-concat axes
        ref_shape = list(inputs[0].shape)
        for i, tensor in enumerate(inputs[1:], start=1):
            for ax in range(len(ref_shape)):
                if ax == axis:
                    continue
                if tensor.shape[ax] != ref_shape[ax]:
                    raise ValueError(
                        f"Shape mismatch at axis {ax} between input[0] and input[{i}]"
                    )

        return np.concatenate(inputs, axis=axis)

    def onnx_reshape(self, data: np.ndarray, shape: np.ndarray) -> np.ndarray:
        # Ensure shape is a 1D array of integers
        target_shape = shape.astype(int).tolist()

        # Use NumPy reshape with dynamic handling of -1
        reshaped = np.reshape(data, target_shape)

        return reshaped

    def post_process_yolox(self, output):
        output_785 = output[0]  # 785
        output_794 = output[1]  # 794
        output_795 = output[2]  # 795
        output_811 = output[3]  # 811
        output_820 = output[4]  # 820
        output_821 = output[5]  # 821
        output_837 = output[6]  # 837
        output_846 = output[7]  # 846
        output_847 = output[8]  # 847

        output_795 = self.sigmoid(output_795)
        output_785 = self.sigmoid(output_785)
        output_821 = self.sigmoid(output_821)
        output_811 = self.sigmoid(output_811)
        output_847 = self.sigmoid(output_847)
        output_837 = self.sigmoid(output_837)

        concat_1 = self.onnx_concat([output_794, output_795, output_785], axis=1)
        concat_2 = self.onnx_concat([output_820, output_821, output_811], axis=1)
        concat_3 = self.onnx_concat([output_846, output_847, output_837], axis=1)

        shape = np.array([1, 85, -1], dtype=np.int64)

        reshape_1 = self.onnx_reshape(concat_1, shape)
        reshape_2 = self.onnx_reshape(concat_2, shape)
        reshape_3 = self.onnx_reshape(concat_3, shape)

        concat_out = self.onnx_concat([reshape_1, reshape_2, reshape_3], axis=2)

        output = concat_out.transpose(0, 2, 1)  # 1, 840, 85

        self.num_classes = output.shape[2] - 5

        # [x, y, h, w, box_score, class_no_1, ..., class_no_80],
        results = output

        results[..., :2] = (results[..., :2] + self.grids) * self.expanded_strides
        results[..., 2:4] = np.exp(results[..., 2:4]) * self.expanded_strides
        image_pred = results[0, ...]

        class_conf = np.max(
            image_pred[:, 5 : 5 + self.num_classes], axis=1, keepdims=True
        )
        class_pred = np.argmax(image_pred[:, 5 : 5 + self.num_classes], axis=1)
        class_pred = np.expand_dims(class_pred, axis=1)

        conf_mask = (image_pred[:, 4] * class_conf.squeeze() >= 0.3).squeeze()
        # Detections ordered as (x1, y1, x2, y2, obj_conf, class_conf, class_pred)
        detections = np.concatenate((image_pred[:, :5], class_conf, class_pred), axis=1)
        detections = detections[conf_mask]

        # Sort by class confidence (index 5) and keep top 20 detections
        ordered = detections[detections[:, 5].argsort()[::-1]][:20]

        # Prepare a final detections array of shape (20, 6)
        final_detections = np.zeros((20, 6), np.float32)
        for i, object_detected in enumerate(ordered):
            final_detections[i] = self.process_yolo(
                object_detected[6], object_detected[5], object_detected[:4]
            )

        self.output_queue.put(final_detections)

    def post_process_ssdlite(self, outputs):
        dets = outputs[0].squeeze(0)  # Shape: (1, num_dets, 5)
        labels = outputs[1].squeeze(0)

        detections = []

        for i in range(dets.shape[0]):
            x_min, y_min, x_max, y_max, confidence = dets[i]
            class_id = int(labels[i])  # Convert label to integer

            if confidence < 0.45:
                continue  # Skip detections below threshold

            # Convert coordinates to integers
            x_min, y_min, x_max, y_max = map(int, [x_min, y_min, x_max, y_max])

            # Append valid detections [class_id, confidence, x, y, width, height]
            detections.append([class_id, confidence, x_min, y_min, x_max, y_max])

        final_detections = np.zeros((20, 6), np.float32)

        if len(detections) == 0:
            # logger.info("No detections found.")
            self.output_queue.put(final_detections)
            return

        # Convert to NumPy array
        detections = np.array(detections, dtype=np.float32)

        # Apply Non-Maximum Suppression (NMS)
        bboxes = detections[:, 2:6].tolist()  # (x_min, y_min, width, height)
        scores = detections[:, 1].tolist()  # Confidence scores

        indices = cv2.dnn.NMSBoxes(bboxes, scores, 0.45, 0.5)

        if len(indices) > 0:
            indices = indices.flatten()[:20]  # Keep only the top 20 detections
            selected_detections = detections[indices]

            # Normalize coordinates AFTER NMS
            for i, det in enumerate(selected_detections):
                class_id, confidence, x_min, y_min, x_max, y_max = det

                # Normalize coordinates
                x_min /= self.memx_model_width
                y_min /= self.memx_model_height
                x_max /= self.memx_model_width
                y_max /= self.memx_model_height

                final_detections[i] = [class_id, confidence, y_min, x_min, y_max, x_max]

        self.output_queue.put(final_detections)

    def _generate_anchors(self, sizes=[80, 40, 20]):
        """Generate anchor points for YOLOv9 style processing"""
        yscales = []
        xscales = []
        for s in sizes:
            r = np.arange(s) + 0.5
            yscales.append(np.repeat(r, s))
            xscales.append(np.repeat(r[None, ...], s, axis=0).flatten())

        yscales = np.concatenate(yscales)
        xscales = np.concatenate(xscales)
        anchors = np.stack([xscales, yscales], axis=1)
        return anchors

    def _generate_scales(self, sizes=[80, 40, 20]):
        """Generate scaling factors for each detection level"""
        factors = [8, 16, 32]
        s = np.concatenate([np.ones([int(s * s)]) * f for s, f in zip(sizes, factors)])
        return s[:, None]

    @staticmethod
    def _softmax(x: np.ndarray, axis: int) -> np.ndarray:
        """Efficient softmax implementation"""
        x = x - np.max(x, axis=axis, keepdims=True)
        np.exp(x, out=x)
        x /= np.sum(x, axis=axis, keepdims=True)
        return x

    def dfl(self, x: np.ndarray) -> np.ndarray:
        """Distribution Focal Loss decoding - YOLOv9 style"""
        x = x.reshape(-1, 4, 16)
        weights = np.arange(16, dtype=np.float32)
        p = self._softmax(x, axis=2)
        p = p * weights[None, None, :]
        out = np.sum(p, axis=2, keepdims=False)
        return out

    def dist2bbox(
        self, x: np.ndarray, anchors: np.ndarray, scales: np.ndarray
    ) -> np.ndarray:
        """Convert distances to bounding boxes - YOLOv9 style"""
        lt = x[:, :2]
        rb = x[:, 2:]

        x1y1 = anchors - lt
        x2y2 = anchors + rb

        wh = x2y2 - x1y1
        c_xy = (x1y1 + x2y2) / 2

        out = np.concatenate([c_xy, wh], axis=1)
        out = out * scales
        return out

    def post_process_yolo_optimized(self, outputs):
        """
        Custom YOLOv9 post-processing optimized for MemryX ONNX outputs.
        Implements DFL decoding, confidence filtering, and NMS in pure NumPy.
        """
        # YOLOv9 outputs: 6 outputs (lbox, lcls, mbox, mcls, sbox, scls)
        conv_out1, conv_out2, conv_out3, conv_out4, conv_out5, conv_out6 = outputs

        # Determine grid sizes based on input resolution
        # YOLOv9 uses 3 detection heads with strides [8, 16, 32]
        # Grid sizes = input_size / stride
        sizes = [
            self.memx_model_height
            // 8,  # Large objects (e.g., 80 for 640x640, 40 for 320x320)
            self.memx_model_height
            // 16,  # Medium objects (e.g., 40 for 640x640, 20 for 320x320)
            self.memx_model_height
            // 32,  # Small objects (e.g., 20 for 640x640, 10 for 320x320)
        ]

        # Generate anchors and scales if not already done
        if not hasattr(self, "anchors"):
            self.anchors = self._generate_anchors(sizes)
            self.scales = self._generate_scales(sizes)

        # Process outputs in YOLOv9 format: reshape and moveaxis for ONNX format
        lbox = np.moveaxis(conv_out1, 1, -1)  # Large boxes
        lcls = np.moveaxis(conv_out2, 1, -1)  # Large classes
        mbox = np.moveaxis(conv_out3, 1, -1)  # Medium boxes
        mcls = np.moveaxis(conv_out4, 1, -1)  # Medium classes
        sbox = np.moveaxis(conv_out5, 1, -1)  # Small boxes
        scls = np.moveaxis(conv_out6, 1, -1)  # Small classes

        # Determine number of classes dynamically from the class output shape
        # lcls shape should be (batch, height, width, num_classes)
        num_classes = lcls.shape[-1]

        # Validate that all class outputs have the same number of classes
        if not (mcls.shape[-1] == num_classes and scls.shape[-1] == num_classes):
            raise ValueError(
                f"Class output shapes mismatch: lcls={lcls.shape}, mcls={mcls.shape}, scls={scls.shape}"
            )

        # Concatenate boxes and classes
        boxes = np.concatenate(
            [
                lbox.reshape(-1, 64),  # 64 is for 4 bbox coords * 16 DFL bins
                mbox.reshape(-1, 64),
                sbox.reshape(-1, 64),
            ],
            axis=0,
        )

        classes = np.concatenate(
            [
                lcls.reshape(-1, num_classes),
                mcls.reshape(-1, num_classes),
                scls.reshape(-1, num_classes),
            ],
            axis=0,
        )

        # Apply sigmoid to classes
        classes = self.sigmoid(classes)

        # Apply DFL to box predictions
        boxes = self.dfl(boxes)

        # YOLOv9 postprocessing with confidence filtering and NMS
        confidence_thres = 0.4
        iou_thres = 0.6

        # Find the class with the highest score for each detection
        max_scores = np.max(classes, axis=1)  # Maximum class score for each detection
        class_ids = np.argmax(classes, axis=1)  # Index of the best class

        # Filter out detections with scores below the confidence threshold
        valid_indices = np.where(max_scores >= confidence_thres)[0]
        if len(valid_indices) == 0:
            # Return empty detections array
            final_detections = np.zeros((20, 6), np.float32)
            return final_detections

        # Select only valid detections
        valid_boxes = boxes[valid_indices]
        valid_class_ids = class_ids[valid_indices]
        valid_scores = max_scores[valid_indices]

        # Convert distances to actual bounding boxes using anchors and scales
        valid_boxes = self.dist2bbox(
            valid_boxes, self.anchors[valid_indices], self.scales[valid_indices]
        )

        # Convert bounding box coordinates from (x_center, y_center, w, h) to (x_min, y_min, x_max, y_max)
        x_center, y_center, width, height = (
            valid_boxes[:, 0],
            valid_boxes[:, 1],
            valid_boxes[:, 2],
            valid_boxes[:, 3],
        )
        x_min = x_center - width / 2
        y_min = y_center - height / 2
        x_max = x_center + width / 2
        y_max = y_center + height / 2

        # Convert to format expected by cv2.dnn.NMSBoxes: [x, y, width, height]
        boxes_for_nms = []
        scores_for_nms = []

        for i in range(len(valid_indices)):
            # Ensure coordinates are within bounds and positive
            x_min_clipped = max(0, x_min[i])
            y_min_clipped = max(0, y_min[i])
            x_max_clipped = min(self.memx_model_width, x_max[i])
            y_max_clipped = min(self.memx_model_height, y_max[i])

            width_clipped = x_max_clipped - x_min_clipped
            height_clipped = y_max_clipped - y_min_clipped

            if width_clipped > 0 and height_clipped > 0:
                boxes_for_nms.append(
                    [x_min_clipped, y_min_clipped, width_clipped, height_clipped]
                )
                scores_for_nms.append(float(valid_scores[i]))

        final_detections = np.zeros((20, 6), np.float32)

        if len(boxes_for_nms) == 0:
            return final_detections

        # Apply NMS using OpenCV
        indices = cv2.dnn.NMSBoxes(
            boxes_for_nms, scores_for_nms, confidence_thres, iou_thres
        )

        if len(indices) > 0:
            # Flatten indices if they are returned as a list of arrays
            if isinstance(indices[0], list) or isinstance(indices[0], np.ndarray):
                indices = [i[0] for i in indices]

            # Limit to top 20 detections
            indices = indices[:20]

            # Convert to Frigate format: [class_id, confidence, y_min, x_min, y_max, x_max] (normalized)
            for i, idx in enumerate(indices):
                class_id = valid_class_ids[idx]
                confidence = valid_scores[idx]

                # Get the box coordinates
                box = boxes_for_nms[idx]
                x_min_norm = box[0] / self.memx_model_width
                y_min_norm = box[1] / self.memx_model_height
                x_max_norm = (box[0] + box[2]) / self.memx_model_width
                y_max_norm = (box[1] + box[3]) / self.memx_model_height

                final_detections[i] = [
                    class_id,
                    confidence,
                    y_min_norm,  # Frigate expects y_min first
                    x_min_norm,
                    y_max_norm,
                    x_max_norm,
                ]

        return final_detections

    def process_output(self, *outputs):
        """Output callback function -- receives frames from the MX3 and triggers post-processing"""
        if self.memx_model_type == ModelTypeEnum.yologeneric:
            # Use complete YOLOv9-style postprocessing (includes NMS)
            final_detections = self.post_process_yolo_optimized(outputs)

            self.output_queue.put(final_detections)

        elif self.memx_model_type == ModelTypeEnum.yolonas:
            return self.post_process_yolonas(outputs)

        elif self.memx_model_type == ModelTypeEnum.yolox:
            return self.post_process_yolox(outputs)

        elif self.memx_model_type == ModelTypeEnum.ssd:
            return self.post_process_ssdlite(outputs)

        else:
            raise Exception(
                f"{self.memx_model_type} is currently not supported for memryx. See the docs for more info on supported models."
            )

    def set_stop_event(self, stop_event):
        """Set the stop event for graceful shutdown."""
        self.stop_event = stop_event

    def shutdown(self):
        """Gracefully shutdown the MemryX accelerator"""
        try:
            if hasattr(self, "accl") and self.accl is not None:
                self.accl.shutdown()
                logger.info("MemryX accelerator shutdown complete")
        except Exception as e:
            logger.error(f"Error during MemryX shutdown: {e}")

    def detect_raw(self, tensor_input: np.ndarray):
        """Removed synchronous detect_raw() function so that we only use async"""
        return 0
