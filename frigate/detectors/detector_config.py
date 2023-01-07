import logging
from enum import Enum
from typing import Dict, List, Optional, Tuple, Union, Literal
from typing_extensions import Annotated

import matplotlib.pyplot as plt
from pydantic import BaseModel, Extra, Field, validator
from pydantic.fields import PrivateAttr

from frigate.util import load_labels


logger = logging.getLogger(__name__)


class ModelTypeEnum(str, Enum):
    object = "object"
    audio = "audio"


class PixelFormatEnum(str, Enum):
    rgb = "rgb"
    bgr = "bgr"
    yuv = "yuv"


class InputTensorEnum(str, Enum):
    nchw = "nchw"
    nhwc = "nhwc"


class BaseModelConfig(BaseModel):
    type: str = Field(default="object", title="Model Type")
    path: Optional[str] = Field(title="Custom model path.")
    labelmap_path: Optional[str] = Field(title="Label map for custom model.")
    labelmap: Dict[int, str] = Field(
        default_factory=dict, title="Labelmap customization."
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
        self._colormap = {}

    def create_colormap(self, enabled_labels: set[str]) -> None:
        """Get a list of colors for enabled labels."""
        cmap = plt.cm.get_cmap("tab10", len(enabled_labels))

        for key, val in enumerate(enabled_labels):
            self._colormap[val] = tuple(int(round(255 * c)) for c in cmap(key)[:3])

    class Config:
        extra = Extra.allow
        arbitrary_types_allowed = True


class ObjectModelConfig(BaseModelConfig):
    type: Literal["object"] = "object"
    width: int = Field(default=320, title="Object detection model input width.")
    height: int = Field(default=320, title="Object detection model input height.")
    input_tensor: InputTensorEnum = Field(
        default=InputTensorEnum.nhwc, title="Model Input Tensor Shape"
    )
    input_pixel_format: PixelFormatEnum = Field(
        default=PixelFormatEnum.rgb, title="Model Input Pixel Color Format"
    )


class AudioModelConfig(BaseModelConfig):
    type: Literal["audio"] = "audio"
    duration: float = Field(default=0.975, title="Model Input Audio Duration")
    format: str = Field(default="s16le", title="Model Input Audio Format")
    sample_rate: int = Field(default=16000, title="Model Input Sample Rate")
    channels: int = Field(default=1, title="Model Input Number of Channels")

    def __init__(self, **config):
        super().__init__(**config)

        self._merged_labelmap = {
            **load_labels(config.get("labelmap_path", "/yamnet_label_list.txt")),
            **config.get("labelmap", {}),
        }


ModelConfig = Annotated[
    Union[tuple(BaseModelConfig.__subclasses__())],
    Field(discriminator="type"),
]


class BaseDetectorConfig(BaseModel):
    # the type field must be defined in all subclasses
    type: str = Field(default="cpu", title="Detector Type")
    model: Optional[ModelConfig]

    class Config:
        extra = Extra.allow
        arbitrary_types_allowed = True
