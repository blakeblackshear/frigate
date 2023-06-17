import importlib
import logging
import pkgutil
from enum import Enum
from typing import Union

from pydantic import Field
from typing_extensions import Annotated

from . import plugins
from .detection_api import DetectionApi
from .detector_config import BaseDetectorConfig

logger = logging.getLogger(__name__)


_included_modules = pkgutil.iter_modules(plugins.__path__, plugins.__name__ + ".")

plugin_modules = []

for _, name, _ in _included_modules:
    try:
        # currently openvino may fail when importing
        # on an arm device with 64 KiB page size.
        plugin_modules.append(importlib.import_module(name))
    except ImportError as e:
        logger.error(f"Error importing detector runtime: {e}")


api_types = {det.type_key: det for det in DetectionApi.__subclasses__()}


class StrEnum(str, Enum):
    pass


DetectorTypeEnum = StrEnum("DetectorTypeEnum", {k: k for k in api_types})

DetectorConfig = Annotated[
    Union[tuple(BaseDetectorConfig.__subclasses__())],
    Field(discriminator="type"),
]
