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
    threshold: float = Field(
        default=0.9, title="Face similarity score required to be considered a match."
    )
    min_area: int = Field(
        default=500, title="Min area of face box to consider running face recognition."
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
