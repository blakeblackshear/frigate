"""URI-aware authorization for nginx-served static media.

The `/auth` endpoint (used as nginx `auth_request` target) calls into this
module to classify the requested URI from the `X-Original-URL` header and, for
camera-scoped resources, decide whether the current role may access them.

Without this, `auth_request` only verifies the JWT — every authenticated user
could read clips, recordings, and exports for *any* camera, bypassing the
per-camera authorization the regular API enforces via `require_camera_access`.
"""

from __future__ import annotations

import logging
import os
from enum import Enum
from typing import Optional
from urllib.parse import unquote, urlparse

from peewee import DoesNotExist

from frigate.config import FrigateConfig
from frigate.const import EXPORT_DIR
from frigate.models import Export, User

logger = logging.getLogger(__name__)


class MediaAuthResolution(str, Enum):
    """Classification of an `X-Original-URL` path for media-auth purposes."""

    CAMERA = "camera"
    ADMIN_ONLY = "admin_only"
    LISTING_MULTI_CAMERA = "listing_multi_camera"
    LISTING_NEUTRAL = "listing_neutral"
    # Under a recognized media root (/clips, /recordings, /exports) but
    # unclassifiable (unknown subtree, no matching DB row, DB error).
    # Restricted users are denied; admins/full-access roles are allowed
    # (nginx will likely return 404 if the file genuinely doesn't exist).
    UNRESOLVED_MEDIA = "unresolved_media"
    # Not a media URI at all (e.g. /api/events, /login).
    UNKNOWN = "unknown"


def extract_path(original_url: Optional[str]) -> Optional[str]:
    """Return the decoded path component of nginx's `X-Original-URL` header.

    nginx forwards the *raw* request URI (with `..` segments intact) via
    `$request_uri`. nginx normalizes the path before serving the file, so a
    request like `/recordings/.../allowed_cam/../forbidden_cam/file.mp4`
    would (1) parse as the allowed camera in our auth check, (2) be served
    as the forbidden camera by nginx. To close the bypass we reject any URI
    whose path contains `.` or `..` segments outright.
    """
    if not original_url:
        return None

    parsed = urlparse(original_url)
    raw_path = parsed.path or original_url
    decoded = unquote(raw_path)
    if not decoded:
        return None

    if not decoded.startswith("/"):
        decoded = "/" + decoded

    segments = decoded.split("/")
    if ".." in segments or "." in segments:
        return None

    return decoded


def resolve_media_uri(
    uri: str, frigate_config: Optional[FrigateConfig] = None
) -> tuple[MediaAuthResolution, Optional[str]]:
    """Classify a URI and return the owning camera if applicable.

    `frigate_config` is used to disambiguate clip/review filenames whose
    camera name contains hyphens by matching against the longest configured
    camera-name prefix.
    """
    if not uri:
        return MediaAuthResolution.UNKNOWN, None

    parts = [p for p in uri.split("/") if p]
    if not parts:
        return MediaAuthResolution.UNKNOWN, None

    root = parts[0]
    if root == "recordings":
        return _resolve_recording(parts)
    if root == "clips":
        return _resolve_clip(parts, frigate_config)
    if root == "exports":
        return _resolve_export(parts)

    return MediaAuthResolution.UNKNOWN, None


def _resolve_recording(
    parts: list[str],
) -> tuple[MediaAuthResolution, Optional[str]]:
    # /recordings                          → neutral
    # /recordings/{date}                   → neutral
    # /recordings/{date}/{hour}            → multi-camera listing
    # /recordings/{date}/{hour}/{cam}/...  → camera
    if len(parts) <= 2:
        return MediaAuthResolution.LISTING_NEUTRAL, None
    if len(parts) == 3:
        return MediaAuthResolution.LISTING_MULTI_CAMERA, None
    return MediaAuthResolution.CAMERA, parts[3]


def _resolve_clip(
    parts: list[str], frigate_config: Optional[FrigateConfig]
) -> tuple[MediaAuthResolution, Optional[str]]:
    # /clips                                          → multi-camera listing
    # /clips/thumbs/{cam}/...                         → camera
    # /clips/previews/{cam}/...                       → camera
    # /clips/review/thumb-{cam}-{review_id}.webp      → camera (parsed)
    # /clips/faces/...                                → admin-only
    # /clips/genai-requests/...                       → admin-only
    # /clips/preview_restart_cache/...                → admin-only
    # /clips/{model}/train|dataset/...                → admin-only
    # /clips/{cam}-{event_id}[-clean].{ext}           → camera (parsed)
    # other /clips/{subdir}/...                       → unresolved (deny restricted)
    if len(parts) == 1:
        return MediaAuthResolution.LISTING_MULTI_CAMERA, None

    second = parts[1]

    if second in ("thumbs", "previews"):
        if len(parts) == 2:
            return MediaAuthResolution.LISTING_MULTI_CAMERA, None
        return MediaAuthResolution.CAMERA, parts[2]

    if second == "review":
        if len(parts) == 2:
            return MediaAuthResolution.LISTING_MULTI_CAMERA, None
        camera = _camera_from_thumb_filename(parts[2], frigate_config)
        if camera:
            return MediaAuthResolution.CAMERA, camera
        return MediaAuthResolution.UNRESOLVED_MEDIA, None

    if second in ("faces", "genai-requests", "preview_restart_cache"):
        return MediaAuthResolution.ADMIN_ONLY, None

    if len(parts) >= 3 and parts[2] in ("train", "dataset"):
        return MediaAuthResolution.ADMIN_ONLY, None

    if len(parts) == 2:
        camera = _camera_from_clip_filename(second, frigate_config)
        if camera:
            return MediaAuthResolution.CAMERA, camera
        return MediaAuthResolution.UNRESOLVED_MEDIA, None

    return MediaAuthResolution.UNRESOLVED_MEDIA, None


def _longest_prefix_camera(
    stem: str, frigate_config: Optional[FrigateConfig]
) -> Optional[str]:
    if frigate_config is None:
        return None
    for cam in sorted(frigate_config.cameras.keys(), key=len, reverse=True):
        if stem.startswith(cam + "-"):
            return cam
    return None


def _camera_from_clip_filename(
    filename: str, frigate_config: Optional[FrigateConfig]
) -> Optional[str]:
    """Match a flat clip filename `{camera}-{event_id}[-clean].{ext}` against
    configured camera names. Longest-prefix wins so camera names containing
    hyphens (e.g. `front-door`) resolve correctly.
    """
    dot = filename.rfind(".")
    stem = filename[:dot] if dot > 0 else filename
    return _longest_prefix_camera(stem, frigate_config)


def _camera_from_thumb_filename(
    filename: str, frigate_config: Optional[FrigateConfig]
) -> Optional[str]:
    """Match a review thumbnail filename `thumb-{camera}-{review_id}.webp`."""
    if not filename.startswith("thumb-"):
        return None
    dot = filename.rfind(".")
    stem = filename[len("thumb-") : dot] if dot > 0 else filename[len("thumb-") :]
    return _longest_prefix_camera(stem, frigate_config)


def _resolve_export(
    parts: list[str],
) -> tuple[MediaAuthResolution, Optional[str]]:
    # /exports                  → multi-camera listing
    # /exports/{filename}.mp4   → camera (DB lookup by exact path)
    if len(parts) == 1:
        return MediaAuthResolution.LISTING_MULTI_CAMERA, None
    if len(parts) != 2:
        return MediaAuthResolution.UNRESOLVED_MEDIA, None

    filename = parts[1]
    full_path = os.path.join(EXPORT_DIR, filename)
    try:
        export = Export.get(Export.video_path == full_path)
        return MediaAuthResolution.CAMERA, export.camera
    except DoesNotExist:
        return MediaAuthResolution.UNRESOLVED_MEDIA, None
    except Exception as e:
        logger.warning("Export DB lookup failed for %s: %s", filename, e)
        return MediaAuthResolution.UNRESOLVED_MEDIA, None


def check_camera_access(role: str, camera: str, frigate_config: FrigateConfig) -> bool:
    """Return True iff `role` may access `camera`.

    Mirrors the gating logic in `require_camera_access`: admin and any role
    without a non-empty allow-list bypass the check.
    """
    if role == "admin":
        return True

    roles_dict = frigate_config.auth.roles
    if not roles_dict.get(role):
        return True

    all_camera_names = set(frigate_config.cameras.keys())
    allowed = User.get_allowed_cameras(role, roles_dict, all_camera_names)
    return camera in allowed


def is_role_restricted(role: str, frigate_config: FrigateConfig) -> bool:
    """True if `role` has a non-empty allow-list (i.e. not full-access)."""
    if role == "admin":
        return False
    return bool(frigate_config.auth.roles.get(role))


def deny_response_for_media_uri(
    original_url: Optional[str], role: Optional[str], frigate_config: FrigateConfig
) -> Optional[int]:
    """Decide whether the current role should be blocked from `original_url`.

    Returns an HTTP status code (403) when access should be denied, or `None`
    when the request is allowed.
    """
    if not original_url:
        return None

    path = extract_path(original_url)

    # `extract_path` returns None for URIs containing `.` or `..` segments.
    # For media-root URIs that's a traversal attempt — deny outright. For
    # non-media URIs, pass through (nginx / the backend handle them).
    if path is None:
        raw = urlparse(original_url).path or original_url
        decoded = unquote(raw)
        first = decoded.lstrip("/").split("/", 1)[0] if decoded else ""
        if first in ("clips", "recordings", "exports"):
            return 403
        return None

    resolution, camera = resolve_media_uri(path, frigate_config)
    if resolution == MediaAuthResolution.UNKNOWN:
        return None

    if not role or role == "admin":
        return None

    if not is_role_restricted(role, frigate_config):
        return None

    if resolution == MediaAuthResolution.LISTING_NEUTRAL:
        return None

    if resolution in (
        MediaAuthResolution.LISTING_MULTI_CAMERA,
        MediaAuthResolution.ADMIN_ONLY,
        MediaAuthResolution.UNRESOLVED_MEDIA,
    ):
        return 403

    if resolution == MediaAuthResolution.CAMERA:
        if camera and check_camera_access(role, camera, frigate_config):
            return None
        return 403

    return 403
