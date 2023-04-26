import logging
import numpy as np
import os
from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig, ModelConfig
from frigate.util import deep_merge
from typing import List, Tuple, Dict, Any, Literal
from typing import Union
from typing import Optional
from typing_extensions import Annotated
from enum import Enum
from pydantic import Field, parse_obj_as
import importlib
import pkgutil

logger = logging.getLogger(__name__)

DETECTOR_KEY = "meta_detector"

DetectorConfig = Annotated[
    Union[tuple(BaseDetectorConfig.__subclasses__())],
    Field(discriminator="type"),
]


class MetaDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    detectors: Dict[str, DetectorConfig] = Field(
        default={"cpu": {"type": "cpu"}},
        title="Detector hardware configuration.",
    )
    filtered_labels: Dict[str, Optional[List[str]]] = Field(
        default={},
        title="Labels to filter for each detector.",
    )
    max_detections: int = Field(
        default=20,
        title="Maximum number of detections to return after merging results",
    )


class MetaDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, meta_detector_config: MetaDetectorConfig):
        self.max_detections = meta_detector_config.max_detections
        self.filtered_labels = meta_detector_config.filtered_labels
        self.labels = meta_detector_config.model.merged_labelmap

        self.detectors = []

        for key, detector in meta_detector_config.detectors.items():
            detector_config: DetectorConfig = parse_obj_as(DetectorConfig, detector)
            if detector_config.model is None:
                detector_config.model = meta_detector_config.model
            else:
                model = detector_config.model
                schema = ModelConfig.schema()["properties"]
                if (
                    model.width != schema["width"]["default"]
                    or model.height != schema["height"]["default"]
                    or model.labelmap_path is not None
                    or model.labelmap is not {}
                    or model.input_tensor != schema["input_tensor"]["default"]
                    or model.input_pixel_format
                    != schema["input_pixel_format"]["default"]
                ):
                    logger.warning(
                        "Customizing more than a detector model path is unsupported."
                    )
            merged_model = deep_merge(
                meta_detector_config.model.dict(exclude_unset=True),
                detector_config.model.dict(exclude_unset=True),
            )
            detector_config.model = ModelConfig.parse_obj(merged_model)
            meta_detector_config.detectors[key] = detector_config
            self.detectors.append(self.create_detector(detector_config))
        self.meta_detector_config = meta_detector_config

    def merge_detections(self, detections_list: List[np.ndarray]) -> np.ndarray:
        all_detections = np.vstack(detections_list)
        sorted_indices = np.argsort(-all_detections[:, 1])
        return all_detections[sorted_indices[: self.max_detections]]

    def detect_raw(self, tensor_input) -> np.ndarray:
        detections_list = []
        for i, detector in enumerate(self.detectors):
            detector_key = list(self.meta_detector_config.detectors.keys())[i]
            filtered_labels = self.filtered_labels.get(detector_key)
            detections = detector.detect_raw(tensor_input)

            if filtered_labels is not None:
                detections = np.array(
                    [
                        d
                        for d in detections
                        if self.get_label_name(d[0]) in filtered_labels
                    ]
                )

            detections_list.append(detections)

        return self.merge_detections(detections_list)

    def get_label_name(self, index: int) -> str:
        return self.labels.get(index)

    def create_detector(self, detector_config):
        current_module_name = os.path.splitext(os.path.basename(__file__))[0]
        modules_folder = os.path.dirname(os.path.abspath(__file__))
        module_prefix = __package__ + "."

        _included_modules = [
            module
            for module in pkgutil.iter_modules([modules_folder], module_prefix)
            if module.name != current_module_name
        ]

        plugin_modules = []

        for _, name, _ in _included_modules:
            try:
                # currently openvino may fail when importing
                # on an arm device with 64 KiB page size.
                plugin_modules.append(importlib.import_module(name))
            except ImportError as e:
                logger.error(f"Error importing detector runtime: {e}")

        api_types = {det.type_key: det for det in DetectionApi.__subclasses__()}
        api = api_types.get(detector_config.type)
        if not api:
            raise ValueError(detector_config.type)
        return api(detector_config)
