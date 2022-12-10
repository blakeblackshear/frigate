import logging
from typing import Dict, List, Optional, Tuple, Union, Literal
from typing_extensions import Annotated

import matplotlib.pyplot as plt
from pydantic import BaseModel, Extra, Field, validator, parse_obj_as
from pydantic.fields import PrivateAttr

from frigate.enums import InputTensorEnum, PixelFormatEnum
from frigate.util import load_labels
from .detector_types import DetectorTypeEnum


logger = logging.getLogger(__name__)


class ModelConfig(BaseModel):
    path: Optional[str] = Field(title="Custom Object detection model path.")
    labelmap_path: Optional[str] = Field(title="Label map for custom object detector.")
    width: int = Field(default=320, title="Object detection model input width.")
    height: int = Field(default=320, title="Object detection model input height.")
    labelmap: Dict[int, str] = Field(
        default_factory=dict, title="Labelmap customization."
    )
    input_tensor: InputTensorEnum = Field(
        default=InputTensorEnum.nhwc, title="Model Input Tensor Shape"
    )
    input_pixel_format: PixelFormatEnum = Field(
        default=PixelFormatEnum.rgb, title="Model Input Pixel Color Format"
    )
    _merged_labelmap: Optional[Dict[int, str]] = PrivateAttr()
    _colormap: Dict[int, Tuple[int, int, int]] = PrivateAttr()

    @property
    def merged_labelmap(self) -> Dict[int, str]:
        return self._merged_labelmap

    @property
    def colormap(self) -> Dict[int, Tuple[int, int, int]]:
        return self._colormap

    def __init__(self, **config):
        super().__init__(**config)

        self._merged_labelmap = {
            **load_labels(config.get("labelmap_path", "/labelmap.txt")),
            **config.get("labelmap", {}),
        }

        cmap = plt.cm.get_cmap("tab10", len(self._merged_labelmap.keys()))

        self._colormap = {}
        for key, val in self._merged_labelmap.items():
            self._colormap[val] = tuple(int(round(255 * c)) for c in cmap(key)[:3])

    class Config:
        extra = Extra.forbid


class DetectorConfig(BaseModel):
    type: str = Field(default=DetectorTypeEnum.cpu, title="Detector Type")
    model: ModelConfig = Field(
        default=None, title="Detector specific model configuration."
    )
    num_threads: Optional[int] = Field(default=3, title="Number of detection threads")
    device: Optional[str] = Field(default="usb", title="Device Type")

    class Config:
        extra = Extra.allow
        arbitrary_types_allowed = True


DEFAULT_DETECTORS = parse_obj_as(Dict[str, DetectorConfig], {"cpu": {"type": "cpu"}})
