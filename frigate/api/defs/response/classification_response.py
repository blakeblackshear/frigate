from typing import Dict, List, Optional

from pydantic import BaseModel, Field, RootModel


class FacesResponse(RootModel[Dict[str, List[str]]]):
    """Response model for the get_faces endpoint.

    Returns a mapping of face names to lists of image filenames.
    Each face name corresponds to a directory in the faces folder,
    and the list contains the names of image files for that face.

    Example:
        {
            "john_doe": ["face1.webp", "face2.jpg"],
            "jane_smith": ["face3.png"]
        }
    """

    root: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Dictionary mapping face names to lists of image filenames",
    )


class FaceRecognitionResponse(BaseModel):
    """Response model for face recognition endpoint.

    Returns the result of attempting to recognize a face from an uploaded image.
    """

    success: bool = Field(description="Whether the face recognition was successful")
    score: Optional[float] = Field(
        default=None, description="Confidence score of the recognition (0-1)"
    )
    face_name: Optional[str] = Field(
        default=None, description="The recognized face name if successful"
    )
