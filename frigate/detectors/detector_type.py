from enum import Enum


class DetectorTypeEnum(str, Enum):
    edgetpu = "edgetpu"
    openvino = "openvino"
    cpu = "cpu"
    tensorrt = "tensorrt"
