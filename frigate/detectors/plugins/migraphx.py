import logging

import ctypes
import sys
from pathlib import Path
from typing import Literal

import numpy as np
from pydantic import Field

from frigate.const import MODEL_CACHE_DIR
from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig
from frigate.detectors.detector_utils import apply_amd_compatibility_env_vars

logger = logging.getLogger(__name__)

DETECTOR_KEY = "migraphx"

class migraphxDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    device: str = Field(default="gpu", title="Device Type (gpu or cpu)")
    conserve_cpu: bool = Field(default=True, title="Conserve CPU at the expense of latency")
    fast_math: bool = Field(default=True, title="Optimize math functions to use faster approximate versions")
    exhaustive_tune: bool = Field(default=False, title="Use exhaustive search to find the fastest generated kernels")

class migraphxDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: migraphxDetectorConfig):
        super().__init__(detector_config)

        apply_amd_compatibility_env_vars()

        try:
            sys.path.append("/opt/rocm/lib")
            import migraphx
            logger.info(f"migraphx: loaded migraphx module")
        except ModuleNotFoundError:
            logger.error("migraphx: module loading failed, missing migraphx")
            raise

        assert detector_config.model.path is not None, "No model.path configured, please configure model.path"
        assert detector_config.model.labelmap_path is not None, "No model.labelmap_path configured, please configure model.labelmap_path"

        device = detector_config.device.lower()
        assert device in ["gpu", "cpu"], "Invalid device set, must be gpu (default) or cpu"

        try:
            if device == "gpu":
                if detector_config.conserve_cpu:
                    logger.info(f"migraphx: enabling hipDeviceScheduleYield to forcefully conserve CPU (conserve_cpu=true)")
                    ctypes.CDLL('/opt/rocm/lib/libamdhip64.so').hipSetDeviceFlags(4)
                else:
                    # Default to hipDeviceScheduleAuto
                    ctypes.CDLL('/opt/rocm/lib/libamdhip64.so').hipSetDeviceFlags(0)
        except Exception as e:
            logger.warning(f"migraphx: could not set hipSetDeviceFlags: {e}")

        cache_dir = Path(MODEL_CACHE_DIR) / "migraphx"
        cache_dir.mkdir(parents=True, exist_ok=True)

        path = Path(detector_config.model.path)
        filename = path.stem + ('_cpu' if device == 'cpu' else ('_tune' if detector_config.exhaustive_tune else ''))
        mxr_cache_path = cache_dir / f"{filename}.mxr"
        mxr_path = path.parent / f"{filename}.mxr"

        if mxr_cache_path.exists():
            logger.info(f"migraphx: loading compiled model from cache {mxr_cache_path}")
            self.model = migraphx.load(str(mxr_cache_path))

        elif mxr_path.exists():
            logger.info(f"migraphx: loading compiled model from {mxr_path}")
            self.model = migraphx.load(str(mxr_path))

        else:
            logger.info(f"migraphx: loading model from {path}")
            if path.suffix == '.onnx':
                self.model = migraphx.parse_onnx(str(path))
            else:
                raise Exception(f"migraphx: unknown model format {path}")

            self.model_output_shapes = self.model.get_output_shapes()
            self.model_is_nms = self.model_output_shapes[0].lens()[2] <= 7
            assert self.model_is_nms is False, "migraphx does not currently support NMS models"

            logger.info(f"migraphx: compiling the model... (fast_math: {detector_config.fast_math}, exhaustive_tune: {detector_config.exhaustive_tune})")
            self.model.compile(
                migraphx.get_target(device),
                offload_copy=True,
                fast_math=detector_config.fast_math,
                exhaustive_tune=detector_config.exhaustive_tune
            )

            logger.info(f"migraphx: saving compiled model into cache {mxr_cache_path}")
            migraphx.save(self.model, str(mxr_cache_path))

        self.model_param_name = self.model.get_parameter_names()[0]
        self.model_input_shape_obj = self.model.get_parameter_shapes()[self.model_param_name]
        self.model_input_shape = tuple(self.model_input_shape_obj.lens())
        self.model_input_arg = migraphx.generate_argument(self.model_input_shape_obj)
        self.model_input_array = np.frombuffer(self.model_input_arg, dtype=np.float32).reshape(self.model_input_shape)

        logger.info(f"migraphx: model loaded (input: {self.model_input_shape})")

    def preprocess(self, tensor_input):

        # Ensure we have a 4D tensor
        if tensor_input.ndim == 3:
            tensor_input = np.expand_dims(tensor_input, axis=0)

        target_n, target_c, target_h, target_w = self.model_input_shape

        # Ensure input shape is NCHW
        if tensor_input.shape[1] == target_c:
            # Already (N, C, H, W), do nothing
            pass
        elif tensor_input.shape[3] == target_c:
            # From (N, H, W, C) to (N, C, H, W)
            tensor_input = tensor_input.transpose(0, 3, 1, 2)
        elif tensor_input.shape[2] == target_c:
            # From (N, H, C, W) to (N, C, H, W)
            tensor_input = tensor_input.transpose(0, 2, 1, 3)

        np.copyto(self.model_input_array, tensor_input)

    def detect_raw(self, tensor_input):
        self.preprocess(tensor_input)

        outputs = self.model.run({self.model_param_name: self.model_input_arg})

        tensor_output = np.frombuffer(
            outputs[0],
            dtype=np.float32
        ).reshape(outputs[0].get_shape().lens())

        return self.optimized_process_yolo(tensor_output)

    def optimized_process_yolo(
        self,
        tensor_output,
        confidence_threshold=0.4,
        intersection_over_union_threshold=0.4,
        top_k=100
    ):
        # Transpose the raw output so each row represents one candidate detection
        # Typical YOLO format: [batch, features, candidates] -> [candidates, features]
        candidate_detections = tensor_output[0].T

        # Extract class probability scores
        class_probability_matrix = candidate_detections[:, 4:]

        # Identify the highest class score and its index for every candidate box
        max_class_scores = np.max(class_probability_matrix, axis=1)

        # Create a boolean mask to filter out low-confidence predictions immediately
        confidence_mask = max_class_scores > confidence_threshold

        # Early exit if no detections meet the minimum confidence requirements
        if not np.any(confidence_mask):
            return np.zeros((20, 6), dtype=np.float32)

        # Filter the detections, scores, and class IDs using the boolean mask
        filtered_detections = candidate_detections[confidence_mask]
        filtered_scores = max_class_scores[confidence_mask]

        # Limit detections to top_k, reducing the set
        if len(filtered_scores) > top_k:
            partition_idx = np.argpartition(-filtered_scores, top_k)[:top_k]
            filtered_detections = filtered_detections[partition_idx]
            filtered_scores = filtered_scores[partition_idx]

        # Obtain class IDs of reduced set
        filtered_class_ids = np.argmax(filtered_detections[:, 4:], axis=1)

        # YOLO boxes are typically [center_x, center_y, width, height]
        center_coordinates_and_dimensions = filtered_detections[:, :4]

        # Pre-calculate an inversion scale to convert pixels to 0.0-1.0 range
        # This replaces multiple division operations with a single multiplication later
        normalization_scale_vector = np.array([
            1.0 / self.width,
            1.0 / self.height,
            1.0 / self.width,
            1.0 / self.height
        ], dtype=np.float32)

        # Calculate half-widths and half-heights to find box corners
        half_dimensions = center_coordinates_and_dimensions[:, 2:4] * 0.5

        # Initialize a buffer for the corner-format boxes [x1, y1, x2, y2]
        corner_format_boxes = np.empty_like(center_coordinates_and_dimensions)

        # Calculate Top-Left corners (x1, y1)
        corner_format_boxes[:, :2] = (center_coordinates_and_dimensions[:, :2] - half_dimensions)

        # Calculate Bottom-Right corners (x2, y2)
        corner_format_boxes[:, 2:4] = (center_coordinates_and_dimensions[:, :2] + half_dimensions)

        # Transform pixel coordinates into normalized values (0.0 to 1.0)
        normalized_boxes = corner_format_boxes * normalization_scale_vector

        # Apply Non-Maximum Suppression (NMS) to remove redundant, overlapping boxes
        # returns indices of detections to keep
        nms_kept_indices = self.optimized_nms(
            normalized_boxes, 
            filtered_scores, 
            intersection_over_union_threshold
        )

        # Limit the number of detections to the top 20
        number_of_detections_to_save = min(len(nms_kept_indices), 20)
        top_detection_indices = nms_kept_indices[:number_of_detections_to_save]

        # Pre-allocate a fixed-size result array (20 detections, 6 columns each)
        # Column structure: [class_id, confidence, y1, x1, y2, x2]
        results = np.zeros((20, 6), dtype=np.float32)

        # Bulk assign data into results using the NMS indices
        # We explicitly swap X and Y during assignment to meet the [y1, x1, y2, x2] requirement
        results[:number_of_detections_to_save, 0] = filtered_class_ids[top_detection_indices] # class_id
        results[:number_of_detections_to_save, 1] = filtered_scores[top_detection_indices]    # confidence

        # Coordinate Mapping
        results[:number_of_detections_to_save, 2] = normalized_boxes[top_detection_indices, 1] # y1
        results[:number_of_detections_to_save, 3] = normalized_boxes[top_detection_indices, 0] # x1
        results[:number_of_detections_to_save, 4] = normalized_boxes[top_detection_indices, 3] # y2
        results[:number_of_detections_to_save, 5] = normalized_boxes[top_detection_indices, 2] # x2

        return results

    def optimized_nms(self, boxes, scores, iou_threshold):
        x1 = boxes[:, 0]
        y1 = boxes[:, 1]
        x2 = boxes[:, 2]
        y2 = boxes[:, 3]
        areas = (x2 - x1) * (y2 - y1)
        order = scores.argsort()[::-1]
        keep = []

        while order.size > 0:
            i = order[0]
            keep.append(i)
            if order.size == 1: break

            # Calculate intersection
            xx1 = np.maximum(x1[i], x1[order[1:]])
            yy1 = np.maximum(y1[i], y1[order[1:]])
            xx2 = np.minimum(x2[i], x2[order[1:]])
            yy2 = np.minimum(y2[i], y2[order[1:]])

            w = np.maximum(0.0, xx2 - xx1)
            h = np.maximum(0.0, yy2 - yy1)
            inter = w * h

            # IoU = Inter / (Area1 + Area2 - Inter)
            ovr = inter / (areas[i] + areas[order[1:]] - inter)

            # Filter indices
            inds = np.where(ovr <= iou_threshold)[0]
            order = order[inds + 1]

        return keep
