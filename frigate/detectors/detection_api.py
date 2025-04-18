import logging
from abc import ABC, abstractmethod
from typing import List

import numpy as np

from frigate.detectors.detector_config import BaseDetectorConfig, ModelTypeEnum

logger = logging.getLogger(__name__)


class DetectionApi(ABC):
    type_key: str
    supported_models: List[ModelTypeEnum]

    @abstractmethod
    def __init__(self, detector_config: BaseDetectorConfig):
        self.detector_config = detector_config
        self.thresh = 0.4
        self.height = detector_config.model.height
        self.width = detector_config.model.width

    @abstractmethod
    def detect_raw(self, tensor_input):
        pass

    def calculate_grids_strides(self) -> None:
        grids = []
        expanded_strides = []

        # decode and orient predictions
        strides = [8, 16, 32]
        hsizes = [self.height // stride for stride in strides]
        wsizes = [self.width // stride for stride in strides]

        for hsize, wsize, stride in zip(hsizes, wsizes, strides):
            xv, yv = np.meshgrid(np.arange(wsize), np.arange(hsize))
            grid = np.stack((xv, yv), 2).reshape(1, -1, 2)
            grids.append(grid)
            shape = grid.shape[:2]
            expanded_strides.append(np.full((*shape, 1), stride))

        self.grids = np.concatenate(grids, 1)
        self.expanded_strides = np.concatenate(expanded_strides, 1)
