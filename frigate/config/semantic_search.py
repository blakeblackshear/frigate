from typing import Dict, List, Optional

from pydantic import Field

from .base import FrigateBaseModel

__all__ = [
    "FaceRecognitionConfig",
    "SemanticSearchConfig",
    "LicensePlateRecognitionConfig",
]


class SemanticSearchConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable semantic search.")
    reindex: Optional[bool] = Field(
        default=False, title="Reindex all detections on startup."
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
    threshold: float = Field(
        default=0.9,
        title="License plate confidence score required to be added to the object as a sub label.",
    )
    min_area: int = Field(
        default=500,
        title="Min area of license plate to consider running license plate recognition.",
    )
    known_plates: Optional[Dict[str, List[str]]] = Field(
        default={}, title="Known plates to track."
    )
