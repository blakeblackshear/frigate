from typing import Dict, List, Tuple

from pydantic import BaseModel, Field


class RenameFaceBody(BaseModel):
    new_name: str = Field(description="New name for the face")


class AudioTranscriptionBody(BaseModel):
    event_id: str = Field(description="ID of the event to transcribe audio for")


class DeleteFaceImagesBody(BaseModel):
    ids: List[str] = Field(
        description="List of image filenames to delete from the face folder"
    )


class GenerateStateExamplesBody(BaseModel):
    model_name: str = Field(description="Name of the classification model")
    cameras: Dict[str, Tuple[float, float, float, float]] = Field(
        description="Dictionary mapping camera names to normalized crop coordinates in [x1, y1, x2, y2] format (values 0-1)"
    )


class GenerateObjectExamplesBody(BaseModel):
    model_name: str = Field(description="Name of the classification model")
    label: str = Field(
        description="Object label to collect examples for (e.g., 'person', 'car')"
    )
