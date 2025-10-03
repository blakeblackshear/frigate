import hashlib
import json
import logging
import os
from enum import Enum
from typing import Any, Dict, Optional, Tuple

import requests
from pydantic import BaseModel, ConfigDict, Field
from pydantic.fields import PrivateAttr

from frigate.const import DEFAULT_ATTRIBUTE_LABEL_MAP, MODEL_CACHE_DIR
from frigate.plus import PlusApi
from frigate.util.builtin import generate_color_palette, load_labels

logger = logging.getLogger(__name__)


class PixelFormatEnum(str, Enum):
    rgb = "rgb"
    bgr = "bgr"
    yuv = "yuv"


class InputTensorEnum(str, Enum):
    nchw = "nchw"
    nhwc = "nhwc"
    hwnc = "hwnc"
    hwcn = "hwcn"


class InputDTypeEnum(str, Enum):
    float = "float"
    float_denorm = "float_denorm"  # non-normalized float
    int = "int"


class ModelTypeEnum(str, Enum):
    dfine = "dfine"
    rfdetr = "rfdetr"
    ssd = "ssd"
    yolox = "yolox"
    yolonas = "yolonas"
    yologeneric = "yolo-generic"


class ModelConfig(BaseModel):
    path: Optional[str] = Field(None, title="Custom Object detection model path.")
    labelmap_path: Optional[str] = Field(
        None, title="Label map for custom object detector."
    )
    width: int = Field(default=320, title="Object detection model input width.")
    height: int = Field(default=320, title="Object detection model input height.")
    labelmap: Dict[int, str] = Field(
        default_factory=dict, title="Labelmap customization."
    )
    attributes_map: Dict[str, list[str]] = Field(
        default=DEFAULT_ATTRIBUTE_LABEL_MAP,
        title="Map of object labels to their attribute labels.",
    )
    input_tensor: InputTensorEnum = Field(
        default=InputTensorEnum.nhwc, title="Model Input Tensor Shape"
    )
    input_pixel_format: PixelFormatEnum = Field(
        default=PixelFormatEnum.rgb, title="Model Input Pixel Color Format"
    )
    input_dtype: InputDTypeEnum = Field(
        default=InputDTypeEnum.int, title="Model Input D Type"
    )
    model_type: ModelTypeEnum = Field(
        default=ModelTypeEnum.ssd, title="Object Detection Model Type"
    )
    _merged_labelmap: Optional[Dict[int, str]] = PrivateAttr()
    _colormap: Dict[int, Tuple[int, int, int]] = PrivateAttr()
    _all_attributes: list[str] = PrivateAttr()
    _all_attribute_logos: list[str] = PrivateAttr()
    _model_hash: str = PrivateAttr()

    @property
    def merged_labelmap(self) -> Dict[int, str]:
        return self._merged_labelmap

    @property
    def colormap(self) -> Dict[int, Tuple[int, int, int]]:
        return self._colormap

    @property
    def non_logo_attributes(self) -> list[str]:
        return ["face", "license_plate"]

    @property
    def all_attributes(self) -> list[str]:
        return self._all_attributes

    @property
    def all_attribute_logos(self) -> list[str]:
        return self._all_attribute_logos

    @property
    def model_hash(self) -> str:
        return self._model_hash

    def __init__(self, **config):
        super().__init__(**config)

        self._merged_labelmap = {
            **load_labels(config.get("labelmap_path", "/labelmap.txt")),
            **config.get("labelmap", {}),
        }
        self._colormap = {}

        # generate list of attribute labels
        unique_attributes = set()

        for attributes in self.attributes_map.values():
            unique_attributes.update(attributes)

        self._all_attributes = list(unique_attributes)
        self._all_attribute_logos = list(
            unique_attributes - set(self.non_logo_attributes)
        )

    def check_and_load_plus_model(
        self, plus_api: PlusApi, detector: str = None
    ) -> None:
        if not self.path or not self.path.startswith("plus://"):
            return

        # ensure that model cache dir exists
        os.makedirs(MODEL_CACHE_DIR, exist_ok=True)

        model_id = self.path[7:]
        self.path = os.path.join(MODEL_CACHE_DIR, model_id)
        model_info_path = f"{self.path}.json"

        # download the model if it doesn't exist
        if not os.path.isfile(self.path):
            download_url = plus_api.get_model_download_url(model_id)
            r = requests.get(download_url)
            with open(self.path, "wb") as f:
                f.write(r.content)

        # download the model info if it doesn't exist
        if not os.path.isfile(model_info_path):
            model_info = plus_api.get_model_info(model_id)
            with open(model_info_path, "w") as f:
                json.dump(model_info, f)
        else:
            with open(model_info_path, "r") as f:
                model_info: dict[str, Any] = json.load(f)

        if detector and detector not in model_info["supportedDetectors"]:
            raise ValueError(f"Model does not support detector type of {detector}")

        self.width = model_info["width"]
        self.height = model_info["height"]
        self.input_tensor = InputTensorEnum(model_info["inputShape"])
        self.input_pixel_format = PixelFormatEnum(model_info["pixelFormat"])
        self.model_type = ModelTypeEnum(model_info["type"])

        if model_info.get("inputDataType"):
            self.input_dtype = InputDTypeEnum(model_info["inputDataType"])

        # RKNN always uses NHWC
        if detector == "rknn":
            self.input_tensor = InputTensorEnum.nhwc

        # generate list of attribute labels
        self.attributes_map = {
            **model_info.get("attributes", DEFAULT_ATTRIBUTE_LABEL_MAP),
            **self.attributes_map,
        }
        unique_attributes = set()

        for attributes in self.attributes_map.values():
            unique_attributes.update(attributes)

        self._all_attributes = list(unique_attributes)
        self._all_attribute_logos = list(
            unique_attributes - set(["face", "license_plate"])
        )

        self._merged_labelmap = {
            **{int(key): val for key, val in model_info["labelMap"].items()},
            **self.labelmap,
        }

    def compute_model_hash(self) -> None:
        if not self.path or not os.path.exists(self.path):
            self._model_hash = hashlib.md5(b"unknown").hexdigest()
        else:
            with open(self.path, "rb") as f:
                file_hash = hashlib.md5()
                while chunk := f.read(8192):
                    file_hash.update(chunk)
            self._model_hash = file_hash.hexdigest()

    def create_colormap(self, enabled_labels: set[str]) -> None:
        """Get a list of colors for enabled labels that aren't attributes."""
        enabled_trackable_labels = list(
            filter(lambda label: label not in self._all_attributes, enabled_labels)
        )
        colors = generate_color_palette(len(enabled_trackable_labels))
        self._colormap = {
            label: color for label, color in zip(enabled_trackable_labels, colors)
        }

    model_config = ConfigDict(extra="forbid", protected_namespaces=())


class BaseDetectorConfig(BaseModel):
    # the type field must be defined in all subclasses
    type: str = Field(default="cpu", title="Detector Type")
    model: Optional[ModelConfig] = Field(
        default=None, title="Detector specific model configuration."
    )
    model_path: Optional[str] = Field(
        default=None, title="Detector specific model path."
    )
    model_config = ConfigDict(
        extra="allow", arbitrary_types_allowed=True, protected_namespaces=()
    )
