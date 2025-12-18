import logging
import os.path
import re
import urllib.request
from typing import Literal

import cv2
import numpy as np
from pydantic import Field

from frigate.const import MODEL_CACHE_DIR, SUPPORTED_RK_SOCS
from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detection_runners import RKNNModelRunner
from frigate.detectors.detector_config import BaseDetectorConfig, ModelTypeEnum
from frigate.util.model import post_process_yolo
from frigate.util.rknn_converter import auto_convert_model

logger = logging.getLogger(__name__)

DETECTOR_KEY = "rknn"

supported_models = {
    ModelTypeEnum.yologeneric: "^frigate-fp16-yolov9-[cemst]$",
    ModelTypeEnum.yolonas: "^deci-fp16-yolonas_[sml]$",
    ModelTypeEnum.yolox: "^rock-(fp16|i8)-yolox_(nano|tiny)$",
}

model_cache_dir = os.path.join(MODEL_CACHE_DIR, "rknn_cache/")


class RknnDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    num_cores: int = Field(default=0, ge=0, le=3, title="Number of NPU cores to use.")


class Rknn(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, config: RknnDetectorConfig):
        super().__init__(config)
        self.height = config.model.height
        self.width = config.model.width
        core_mask = 2**config.num_cores - 1
        soc = self.get_soc()

        model_path = config.model.path or "deci-fp16-yolonas_s"

        model_props = self.parse_model_input(model_path, soc)

        if self.detector_config.model.model_type == ModelTypeEnum.yolox:
            self.calculate_grids_strides(expanded=False)

        if model_props["preset"]:
            config.model.model_type = model_props["model_type"]

            if model_props["model_type"] == ModelTypeEnum.yolonas:
                logger.info(
                    "You are using yolo-nas with weights from DeciAI. "
                    "These weights are subject to their license and can't be used commercially. "
                    "For more information, see: https://docs.deci.ai/super-gradients/latest/LICENSE.YOLONAS.html"
                )

        self.runner = RKNNModelRunner(
            model_path=model_props["path"],
            model_type=config.model.model_type.value
            if config.model.model_type
            else None,
            core_mask=core_mask,
        )

    def __del__(self):
        if hasattr(self, "runner") and self.runner:
            # The runner's __del__ method will handle cleanup
            pass

    def get_soc(self):
        try:
            with open("/proc/device-tree/compatible") as file:
                soc = file.read().split(",")[-1].strip("\x00")
        except FileNotFoundError:
            raise Exception("Make sure to run docker in privileged mode.")

        if soc not in SUPPORTED_RK_SOCS:
            raise Exception(
                f"Your SoC is not supported. Your SoC is: {soc}. Currently these SoCs are supported: {SUPPORTED_RK_SOCS}."
            )

        return soc

    def parse_model_input(self, model_path, soc):
        model_props = {}

        # find out if user provides his own model
        # user provided models should be a path and contain a "/"
        if "/" in model_path:
            model_props["preset"] = False

            # Check if this is an ONNX model or model without extension that needs conversion
            if model_path.endswith(".onnx") or not os.path.splitext(model_path)[1]:
                # Try to auto-convert to RKNN format
                logger.info(
                    f"Attempting to auto-convert {model_path} to RKNN format..."
                )

                # Determine model type from config
                model_type = self.detector_config.model.model_type

                # Convert enum to string if needed
                model_type_str = model_type.value if model_type else None

                # Auto-convert the model
                converted_path = auto_convert_model(model_path, model_type_str)

                if converted_path:
                    model_props["path"] = converted_path
                    logger.info(f"Successfully converted model to: {converted_path}")
                else:
                    # Fall back to original path if conversion fails
                    logger.warning(
                        f"Failed to convert {model_path} to RKNN format, using original path"
                    )
                    model_props["path"] = model_path
            else:
                model_props["path"] = model_path
        else:
            model_props["preset"] = True

            """
            Filenames follow this pattern:
            origin-quant-basename-soc-tk_version-rev.rknn
            origin: From where comes the model? default: upstream repo; rknn: modifications from airockchip
            quant: i8 or fp16
            basename: e.g. yolonas_s
            soc: e.g. rk3588
            tk_version: e.g. v2.0.0
            rev: e.g. 1

            Full name could be: default-fp16-yolonas_s-rk3588-v2.0.0-1.rknn
            """

            model_matched = False

            for model_type, pattern in supported_models.items():
                if re.match(pattern, model_path):
                    model_matched = True
                    model_props["model_type"] = model_type

            if model_matched:
                model_props["filename"] = model_path + f"-{soc}-v2.3.2-2.rknn"

                model_props["path"] = model_cache_dir + model_props["filename"]

                if not os.path.isfile(model_props["path"]):
                    self.download_model(model_props["filename"])
            else:
                supported_models_str = ", ".join(
                    model[1:-1] for model in supported_models
                )
                raise Exception(
                    f"Model {model_path} is unsupported. Provide your own model or choose one of the following: {supported_models_str}"
                )

        return model_props

    def download_model(self, filename):
        if not os.path.isdir(model_cache_dir):
            os.mkdir(model_cache_dir)

        GITHUB_ENDPOINT = os.environ.get("GITHUB_ENDPOINT", "https://github.com")
        urllib.request.urlretrieve(
            f"{GITHUB_ENDPOINT}/MarcA711/rknn-models/releases/download/v2.3.2-2/{filename}",
            model_cache_dir + filename,
        )

    def post_process_yolonas(self, output: list[np.ndarray]):
        """
        @param output: output of inference
        expected shape: [np.array(1, N, 4), np.array(1, N, 80)]
        where N depends on the input size e.g. N=2100 for 320x320 images

        @return: best results: np.array(20, 6) where each row is
        in this order (class_id, score, y1/height, x1/width, y2/height, x2/width)
        """

        N = output[0].shape[1]

        boxes = output[0].reshape(N, 4)
        scores = output[1].reshape(N, 80)

        class_ids = np.argmax(scores, axis=1)
        scores = scores[np.arange(N), class_ids]

        args_best = np.argwhere(scores > self.thresh)[:, 0]

        num_matches = len(args_best)
        if num_matches == 0:
            return np.zeros((20, 6), np.float32)
        elif num_matches > 20:
            args_best20 = np.argpartition(scores[args_best], -20)[-20:]
            args_best = args_best[args_best20]

        boxes = boxes[args_best]
        class_ids = class_ids[args_best]
        scores = scores[args_best]

        boxes = np.transpose(
            np.vstack(
                (
                    boxes[:, 1] / self.height,
                    boxes[:, 0] / self.width,
                    boxes[:, 3] / self.height,
                    boxes[:, 2] / self.width,
                )
            )
        )

        results = np.hstack(
            (class_ids[..., np.newaxis], scores[..., np.newaxis], boxes)
        )

        return np.resize(results, (20, 6))

    def post_process_yolox(
        self,
        predictions: list[np.ndarray],
        grids: np.ndarray,
        expanded_strides: np.ndarray,
    ) -> np.ndarray:
        def sp_flatten(_in: np.ndarray):
            ch = _in.shape[1]
            _in = _in.transpose(0, 2, 3, 1)
            return _in.reshape(-1, ch)

        boxes, scores, classes_conf = [], [], []

        input_data = [
            _in.reshape([1, -1] + list(_in.shape[-2:])) for _in in predictions
        ]

        for i in range(len(input_data)):
            unprocessed_box = input_data[i][:, :4, :, :]
            box_xy = unprocessed_box[:, :2, :, :]
            box_wh = np.exp(unprocessed_box[:, 2:4, :, :]) * expanded_strides[i]

            box_xy += grids[i]
            box_xy *= expanded_strides[i]
            box = np.concatenate((box_xy, box_wh), axis=1)

            # Convert [c_x, c_y, w, h] to [x1, y1, x2, y2]
            xyxy = np.copy(box)
            xyxy[:, 0, :, :] = box[:, 0, :, :] - box[:, 2, :, :] / 2  # top left x
            xyxy[:, 1, :, :] = box[:, 1, :, :] - box[:, 3, :, :] / 2  # top left y
            xyxy[:, 2, :, :] = box[:, 0, :, :] + box[:, 2, :, :] / 2  # bottom right x
            xyxy[:, 3, :, :] = box[:, 1, :, :] + box[:, 3, :, :] / 2  # bottom right y

            boxes.append(xyxy)
            scores.append(input_data[i][:, 4:5, :, :])
            classes_conf.append(input_data[i][:, 5:, :, :])

        # flatten data
        boxes = np.concatenate([sp_flatten(_v) for _v in boxes])
        classes_conf = np.concatenate([sp_flatten(_v) for _v in classes_conf])
        scores = np.concatenate([sp_flatten(_v) for _v in scores])

        # reshape and filter boxes
        box_confidences = scores.reshape(-1)
        class_max_score = np.max(classes_conf, axis=-1)
        classes = np.argmax(classes_conf, axis=-1)
        _class_pos = np.where(class_max_score * box_confidences >= 0.4)
        scores = (class_max_score * box_confidences)[_class_pos]
        boxes = boxes[_class_pos]
        classes = classes[_class_pos]

        # run nms
        indices = cv2.dnn.NMSBoxes(
            bboxes=boxes,
            scores=scores,
            score_threshold=0.4,
            nms_threshold=0.4,
        )

        results = np.zeros((20, 6), np.float32)

        if len(indices) > 0:
            for i, idx in enumerate(indices.flatten()[:20]):
                box = boxes[idx]
                results[i] = [
                    classes[idx],
                    scores[idx],
                    box[1] / self.height,
                    box[0] / self.width,
                    box[3] / self.height,
                    box[2] / self.width,
                ]

        return results

    def post_process(self, output):
        if self.detector_config.model.model_type == ModelTypeEnum.yolonas:
            return self.post_process_yolonas(output)
        elif self.detector_config.model.model_type == ModelTypeEnum.yologeneric:
            return post_process_yolo(output, self.width, self.height)
        elif self.detector_config.model.model_type == ModelTypeEnum.yolox:
            return self.post_process_yolox(output, self.grids, self.expanded_strides)
        else:
            raise ValueError(
                f'Model type "{self.detector_config.model.model_type}" is currently not supported.'
            )

    def detect_raw(self, tensor_input):
        # Prepare input for the runner
        inputs = {"input": tensor_input}
        output = self.runner.run(inputs)
        return self.post_process(output)
