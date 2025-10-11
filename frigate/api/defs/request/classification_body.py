from typing import List

from pydantic import BaseModel, Field


class RenameFaceBody(BaseModel):
    new_name: str


class AudioTranscriptionBody(BaseModel):
    event_id: str


class DeleteFaceImagesBody(BaseModel):
    ids: List[str] = Field(
        description="List of image filenames to delete from the face folder"
    )
