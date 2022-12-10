import logging
from abc import ABC, abstractmethod


logger = logging.getLogger(__name__)


class DetectionApi(ABC):
    type_key: str

    @abstractmethod
    def __init__(self, detector_config):
        pass

    @abstractmethod
    def detect_raw(self, tensor_input):
        pass
