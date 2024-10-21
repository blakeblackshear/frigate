from typing import Optional

from pydantic import Field

from .base import FrigateBaseModel

__all__ = ["FaceRecognitionConfig", "SemanticSearchConfig"]


class FaceRecognitionConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable face recognition.")
    reindex: Optional[bool] = Field(
        default=False, title="Reindex all detections on startup."
    )
    model_size: str = Field(
        default="small", title="The size of the embeddings model used."
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
