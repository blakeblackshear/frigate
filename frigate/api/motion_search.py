"""Motion search API for detecting changes within a region of interest."""

import logging
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from frigate.api.auth import require_camera_access
from frigate.api.defs.tags import Tags
from frigate.jobs.motion_search import (
    cancel_motion_search_job,
    get_motion_search_job,
    start_motion_search_job,
)
from frigate.types import JobStatusTypesEnum

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.motion_search])


class MotionSearchRequest(BaseModel):
    """Request body for motion search."""

    start_time: float = Field(description="Start timestamp for the search range")
    end_time: float = Field(description="End timestamp for the search range")
    polygon_points: List[List[float]] = Field(
        description="List of [x, y] normalized coordinates (0-1) defining the ROI polygon"
    )
    threshold: int = Field(
        default=30,
        ge=1,
        le=255,
        description="Pixel difference threshold (1-255)",
    )
    min_area: float = Field(
        default=5.0,
        ge=0.1,
        le=100.0,
        description="Minimum change area as a percentage of the ROI",
    )
    frame_skip: int = Field(
        default=5,
        ge=1,
        le=30,
        description="Process every Nth frame (1=all frames, 5=every 5th frame)",
    )
    parallel: bool = Field(
        default=False,
        description="Enable parallel scanning across segments",
    )
    max_results: int = Field(
        default=25,
        ge=1,
        le=200,
        description="Maximum number of search results to return",
    )


class MotionSearchResult(BaseModel):
    """A single search result with timestamp and change info."""

    timestamp: float = Field(description="Timestamp where change was detected")
    change_percentage: float = Field(description="Percentage of ROI area that changed")


class MotionSearchMetricsResponse(BaseModel):
    """Metrics collected during motion search execution."""

    segments_scanned: int = 0
    segments_processed: int = 0
    metadata_inactive_segments: int = 0
    heatmap_roi_skip_segments: int = 0
    fallback_full_range_segments: int = 0
    frames_decoded: int = 0
    wall_time_seconds: float = 0.0
    segments_with_errors: int = 0


class MotionSearchStartResponse(BaseModel):
    """Response when motion search job starts."""

    success: bool
    message: str
    job_id: str


class MotionSearchStatusResponse(BaseModel):
    """Response containing job status and results."""

    success: bool
    message: str
    status: str  # "queued", "running", "success", "failed", or "cancelled"
    results: Optional[List[MotionSearchResult]] = None
    total_frames_processed: Optional[int] = None
    error_message: Optional[str] = None
    metrics: Optional[MotionSearchMetricsResponse] = None


@router.post(
    "/{camera_name}/search/motion",
    response_model=MotionSearchStartResponse,
    dependencies=[Depends(require_camera_access)],
    summary="Start motion search job",
    description="""Starts an asynchronous search for significant motion changes within
    a user-defined Region of Interest (ROI) over a specified time range. Returns a job_id
    that can be used to poll for results.""",
)
async def start_motion_search(
    request: Request,
    camera_name: str,
    body: MotionSearchRequest,
):
    """Start an async motion search job."""
    config = request.app.frigate_config

    if camera_name not in config.cameras:
        return JSONResponse(
            content={"success": False, "message": f"Camera {camera_name} not found"},
            status_code=404,
        )

    # Validate polygon has at least 3 points
    if len(body.polygon_points) < 3:
        return JSONResponse(
            content={
                "success": False,
                "message": "Polygon must have at least 3 points",
            },
            status_code=400,
        )

    # Validate time range
    if body.start_time >= body.end_time:
        return JSONResponse(
            content={
                "success": False,
                "message": "Start time must be before end time",
            },
            status_code=400,
        )

    # Start the job using the jobs module
    job_id = start_motion_search_job(
        config=config,
        camera_name=camera_name,
        start_time=body.start_time,
        end_time=body.end_time,
        polygon_points=body.polygon_points,
        threshold=body.threshold,
        min_area=body.min_area,
        frame_skip=body.frame_skip,
        parallel=body.parallel,
        max_results=body.max_results,
    )

    return JSONResponse(
        content={
            "success": True,
            "message": "Search job started",
            "job_id": job_id,
        }
    )


@router.get(
    "/{camera_name}/search/motion/{job_id}",
    response_model=MotionSearchStatusResponse,
    dependencies=[Depends(require_camera_access)],
    summary="Get motion search job status",
    description="Returns the status and results (if complete) of a motion search job.",
)
async def get_motion_search_status_endpoint(
    request: Request,
    camera_name: str,
    job_id: str,
):
    """Get the status of a motion search job."""
    config = request.app.frigate_config

    if camera_name not in config.cameras:
        return JSONResponse(
            content={"success": False, "message": f"Camera {camera_name} not found"},
            status_code=404,
        )

    job = get_motion_search_job(job_id)
    if not job:
        return JSONResponse(
            content={"success": False, "message": "Job not found"},
            status_code=404,
        )

    api_status = job.status

    # Build response content
    response_content: dict[str, Any] = {
        "success": api_status != JobStatusTypesEnum.failed,
        "status": api_status,
    }

    if api_status == JobStatusTypesEnum.failed:
        response_content["message"] = job.error_message or "Search failed"
        response_content["error_message"] = job.error_message
    elif api_status == JobStatusTypesEnum.cancelled:
        response_content["message"] = "Search cancelled"
        response_content["total_frames_processed"] = job.total_frames_processed
    elif api_status == JobStatusTypesEnum.success:
        response_content["message"] = "Search complete"
        if job.results:
            response_content["results"] = job.results.get("results", [])
            response_content["total_frames_processed"] = job.results.get(
                "total_frames_processed", job.total_frames_processed
            )
        else:
            response_content["results"] = []
            response_content["total_frames_processed"] = job.total_frames_processed
    else:
        response_content["message"] = "Job processing"
        response_content["total_frames_processed"] = job.total_frames_processed
        # Include partial results if available (streaming)
        if job.results:
            response_content["results"] = job.results.get("results", [])
            response_content["total_frames_processed"] = job.results.get(
                "total_frames_processed", job.total_frames_processed
            )

    # Include metrics if available
    if job.metrics:
        response_content["metrics"] = job.metrics.to_dict()

    return JSONResponse(content=response_content)


@router.post(
    "/{camera_name}/search/motion/{job_id}/cancel",
    dependencies=[Depends(require_camera_access)],
    summary="Cancel motion search job",
    description="Cancels an active motion search job if it is still processing.",
)
async def cancel_motion_search_endpoint(
    request: Request,
    camera_name: str,
    job_id: str,
):
    """Cancel an active motion search job."""
    config = request.app.frigate_config

    if camera_name not in config.cameras:
        return JSONResponse(
            content={"success": False, "message": f"Camera {camera_name} not found"},
            status_code=404,
        )

    job = get_motion_search_job(job_id)
    if not job:
        return JSONResponse(
            content={"success": False, "message": "Job not found"},
            status_code=404,
        )

    # Check if already finished
    api_status = job.status
    if api_status not in (JobStatusTypesEnum.queued, JobStatusTypesEnum.running):
        return JSONResponse(
            content={
                "success": True,
                "message": "Job already finished",
                "status": api_status,
            }
        )

    # Request cancellation
    cancelled = cancel_motion_search_job(job_id)
    if cancelled:
        return JSONResponse(
            content={
                "success": True,
                "message": "Search cancelled",
                "status": "cancelled",
            }
        )

    return JSONResponse(
        content={
            "success": False,
            "message": "Failed to cancel job",
        },
        status_code=500,
    )
