from typing import Optional

from pydantic import Field

from .base import FrigateBaseModel

__all__ = ["FaceRecognitionConfig", "SemanticSearchConfig"]


class FaceRecognitionConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable face recognition.")
    threshold: float = Field(
        default=0.9, title="Face similarity score required to be considered a match."
    )
    min_area: int = Field(
        default=500, title="Min area of face box to consider running face recognition."
    )


class SemanticSearchConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable semantic search.")
    reindex: Optional[bool] = Field(
        default=False, title="Reindex all detections on startup."
    )
    face_recognition: FaceRecognitionConfig = Field(
        default_factory=FaceRecognitionConfig, title="Face recognition config."
    )
    model_size: str = Field(
        default="small", title="The size of the embeddings model used."
    )
