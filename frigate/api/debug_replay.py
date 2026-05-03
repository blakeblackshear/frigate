"""Debug replay API endpoints."""

import asyncio
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from frigate.api.auth import require_role
from frigate.api.defs.tags import Tags
from frigate.jobs.debug_replay import start_debug_replay_job

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.app])


class DebugReplayStartBody(BaseModel):
    """Request body for starting a debug replay session."""

    camera: str = Field(title="Source camera name")
    start_time: float = Field(title="Start timestamp")
    end_time: float = Field(title="End timestamp")


class DebugReplayStartResponse(BaseModel):
    """Response for starting a debug replay session."""

    success: bool
    replay_camera: str
    job_id: str


class DebugReplayStatusResponse(BaseModel):
    """Response for debug replay status.

    Returns only session-presence fields. Startup progress and error
    details flow through the job_state WebSocket topic via the
    debug_replay job (see frigate.jobs.debug_replay); the
    Replay page subscribes there with useJobStatus("debug_replay").
    """

    active: bool
    replay_camera: str | None = None
    source_camera: str | None = None
    start_time: float | None = None
    end_time: float | None = None
    live_ready: bool = False


class DebugReplayStopResponse(BaseModel):
    """Response for stopping a debug replay session."""

    success: bool


@router.post(
    "/debug_replay/start",
    response_model=DebugReplayStartResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Start debug replay",
    description="Start a debug replay session from camera recordings. Returns "
    "immediately while clip generation runs as a background job; subscribe "
    "to the 'debug_replay' job_state WS topic to track progress.",
)
async def start_debug_replay(request: Request, body: DebugReplayStartBody):
    """Start a debug replay session asynchronously."""
    replay_manager = request.app.replay_manager

    try:
        job_id = await asyncio.to_thread(
            start_debug_replay_job,
            source_camera=body.camera,
            start_ts=body.start_time,
            end_ts=body.end_time,
            frigate_config=request.app.frigate_config,
            config_publisher=request.app.config_publisher,
            replay_manager=replay_manager,
        )
    except RuntimeError as exc:
        return JSONResponse(
            content={
                "success": False,
                "message": str(exc),
            },
            status_code=409,
        )
    except ValueError as exc:
        logger.info("Rejected debug replay start request: %s", exc)
        return JSONResponse(
            content={
                "success": False,
                "message": str(exc),
            },
            status_code=400,
        )

    return JSONResponse(
        content={
            "success": True,
            "replay_camera": replay_manager.replay_camera_name,
            "job_id": job_id,
        },
        status_code=202,
    )


@router.get(
    "/debug_replay/status",
    response_model=DebugReplayStatusResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Get debug replay status",
    description="Get the status of the current debug replay session.",
)
def get_debug_replay_status(request: Request):
    """Get the current replay session status."""
    replay_manager = request.app.replay_manager

    live_ready = False
    replay_camera = replay_manager.replay_camera_name

    if replay_manager.active and replay_camera:
        frame_processor = request.app.detected_frames_processor
        frame = (
            frame_processor.get_current_frame(replay_camera)
            if frame_processor is not None
            else None
        )

        if frame is not None:
            frame_time = frame_processor.get_current_frame_time(replay_camera)
            camera_config = request.app.frigate_config.cameras.get(replay_camera)
            retry_interval = 10

            if camera_config is not None:
                retry_interval = float(camera_config.ffmpeg.retry_interval or 10)

            live_ready = datetime.now().timestamp() <= frame_time + retry_interval

    return DebugReplayStatusResponse(
        active=replay_manager.active,
        replay_camera=replay_camera,
        source_camera=replay_manager.source_camera,
        start_time=replay_manager.start_ts,
        end_time=replay_manager.end_ts,
        live_ready=live_ready,
    )


@router.post(
    "/debug_replay/stop",
    response_model=DebugReplayStopResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Stop debug replay",
    description="Stop the active debug replay session and clean up all artifacts.",
)
async def stop_debug_replay(request: Request):
    """Stop the active replay session."""
    replay_manager = request.app.replay_manager

    if not replay_manager.active:
        return JSONResponse(
            content={"success": False, "message": "No active replay session"},
            status_code=400,
        )

    try:
        await asyncio.to_thread(
            replay_manager.stop,
            frigate_config=request.app.frigate_config,
            config_publisher=request.app.config_publisher,
        )
    except (ValueError, RuntimeError, OSError) as e:
        logger.error("Error stopping replay: %s", e)
        return JSONResponse(
            content={
                "success": False,
                "message": "Failed to stop replay session due to an internal error.",
            },
            status_code=500,
        )

    return DebugReplayStopResponse(success=True)
