import logging
import importlib
import pkgutil
from enum import Enum

from .detection_api import DetectionApi
from . import plugins


logger = logging.getLogger(__name__)


class StrEnum(str, Enum):
    pass


plugin_modules = [
    importlib.import_module(name)
    for finder, name, ispkg in pkgutil.iter_modules(
        plugins.__path__, plugins.__name__ + "."
    )
]

api_types = {det.type_key: det for det in DetectionApi.__subclasses__()}
DetectorTypeEnum = StrEnum("DetectorTypeEnum", {k: k for k in api_types})


def create_detector(detector_config):
    if detector_config.type == DetectorTypeEnum.cpu:
        logger.warning(
            "CPU detectors are not recommended and should only be used for testing or for trial purposes."
        )

    api = api_types.get(detector_config.type)
    if not api:
        raise ValueError(detector_config.type)
    return api(detector_config)
