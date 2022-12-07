import logging

from .detector_type import DetectorTypeEnum

from abc import ABC, abstractmethod
from typing import Dict


logger = logging.getLogger(__name__)


class DetectionApi(ABC):
    _api_types = {}

    @abstractmethod
    def __init__(self, det_device=None, model_config=None):
        pass

    @abstractmethod
    def detect_raw(self, tensor_input):
        pass

    @staticmethod
    def register_api(det_type: DetectorTypeEnum, det_api):
        DetectionApi._api_types[det_type] = det_api

    @staticmethod
    def create(det_type: DetectorTypeEnum, **kwargs):
        api = DetectionApi._api_types.get(det_type)
        if not api:
            raise ValueError(det_type)
        return api(**kwargs)
