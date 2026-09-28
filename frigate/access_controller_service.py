"""Poll access controllers and verify card scans against Frigate events."""

import asyncio
import hashlib
import json
import logging
import time
from datetime import UTC, datetime
from pathlib import Path

import requests

from frigate.const import FACE_DIR
from frigate.dahua_adapter import DahuaAccessController
from frigate.models import (
    AccessControl,
    AccessEvent,
    Event,
    Recordings,
)

logger = logging.getLogger(__name__)
POLL_INTERVAL_SECONDS = 10
HISTORY_SECONDS = 24 * 60 * 60


def build_controller(device: AccessControl) -> DahuaAccessController:
    """Create a Dahua client for a saved controller."""
    username = (device.username or "").strip()
    password = (device.password or "").strip()
    return DahuaAccessController(
        ip=device.ip_address,
        username=username,
        password=password,
        port=int(device.port or 80),
        use_auth=bool(username and password),
        provider=device.provider or "cgi",
        scheme="https" if device.use_https else "http",
        sdk_port=int(device.sdk_port or 37777),
        provider_options=device.provider_options or {},
    )


def probe_device_with_info(device: AccessControl) -> tuple[AccessControl, dict | None]:
    """Record a connection result and return the device's raw system info."""
    info = None
    try:
        info = build_controller(device).get_system_info()
        if not info:
            raise ValueError("Empty system information")
        channel_count = int(info.get("channelNumber") or device.channel_count or 1)
    except (requests.RequestException, ValueError, AttributeError, TypeError) as err:
        device.status = (
            "offline"
            if isinstance(err, requests.ConnectionError)
            or (hasattr(err, "status") and err.status is None)
            else "error"
        )
        diagnostics = (
            err.as_dict()
            if hasattr(err, "as_dict")
            else {
                "provider": device.provider,
                "operation": "get_system_info",
                "exception_type": type(err).__name__,
                "message": str(err),
            }
        )
        logger.warning(
            "Unable to reach access controller %s: %s", device.id, diagnostics
        )
        fields = [AccessControl.status, AccessControl.last_checked_at]
    else:
        device.name = (
            info.get("deviceName") or info.get("name") or device.name or device.id
        )
        device.type = info.get("deviceType") or device.type or "Dahua"
        device.model = (
            info.get("model") or info.get("deviceType") or device.model or "Unknown"
        )
        device.serial_number = (
            info.get("serialNumber") or info.get("serial") or device.serial_number or ""
        )
        device.channel_count = channel_count
        device.status = "online"
        fields = [
            AccessControl.name,
            AccessControl.type,
            AccessControl.model,
            AccessControl.serial_number,
            AccessControl.channel_count,
            AccessControl.status,
            AccessControl.last_checked_at,
        ]
    device.last_checked_at = time.time()
    device.save(only=fields)
    return device, info if device.status == "online" else None


def probe_device(device: AccessControl) -> AccessControl:
    """Record a fresh connection result, including failed attempts."""
    return probe_device_with_info(device)[0]


def _record_time(row: dict) -> float | None:
    value = (
        row.get("CreateTime")
        or row.get("Time")
        or row.get("time")
        or row.get("datetime")
        or row.get("timestamp")
    )
    if isinstance(value, (int, float)):
        return float(value)
    if not isinstance(value, str) or not value:
        return None
    try:
        return float(value)
    except ValueError:
        pass
    try:
        # Dahua timestamps are local wall time, matching the server timezone.
        return datetime.fromisoformat(value).timestamp()
    except ValueError:
        logger.warning("Ignoring access record with invalid timestamp")
        return None


def _timestamp(value: datetime | float | None) -> float | None:
    if value is None:
        return None
    return value.timestamp() if isinstance(value, datetime) else float(value)


def _detected_names(person: dict) -> set[str]:
    return {name.strip().casefold() for name in str(person["name"]).split(",")}


def _access_granted_card_scan(row: dict) -> bool:
    """Select successful card scans, excluding denied and non-card events."""
    if not (row.get("CardNo") or row.get("card_number")):
        return False
    method = row.get("Method")
    if method is not None and str(method) not in {"1", "2", "3"}:
        return False
    status = row.get("Status")
    if status is None:
        status = row.get("access_status")
    if status is not None:
        return str(status).strip().casefold() in {"1", "true", "success", "succeeded"}
    event_type = str(row.get("EventType") or row.get("event_code") or "").casefold()
    return event_type in {"accessgranted", "accessallowed"}


def _store_record(
    device: AccessControl, row: dict, owner_names: list[str], owners_complete: bool
) -> None:
    row = DahuaAccessController.sanitize_raw_event(row)
    occurred_at = _record_time(row)
    if occurred_at is None:
        return
    card_number = str(row.get("CardNo") or row.get("card_number") or "").strip()
    fingerprint = hashlib.sha256(
        f"{device.id}:{json.dumps(row, sort_keys=True, default=str)}".encode()
    ).hexdigest()
    is_new_scan = _access_granted_card_scan(row) and occurred_at >= (
        device.event_tracking_started_at or 0
    )
    normalized = DahuaAccessController.normalize_event(row, device.id)
    record = {
        **row,
        **normalized,
        **(normalized.get("data") if isinstance(normalized.get("data"), dict) else {}),
        "_owner_names": owner_names,
        "_owner_names_complete": owners_complete,
    }
    AccessEvent.insert(
        id=fingerprint,
        device_id=device.id,
        occurred_at=occurred_at,
        card_number=card_number or None,
        raw_record=record,
        verification_status="pending" if is_new_scan else "unverified",
        people=[],
        camera=device.associated_camera,
        seconds_before=device.seconds_before,
        seconds_after=device.seconds_after,
    ).on_conflict_ignore().execute()


def _store_live_event(device_id: str, event: dict) -> None:
    """Normalize a provider event and store it in the existing event table."""
    device = AccessControl.get_or_none(AccessControl.id == device_id)
    if device is None:
        return
    normalized = DahuaAccessController.normalize_event(event, device_id)
    if normalized["timestamp"] is None:
        normalized["timestamp"] = time.time()
        normalized["timestamp_source"] = "received_at"
    record = {
        **(event.get("raw") if isinstance(event.get("raw"), dict) else {}),
        **(normalized.get("data") if isinstance(normalized.get("data"), dict) else {}),
        **normalized,
        "live": True,
    }
    _store_record(
        device,
        record,
        DahuaAccessController.record_names(record),
        bool(DahuaAccessController.record_names(record)),
    )


def poll_controller(device_id: str) -> AccessControl | None:
    """Check one device and ingest new records without repeating old scans."""
    device = AccessControl.get_or_none(AccessControl.id == device_id)
    if device is None:
        return None
    if device.event_tracking_started_at is None:
        device.event_tracking_started_at = int(time.time())
        device.save(only=[AccessControl.event_tracking_started_at])
    probe_device(device)
    if device.status != "online":
        return device
    poll_end = time.time()
    poll_start = max(0, (device.last_event_poll or poll_end - HISTORY_SECONDS) - 30)
    controller = build_controller(device)
    try:
        rows = controller.get_access_records(
            datetime.fromtimestamp(poll_start, UTC).astimezone(),
            datetime.fromtimestamp(poll_end, UTC).astimezone(),
        )
    except (requests.RequestException, ValueError) as err:
        diagnostics = (
            err.as_dict()
            if hasattr(err, "as_dict")
            else {
                "provider": device.provider,
                "operation": "get_access_records",
                "exception_type": type(err).__name__,
                "message": str(err),
            }
        )
        logger.warning(
            "Unable to fetch access events for %s: %s", device.id, diagnostics
        )
        return device
    owners_by_card: dict[str, list[str]] = {}
    for row in rows:
        card_number = str(row.get("CardNo") or row.get("card_number") or "").strip()
        event_names = DahuaAccessController.record_names(row)
        has_name_array = any(
            key.startswith(("CardName[", "CardNames[", "UserNames[", "Names["))
            or (
                key in {"CardName", "CardNames", "UserNames", "Names"}
                and (
                    isinstance(value, list)
                    or (isinstance(value, str) and value.strip().startswith("["))
                )
            )
            for key, value in row.items()
        )
        if (
            _access_granted_card_scan(row)
            and not has_name_array
            and card_number not in owners_by_card
        ):
            try:
                owners_by_card[card_number] = controller.get_card_owners(card_number)
            except (requests.RequestException, ValueError) as err:
                logger.warning(
                    "Unable to read card owners from controller %s: %s", device.id, err
                )
                owners_by_card[card_number] = []
        _store_record(
            device,
            row,
            event_names
            if has_name_array
            else owners_by_card.get(card_number) or event_names,
            bool(owners_by_card.get(card_number)) or has_name_array,
        )
    device.last_event_poll = poll_end
    device.save(only=[AccessControl.last_event_poll])
    return device


def _mark_poll_error(device_id: str) -> AccessControl | None:
    device = AccessControl.get_or_none(AccessControl.id == device_id)
    if device is not None:
        device.status = "error"
        device.last_checked_at = time.time()
        device.save(only=[AccessControl.status, AccessControl.last_checked_at])
    return device


def verify_pending_events() -> None:
    """Finalize scans once their camera window and recording grace have passed."""
    now = time.time()
    pending = AccessEvent.select().where(AccessEvent.verification_status == "pending")
    for access_event in pending:
        start = access_event.occurred_at - access_event.seconds_before
        end = access_event.occurred_at + access_event.seconds_after
        if now < end + 5:
            continue

        camera = access_event.camera
        people: list[dict[str, str | float | None]] = []
        if camera:
            detections = Event.select(
                Event.id, Event.sub_label, Event.start_time, Event.end_time
            ).where(
                (Event.camera == camera)
                & (Event.label == "person")
                & (Event.false_positive == False)
                & (Event.start_time <= end)
                & ((Event.end_time >= start) | Event.end_time.is_null())
            )
            for detection in detections:
                name = detection.sub_label or "unknown"
                people.append(
                    {
                        "event_id": detection.id,
                        "name": name,
                        "start_time": _timestamp(detection.start_time),
                        "end_time": _timestamp(detection.end_time),
                    }
                )

        access_event.people = people
        owner_names = access_event.raw_record.get(
            "_owner_names"
        ) or DahuaAccessController.record_names(access_event.raw_record)
        owners = {
            name.casefold()
            for name in owner_names
            if isinstance(name, str) and name.strip()
        }
        registered_faces = (
            {path.name.casefold() for path in Path(FACE_DIR).iterdir() if path.is_dir()}
            if Path(FACE_DIR).is_dir()
            else set()
        )
        has_recording = (
            bool(camera)
            and Recordings.select()
            .where(
                (Recordings.camera == camera)
                & (Recordings.start_time <= end)
                & (Recordings.end_time >= start)
            )
            .exists()
        )

        if (
            not owners
            or access_event.raw_record.get("_owner_names_complete") is False
            or not owners.issubset(registered_faces)
            or not has_recording
            or not people
        ):
            access_event.verification_status = "unknown"
        elif any(not _detected_names(person).issubset(owners) for person in people):
            access_event.verification_status = "warning"
        elif any(_detected_names(person).intersection(owners) for person in people):
            access_event.verification_status = "valid"
        else:
            access_event.verification_status = "unknown"
        access_event.save()


async def poll_all_controllers() -> list[AccessControl | None]:
    """Probe every device concurrently without unbounded network requests."""

    def device_ids() -> list[str]:
        return [device.id for device in AccessControl.select(AccessControl.id)]

    ids = await asyncio.to_thread(device_ids)
    semaphore = asyncio.Semaphore(8)

    async def poll(device_id: str) -> AccessControl | None:
        async with semaphore:
            try:
                return await asyncio.to_thread(poll_controller, device_id)
            except Exception:
                logger.exception("Unable to poll access controller %s", device_id)
                return await asyncio.to_thread(_mark_poll_error, device_id)

    return await asyncio.gather(*(poll(device_id) for device_id in ids))


async def run_controller_polling() -> None:
    """Refresh controller status and process scans throughout API uptime."""
    await asyncio.sleep(POLL_INTERVAL_SECONDS)
    listener_tasks: dict[str, asyncio.Task] = {}
    try:
        while True:
            try:
                device_ids = await asyncio.to_thread(
                    lambda: [
                        device.id for device in AccessControl.select(AccessControl.id)
                    ]
                )
                for stopped_id, task in list(listener_tasks.items()):
                    if task.done():
                        listener_tasks.pop(stopped_id)
                for removed_id in listener_tasks.keys() - set(device_ids):
                    listener_tasks.pop(removed_id).cancel()
                for device_id in device_ids:
                    if device_id not in listener_tasks:
                        listener_tasks[device_id] = asyncio.create_task(
                            _listen_to_controller(device_id)
                        )
                await poll_all_controllers()
                await asyncio.to_thread(verify_pending_events)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Access controller polling failed")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
    finally:
        for task in listener_tasks.values():
            task.cancel()
        await asyncio.gather(*listener_tasks.values(), return_exceptions=True)


async def _listen_to_controller(device_id: str) -> None:
    """Keep the selected provider's live subscription active."""
    while True:
        device = await asyncio.to_thread(
            AccessControl.get_or_none, AccessControl.id == device_id
        )
        if device is None:
            return
        try:
            controller = build_controller(device)
            queue: asyncio.Queue[dict] = asyncio.Queue(maxsize=1000)
            loop = asyncio.get_running_loop()

            def put_event(event: dict, current_queue=queue) -> None:
                try:
                    current_queue.put_nowait(event)
                except asyncio.QueueFull:
                    logger.warning(
                        "Dropping live event for access controller %s because its queue is full",
                        device_id,
                    )

            def enqueue(event: dict, current_loop=loop, push_event=put_event) -> None:
                current_loop.call_soon_threadsafe(push_event, event)

            listener = asyncio.create_task(controller.listen_events_async(enqueue))
            event_task: asyncio.Task | None = None
            try:
                while True:
                    event_task = asyncio.create_task(queue.get())
                    completed, _ = await asyncio.wait(
                        {listener, event_task},
                        return_when=asyncio.FIRST_COMPLETED,
                    )
                    if listener in completed:
                        event_task.cancel()
                        await listener
                        return
                    event = event_task.result()
                    event_task = None
                    await asyncio.to_thread(_store_live_event, device_id, event)
            finally:
                if event_task is not None:
                    event_task.cancel()
                listener.cancel()
                await asyncio.gather(listener, return_exceptions=True)
        except asyncio.CancelledError:
            raise
        except Exception as err:  # noqa: BLE001 - keep the background listener alive
            diagnostics = (
                err.as_dict()
                if hasattr(err, "as_dict")
                else {
                    "provider": getattr(device, "provider", "unknown"),
                    "operation": "listen_events",
                    "exception_type": type(err).__name__,
                    "message": str(err),
                }
            )
            logger.warning(
                "Live event subscription failed for %s: %s", device_id, diagnostics
            )
            await asyncio.sleep(30)
