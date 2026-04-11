from typing import Any, List, Optional

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
    status: Optional[str] = Field(
        default=None,
        description="Queue status for the export job",
    )


class BatchExportResultModel(BaseModel):
    """Per-item result for a batch export request."""

    camera: str = Field(description="Camera name for this export attempt")
    export_id: Optional[str] = Field(
        default=None,
        description="The export ID when the export was successfully queued",
    )
    success: bool = Field(description="Whether the export was successfully queued")
    status: Optional[str] = Field(
        default=None,
        description="Queue status for this camera export",
    )
    error: Optional[str] = Field(
        default=None,
        description="Validation or queueing error for this item, if any",
    )
    item_index: Optional[int] = Field(
        default=None,
        description="Zero-based index of this result within the request items list",
    )
    client_item_id: Optional[str] = Field(
        default=None,
        description="Opaque client-supplied item identifier echoed from the request",
    )


class BatchExportResponse(BaseModel):
    """Response model for starting an export batch."""

    export_case_id: Optional[str] = Field(
        default=None,
        description="Export case ID associated with the batch",
    )
    export_ids: List[str] = Field(description="Export IDs successfully queued")
    results: List[BatchExportResultModel] = Field(
        description="Per-item batch export results"
    )


class ExportJobModel(BaseModel):
    """Model representing a queued or running export job."""

    id: str = Field(description="Unique identifier for the export job")
    job_type: str = Field(description="Job type")
    status: str = Field(description="Current job status")
    camera: str = Field(description="Camera associated with this export job")
    name: Optional[str] = Field(
        default=None,
        description="Friendly name for the export",
    )
    export_case_id: Optional[str] = Field(
        default=None,
        description="ID of the export case this export belongs to",
    )
    request_start_time: float = Field(description="Requested export start time")
    request_end_time: float = Field(description="Requested export end time")
    start_time: Optional[float] = Field(
        default=None,
        description="Unix timestamp when execution started",
    )
    end_time: Optional[float] = Field(
        default=None,
        description="Unix timestamp when execution completed",
    )
    error_message: Optional[str] = Field(
        default=None,
        description="Error message for failed jobs",
    )
    results: Optional[dict[str, Any]] = Field(
        default=None,
        description="Result metadata for completed jobs",
    )


ExportJobsResponse = List[ExportJobModel]


ExportsResponse = List[ExportModel]
