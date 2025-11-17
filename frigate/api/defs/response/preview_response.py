from typing import List

from pydantic import BaseModel, Field


class PreviewModel(BaseModel):
    """Model representing a single preview clip."""

    camera: str = Field(description="Camera name for this preview")
    src: str = Field(description="Path to the preview video file")
    type: str = Field(description="MIME type of the preview video (video/mp4)")
    start: float = Field(description="Unix timestamp when the preview starts")
    end: float = Field(description="Unix timestamp when the preview ends")


PreviewsResponse = List[PreviewModel]
PreviewFramesResponse = List[str]
