from typing import Dict, List, Tuple

from pydantic import BaseModel, Field


class RenameFaceBody(BaseModel):
    new_name: str


class AudioTranscriptionBody(BaseModel):
    event_id: str


class DeleteFaceImagesBody(BaseModel):
    ids: List[str] = Field(
        description="List of image filenames to delete from the face folder"
    )


class GenerateStateExamplesBody(BaseModel):
    model_name: str
    cameras: Dict[str, Tuple[float, float, float, float]] = Field(
        description="Dictionary mapping camera names to crop coordinates (x, y, width, height) normalized 0-1"
    )


class GenerateObjectExamplesBody(BaseModel):
    model_name: str
    label: str
