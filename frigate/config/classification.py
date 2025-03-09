from enum import Enum
from typing import Dict, List, Optional

from pydantic import Field

from .base import FrigateBaseModel

__all__ = [
    "FaceRecognitionConfig",
    "SemanticSearchConfig",
    "LicensePlateRecognitionConfig",
]


class SemanticSearchModelEnum(str, Enum):
    jinav1 = "jinav1"
    jinav2 = "jinav2"


class BirdClassificationConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable bird classification.")
    threshold: float = Field(
        default=0.9,
        title="Minimum classification score required to be considered a match.",
        gt=0.0,
        le=1.0,
    )


class ClassificationConfig(FrigateBaseModel):
    bird: BirdClassificationConfig = Field(
        default_factory=BirdClassificationConfig, title="Bird classification config."
    )


class SemanticSearchConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable semantic search.")
    reindex: Optional[bool] = Field(
        default=False, title="Reindex all tracked objects on startup."
    )
    model: Optional[SemanticSearchModelEnum] = Field(
        default=SemanticSearchModelEnum.jinav1,
        title="The CLIP model to use for semantic search.",
    )
    model_size: str = Field(
        default="small", title="The size of the embeddings model used."
    )


class FaceRecognitionConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable face recognition.")
    min_score: float = Field(
        title="Minimum face distance score required to save the attempt.",
        default=0.8,
        gt=0.0,
        le=1.0,
    )
    threshold: float = Field(
        default=0.9,
        title="Minimum face distance score required to be considered a match.",
        gt=0.0,
        le=1.0,
    )
    min_area: int = Field(
        default=500, title="Min area of face box to consider running face recognition."
    )
    save_attempts: bool = Field(
        default=True, title="Save images of face detections for training."
    )


class LicensePlateRecognitionConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable license plate recognition.")
    detection_threshold: float = Field(
        default=0.7,
        title="License plate object confidence score required to begin running recognition.",
        gt=0.0,
        le=1.0,
    )
    min_area: int = Field(
        default=1000,
        title="Minimum area of license plate to begin running recognition.",
    )
    recognition_threshold: float = Field(
        default=0.9,
        title="Recognition confidence score required to add the plate to the object as a sub label.",
        gt=0.0,
        le=1.0,
    )
    min_plate_length: int = Field(
        default=4,
        title="Minimum number of characters a license plate must have to be added to the object as a sub label.",
    )
    format: Optional[str] = Field(
        default=None,
        title="Regular expression for the expected format of license plate.",
    )
    match_distance: int = Field(
        default=1,
        title="Allow this number of missing/incorrect characters to still cause a detected plate to match a known plate.",
        ge=0,
    )
    known_plates: Optional[Dict[str, List[str]]] = Field(
        default={}, title="Known plates to track (strings or regular expressions)."
    )
