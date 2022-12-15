import logging
import importlib
import pkgutil
from typing import Union
from typing_extensions import Annotated
from enum import Enum
from pydantic import Field

from . import plugins
from .detection_api import DetectionApi
from .detector_config import BaseDetectorConfig


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

DetectorConfig = Annotated[
    Union[tuple(BaseDetectorConfig.__subclasses__())],
    Field(discriminator="type"),
]
