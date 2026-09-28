"""Access controller management APIs."""

import asyncio
import logging
import time
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse, Response

from frigate.access_controller_service import (
    build_controller,
    poll_all_controllers,
    probe_device,
    probe_device_with_info,
)
from frigate.api.auth import require_role
from frigate.api.defs.request.access_controller_body import (
    AccessControllerBody,
    AccessControllerUpdateBody,
)
from frigate.api.defs.tags import Tags
from frigate.dahua_adapter import (
    DahuaAccessController,
    DahuaNotSupported,
    DahuaOperationError,
)
from frigate.models import AccessControl, AccessEvent

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.access_controller])


def _ensure_access_control_table() -> None:
    """Create the access-control table if the migration has not run yet."""
    try:
        AccessControl.select().limit(1).scalar()
    except Exception as err:
        msg = str(err).lower()
        if "no such table" not in msg and "does not exist" not in msg:
            raise

        logger.warning("Creating missing access_control table")
        AccessControl.create_table(safe=True)


def _default_device_info(device: AccessControl) -> dict:
    return {
        "id": device.id,
        "name": device.name or device.id,
        "ip_address": device.ip_address,
        "port": int(device.port or 80),
        "provider": device.provider or "cgi",
        "sdk_port": int(device.sdk_port or 37777),
        "use_https": bool(device.use_https),
        "provider_options": device.provider_options or {},
        "event_api": (device.provider_options or {}).get("event_api", "eventManager"),
        "type": device.type or "Dahua",
        "model": device.model or "Unknown",
        "channel_count": int(device.channel_count or 1),
        "serial_number": device.serial_number or "",
        "status": device.status or "offline",
        "associated_camera": device.associated_camera,
        "seconds_before": device.seconds_before,
        "seconds_after": device.seconds_after,
        "last_checked_at": device.last_checked_at,
    }


def _serialize_access_controller(device: AccessControl) -> dict:
    return _default_device_info(device)


@router.get(
    "/access-controllers",
    dependencies=[Depends(require_role(["admin"]))],
)
def get_access_controllers():
    """List saved access controllers and their latest connection results."""
    _ensure_access_control_table()
    devices = AccessControl.select().order_by(AccessControl.name, AccessControl.id)
    return JSONResponse(
        content=[_serialize_access_controller(device) for device in devices]
    )


@router.post(
    "/access-controllers",
    dependencies=[Depends(require_role(["admin"]))],
)
def create_access_controller(body: AccessControllerBody):
    """Save a Dahua controller and try its connection."""
    _ensure_access_control_table()
    device_id = str(body.id or "").strip()
    if not device_id:
        return JSONResponse(
            content={"success": False, "message": "Device id is required"},
            status_code=400,
        )

    ip_address = str(body.ip_address or "").strip()
    if not ip_address:
        return JSONResponse(
            content={"success": False, "message": "Device IP is required"},
            status_code=400,
        )

    if AccessControl.select().where(AccessControl.id == device_id).exists():
        return JSONResponse(
            content={
                "success": False,
                "message": f"Access controller {device_id} already exists",
            },
            status_code=409,
        )

    device = AccessControl.create(
        id=device_id,
        name=str(body.name or device_id),
        ip_address=ip_address,
        type="Dahua",
        model="Unknown",
        port=int(body.port or 80),
        provider=body.provider,
        sdk_port=body.sdk_port,
        use_https=body.use_https,
        provider_options={"event_api": body.event_api},
        channel_count=1,
        serial_number="",
        username=str(body.username or ""),
        password=str(body.password or ""),
        status="offline",
        event_tracking_started_at=time.time(),
        associated_camera=body.associated_camera,
        seconds_before=body.seconds_before,
        seconds_after=body.seconds_after,
    )

    probe_device(device)
    return JSONResponse(content=_serialize_access_controller(device))


@router.put(
    "/access-controllers/{device_id}",
    dependencies=[Depends(require_role(["admin"]))],
)
def update_access_controller(device_id: str, body: AccessControllerUpdateBody):
    """Update a controller and refresh its connection result."""
    _ensure_access_control_table()
    device = AccessControl.get_or_none(AccessControl.id == device_id)
    if device is None:
        return JSONResponse(
            content={
                "success": False,
                "message": f"Access controller {device_id} not found",
            },
            status_code=404,
        )

    if body.ip_address is not None:
        device.ip_address = str(body.ip_address).strip()
    if body.port is not None:
        device.port = int(body.port or device.port or 80)
    if body.provider is not None:
        device.provider = body.provider
    if body.sdk_port is not None:
        device.sdk_port = body.sdk_port
    if body.use_https is not None:
        device.use_https = body.use_https
    if body.event_api is not None:
        device.provider_options = {
            **(device.provider_options or {}),
            "event_api": body.event_api,
        }
    if body.clear_credentials:
        device.username = ""
        device.password = ""
    elif body.username is not None:
        device.username = str(body.username or "")
    if body.password is not None and not body.clear_credentials:
        device.password = str(body.password or "")
    if body.name is not None:
        device.name = str(body.name or device.id)
    if "associated_camera" in body.model_fields_set:
        device.associated_camera = body.associated_camera
    if body.seconds_before is not None:
        device.seconds_before = body.seconds_before
    if body.seconds_after is not None:
        device.seconds_after = body.seconds_after

    device.save()
    probe_device(device)
    return JSONResponse(content=_serialize_access_controller(device))


@router.delete(
    "/access-controllers/{device_id}",
    dependencies=[Depends(require_role(["admin"]))],
)
def delete_access_controller(device_id: str):
    """Delete a controller."""
    _ensure_access_control_table()
    deleted = AccessControl.delete().where(AccessControl.id == device_id).execute()
    if deleted == 0:
        return JSONResponse(
            content={
                "success": False,
                "message": f"Access controller {device_id} not found",
            },
            status_code=404,
        )
    return JSONResponse(
        content={"success": True, "message": "Successfully deleted access controller"}
    )


@router.post(
    "/access-controllers/refresh-all",
    dependencies=[Depends(require_role(["admin"]))],
)
async def refresh_all_access_controllers():
    """Try all configured controllers and return each connection result."""
    devices = await poll_all_controllers()
    return JSONResponse(
        content=[_serialize_access_controller(device) for device in devices if device]
    )


@router.post(
    "/access-controllers/{device_id}/refresh",
    dependencies=[Depends(require_role(["admin"]))],
)
async def refresh_access_controller(device_id: str):
    """Retry one controller and return the actual connection status."""
    await asyncio.to_thread(_ensure_access_control_table)
    device = await asyncio.to_thread(
        AccessControl.get_or_none, AccessControl.id == device_id
    )
    if device is None:
        return JSONResponse(
            content={
                "success": False,
                "message": f"Access controller {device_id} not found",
            },
            status_code=404,
        )
    device = await asyncio.to_thread(probe_device, device)
    return JSONResponse(content=_serialize_access_controller(device))


@router.get("/access-controllers/events")
def get_access_controller_events(
    device_id: str | None = Query(default=None),
    start: str | None = Query(default=None),
    end: str | None = Query(default=None),
):
    """Return stored controller records with their verification results."""
    _ensure_access_control_table()
    try:
        start_ts = (
            datetime.fromisoformat(start).timestamp() if start else time.time() - 86400
        )
        end_ts = datetime.fromisoformat(end).timestamp() if end else time.time()
    except ValueError:
        return JSONResponse(content={"message": "Invalid time range"}, status_code=400)
    query = AccessEvent.select().where(
        (AccessEvent.occurred_at >= start_ts) & (AccessEvent.occurred_at <= end_ts)
    )
    if device_id:
        query = query.where(AccessEvent.device_id == device_id)
    names = {
        device.id: device.name
        for device in AccessControl.select(AccessControl.id, AccessControl.name)
    }
    events = []
    for event in query.order_by(AccessEvent.occurred_at.desc()).limit(250):
        raw_record = {
            key: value
            for key, value in event.raw_record.items()
            if key not in {"_owner_names", "_owner_names_complete"}
        }
        events.append(
            {
                **raw_record,
                "id": event.id,
                "device_id": event.device_id,
                "device_name": names.get(event.device_id, event.device_id),
                "timestamp": event.occurred_at,
                "card_number": event.card_number,
                "owner_names": event.raw_record.get("_owner_names")
                or DahuaAccessController.record_names(event.raw_record),
                "verification_status": event.verification_status,
                "people": event.people,
                "camera": event.camera,
                "clip_start": event.occurred_at - event.seconds_before,
                "clip_end": event.occurred_at + event.seconds_after,
            }
        )
    return JSONResponse(content=events)


@router.get("/access-controllers/{device_id}/events")
def get_access_controller_device_events(
    device_id: str,
    start: str | None = Query(default=None),
    end: str | None = Query(default=None),
):
    """Return stored access events for one controller."""
    return get_access_controller_events(device_id=device_id, start=start, end=end)


@router.get("/access-controllers/{device_id}/live")
def access_controller_live_events(device_id: str):
    """Probe a controller and return its current system information."""
    _ensure_access_control_table()
    device = AccessControl.get_or_none(AccessControl.id == device_id)
    if device is None:
        return JSONResponse(
            content={
                "success": False,
                "message": f"Access controller {device_id} not found",
            },
            status_code=404,
        )

    device, info = probe_device_with_info(device)
    if device.status != "online":
        return JSONResponse(content={"error": device.status}, status_code=503)

    return JSONResponse(
        content={"device_id": device.id, "status": "online", "system_info": info}
    )


def _controller_or_404(device_id: str) -> AccessControl | JSONResponse:
    """Load a configured controller for one administrative operation."""
    device = AccessControl.get_or_none(AccessControl.id == device_id)
    if device is None:
        return JSONResponse(
            content={
                "success": False,
                "message": f"Access controller {device_id} not found",
            },
            status_code=404,
        )
    return device


def _provider_error(err: Exception) -> JSONResponse:
    """Return safe provider diagnostics without exposing controller credentials."""
    diagnostics = (
        err.as_dict()
        if isinstance(err, DahuaOperationError)
        else {
            "exception_type": type(err).__name__,
            "message": str(err),
        }
    )
    unsupported = isinstance(err, DahuaNotSupported)
    return JSONResponse(
        content={
            "success": False,
            "status": "NOT SUPPORTED" if unsupported else "FAIL",
            "message": str(err),
            "diagnostics": diagnostics,
        },
        status_code=501 if unsupported else 502,
    )


@router.get(
    "/access-controllers/{device_id}/capabilities",
    dependencies=[Depends(require_role(["admin"]))],
)
def get_access_controller_capabilities(device_id: str):
    """List selected provider capabilities and their current verification state."""
    device = _controller_or_404(device_id)
    if isinstance(device, JSONResponse):
        return device
    try:
        controller = build_controller(device)
        return JSONResponse(
            content={
                "device_id": device.id,
                "selected_provider": controller.provider_name,
                "capabilities": controller.get_capabilities(),
            }
        )
    except DahuaOperationError as err:
        return _provider_error(err)


@router.get(
    "/access-controllers/{device_id}/system-info",
    dependencies=[Depends(require_role(["admin"]))],
)
def get_access_controller_system_info(device_id: str):
    """Fetch reported controller information from the configured provider."""
    device = _controller_or_404(device_id)
    if isinstance(device, JSONResponse):
        return device
    try:
        controller = build_controller(device)
        return JSONResponse(
            content={
                "device_id": device.id,
                "provider": controller.provider_name,
                "system_info": controller.get_system_info(),
            }
        )
    except DahuaOperationError as err:
        return _provider_error(err)


@router.get(
    "/access-controllers/{device_id}/doors",
    dependencies=[Depends(require_role(["admin"]))],
)
def get_access_controller_doors(device_id: str):
    """Discover and list the doors reported by a controller."""
    device = _controller_or_404(device_id)
    if isinstance(device, JSONResponse):
        return device
    try:
        controller = build_controller(device)
        return JSONResponse(
            content={
                "device_id": device.id,
                "provider": controller.provider_name,
                "doors": controller.get_doors(),
            }
        )
    except DahuaOperationError as err:
        return _provider_error(err)


@router.get(
    "/access-controllers/{device_id}/doors/{door_id}",
    dependencies=[Depends(require_role(["admin"]))],
)
def get_access_controller_door_status(device_id: str, door_id: str):
    """Return the controller's observed status for one discovered door."""
    device = _controller_or_404(device_id)
    if isinstance(device, JSONResponse):
        return device
    try:
        status = build_controller(device).get_door_status(door_id)
        return JSONResponse(content=status)
    except DahuaOperationError as err:
        return _provider_error(err)


def _run_door_command(device_id: str, door_id: str, action: str):
    device = _controller_or_404(device_id)
    if isinstance(device, JSONResponse):
        return device
    try:
        controller = build_controller(device)
        result = (
            controller.open_door(door_id)
            if action == "open"
            else controller.close_door(door_id)
        )
        return JSONResponse(content=result)
    except DahuaOperationError as err:
        return _provider_error(err)


@router.post(
    "/access-controllers/{device_id}/doors/{door_id}/open",
    dependencies=[Depends(require_role(["admin"]))],
)
def open_access_controller_door(device_id: str, door_id: str):
    """Request an unlock through the controller's door relay."""
    return _run_door_command(device_id, door_id, "open")


@router.post(
    "/access-controllers/{device_id}/doors/{door_id}/close",
    dependencies=[Depends(require_role(["admin"]))],
)
def close_access_controller_door(device_id: str, door_id: str):
    """Request relocking through the controller's door relay."""
    return _run_door_command(device_id, door_id, "close")


@router.get(
    "/access-controllers/{device_id}/preview",
    dependencies=[Depends(require_role(["admin"]))],
)
def get_access_controller_preview(device_id: str):
    """Report the best available controller or associated-camera preview."""
    device = _controller_or_404(device_id)
    if isinstance(device, JSONResponse):
        return device
    controller = build_controller(device)
    try:
        controller.get_snapshot()
        return JSONResponse(
            content={
                "available": True,
                "source": "controller_snapshot",
                "provider": controller.provider_name,
                "snapshot_url": f"access-controllers/{device.id}/preview/snapshot",
            }
        )
    except DahuaOperationError as err:
        if device.associated_camera:
            return JSONResponse(
                content={
                    "available": True,
                    "source": "frigate_camera",
                    "camera": device.associated_camera,
                    "image_url": f"api/{device.associated_camera}/latest.jpg",
                    "provider_diagnostic": err.as_dict(),
                }
            )
        return _provider_error(err)


@router.get(
    "/access-controllers/{device_id}/preview/snapshot",
    dependencies=[Depends(require_role(["admin"]))],
)
def get_access_controller_snapshot(device_id: str):
    """Return a native controller snapshot when the selected provider supports it."""
    device = _controller_or_404(device_id)
    if isinstance(device, JSONResponse):
        return device
    try:
        image = build_controller(device).get_snapshot()
        return Response(content=image, media_type="image/jpeg")
    except DahuaOperationError as err:
        return _provider_error(err)
