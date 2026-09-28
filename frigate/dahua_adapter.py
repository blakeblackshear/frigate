"""Provider based Dahua access controller integrations."""

import asyncio
import contextvars
import importlib.metadata
import json
import logging
import re
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Protocol
from urllib.parse import urlencode

import aiohttp
import requests

logger = logging.getLogger(__name__)
_redaction_secret: contextvars.ContextVar[str] = contextvars.ContextVar(
    "dahua_redaction_secret", default=""
)


class DahuaOperationError(requests.RequestException):
    """An operation failed with diagnostics safe to return to an administrator."""

    def __init__(
        self,
        provider: str,
        operation: str,
        message: str,
        *,
        endpoint: str | None = None,
        status: int | None = None,
        dahua_code: str | None = None,
        response_body: str | None = None,
    ) -> None:
        self.provider = provider
        self.operation = operation
        self.endpoint = _safe_body(str(endpoint or "")) or None
        try:
            self.status = int(status) if status is not None else None
        except (TypeError, ValueError):
            self.status = None
        self.dahua_code = str(dahua_code) if dahua_code is not None else None
        self.response_body = _safe_body(str(response_body or "")) or None
        super().__init__(_safe_body(str(message)))
        logger.error("Dahua provider operation failed: %s", self.as_dict())

    def as_dict(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "operation": self.operation,
            "endpoint": self.endpoint,
            "http_status": self.status,
            "dahua_error_code": self.dahua_code,
            "response_body": self.response_body,
            "exception_type": type(self).__name__,
            "message": str(self),
        }


class DahuaNotSupported(DahuaOperationError):
    """The configured provider cannot supply a capability in this runtime."""


def _safe_body(value: str, limit: int = 2048) -> str:
    """Trim a response body and remove fields that may contain credentials."""
    secret = _redaction_secret.get()
    if secret:
        value = value.replace(secret, "<redacted>")
    value = re.sub(
        r"(?is)([\"']?(?:password|passwd|userpassword|pin|pwd)[\"']?\s*:\s*\")([^\"]*)(\")",
        r"\1<redacted>\3",
        value,
    )
    value = re.sub(
        r"(?im)([\"']?(?:password|passwd|userpassword|authorization|token|pin|pwd)[\"']?\s*[:=]\s*[\"']?)[^,;\s}\]]+[\"']?",
        r"\1<redacted>",
        value,
    )
    value = re.sub(
        r"(?im)(?:\bauthorization\s*[:=]\s*).+$",
        "authorization=<redacted>",
        value,
    )
    value = re.sub(
        r"(?is)(<(?P<tag>password|passwd|userpassword|pin|pwd)>)[^<]*(</(?P=tag)>)",
        r"\1<redacted>\3",
        value,
    )
    value = re.sub(r"(?i)(https?://)[^/@\s]+@", r"\1<redacted>@", value)
    return value[:limit]


def _safe_raw(value: Any) -> Any:
    """Redact credential fields while retaining the rest of a provider event."""
    if isinstance(value, dict):
        return {
            key: "<redacted>"
            if str(key).casefold()
            in {
                "password",
                "passwd",
                "userpassword",
                "pwd",
                "pin",
                "token",
                "authorization",
            }
            else _safe_raw(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_safe_raw(item) for item in value]
    if isinstance(value, str):
        secret = _redaction_secret.get()
        return value.replace(secret, "<redacted>") if secret else value
    return value


def _sync(coro):
    """Run an async provider operation from the legacy synchronous interface."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    coro.close()
    raise RuntimeError("Use the async adapter method from an event loop")


@dataclass(slots=True)
class DahuaConnection:
    """Connection settings shared by Dahua providers."""

    ip: str
    username: str = "admin"
    password: str = field(default="", repr=False)
    port: int = 80
    timeout: float = 5
    use_auth: bool = True
    scheme: str = "http"
    sdk_port: int = 37777
    provider_options: dict[str, Any] = field(default_factory=dict)


class DahuaProvider(Protocol):
    """Operations supported by a controller provider."""

    name: str

    async def get_system_info(self) -> dict[str, Any]: ...

    async def get_access_records(
        self, start_time: datetime, end_time: datetime
    ) -> list[dict[str, Any]]: ...

    async def get_card_owners(self, card_number: str) -> list[str]: ...

    async def listen_events(
        self, callback: Callable[[dict[str, Any]], None]
    ) -> None: ...

    async def get_doors(self) -> list[dict[str, Any]]: ...

    async def get_door_status(self, door_id: str) -> dict[str, Any]: ...

    async def open_door(self, door_id: str) -> dict[str, Any]: ...

    async def close_door(self, door_id: str) -> dict[str, Any]: ...

    async def get_snapshot(self) -> bytes: ...


class CgiProvider:
    """Dahua HTTP CGI provider. Device support is reported per operation."""

    name = "cgi"

    def __init__(
        self,
        connection: DahuaConnection,
        diagnostic: Callable[[dict[str, Any]], None] | None = None,
    ) -> None:
        self.connection = connection
        self.base_url = f"{connection.scheme}://{connection.ip}:{connection.port}"
        self.diagnostic = diagnostic

    def _report(self, detail: dict[str, Any]) -> None:
        if self.diagnostic is not None:
            self.diagnostic(_safe_raw(detail))

    def _auth(self):
        if not self.connection.use_auth:
            return ()
        return (
            aiohttp.DigestAuthMiddleware(
                self.connection.username, self.connection.password
            ),
        )

    async def _get(
        self,
        operation: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        stream: bool = False,
        binary: bool = False,
    ) -> tuple[int, str, aiohttp.ClientResponse, aiohttp.ClientSession]:
        timeout = aiohttp.ClientTimeout(
            total=None if stream else self.connection.timeout,
            connect=self.connection.timeout,
            sock_read=20 if stream else self.connection.timeout,
        )
        session = aiohttp.ClientSession(timeout=timeout, middlewares=self._auth())
        endpoint = f"{self.base_url}{path}"
        diagnostic_endpoint = endpoint
        if params:
            diagnostic_endpoint = f"{endpoint}?{urlencode(params, doseq=True)}"
        try:
            response = await session.get(endpoint, params=params)
            actual_endpoint = str(response.url)
            if stream and response.status >= 400:
                body = await response.text(errors="replace")
                self._report({"provider": self.name, "operation": operation, "endpoint": actual_endpoint, "http_status": response.status, "raw_response": _safe_body(body)})
                raise DahuaOperationError(
                    self.name,
                    operation,
                    f"Dahua CGI request failed ({response.status})",
                    endpoint=actual_endpoint,
                    status=response.status,
                    dahua_code=self._response_error(body),
                    response_body=body,
                )
            if not stream and not binary:
                body = await response.text(errors="replace")
                self._report({"provider": self.name, "operation": operation, "endpoint": actual_endpoint, "http_status": response.status, "raw_response": _safe_body(body)})
                code = self._response_error(body)
                if response.status >= 400 or code:
                    raise DahuaOperationError(
                        self.name,
                        operation,
                        f"Dahua CGI request failed ({response.status})",
                        endpoint=actual_endpoint,
                        status=response.status,
                        dahua_code=code,
                        response_body=body,
                    )
            elif not stream:
                body_bytes = await response.read()
                self._report({"provider": self.name, "operation": operation, "endpoint": actual_endpoint, "http_status": response.status, "raw_response": f"<binary: {len(body_bytes)} bytes>" if response.status < 400 else _safe_body(body_bytes[:2048].decode("utf-8", errors="replace"))})
                if response.status >= 400:
                    body = body_bytes.decode("utf-8", errors="replace")
                    raise DahuaOperationError(
                        self.name,
                        operation,
                        f"Dahua CGI request failed ({response.status})",
                        endpoint=actual_endpoint,
                        status=response.status,
                        dahua_code=self._response_error(body),
                        response_body=body,
                    )
            if stream:
                self._report({"provider": self.name, "operation": operation, "endpoint": actual_endpoint, "http_status": response.status, "raw_response": "<event stream connected>"})
            return response.status, path, response, session
        except DahuaOperationError:
            await session.close()
            raise
        except (aiohttp.ClientError, TimeoutError) as err:
            await session.close()
            error = DahuaOperationError(
                self.name,
                operation,
                f"{type(err).__name__}: {_safe_body(str(err))}",
                endpoint=diagnostic_endpoint,
            )
            raise error from err

    @staticmethod
    def _response_error(body: str) -> str | None:
        for pattern in (
            r"(?im)^ErrorCode\s*=\s*([^\s;&]+)",
            r"(?im)^errorCode\s*=\s*([^\s;&]+)",
            r"(?im)^Error\s*=\s*([^\s;&]+)",
        ):
            match = re.search(pattern, body)
            if match:
                code = match.group(1)
                if code.casefold() not in {"0", "200", "ok", "success", "none"}:
                    return code
        stripped = body.strip()
        lower_body = stripped.casefold()
        if lower_body.startswith(("error", "failed", "failure")) or any(
            phrase in lower_body
            for phrase in ("not supported", "unsupported", "invalid command")
        ):
            return stripped.splitlines()[0][:100]
        return None

    @staticmethod
    def _event_data(value: str) -> Any:
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return {"raw": value}

    @staticmethod
    def _parse_fields(text: str) -> dict[str, str]:
        fields: dict[str, str] = {}
        for line in text.splitlines():
            line = line.strip().rstrip(";")
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            if key and not key.startswith("--"):
                fields[key.strip()] = value.strip()
        return fields

    @classmethod
    def _parse_records(cls, text: str) -> list[dict[str, Any]]:
        fields = cls._parse_fields(text)
        records: dict[int, dict[str, Any]] = {}
        for key, value in fields.items():
            match = re.match(r"records\[(\d+)\]\.(.+)", key)
            if match:
                records.setdefault(int(match.group(1)), {})[match.group(2)] = value
        return [records[index] for index in sorted(records)]

    async def _text(
        self,
        operation: str,
        path: str,
        params: dict[str, Any] | None = None,
    ) -> str:
        _, _, response, session = await self._get(operation, path, params=params)
        try:
            return await response.text()
        finally:
            response.release()
            await session.close()

    async def get_system_info(self) -> dict[str, Any]:
        text = await self._text(
            "get_system_info", "/cgi-bin/magicBox.cgi", {"action": "getSystemInfo"}
        )
        raw: dict[str, Any] = self._parse_fields(text)
        if not raw:
            raise DahuaNotSupported(
                self.name,
                "get_system_info",
                "Controller returned no system information fields",
                endpoint="/cgi-bin/magicBox.cgi?action=getSystemInfo",
                response_body=text,
            )
        aliases = {
            "manufacturer": ("manufacturer", "vendor"),
            "model": ("deviceModel", "model", "deviceType", "type"),
            "serial_number": ("serialNumber", "serial"),
            "firmware_version": ("firmwareVersion", "softwareVersion", "version"),
            "device_name": ("deviceName", "name"),
            "hardware_version": ("hardwareVersion",),
        }
        for normalized, keys in aliases.items():
            value = next((raw.get(key) for key in keys if raw.get(key)), None)
            if value is not None:
                raw[normalized] = value
        ip_address = next(
            (
                raw.get(key)
                for key in ("IPAddress", "ipAddress", "deviceIp")
                if raw.get(key)
            ),
            None,
        )
        if ip_address is not None:
            raw["ip_address"] = ip_address
        return raw

    async def get_access_records(
        self, start_time: datetime, end_time: datetime
    ) -> list[dict[str, Any]]:
        if end_time < start_time:
            raise ValueError("end_time must not be earlier than start_time")
        path = "/cgi-bin/recordFinder.cgi"
        base_params = {
            "action": "find",
            "name": "AccessControlCardRec",
            "StartTime": int(start_time.timestamp()),
            "EndTime": int(end_time.timestamp()),
            "count": 100,
        }
        records: list[dict[str, Any]] = []
        start_index = 0
        seen_pages: set[str] = set()
        for _ in range(1000):
            params = {**base_params, "StartIndex": start_index}
            text = await self._text("get_access_records", path, params)
            fields = self._parse_fields(text)
            page = self._parse_records(text)
            if not page:
                return records
            signature = json.dumps(page, sort_keys=True)
            if signature in seen_pages:
                raise DahuaOperationError(
                    self.name,
                    "get_access_records",
                    "Controller repeated a records page; results may be incomplete",
                    endpoint=path,
                    response_body=text,
                )
            seen_pages.add(signature)
            records.extend(_safe_raw(record) for record in page)
            found = int(fields.get("found", len(page)) or 0)
            total_text = fields.get("totalCount")
            total = int(total_text or 0)
            start_index += len(page)
            if total and start_index >= total:
                return records
            if len(page) < int(base_params["count"]):
                return records
            if found and found < len(page):
                return records
        raise DahuaOperationError(
            self.name,
            "get_access_records",
            "History pagination exceeded the safety limit",
            endpoint=path,
        )

    async def get_card_owners(self, card_number: str) -> list[str]:
        text = await self._text(
            "get_card_owners",
            "/cgi-bin/recordFinder.cgi",
            {
                "action": "find",
                "name": "AccessControlCard",
                "condition.CardNo": card_number,
                "count": 1024,
            },
        )
        return sorted(
            {
                name
                for record in self._parse_records(text)
                if str(record.get("CardNo", "")).strip() == card_number
                for name in DahuaAccessController.record_names(record)
            }
        )

    async def listen_events(self, callback: Callable[[dict[str, Any]], None]) -> None:
        # Keep the legacy event manager selectable alongside the multipart CGI
        # documented by Dahua's access-control integration guide.
        event_api = self.connection.provider_options.get("event_api", "eventManager")
        if event_api == "eventManager":
            path = "/cgi-bin/eventManager.cgi"
            params = {"action": "attach", "codes": "[All]"}
        elif event_api == "snapManager":
            path = "/cgi-bin/snapManager.cgi"
            params = {
                "action": "attachFileProc",
                "Flags[0]": "Event",
                "Events": "[AccessControl]",
                "heartbeat": 5,
            }
        else:
            raise ValueError("event_api must be eventManager or snapManager")
        _, _, response, session = await self._get(
            "listen_events",
            path,
            params=params,
            stream=True,
        )
        try:
            pending: dict[str, Any] = {}
            while raw_line := await response.content.readline():
                line = raw_line.decode("utf-8", errors="replace").strip()
                if not line:
                    event = self._event_from_fields(pending)
                    if event:
                        callback(_safe_raw(event))
                    pending.clear()
                    continue
                if line.startswith(("--", "Content-")):
                    continue
                if line.casefold() == "heartbeat":
                    continue
                if line.startswith("{"):
                    try:
                        payload = json.loads(line)
                    except json.JSONDecodeError:
                        payload = None
                    if isinstance(payload, dict):
                        event = {
                            "code": payload.get("Code") or payload.get("code"),
                            "action": payload.get("action"),
                            "index": payload.get("index"),
                            "data": payload.get("data", {}),
                            "raw": payload,
                        }
                        if isinstance(event["data"], str):
                            event["data"] = self._event_data(event["data"])
                        if event["code"]:
                            callback(_safe_raw(event))
                    continue
                dahua_code = self._response_error(line)
                if dahua_code:
                    raise DahuaOperationError(
                        self.name,
                        "listen_events",
                        "Dahua rejected the live-event subscription",
                        endpoint=str(response.url),
                        status=response.status,
                        dahua_code=dahua_code,
                        response_body=line,
                    )
                if "=" not in line:
                    continue
                parts = line.split(";") if event_api == "eventManager" else [line]
                for part in parts:
                    if "=" not in part:
                        continue
                    key, value = part.split("=", 1)
                    key = re.sub(r"^Events\[\d+\]\.", "", key.strip())
                    value = value.strip()
                    if key.casefold() == "code" and pending.get("Code"):
                        event = self._event_from_fields(pending)
                        if event:
                            callback(_safe_raw(event))
                        pending.clear()
                    pending[key] = value
                    if key.casefold() == "data":
                        event = self._event_from_fields(pending)
                        if event:
                            callback(_safe_raw(event))
                        pending.clear()
        except (aiohttp.ClientError, TimeoutError) as err:
            error = DahuaOperationError(
                self.name,
                "listen_events",
                f"{type(err).__name__}: {_safe_body(str(err))}",
                endpoint=path,
            )
            raise error from err
        finally:
            response.close()
            await session.close()

    @staticmethod
    def _event_from_fields(fields: dict[str, Any]) -> dict[str, Any] | None:
        clean = {key: value for key, value in fields.items() if not key.startswith("_")}
        code = clean.get("Code") or clean.get("code")
        if not code:
            return None
        data: dict[str, Any] = {}
        for key, value in clean.items():
            if key == "Code":
                continue
            if key.startswith("Data."):
                data[key.removeprefix("Data.")] = value
            elif key.casefold() == "data" and isinstance(value, str):
                parsed = CgiProvider._event_data(value)
                if isinstance(parsed, dict):
                    data.update(parsed)
                else:
                    data["value"] = parsed
            else:
                data[key] = value
        return {
            "code": code,
            "action": clean.get("action"),
            "index": clean.get("index"),
            "data": data,
            "raw": clean,
        }

    async def _get_door_config(self) -> dict[str, str]:
        text = await self._text(
            "get_doors",
            "/cgi-bin/configManager.cgi",
            {"action": "getConfig", "name": "AccessControl"},
        )
        return self._parse_fields(text)

    async def get_doors(self) -> list[dict[str, Any]]:
        config = await self._get_door_config()
        doors: dict[str, dict[str, Any]] = {}
        for key, value in config.items():
            match = re.search(
                r"(?:AccessControl\.)?(?:AccessControl|Door)\[(\d+)\]\.(.+)",
                key,
                re.IGNORECASE,
            )
            if not match:
                continue
            index, field_name = match.groups()
            door_id = str(int(index) + 1)
            door = doors.setdefault(
                door_id,
                {
                    "id": door_id,
                    "name": f"Door {door_id}",
                    "status": "unknown",
                    "online": None,
                },
            )
            if field_name.casefold() in {"name", "doorname", "label"} and value:
                door["name"] = value
            door.setdefault("raw", {})[field_name] = value
        if not doors:
            raise DahuaNotSupported(
                self.name,
                "get_doors",
                "Controller did not report door configuration",
                endpoint="/cgi-bin/configManager.cgi?action=getConfig&name=AccessControl",
                response_body=json.dumps(config),
            )
        return [_safe_raw(doors[key]) for key in sorted(doors, key=int)]

    async def get_door_status(self, door_id: str) -> dict[str, Any]:
        try:
            channel = self._door_channel(door_id)
        except ValueError as err:
            raise DahuaOperationError(
                self.name,
                "get_door_status",
                str(err),
                endpoint="/cgi-bin/accessControl.cgi?action=getDoorStatus",
            ) from err
        doors = await self.get_doors()
        discovered_door = next(
            (door for door in doors if str(door.get("id")) == str(door_id)),
            None,
        )
        if discovered_door is None:
            raise DahuaOperationError(
                self.name,
                "get_door_status",
                f"Door {door_id} was not reported by controller discovery",
                endpoint="/cgi-bin/configManager.cgi?action=getConfig&name=AccessControl",
            )
        text = await self._text(
            "get_door_status",
            "/cgi-bin/accessControl.cgi",
            {"action": "getDoorStatus", "channel": channel},
        )
        status = self._parse_fields(text)
        if not status:
            raise DahuaNotSupported(
                self.name,
                "get_door_status",
                "Controller returned no door status fields",
                endpoint="/cgi-bin/accessControl.cgi?action=getDoorStatus",
                response_body=text,
            )
        raw_status = next(
            (
                value
                for key, value in status.items()
                if key.casefold() in {"status", "doorstatus", "state"}
            ),
            "unknown",
        )
        normalized = {
            "closed": "closed",
            "close": "closed",
            "normalclose": "closed",
            "open": "open",
            "opened": "open",
            "normalopen": "open",
        }.get(str(raw_status).strip().casefold(), "unknown")
        online_value = next(
            (
                value
                for key, value in status.items()
                if key.casefold() in {"online", "isonline"}
            ),
            None,
        )
        online = (
            str(online_value).strip().casefold() in {"1", "true", "yes", "online"}
            if online_value is not None
            else None
        )
        return {
            "provider": self.name,
            "id": str(door_id),
            "name": discovered_door["name"],
            "status": normalized,
            "online": online,
            "raw": status,
        }

    @staticmethod
    def _door_channel(door_id: str) -> int:
        try:
            channel = int(door_id)
        except (ValueError, TypeError) as err:
            raise ValueError("door_id must be a discovered positive integer") from err
        if channel < 1:
            raise ValueError("door_id must be a discovered positive integer")
        return channel

    async def _door_command(self, door_id: str, action: str) -> dict[str, Any]:
        endpoint = f"/cgi-bin/accessControl.cgi?action={action}Door"
        try:
            channel = self._door_channel(door_id)
        except ValueError as err:
            raise DahuaOperationError(
                self.name,
                f"{action}_door",
                str(err),
                endpoint=endpoint,
            ) from err
        doors = await self.get_doors()
        if not any(str(door["id"]) == str(door_id) for door in doors):
            raise DahuaOperationError(
                self.name,
                f"{action}_door",
                f"Door {door_id} was not reported by controller discovery",
                endpoint="/cgi-bin/configManager.cgi?action=getConfig&name=AccessControl",
            )
        text = await self._text(
            f"{action}_door",
            "/cgi-bin/accessControl.cgi",
            {
                "action": "openDoor" if action == "open" else "closeDoor",
                "channel": channel,
            },
        )
        if text.strip().casefold() not in {"ok", "", "success", "true"}:
            raise DahuaOperationError(
                self.name,
                f"{action}_door",
                "Controller did not acknowledge the door command",
                endpoint=f"{endpoint}&channel={channel}",
                response_body=text,
            )
        return {
            "provider": self.name,
            "door_id": str(door_id),
            "operation": action,
            "accepted": True,
            "message": "Unlock command accepted"
            if action == "open"
            else "Relock command accepted",
        }

    async def open_door(self, door_id: str) -> dict[str, Any]:
        return await self._door_command(door_id, "open")

    async def close_door(self, door_id: str) -> dict[str, Any]:
        return await self._door_command(door_id, "close")

    async def get_snapshot(self) -> bytes:
        _, _, response, session = await self._get(
            "get_snapshot",
            "/cgi-bin/snapshot.cgi",
            params={"channel": 1},
            binary=True,
        )
        try:
            content = await response.read()
            if not content.startswith(b"\xff\xd8"):
                body = content[:500].decode("utf-8", errors="replace")
                dahua_code = self._response_error(body)
                if dahua_code:
                    raise DahuaOperationError(
                        self.name,
                        "get_snapshot",
                        "Dahua rejected the snapshot request",
                        endpoint=str(response.url),
                        status=response.status,
                        dahua_code=dahua_code,
                        response_body=body,
                    )
                raise DahuaNotSupported(
                    self.name,
                    "get_snapshot",
                    "Controller did not return a JPEG snapshot",
                    endpoint="/cgi-bin/snapshot.cgi",
                    status=response.status,
                    response_body=body,
                )
            return content
        finally:
            response.close()
            await session.close()

    async def get_preview_clip(self) -> bytes:
        raise DahuaNotSupported(
            self.name,
            "get_preview_clip",
            "A documented controller preview clip endpoint is not available",
        )


class NetSDKProvider:
    """Adapter for an explicitly installed Dahua NetSDK provider plugin.

    Dahua distributes versioned native libraries and matching Python bindings
    outside Frigate. The plugin boundary prevents loading an unknown ABI into
    Frigate's API process and makes missing SDK support visible.
    """

    name = "netsdk"

    def __init__(self, connection: DahuaConnection) -> None:
        self.connection = connection
        factory = self._load_provider()
        self._provider = factory(connection)

    @staticmethod
    def _load_provider():
        try:
            candidates = importlib.metadata.entry_points(group="frigate.dahua_netsdk")
        except TypeError:
            candidates = importlib.metadata.entry_points().select(
                group="frigate.dahua_netsdk"
            )
        candidates = list(candidates)
        if len(candidates) != 1:
            reason = (
                "No Dahua NetSDK provider is installed. Install one built against the official Linux x86_64 SDK."
                if not candidates
                else "Multiple Dahua NetSDK providers are installed: "
                + ", ".join(candidate.name for candidate in candidates)
            )
            raise DahuaNotSupported(
                "netsdk",
                "initialize",
                reason,
                endpoint="Dahua NetSDK runtime",
            )
        return candidates[0].load()

    def __getattr__(self, name: str):
        return getattr(self._provider, name)


class UnavailableProvider:
    """Provider selection that reports a missing runtime on each operation."""

    def __init__(self, provider: str, error: DahuaNotSupported) -> None:
        self.name = provider
        self.error = error

    def get_capabilities(self) -> dict[str, dict[str, str]]:
        return {
            operation: {
                "provider": self.name,
                "status": "runtime-unavailable",
                "reason": str(self.error),
            }
            for operation in (
                "get_system_info",
                "is_online",
                "get_access_records",
                "get_card_owners",
                "listen_events",
                "get_doors",
                "get_door_status",
                "open_door",
                "close_door",
                "get_snapshot",
                "get_preview",
                "get_preview_clip",
            )
        }

    def __getattr__(self, name: str):
        async def unavailable(*args, **kwargs):
            raise DahuaNotSupported(
                self.name,
                name,
                str(self.error),
                endpoint=self.error.endpoint,
            )

        return unavailable


class DahuaAccessController:
    """Stable application adapter over an explicitly selected Dahua provider."""

    def __init__(
        self,
        ip: str,
        username: str = "admin",
        password: str = "",
        port: int = 80,
        timeout: float = 5,
        use_auth: bool = True,
        *,
        provider: str = "cgi",
        scheme: str = "http",
        sdk_port: int = 37777,
        provider_options: dict[str, Any] | None = None,
        diagnostic: Callable[[dict[str, Any]], None] | None = None,
    ) -> None:
        self.connection = DahuaConnection(
            ip=ip,
            username=username,
            password=password,
            port=port,
            timeout=timeout,
            use_auth=use_auth,
            scheme=scheme,
            sdk_port=sdk_port,
            provider_options=provider_options or {},
        )
        self.provider_name = provider.casefold()
        if self.provider_name == "cgi":
            self.provider: DahuaProvider = CgiProvider(self.connection, diagnostic)
        elif self.provider_name == "netsdk":
            try:
                self.provider = NetSDKProvider(self.connection)  # type: ignore[assignment]
            except DahuaNotSupported as err:
                self.provider = UnavailableProvider(self.provider_name, err)  # type: ignore[assignment]
            except Exception as err:  # noqa: BLE001 - preserve SDK load diagnostics
                response_body = getattr(err, "response_body", None) or getattr(
                    err, "body", None
                )
                self.provider = UnavailableProvider(
                    self.provider_name,
                    DahuaNotSupported(
                        self.provider_name,
                        "initialize",
                        f"NetSDK provider could not load: {type(err).__name__}: {_safe_body(str(err).replace(self.connection.password, '<redacted>') if self.connection.password else str(err))}",
                        endpoint="Dahua NetSDK runtime",
                        response_body=(
                            str(response_body).replace(self.connection.password, "<redacted>")
                            if response_body is not None and self.connection.password
                            else str(response_body) if response_body is not None else None
                        ),
                    ),
                )  # type: ignore[assignment]
        else:
            raise ValueError(f"Unknown Dahua provider: {provider}")

    async def _provider_call(self, operation: str, *args):
        """Invoke one provider operation and attach consistent diagnostics."""
        redaction_token = _redaction_secret.set(self.connection.password)
        try:
            method = getattr(self.provider, operation)
            return _safe_raw(await method(*args))
        except DahuaOperationError:
            raise
        except Exception as err:  # noqa: BLE001 - capture provider operation failures
            response_body = getattr(err, "response_body", None) or getattr(
                err, "body", None
            )
            raise DahuaOperationError(
                self.provider_name,
                operation,
                f"{type(err).__name__}: {_safe_body(str(err))}",
                endpoint=(
                    getattr(err, "endpoint", None)
                    or getattr(err, "url", None)
                    or operation
                ),
                status=getattr(err, "status_code", None)
                or getattr(err, "status", None),
                dahua_code=getattr(err, "dahua_code", None)
                or getattr(err, "error_code", None),
                response_body=(
                    str(response_body) if response_body is not None else None
                ),
            ) from err
        finally:
            _redaction_secret.reset(redaction_token)

    async def get_system_info_async(self) -> dict[str, Any]:
        return await self._provider_call("get_system_info")

    def get_system_info(self) -> dict[str, Any]:
        return _sync(self.get_system_info_async())

    async def is_online_async(self) -> bool:
        try:
            return bool(await self.get_system_info_async())
        except (DahuaOperationError, ValueError):
            return False

    def is_online(self) -> bool:
        return _sync(self.is_online_async())

    async def get_access_records_async(
        self, start_time: datetime, end_time: datetime
    ) -> list[dict[str, Any]]:
        return await self._provider_call("get_access_records", start_time, end_time)

    def get_access_records(
        self, start_time: datetime, end_time: datetime
    ) -> list[dict[str, Any]]:
        return _sync(self.get_access_records_async(start_time, end_time))

    async def get_card_owners_async(self, card_number: str) -> list[str]:
        return await self._provider_call("get_card_owners", card_number)

    def get_card_owners(self, card_number: str) -> list[str]:
        return _sync(self.get_card_owners_async(card_number))

    async def listen_events_async(
        self, callback: Callable[[dict[str, Any]], None]
    ) -> None:
        def safe_callback(event: dict[str, Any]) -> None:
            callback(self.sanitize_raw_event(event))

        await self._provider_call("listen_events", safe_callback)

    def listen_events(self, callback: Callable[[dict[str, Any]], None]) -> None:
        _sync(self.listen_events_async(callback))

    async def get_doors_async(self) -> list[dict[str, Any]]:
        return await self._provider_call("get_doors")

    def get_doors(self) -> list[dict[str, Any]]:
        return _sync(self.get_doors_async())

    async def get_door_status_async(self, door_id: str) -> dict[str, Any]:
        return await self._provider_call("get_door_status", door_id)

    def get_door_status(self, door_id: str) -> dict[str, Any]:
        return _sync(self.get_door_status_async(door_id))

    async def open_door_async(self, door_id: str) -> dict[str, Any]:
        return await self._provider_call("open_door", door_id)

    def open_door(self, door_id: str) -> dict[str, Any]:
        return _sync(self.open_door_async(door_id))

    async def close_door_async(self, door_id: str) -> dict[str, Any]:
        return await self._provider_call("close_door", door_id)

    def close_door(self, door_id: str) -> dict[str, Any]:
        return _sync(self.close_door_async(door_id))

    async def get_snapshot_async(self) -> bytes:
        return await self._provider_call("get_snapshot")

    def get_snapshot(self) -> bytes:
        return _sync(self.get_snapshot_async())

    async def get_preview_async(self) -> dict[str, Any]:
        try:
            await self.get_snapshot_async()
        except DahuaOperationError as err:
            return {
                "available": False,
                "source": None,
                "provider": self.provider_name,
                "diagnostic": err.as_dict(),
            }
        return {
            "available": True,
            "source": "controller_snapshot",
            "provider": self.provider_name,
        }

    def get_preview(self) -> dict[str, Any]:
        return _sync(self.get_preview_async())

    def get_capabilities(self) -> dict[str, dict[str, str]]:
        """Report the selected provider and the runtime state of each feature."""
        operations = (
            "get_system_info",
            "is_online",
            "get_access_records",
            "get_card_owners",
            "listen_events",
            "get_doors",
            "get_door_status",
            "open_door",
            "close_door",
            "get_snapshot",
            "get_preview",
            "get_preview_clip",
        )
        if self.provider_name == "cgi":
            return {
                operation: {
                    "provider": self.provider_name,
                    "status": "unsupported"
                    if operation == "get_preview_clip"
                    else "untested",
                    "reason": (
                        "No controller preview clip endpoint is implemented"
                        if operation == "get_preview_clip"
                        else "Provider implements this operation; device support has not been checked"
                    ),
                }
                for operation in operations
            }
        capabilities = getattr(self.provider, "get_capabilities", None)
        if callable(capabilities):
            try:
                return capabilities()
            except Exception as err:  # noqa: BLE001 - capture SDK capability failures
                raise DahuaOperationError(
                    self.provider_name,
                    "get_capabilities",
                    f"{type(err).__name__}: {_safe_body(str(err))}",
                    endpoint="get_capabilities",
                ) from err
        return {
            operation: {
                "provider": self.provider_name,
                "status": "untested",
                "reason": "Provided by the configured NetSDK plugin; device support has not been checked",
            }
            for operation in operations
        }

    async def get_preview_clip_async(self) -> bytes:
        method = getattr(self.provider, "get_preview_clip", None)
        if method is None:
            raise DahuaNotSupported(
                self.provider_name,
                "get_preview_clip",
                "Provider does not support preview clips",
            )
        return await self._provider_call("get_preview_clip")

    def get_preview_clip(self) -> bytes:
        return _sync(self.get_preview_clip_async())

    @staticmethod
    def sanitize_raw_event(event: dict[str, Any]) -> dict[str, Any]:
        """Remove passwords, PINs, tokens, and auth headers from raw events."""
        return _safe_raw(event)

    @staticmethod
    def record_names(record: dict) -> list[str]:
        """Extract single or indexed card and user names from Dahua records."""
        names: list[str] = []
        for key, value in record.items():
            normalized_key = key.casefold()
            if normalized_key not in {
                "cardname",
                "cardnames",
                "username",
                "usernames",
                "names",
                "user_name",
                "owner_names",
            } and not key.startswith(
                ("CardName[", "CardNames[", "UserName[", "UserNames[", "Names[")
            ):
                continue
            if isinstance(value, str) and value.startswith("["):
                try:
                    value = json.loads(value)
                except json.JSONDecodeError:
                    pass
            for item in value if isinstance(value, list) else [value]:
                if isinstance(item, str) and item.strip():
                    names.append(item.strip())
        return list(dict.fromkeys(names))

    @staticmethod
    def normalize_event(event: dict[str, Any], device_id: str) -> dict[str, Any]:
        """Map provider events and access records into Frigate's common shape."""
        raw = _safe_raw(event.get("raw", event))
        data = event.get("data")
        if not isinstance(data, dict):
            data = {}
        else:
            data = _safe_raw(data)
        source = {**event, **data}

        def first_present(*keys: str):
            return next(
                (source[key] for key in keys if source.get(key) is not None), None
            )

        timestamp = next(
            (
                source.get(key)
                for key in ("timestamp", "CreateTime", "Time", "time", "PTS")
                if source.get(key) is not None
            ),
            None,
        )
        if isinstance(timestamp, str):
            try:
                timestamp = float(timestamp)
            except ValueError:
                try:
                    timestamp = datetime.fromisoformat(timestamp).timestamp()
                except ValueError:
                    timestamp = None
        try:
            timestamp = float(timestamp) if timestamp is not None else None
        except (ValueError, TypeError):
            timestamp = None
        card_number = first_present("CardNo", "card_number", "cardNo")
        card_name = first_present("CardName", "card_name", "CardholderName")
        return {
            "device_id": device_id,
            "event_code": event.get("code") or first_present("Code", "EventType"),
            "timestamp": timestamp,
            "door_id": first_present("DoorID", "DoorNo", "Door", "door_id", "channel"),
            "reader_id": first_present("ReaderID", "Reader", "reader_id"),
            "card_number": str(card_number).strip()
            if card_number is not None
            else None,
            "user_id": first_present("UserID", "user_id"),
            "user_name": first_present("UserName", "user_name") or card_name,
            "card_name": card_name,
            "access_status": first_present("Status", "status", "result"),
            "authentication_method": first_present("Method", "method"),
            "action": event.get("action") or first_present("action"),
            "data": data,
            "raw": raw,
        }
