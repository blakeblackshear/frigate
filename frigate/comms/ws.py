"""Websocket communicator."""

import errno
import json
import logging
import threading
from typing import Any, Callable
from wsgiref.simple_server import make_server

from ws4py.server.wsgirefserver import (
    WebSocketWSGIHandler,
    WebSocketWSGIRequestHandler,
    WSGIServer,
)
from ws4py.server.wsgiutils import WebSocketWSGIApplication
from ws4py.websocket import WebSocket as WebSocket_

from frigate.comms.base_communicator import Communicator
from frigate.config import FrigateConfig
from frigate.const import (
    CLEAR_ONGOING_REVIEW_SEGMENTS,
    EXPIRE_AUDIO_ACTIVITY,
    INSERT_MANY_RECORDINGS,
    INSERT_PREVIEW,
    NOTIFICATION_TEST,
    REQUEST_REGION_GRID,
    UPDATE_AUDIO_ACTIVITY,
    UPDATE_AUDIO_TRANSCRIPTION_STATE,
    UPDATE_BIRDSEYE_LAYOUT,
    UPDATE_CAMERA_ACTIVITY,
    UPDATE_EMBEDDINGS_REINDEX_PROGRESS,
    UPDATE_EVENT_DESCRIPTION,
    UPDATE_MODEL_STATE,
    UPDATE_REVIEW_DESCRIPTION,
    UPSERT_REVIEW_SEGMENT,
)
from frigate.models import User
from frigate.output.ws_auth import ws_has_camera_access

logger = logging.getLogger(__name__)

# Internal IPC topics — NEVER allowed from WebSocket, regardless of role
_WS_BLOCKED_TOPICS = frozenset(
    {
        INSERT_MANY_RECORDINGS,
        INSERT_PREVIEW,
        REQUEST_REGION_GRID,
        UPSERT_REVIEW_SEGMENT,
        CLEAR_ONGOING_REVIEW_SEGMENTS,
        UPDATE_CAMERA_ACTIVITY,
        UPDATE_AUDIO_ACTIVITY,
        EXPIRE_AUDIO_ACTIVITY,
        UPDATE_EVENT_DESCRIPTION,
        UPDATE_REVIEW_DESCRIPTION,
        UPDATE_MODEL_STATE,
        UPDATE_EMBEDDINGS_REINDEX_PROGRESS,
        UPDATE_BIRDSEYE_LAYOUT,
        UPDATE_AUDIO_TRANSCRIPTION_STATE,
        NOTIFICATION_TEST,
    }
)

# Read-only topics any authenticated user (including viewer) can send
_WS_VIEWER_TOPICS = frozenset(
    {
        "onConnect",
        "modelState",
        "audioTranscriptionState",
        "birdseyeLayout",
        "embeddingsReindexProgress",
        "jobState",
    }
)


def _check_ws_authorization(
    topic: str,
    role_header: str | None,
    separator: str,
) -> bool:
    """Check if a WebSocket message is authorized.

    Args:
        topic: The message topic.
        role_header: The HTTP_REMOTE_ROLE header value, or None.
        separator: The role separator character from proxy config.

    Returns:
        True if authorized, False if blocked.
    """
    # Block IPC-only topics unconditionally
    if topic in _WS_BLOCKED_TOPICS:
        return False

    # No role header: default to viewer (fail-closed)
    if role_header is None:
        return topic in _WS_VIEWER_TOPICS

    # Check if any role is admin
    roles = [r.strip() for r in role_header.split(separator)]
    if "admin" in roles:
        return True

    # Non-admin: only viewer topics allowed
    return topic in _WS_VIEWER_TOPICS


# ---- Outbound filtering ---------------------------------------------------
#
# Every WebSocket broadcast is classified into one of a small set of scopes,
# then materialized per recipient. Connections with restricted roles only see
# data for cameras they are authorized to access; admin and full-access roles
# behave as today.

# Topics that are safe to broadcast to every authenticated client.
_WS_GLOBAL_OUTBOUND_TOPICS = frozenset(
    {
        "model_state",
        "embeddings_reindex_progress",
        "audio_transcription_state",
        "profile/state",
        "notifications/state",
        "notification_test",
    }
)

# Topics that restricted roles must never receive. Birdseye composites span
# all cameras, so the existing JSMPEG policy already restricts birdseye access
# to unrestricted roles; the layout broadcast follows the same rule.
_WS_UNRESTRICTED_ONLY_TOPICS = frozenset(
    {
        "birdseye_layout",
    }
)

# Topics whose payload (parsed as JSON) names a single owning camera at the
# given key path. Used to scope events, reviews, triggers, etc.
_WS_PAYLOAD_CAMERA_TOPICS: dict[str, tuple[str, ...]] = {
    "events": ("after", "camera"),
    "reviews": ("after", "camera"),
    "tracked_object_update": ("camera",),
    "triggers": ("camera",),
    "camera_monitoring": ("camera",),
}

# Topics whose payload is a dict keyed by camera name; filter keys per
# recipient.
_WS_RESHAPE_BY_CAMERA_KEY_TOPICS = frozenset(
    {
        "camera_activity",
        "audio_detections",
    }
)

# Topics whose payload is a dict keyed by job_type, where each entry may
# contain a "camera" or "source_camera" field, or a nested ``results.jobs``
# list of per-camera sub-jobs (export broadcasts).
_WS_RESHAPE_JOB_STATE_TOPICS = frozenset(
    {
        "job_state",
    }
)

# Topics whose payload mixes global aggregates with a ``cameras`` sub-dict
# keyed by camera name. Aggregates and detector data stay; per-camera entries
# are filtered.
_WS_RESHAPE_STATS_TOPICS = frozenset(
    {
        "stats",
    }
)


def _collect_zone_names(config: FrigateConfig) -> set[str]:
    """Return the set of all zone names defined across cameras."""
    names: set[str] = set()
    for camera in config.cameras.values():
        zones = getattr(camera, "zones", None) or {}
        names.update(zones.keys())
    return names


def _parse_json_payload(payload: Any) -> Any:
    """Return payload parsed as JSON if it is a string, else as-is."""
    if isinstance(payload, str):
        try:
            return json.loads(payload)
        except (ValueError, TypeError):
            return None
    return payload


def _scope_job_entry_to_allowed(entry: Any, allowed: set[str]) -> dict[str, Any] | None:
    """Filter a single job_state entry to the recipient's allowed cameras.

    Returns the (possibly reshaped) entry, or None to drop it. Four shapes
    are handled:

    * Top-level ``camera`` or ``source_camera`` (motion_search, vlm_watch,
      export sub-job dicts): drop the entry if not allowed.
    * Nested ``results.jobs`` list of per-camera sub-jobs (the aggregated
      export broadcast): filter the list; drop the entry if nothing remains.
    * Nested ``results.camera`` or ``results.source_camera`` (debug_replay,
      which puts replay-specific fields inside ``results``): drop the entry
      if not allowed.
    * No camera anywhere (e.g. ``media_sync``): treat as global and keep.
    """
    if not isinstance(entry, dict):
        return None

    cam = entry.get("camera") or entry.get("source_camera")

    if cam is None:
        results = entry.get("results")
        if isinstance(results, dict):
            sub_jobs = results.get("jobs")
            if isinstance(sub_jobs, list):
                filtered_jobs = [
                    j
                    for j in sub_jobs
                    if isinstance(j, dict)
                    and (j.get("camera") or j.get("source_camera")) in allowed
                ]
                if not filtered_jobs:
                    return None
                reshaped = dict(entry)
                reshaped["results"] = dict(results)
                reshaped["results"]["jobs"] = filtered_jobs
                return reshaped

            cam = results.get("camera") or results.get("source_camera")

    if cam is not None:
        return entry if cam in allowed else None

    return entry


def _extract_payload_camera(payload: Any, path: tuple[str, ...]) -> str | None:
    """Walk the dotted path through a (possibly JSON-encoded) payload."""
    cur = _parse_json_payload(payload)
    for key in path:
        if not isinstance(cur, dict):
            return None
        cur = cur.get(key)
    return cur if isinstance(cur, str) else None


def _classify_outbound(
    topic: str, all_cameras: set[str], all_zones: set[str]
) -> tuple[str, Any]:
    """Classify an outbound topic into (kind, extra).

    kind values:
      - "global"             : send to every authenticated client
      - "drop"               : send to nobody (fail-closed for unknowns)
      - "unrestricted_only"  : send only to admin/full-access roles
      - "camera"             : extra is the owning camera name
      - "payload_camera"     : extra is the JSON key path to the camera name
      - "reshape_by_camera_key"
      - "reshape_job_state"
      - "reshape_stats"
    """
    if topic in _WS_GLOBAL_OUTBOUND_TOPICS:
        return ("global", None)
    if topic in _WS_UNRESTRICTED_ONLY_TOPICS:
        return ("unrestricted_only", None)
    if topic in _WS_RESHAPE_BY_CAMERA_KEY_TOPICS:
        return ("reshape_by_camera_key", None)
    if topic in _WS_RESHAPE_JOB_STATE_TOPICS:
        return ("reshape_job_state", None)
    if topic in _WS_RESHAPE_STATS_TOPICS:
        return ("reshape_stats", None)
    if topic in _WS_PAYLOAD_CAMERA_TOPICS:
        return ("payload_camera", _WS_PAYLOAD_CAMERA_TOPICS[topic])

    # Topic-prefix based: first segment names the owning camera or zone.
    first = topic.split("/", 1)[0]
    if first in all_cameras:
        return ("camera", first)
    if first in all_zones:
        # Zone aggregates span cameras; restricted users see nothing here.
        return ("unrestricted_only", None)

    return ("drop", None)


def _ws_role_header(ws: Any) -> str | None:
    """Return the HTTP_REMOTE_ROLE header value, if any."""
    environ = getattr(ws, "environ", None)
    if not environ:
        return None
    value = environ.get("HTTP_REMOTE_ROLE")
    return value if isinstance(value, str) else None


def _ws_valid_roles(ws: Any, config: FrigateConfig) -> list[str]:
    """Return the list of recognized roles for this connection."""
    header = _ws_role_header(ws)
    if not header:
        return []
    roles = [r.strip() for r in header.split(config.proxy.separator) if r.strip()]
    return [r for r in roles if r in config.auth.roles]


def _ws_is_unrestricted(ws: Any, config: FrigateConfig) -> bool:
    """True when the connection has unrestricted camera access.

    Mirrors the policy in ``frigate.output.ws_auth``: admin or any role with
    an empty allow-list grants full access.
    """
    roles = _ws_valid_roles(ws, config)
    if not roles:
        return False
    roles_dict = config.auth.roles
    return any(r == "admin" or not roles_dict.get(r) for r in roles)


def _ws_allowed_cameras(ws: Any, config: FrigateConfig) -> set[str]:
    """Return the union of cameras this connection may access across its roles."""
    roles = _ws_valid_roles(ws, config)
    if not roles:
        return set()
    all_cameras = set(config.cameras.keys())
    allowed: set[str] = set()
    for role in roles:
        if role == "admin" or not config.auth.roles.get(role):
            return all_cameras
        allowed.update(User.get_allowed_cameras(role, config.auth.roles, all_cameras))
    return allowed


def _wrap_envelope(topic: str, inner_payload: Any) -> str:
    """Re-serialize a (topic, payload) message after payload reshaping.

    Frigate's wire format keeps payloads as JSON-encoded strings inside the
    outer envelope, mirroring what producers send today.
    """
    return json.dumps({"topic": topic, "payload": json.dumps(inner_payload)})


def _materialize_for_ws(
    ws: Any,
    topic: str,
    full_message: str,
    scope: tuple[str, Any],
    parsed_payload: Any,
    config: FrigateConfig,
) -> str | None:
    """Return the JSON string to deliver to ``ws``, or None to skip it."""
    kind, extra = scope
    has_role = _ws_role_header(ws) is not None

    if kind == "drop":
        return None

    if kind == "global":
        # Globals still require an authenticated connection. Missing role
        # falls back to viewer semantics (matching the inbound rule).
        return full_message

    # Beyond globals, an authenticated role header is required (fail-closed).
    if not has_role:
        return None

    if kind == "unrestricted_only":
        return full_message if _ws_is_unrestricted(ws, config) else None

    if kind == "camera":
        return full_message if ws_has_camera_access(ws, extra, config) else None

    if kind == "payload_camera":
        camera = _extract_payload_camera(parsed_payload, extra)
        if camera is None:
            return None
        return full_message if ws_has_camera_access(ws, camera, config) else None

    if kind == "reshape_by_camera_key":
        if _ws_is_unrestricted(ws, config):
            return full_message
        if not isinstance(parsed_payload, dict):
            return None
        allowed = _ws_allowed_cameras(ws, config)
        filtered = {cam: data for cam, data in parsed_payload.items() if cam in allowed}
        if not filtered:
            return None
        return _wrap_envelope(topic, filtered)

    if kind == "reshape_job_state":
        if _ws_is_unrestricted(ws, config):
            return full_message
        if not isinstance(parsed_payload, dict):
            return None
        allowed = _ws_allowed_cameras(ws, config)
        filtered_jobs: dict[str, Any] = {}
        for job_type, job_payload in parsed_payload.items():
            scoped = _scope_job_entry_to_allowed(job_payload, allowed)
            if scoped is not None:
                filtered_jobs[job_type] = scoped
        if not filtered_jobs:
            return None
        return _wrap_envelope(topic, filtered_jobs)

    if kind == "reshape_stats":
        if _ws_is_unrestricted(ws, config):
            return full_message
        if not isinstance(parsed_payload, dict):
            return None
        allowed = _ws_allowed_cameras(ws, config)
        cameras_block = parsed_payload.get("cameras")
        if isinstance(cameras_block, dict):
            filtered_cameras = {
                name: data for name, data in cameras_block.items() if name in allowed
            }
            reshaped = dict(parsed_payload)
            reshaped["cameras"] = filtered_cameras
            return _wrap_envelope(topic, reshaped)
        return full_message

    return None


class WebSocket(WebSocket_):  # type: ignore[misc]
    def unhandled_error(self, error: Any) -> None:
        """
        Handles the unfriendly socket closures on the server side
        without showing a confusing error message
        """
        if hasattr(error, "errno") and error.errno == errno.ECONNRESET:
            pass
        else:
            logging.getLogger("ws4py").exception("Failed to receive data")


class WebSocketClient(Communicator):
    """Frigate wrapper for ws client."""

    def __init__(self, config: FrigateConfig) -> None:
        self.config = config
        self.websocket_server: WSGIServer | None = None

    def subscribe(self, receiver: Callable) -> None:
        self._dispatcher = receiver
        self.start()

    def start(self) -> None:
        """Start the websocket client."""

        class _WebSocketHandler(WebSocket):
            receiver = self._dispatcher
            role_separator = self.config.proxy.separator or ","

            def received_message(self, message: WebSocket.received_message) -> None:  # type: ignore[name-defined]
                try:
                    json_message = json.loads(message.data.decode("utf-8"))
                    json_message = {
                        "topic": json_message.get("topic"),
                        "payload": json_message.get("payload"),
                    }
                except Exception:
                    logger.warning(
                        f"Unable to parse websocket message as valid json: {message.data.decode('utf-8')}"
                    )
                    return

                topic = json_message["topic"]

                # Authorization check (skip when environ is None — direct internal connection)
                role_header = (
                    self.environ.get("HTTP_REMOTE_ROLE") if self.environ else None
                )
                if self.environ is not None and not _check_ws_authorization(
                    topic, role_header, self.role_separator
                ):
                    logger.warning(
                        "Blocked unauthorized WebSocket message: topic=%s, role=%s",
                        topic,
                        role_header,
                    )
                    return

                logger.debug(f"Publishing mqtt message from websockets at {topic}.")
                self.receiver(
                    topic,
                    json_message["payload"],
                )

        # start a websocket server on 5002
        WebSocketWSGIHandler.http_version = "1.1"
        self.websocket_server = make_server(
            "127.0.0.1",
            5002,
            server_class=WSGIServer,
            handler_class=WebSocketWSGIRequestHandler,
            app=WebSocketWSGIApplication(handler_cls=_WebSocketHandler),
        )
        self.websocket_server.initialize_websockets_manager()
        self.websocket_thread = threading.Thread(
            target=self.websocket_server.serve_forever
        )
        self.websocket_thread.start()

    def publish(self, topic: str, payload: Any, _: bool = False) -> None:
        if self.websocket_server is None:
            logger.debug("Skipping message, websocket not connected yet")
            return

        try:
            ws_message = json.dumps(
                {
                    "topic": topic,
                    "payload": payload,
                }
            )
        except Exception:
            # if the payload can't be decoded don't relay to clients
            logger.debug(f"payload for {topic} wasn't text. Skipping...")
            return

        all_cameras = set(self.config.cameras.keys())
        all_zones = _collect_zone_names(self.config)
        scope = _classify_outbound(topic, all_cameras, all_zones)

        if scope[0] == "drop":
            return

        # Pre-parse payload once for topics that need to read its contents.
        parsed_payload: Any = None
        if scope[0] in (
            "payload_camera",
            "reshape_by_camera_key",
            "reshape_job_state",
            "reshape_stats",
        ):
            parsed_payload = _parse_json_payload(payload)
            if parsed_payload is None:
                # malformed payload — fail closed
                return

        manager = self.websocket_server.manager
        with manager.lock:
            websockets = list(manager.websockets.values())

        for ws in websockets:
            if getattr(ws, "terminated", False):
                continue
            message = _materialize_for_ws(
                ws, topic, ws_message, scope, parsed_payload, self.config
            )
            if message is None:
                continue
            try:
                ws.send(message)
            except (ConnectionResetError, BrokenPipeError, ValueError):
                pass

    def stop(self) -> None:
        if self.websocket_server is not None:
            self.websocket_server.manager.close_all()
            self.websocket_server.manager.stop()
            self.websocket_server.manager.join()
            self.websocket_server.shutdown()

        self.websocket_thread.join()
        logger.info("Exiting websocket client...")
