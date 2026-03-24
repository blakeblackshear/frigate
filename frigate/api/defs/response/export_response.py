from typing import List, Optional

from pydantic import BaseModel, Field


class ExportModel(BaseModel):
    """Model representing a single export."""

    id: str = Field(description="Unique identifier for the export")
    camera: str = Field(description="Camera name associated with this export")
    name: str = Field(description="Friendly name of the export")
    date: float = Field(description="Unix timestamp when the export was created")
    video_path: str = Field(description="File path to the exported video")
    thumb_path: str = Field(description="File path to the export thumbnail")
    in_progress: bool = Field(
        description="Whether the export is currently being processed"
    )
    export_case_id: Optional[str] = Field(
        default=None, description="ID of the export case this export belongs to"
    )


class StartExportResponse(BaseModel):
    """Response model for starting an export."""

    success: bool = Field(description="Whether the export was started successfully")
    message: str = Field(description="Status or error message")
    export_id: Optional[str] = Field(
        default=None, description="The export ID if successfully started"
    )


ExportsResponse = List[ExportModel]
