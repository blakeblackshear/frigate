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
from enum import Enum
from typing import Optional
from urllib.parse import unquote, urlparse

from peewee import DoesNotExist

from frigate.config import FrigateConfig
from frigate.models import Export, User

logger = logging.getLogger(__name__)


class MediaAuthResolution(str, Enum):
    """Classification of an `X-Original-URL` path for media-auth purposes."""

    CAMERA = "camera"
    ADMIN_ONLY = "admin_only"
    LISTING_MULTI_CAMERA = "listing_multi_camera"
    LISTING_NEUTRAL = "listing_neutral"
    UNKNOWN = "unknown"


def extract_path(original_url: Optional[str]) -> Optional[str]:
    """Return just the path component of nginx's `X-Original-URL` header.

    nginx sets the value to `{scheme}://{host}{request_uri}`; we strip
    scheme/host and query string and percent-decode.
    """
    if not original_url:
        return None

    parsed = urlparse(original_url)
    path = parsed.path or original_url
    return unquote(path) or None


def resolve_media_uri(
    uri: str, frigate_config: Optional[FrigateConfig] = None
) -> tuple[MediaAuthResolution, Optional[str]]:
    """Classify a URI and return the owning camera if applicable.

    `frigate_config` is used to disambiguate clip filenames whose camera name
    contains hyphens by matching against the longest configured camera-name
    prefix.
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
    # /clips                                     → multi-camera listing
    # /clips/thumbs                              → multi-camera listing
    # /clips/thumbs/{cam}/...                    → camera
    # /clips/faces/...                           → admin-only
    # /clips/{model}/train|dataset/...           → admin-only
    # /clips/{cam}-{event_id}[-clean].{ext}      → camera (resolved via config)
    # other /clips/{subdir}/...                  → admin-only (conservative)
    if len(parts) == 1:
        return MediaAuthResolution.LISTING_MULTI_CAMERA, None

    second = parts[1]
    if second == "thumbs":
        if len(parts) == 2:
            return MediaAuthResolution.LISTING_MULTI_CAMERA, None
        return MediaAuthResolution.CAMERA, parts[2]

    if second == "faces":
        return MediaAuthResolution.ADMIN_ONLY, None

    if len(parts) >= 3 and parts[2] in ("train", "dataset"):
        return MediaAuthResolution.ADMIN_ONLY, None

    if len(parts) == 2:
        camera = _camera_from_clip_filename(second, frigate_config)
        if camera:
            return MediaAuthResolution.CAMERA, camera
        return MediaAuthResolution.UNKNOWN, None

    return MediaAuthResolution.ADMIN_ONLY, None


def _camera_from_clip_filename(
    filename: str, frigate_config: Optional[FrigateConfig]
) -> Optional[str]:
    """Match a flat clip filename `{camera}-{event_id}[-clean].{ext}` against
    configured camera names. Longest-prefix wins so camera names containing
    hyphens (e.g. `front-door`) resolve correctly.
    """
    if frigate_config is None:
        return None

    dot = filename.rfind(".")
    stem = filename[:dot] if dot > 0 else filename

    for cam in sorted(frigate_config.cameras.keys(), key=len, reverse=True):
        if stem.startswith(cam + "-"):
            return cam
    return None


def _resolve_export(
    parts: list[str],
) -> tuple[MediaAuthResolution, Optional[str]]:
    # /exports                  → multi-camera listing
    # /exports/{filename}.mp4   → camera (DB lookup)
    if len(parts) == 1:
        return MediaAuthResolution.LISTING_MULTI_CAMERA, None
    if len(parts) != 2:
        return MediaAuthResolution.UNKNOWN, None

    filename = parts[1]
    try:
        export = Export.get(Export.video_path.endswith(filename))
        return MediaAuthResolution.CAMERA, export.camera
    except DoesNotExist:
        return MediaAuthResolution.UNKNOWN, None
    except Exception as e:
        logger.debug("Export DB lookup failed for %s: %s", filename, e)
        return MediaAuthResolution.UNKNOWN, None


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
    when the request is allowed or the URI is not a recognized media path.
    """
    path = extract_path(original_url)
    if not path:
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
    ):
        return 403

    if resolution == MediaAuthResolution.CAMERA:
        if camera and check_camera_access(role, camera, frigate_config):
            return None
        return 403

    return 403
