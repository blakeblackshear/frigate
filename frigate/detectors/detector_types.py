import logging
import importlib
import pkgutil
from enum import Enum

from . import plugins
from .detection_api import DetectionApi


logger = logging.getLogger(__name__)

plugin_modules = [
    importlib.import_module(name)
    for finder, name, ispkg in pkgutil.iter_modules(
        plugins.__path__, plugins.__name__ + "."
    )
]

api_types = {det.type_key: det for det in DetectionApi.__subclasses__()}


class StrEnum(str, Enum):
    pass


DetectorTypeEnum = StrEnum("DetectorTypeEnum", {k: k for k in api_types})
