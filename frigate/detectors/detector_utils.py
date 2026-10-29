import logging
import math
import os

import cv2
import numpy as np

from frigate.detectors.detector_config import ModelConfig, ModelTypeEnum
from frigate.util.model import xyxy_to_xywh_for_nms

try:
    from tflite_runtime.interpreter import Interpreter, load_delegate
except ModuleNotFoundError:
    from ai_edge_litert.interpreter import Interpreter, load_delegate


logger = logging.getLogger(__name__)


class TFLiteDetectionModel:
    """Object detection pre and post processing for a TFLite interpreter.

    Every TFLite detector shares this, differing only in how it builds the
    interpreter (on the CPU, or with the EdgeTPU or Teflon delegate).
    """

    supported_models = [
        ModelTypeEnum.ssd,
        ModelTypeEnum.yologeneric,
    ]

    def __init__(
        self, interpreter: Interpreter, model_config: ModelConfig, detector_key: str
    ):
        """Prepare the interpreter and work out the model's output layout.

        Args:
            interpreter: The TFLite interpreter, with any delegate loaded
            model_config: The model being run
            detector_key: The detector's type, for error messages
        """
        self.model_type = model_config.model_type

        if self.model_type not in self.supported_models:
            raise ValueError(
                f"{self.model_type.value} is currently not supported for {detector_key}. See the docs for more info on supported models."
            )

        self.interpreter = interpreter

        try:
            self.interpreter.allocate_tensors()
        except RuntimeError as e:
            # an EdgeTPU compiled model wraps its graph in a custom op that only
            # the EdgeTPU delegate can run
            if "edgetpu-custom-op" in str(e):
                logger.error(
                    "%s is compiled for the EdgeTPU and can only be run by an edgetpu detector",
                    model_config.path,
                )
            raise

        self.tensor_input_details = self.interpreter.get_input_details()
        self.tensor_output_details = self.interpreter.get_output_details()
        self.model_width = model_config.width
        self.model_height = model_config.height

        self.min_score = 0.4
        self.max_detections = 20

        self.model_requires_int8 = self.tensor_input_details[0]["dtype"] == np.int8

        if self.model_type == ModelTypeEnum.yologeneric:
            logger.debug("Using YOLO preprocessing/postprocessing")

            if len(self.tensor_output_details) not in [2, 3]:
                raise ValueError(
                    f"Invalid count of output tensors in YOLO model. Found {len(self.tensor_output_details)}, expecting 2 or 3."
                )

            self.reg_max = 16  # = 64 dfl_channels // 4 # YOLO standard
            self.min_logit_value = np.log(
                self.min_score / (1 - self.min_score)
            )  # for filtering
            self._generate_anchors_and_strides()  # decode bounding box DFL
            self.project = np.arange(
                self.reg_max, dtype=np.float32
            )  # for decoding bounding box DFL information

            # Determine YOLO tensor indices and quantization scales for
            # boxes and class_scores the tensor ordering and names are
            # not reliable, so use tensor shape to detect which tensor
            # holds boxes or class scores.
            # The tensors have shapes (B, N, C)
            # where N is the number of candidates (=2100 for 320x320)
            # this may guess wrong if the number of classes is exactly 64
            output_boxes_index = None
            output_classes_index = None
            for i, x in enumerate(self.tensor_output_details):
                # the nominal index seems to start at 1 instead of 0
                if len(x["shape"]) == 3 and x["shape"][2] == 64:
                    output_boxes_index = i
                elif len(x["shape"]) == 3 and x["shape"][2] > 1:
                    # require the number of classes to be more than 1
                    # to differentiate from (not used) max score tensor
                    output_classes_index = i
            if output_boxes_index is None or output_classes_index is None:
                logger.warning("Unrecognized model output, unexpected tensor shapes.")
                output_classes_index = (
                    0
                    if (output_boxes_index is None or output_classes_index == 1)
                    else 1
                )  # 0 is default guess
                output_boxes_index = 1 if (output_boxes_index == 0) else 0

            scores_details = self.tensor_output_details[output_classes_index]
            boxes_details = self.tensor_output_details[output_boxes_index]

            # post processing works on the raw quantized values, which a float
            # model doesn't have
            if np.issubdtype(scores_details["dtype"], np.floating) or np.issubdtype(
                boxes_details["dtype"], np.floating
            ):
                raise ValueError(
                    f"{model_config.path} has float outputs. YOLO models for TFLite must be int8 quantized."
                )

            self.scores_tensor_index = scores_details["index"]
            self.scores_scale, self.scores_zero_point = scores_details["quantization"]
            # calculate the quantized version of the min_score
            self.min_score_quantized = int(
                (self.min_logit_value / self.scores_scale) + self.scores_zero_point
            )
            self.logit_shift_to_positive_values = (
                max(0, math.ceil((128 + self.scores_zero_point) * self.scores_scale))
                + 1
            )  # round up

            self.boxes_tensor_index = boxes_details["index"]
            self.boxes_scale, self.boxes_zero_point = boxes_details["quantization"]

        elif self.model_type == ModelTypeEnum.ssd:
            logger.debug("Using SSD preprocessing/postprocessing")

            # SSD models end in TFLite_Detection_PostProcess, which outputs
            # boxes, class ids, scores and count
            if len(self.tensor_output_details) < 4:
                raise ValueError(
                    f"Invalid count of output tensors in SSD model. Found {len(self.tensor_output_details)}, expecting 4. YOLO models need a model_type of yolo-generic."
                )

    def _generate_anchors_and_strides(self):
        # for decoding the bounding box DFL information into xy coordinates
        all_anchors = []
        all_strides = []
        strides = (8, 16, 32)  # YOLO's small, medium, large detection heads

        for stride in strides:
            feat_h, feat_w = self.model_height // stride, self.model_width // stride

            grid_y, grid_x = np.meshgrid(
                np.arange(feat_h, dtype=np.float32),
                np.arange(feat_w, dtype=np.float32),
                indexing="ij",
            )

            grid_coords = np.stack((grid_x.flatten(), grid_y.flatten()), axis=1)
            anchor_points = grid_coords + 0.5

            all_anchors.append(anchor_points)
            all_strides.append(np.full((feat_h * feat_w, 1), stride, dtype=np.float32))

        self.anchors = np.concatenate(all_anchors, axis=0)
        self.anchor_strides = np.concatenate(all_strides, axis=0)

    def pre_process(self, tensor_input):
        if self.model_requires_int8:
            tensor_input = np.bitwise_xor(tensor_input, 128).view(
                np.int8
            )  # shift by -128
        return tensor_input

    def detect_raw(self, tensor_input):
        """Run the model on a frame.

        Args:
            tensor_input: The frame, already resized to the model's input

        Returns:
            Up to 20 detections as [class_id, score, ymin, xmin, ymax, xmax],
            padded with zeros
        """
        tensor_input = self.pre_process(tensor_input)

        self.interpreter.set_tensor(self.tensor_input_details[0]["index"], tensor_input)
        self.interpreter.invoke()

        if self.model_type == ModelTypeEnum.yologeneric:
            return self._post_process_yolo()

        return self._post_process_ssd()

    def _post_process_yolo(self):
        # Multi-tensor YOLO model with (non-standard B(H*W)C output format).
        # (the comments indicate the shape of tensors,
        # using "2100" as the anchor count (for image size of 320x320),
        # "NC" as number of classes,
        # "N" as the count that survive after min-score filtering)
        # TENSOR A) class scores (1, 2100, NC) with logit values
        # TENSOR B) box coordinates (1, 2100, 64) encoded as dfl scores
        # Recommend that the model clamp the logit values in tensor (A)
        # to the range [-4,+4] to preserve precision from [2%,98%]
        # and because NMS requires the min_score parameter to be >= 0

        # don't dequantize scores data yet, wait until the low-confidence
        # candidates are filtered out from the overall result set.
        # This reduces the work and makes post-processing faster.
        # this method works with raw quantized numbers when possible,
        # which relies on the value of the scale factor to be >0.
        # This speeds up max and argmax operations.
        # Get max confidence for each detection and create the mask
        detections = np.zeros(
            (self.max_detections, 6), np.float32
        )  # initialize zero results
        scores_output_quantized = self.interpreter.get_tensor(self.scores_tensor_index)[
            0
        ]  # (2100, NC)
        max_scores_quantized = np.max(scores_output_quantized, axis=1)  # (2100,)
        mask = max_scores_quantized >= self.min_score_quantized  # (2100,)

        if not np.any(mask):
            return detections  # empty results

        max_scores_filtered_shiftedpositive = (
            (max_scores_quantized[mask] - self.scores_zero_point) * self.scores_scale
        ) + self.logit_shift_to_positive_values  # (N,1) shifted logit values
        scores_output_quantized_filtered = scores_output_quantized[mask]

        # dequantize boxes. NMS needs them to be in float format
        # remove candidates with probabilities < threshold
        boxes_output_quantized_filtered = (
            self.interpreter.get_tensor(self.boxes_tensor_index)[0]
        )[mask]  # (N, 64)
        boxes_output_filtered = (
            boxes_output_quantized_filtered.astype(np.float32) - self.boxes_zero_point
        ) * self.boxes_scale

        # 2. Decode DFL to distances (ltrb)
        dfl_distributions = boxes_output_filtered.reshape(
            -1, 4, self.reg_max
        )  # (N, 4, 16)

        # Softmax over the 16 bins
        dfl_max = np.max(dfl_distributions, axis=2, keepdims=True)
        dfl_exp = np.exp(dfl_distributions - dfl_max)
        dfl_probs = dfl_exp / np.sum(dfl_exp, axis=2, keepdims=True)  # (N, 4, 16)

        # Weighted sum: (N, 4, 16) * (16,) -> (N, 4)
        distances = np.einsum("pcr,r->pc", dfl_probs, self.project)

        # Calculate box corners in pixel coordinates
        anchors_filtered = self.anchors[mask]
        anchor_strides_filtered = self.anchor_strides[mask]
        x1y1 = (
            anchors_filtered - distances[:, [0, 1]]
        ) * anchor_strides_filtered  # (N, 2)
        x2y2 = (
            anchors_filtered + distances[:, [2, 3]]
        ) * anchor_strides_filtered  # (N, 2)
        boxes_filtered_decoded = np.concatenate((x1y1, x2y2), axis=-1)  # (N, 4)

        # 9. Apply NMS. Use logit scores here to defer sigmoid()
        # until after filtering out redundant boxes
        # Shift the logit scores to be non-negative (required by cv2)
        indices = cv2.dnn.NMSBoxes(
            bboxes=xyxy_to_xywh_for_nms(boxes_filtered_decoded),
            scores=max_scores_filtered_shiftedpositive,
            score_threshold=(
                self.min_logit_value + self.logit_shift_to_positive_values
            ),
            nms_threshold=0.4,  # should this be a model config setting?
        )
        num_detections = len(indices)
        if num_detections == 0:
            return detections  # empty results

        nms_indices = np.array(indices, dtype=np.int32).ravel()  # or .flatten()
        if num_detections > self.max_detections:
            nms_indices = nms_indices[: self.max_detections]
            num_detections = self.max_detections
        kept_logits_quantized = scores_output_quantized_filtered[nms_indices]
        class_ids_post_nms = np.argmax(kept_logits_quantized, axis=1)

        # Extract the final boxes and scores using fancy indexing
        final_boxes = boxes_filtered_decoded[nms_indices]
        final_scores_logits = (
            max_scores_filtered_shiftedpositive[nms_indices]
            - self.logit_shift_to_positive_values
        )  # Unshifted logits

        # Detections array format: [class_id, score, ymin, xmin, ymax, xmax]
        detections[:num_detections, 0] = class_ids_post_nms
        detections[:num_detections, 1] = 1.0 / (
            1.0 + np.exp(-final_scores_logits)
        )  # sigmoid
        detections[:num_detections, 2] = final_boxes[:, 1] / self.model_height
        detections[:num_detections, 3] = final_boxes[:, 0] / self.model_width
        detections[:num_detections, 4] = final_boxes[:, 3] / self.model_height
        detections[:num_detections, 5] = final_boxes[:, 2] / self.model_width
        return detections

    def _post_process_ssd(self):
        boxes = self.interpreter.tensor(self.tensor_output_details[0]["index"])()[0]
        class_ids = self.interpreter.tensor(self.tensor_output_details[1]["index"])()[0]
        scores = self.interpreter.tensor(self.tensor_output_details[2]["index"])()[0]
        count = int(
            self.interpreter.tensor(self.tensor_output_details[3]["index"])()[0]
        )

        detections = np.zeros((self.max_detections, 6), np.float32)

        for i in range(count):
            if scores[i] < self.min_score:
                break
            if i == self.max_detections:
                logger.debug("Too many detections (%s)", count)
                break
            detections[i] = [
                class_ids[i],
                float(scores[i]),
                boxes[i][0],
                boxes[i][1],
                boxes[i][2],
                boxes[i][3],
            ]

        return detections


def tflite_load_delegate_interpreter(
    delegate_library: str, detector_config, device_config
):
    try:
        logger.info("Attempting to load NPU")
        tf_delegate = load_delegate(delegate_library, device_config)
        logger.info("NPU found")
        interpreter = Interpreter(
            model_path=detector_config.model.path,
            experimental_delegates=[tf_delegate],
        )
        return interpreter
    except ValueError:
        _, ext = os.path.splitext(detector_config.model.path)

        if ext and ext != ".tflite":
            logger.error(
                "Incorrect model used with NPU. Only .tflite models can be used with a TFLite delegate."
            )
        else:
            logger.error(
                "No NPU was detected. If you do not have a TFLite device yet, you must configure CPU detectors."
            )

        raise
