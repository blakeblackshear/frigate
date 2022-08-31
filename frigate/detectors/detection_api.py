import logging

from abc import ABC, abstractmethod
from typing import Dict


logger = logging.getLogger(__name__)


class DetectionApi(ABC):
    @abstractmethod
    def __init__(self, det_device=None, model_config=None):
        pass

    @abstractmethod
    def detect_raw(self, tensor_input):
        pass
