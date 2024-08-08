import logging
from abc import ABC, abstractmethod
from typing import List

import numpy as np

from frigate.detectors.detector_config import ModelTypeEnum

logger = logging.getLogger(__name__)


class DetectionApi(ABC):
    type_key: str
    supported_models: List[ModelTypeEnum]

    @abstractmethod
    def __init__(self, detector_config):
        self.detector_config = detector_config
        self.thresh = 0.5
        self.height = detector_config.model.height
        self.width = detector_config.model.width

    @abstractmethod
    def detect_raw(self, tensor_input):
        pass

    def post_process_yolonas(self, output):
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

    def post_process(self, output):
        if self.detector_config.model.model_type == ModelTypeEnum.yolonas:
            return self.post_process_yolonas(output)
        else:
            raise ValueError(
                f'Model type "{self.detector_config.model.model_type}" is currently not supported.'
            )
