from enum import Enum


class EmbeddingTypeEnum(str, Enum):
    thumbnail = "thumbnail"
    description = "description"


class EnrichmentModelTypeEnum(str, Enum):
    arcface = "arcface"
    facenet = "facenet"
    jina_v1 = "jina_v1"
    jina_v2 = "jina_v2"
    paddleocr = "paddleocr"
    yolov9_license_plate = "yolov9_license_plate"
