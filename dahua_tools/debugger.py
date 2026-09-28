"""Standalone web debugger for Dahua access controllers."""

import asyncio
import base64
import json
import logging
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, field_validator

from frigate.dahua_adapter import (
    DahuaAccessController,
    DahuaNotSupported,
    DahuaOperationError,
)

logger = logging.getLogger(__name__)
PAGE = Path(__file__).with_name("debugger.html")
OPERATIONS = {
    "connection", "system_info", "doors", "door_status", "open_door",
    "close_door", "card_owners", "historical_records", "snapshot", "preview",
    "preview_clip", "live_events",
}


class Target(BaseModel):
    """Connection settings supplied for a single diagnostic request."""

    host: str = Field(min_length=1)
    port: int = Field(default=80, ge=1, le=65535)
    username: str = "admin"
    password: str = Field(default="", exclude=True, repr=False)
    scheme: str = Field(default="http", pattern="^(http|https)$")
    provider: str = Field(default="cgi", pattern="^(cgi|netsdk)$")
    use_auth: bool = True
    event_api: str = Field(default="eventManager", pattern="^(eventManager|snapManager)$")
    sdk_port: int = Field(default=37777, ge=1, le=65535)
    timeout: float = Field(default=5, gt=0, le=60)

    @field_validator("host")
    @classmethod
    def valid_host(cls, value: str) -> str:
        """Accept a bare hostname or IP address, never URL credentials."""
        if any(character in value for character in "@/?#\\") or any(character.isspace() for character in value):
            raise ValueError("Enter a bare hostname or IP address")
        try:
            parsed = urlsplit(f"http://{value}")
            invalid = not parsed.hostname or parsed.username or parsed.password or parsed.port is not None
        except ValueError as err:
            raise ValueError("Enter a bare hostname or IP address") from err
        if invalid:
            raise ValueError("Enter a bare hostname or IP address")
        return value


class OperationRequest(BaseModel):
    """One capability request and its optional operation inputs."""

    target: Target
    operation: str
    door_id: str = "1"
    card_number: str = ""
    start_time: datetime | None = None
    end_time: datetime | None = None


def redact(value: Any, password: str) -> Any:
    """Remove credentials from nested diagnostic values."""
    if isinstance(value, dict):
        return {
            key: "<redacted>"
            if str(key).casefold() in {"password", "passwd", "pwd", "pin", "token", "authorization"}
            else redact(item, password)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [redact(item, password) for item in value]
    if isinstance(value, str):
        return value.replace(password, "<redacted>") if password else value
    return value


def adapter_for(target: Target, trace: list[dict[str, Any]]) -> DahuaAccessController:
    """Construct the shared adapter with a per-request HTTP observer."""
    def observe(detail: dict[str, Any]) -> None:
        trace.append(redact(detail, target.password))

    return DahuaAccessController(
        ip=target.host,
        port=target.port,
        username=target.username,
        password=target.password,
        timeout=target.timeout,
        use_auth=target.use_auth,
        provider=target.provider,
        scheme=target.scheme,
        sdk_port=target.sdk_port,
        provider_options={"event_api": target.event_api},
        diagnostic=observe,
    )


def safe_request(value: OperationRequest) -> dict[str, Any]:
    """Describe the request without exposing the secret."""
    return {
        "operation": value.operation,
        "provider": value.target.provider,
        "target": f"{value.target.scheme}://{value.target.host}:{value.target.port}",
        "authentication": "digest" if value.target.use_auth and value.target.provider == "cgi" else "none or provider-specific",
        "event_api": value.target.event_api if value.target.provider == "cgi" else None,
        "door_id": value.door_id if value.operation in {"door_status", "open_door", "close_door"} else None,
        "card_number": value.card_number if value.operation == "card_owners" else None,
        "start_time": value.start_time.isoformat() if value.start_time else None,
        "end_time": value.end_time.isoformat() if value.end_time else None,
    }


def classify(error: DahuaOperationError) -> str:
    """Separate missing capabilities from real operation failures."""
    if isinstance(error, DahuaNotSupported) or error.status in {404, 405, 501}:
        return "NOT SUPPORTED"
    if "not supported" in str(error).casefold() or "unsupported" in str(error).casefold():
        return "NOT SUPPORTED"
    return "FAILED"


async def invoke(controller: DahuaAccessController, value: OperationRequest) -> Any:
    """Run exactly one requested adapter operation."""
    match value.operation:
        case "connection":
            info = await controller.get_system_info_async()
            return {"online": True, "system_info": info}
        case "system_info":
            return await controller.get_system_info_async()
        case "doors":
            return await controller.get_doors_async()
        case "door_status":
            return await controller.get_door_status_async(value.door_id)
        case "open_door":
            return await controller.open_door_async(value.door_id)
        case "close_door":
            return await controller.close_door_async(value.door_id)
        case "card_owners":
            return await controller.get_card_owners_async(value.card_number)
        case "historical_records":
            if value.start_time is None or value.end_time is None:
                raise ValueError("Start and end times are required")
            return await controller.get_access_records_async(value.start_time, value.end_time)
        case "snapshot":
            content = await controller.get_snapshot_async()
            return {"bytes": len(content), "mime_type": "image/jpeg", "image": f"data:image/jpeg;base64,{base64.b64encode(content).decode()}"}
        case "preview":
            preview = await controller.get_preview_async()
            if not preview.get("available"):
                detail = preview.get("diagnostic") or {}
                error_type = DahuaNotSupported if detail.get("exception_type") == "DahuaNotSupported" else DahuaOperationError
                raise error_type(controller.provider_name, "get_preview", detail.get("message", "Preview is unavailable"), endpoint=detail.get("endpoint"), status=detail.get("http_status"), response_body=detail.get("response_body"))
            content = await controller.get_snapshot_async()
            return {**preview, "bytes": len(content), "image": f"data:image/jpeg;base64,{base64.b64encode(content).decode()}"}
        case "preview_clip":
            content = await controller.get_preview_clip_async()
            return {"bytes": len(content), "media": f"data:video/mp4;base64,{base64.b64encode(content).decode()}"}
        case _:
            raise ValueError("Unknown operation")


async def run_operation(value: OperationRequest) -> dict[str, Any]:
    """Return a complete, safely redacted diagnostic envelope."""
    started = datetime.now().astimezone()
    tick = time.monotonic()
    trace: list[dict[str, Any]] = []
    result: dict[str, Any] = {
        "request": safe_request(value),
        "provider": value.target.provider,
        "start_time": started.isoformat(),
    }
    try:
        if value.operation not in OPERATIONS or value.operation == "live_events":
            raise ValueError("Unknown operation")
        controller = adapter_for(value.target, trace)
        output = await invoke(controller, value)
        normalized = (
            [DahuaAccessController.normalize_event(item, value.target.host) for item in output]
            if value.operation == "historical_records"
            else output
        )
        result.update(status="SUCCESS", response=output, normalized_response=normalized, exception=None)
    except DahuaOperationError as error:
        result.update(status=classify(error), response=None, normalized_response=None, exception=error.as_dict())
    except (ValueError, TypeError) as error:
        result.update(status="FAILED", response=None, normalized_response=None, exception={"exception_type": type(error).__name__, "message": str(error)})
    except Exception as error:  # noqa: BLE001 - expose provider-specific SDK failures
        logger.error("Debugger operation failed for provider %s operation %s: %s", value.target.provider, value.operation, redact(str(error), value.target.password))
        result.update(status="FAILED", response=None, normalized_response=None, exception={"exception_type": type(error).__name__, "message": str(error)})
    result["duration_ms"] = round((time.monotonic() - tick) * 1000, 2)
    result["http_sdk_status"] = next((item.get("http_status") for item in reversed(trace) if item.get("http_status") is not None), (result.get("exception") or {}).get("http_status"))
    result["raw_response"] = [item.get("raw_response") for item in trace if item.get("raw_response") is not None]
    result["logs"] = [*trace, {"provider": value.target.provider, "operation": value.operation, "outcome": result["status"], "duration_ms": result["duration_ms"]}]
    return redact(result, value.target.password)


app = FastAPI(title="Dahua Access Controller Debugger")


@app.exception_handler(RequestValidationError)
async def invalid_request(_request: Request, error: RequestValidationError) -> JSONResponse:
    """Return useful field errors without echoing the submitted password."""
    return JSONResponse(
        status_code=422,
        content={"detail": [{"field": list(item["loc"]), "message": item["msg"]} for item in error.errors()]},
    )


@app.get("/", response_class=HTMLResponse)
async def home() -> str:
    """Serve the independent debugger interface."""
    return await asyncio.to_thread(PAGE.read_text)


@app.post("/api/operation")
async def operation(value: OperationRequest) -> dict[str, Any]:
    """Run one access-controller capability check."""
    return await run_operation(value)


@app.post("/api/live")
async def live(value: OperationRequest) -> StreamingResponse:
    """Stream one listener's diagnostics and normalized access events."""
    async def stream():
        started = datetime.now().astimezone()
        tick = time.monotonic()
        trace: list[dict[str, Any]] = []
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=100)
        loop = asyncio.get_running_loop()

        def callback(event: dict[str, Any]) -> None:
            normalized = DahuaAccessController.normalize_event(event, value.target.host)
            item = {"event": redact(event, value.target.password), "normalized_response": redact(normalized, value.target.password)}
            def enqueue() -> None:
                if queue.full():
                    queue.get_nowait()
                queue.put_nowait(item)
            loop.call_soon_threadsafe(enqueue)

        controller = adapter_for(value.target, trace)
        task = asyncio.create_task(controller.listen_events_async(callback))
        try:
            yield json.dumps({"status": "STARTING", "request": safe_request(value), "provider": value.target.provider, "start_time": started.isoformat()}) + "\n"
            while True:
                if task.done():
                    try:
                        await task
                    except DahuaOperationError as error:
                        yield json.dumps(redact({"status": classify(error), "exception": error.as_dict(), "logs": trace, "http_sdk_status": next((entry.get("http_status") for entry in reversed(trace) if entry.get("http_status") is not None), None), "duration_ms": round((time.monotonic() - tick) * 1000, 2)}, value.target.password)) + "\n"
                    except Exception as error:  # noqa: BLE001 - SDK diagnostic boundary
                        yield json.dumps(redact({"status": "FAILED", "exception": {"exception_type": type(error).__name__, "message": str(error)}, "logs": trace}, value.target.password)) + "\n"
                    else:
                        yield json.dumps({"status": "FAILED", "exception": {"message": "Listener ended without an error"}, "logs": trace}) + "\n"
                    break
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=0.5)
                except TimeoutError:
                    if trace:
                        yield json.dumps({"status": "SUCCESS", "response": "Listener connected", "logs": trace, "http_sdk_status": next((entry.get("http_status") for entry in reversed(trace) if entry.get("http_status") is not None), None), "duration_ms": round((time.monotonic() - tick) * 1000, 2)}) + "\n"
                        trace.clear()
                    continue
                yield json.dumps({"status": "SUCCESS", **item, "duration_ms": round((time.monotonic() - tick) * 1000, 2)}) + "\n"
        finally:
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

    return StreamingResponse(stream(), media_type="application/x-ndjson")


def main() -> None:
    """Run the debugger without the simulator or employee portal."""
    import uvicorn

    uvicorn.run(app, host=os.environ.get("DAHUA_DEBUG_HOST", "127.0.0.1"), port=int(os.environ.get("DAHUA_DEBUG_PORT", "8081")))


if __name__ == "__main__":
    main()
