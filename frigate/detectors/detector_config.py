import logging
from enum import Enum
from typing import Dict, List, Optional, Tuple, Union, Literal

import matplotlib.pyplot as plt
from pydantic import BaseModel, Extra, Field, validator
from pydantic.fields import PrivateAttr

from frigate.util import load_labels


logger = logging.getLogger(__name__)


class PixelFormatEnum(str, Enum):
    rgb = "rgb"
    bgr = "bgr"
    yuv = "yuv"


class InputTensorEnum(str, Enum):
    nchw = "nchw"
    nhwc = "nhwc"


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


class BaseDetectorConfig(BaseModel):
    # the type field must be defined in all subclasses
    type: str = Field(default="cpu", title="Detector Type")
    cameras: List[str] = Field(default=None, title="Cameras to track")
    address: str = Field(default=None, title="Frigate Detection Queue Server Address")
    shared_memory: Union[bool, None] = Field(default=None, title="Use Shared Memory")
    model: ModelConfig = Field(
        default=None, title="Detector specific model configuration."
    )

    class Config:
        extra = Extra.allow
        arbitrary_types_allowed = True


class DetectionServerModeEnum(str, Enum):
    Full = "full"
    DetectionOnly = "detection_only"


class DetectionServerConfig(BaseModel):
    mode: DetectionServerModeEnum = Field(
        default=DetectionServerModeEnum.Full, title="Server mode"
    )
    ipc: str = Field(default="ipc://detection_broker.ipc", title="Broker IPC path")
    addresses: List[str] = Field(
        default=["tcp://127.0.0.1:5555"], title="Broker TCP addresses"
    )
