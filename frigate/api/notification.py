"""Notification apis."""

import logging
import os
from typing import Any

from cryptography.hazmat.primitives import serialization
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from py_vapid import Vapid01, utils

from frigate.api.auth import allow_any_authenticated
from frigate.api.defs.tags import Tags
from frigate.comms.webpush import validate_push_endpoint
from frigate.const import CONFIG_DIR
from frigate.models import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.notifications])


def _validate_subscription(sub: Any) -> str | None:
    """Return a reason the subscription is unusable, or None when it is valid."""
    if not isinstance(sub, dict):
        return "subscription must be an object"

    reason = validate_push_endpoint(sub.get("endpoint"))

    if reason:
        return reason

    keys = sub.get("keys")

    if not isinstance(keys, dict):
        return "subscription must include keys"

    # WebPusher raises on a missing key, which would break every send for the
    # user rather than just this registration
    for name in ("p256dh", "auth"):
        value = keys.get(name)

        if not isinstance(value, str) or not value:
            return f"subscription keys must include {name}"

    return None


@router.get(
    "/notifications/pubkey",
    dependencies=[Depends(allow_any_authenticated())],
    summary="Get VAPID public key",
    description="""Gets the VAPID public key for the notifications.
    Returns the public key or an error if notifications are not enabled.
    """,
)
def get_vapid_pub_key(request: Request):
    config = request.app.frigate_config
    notifications_enabled = config.notifications.enabled
    camera_notifications_enabled = [
        c for c in config.cameras.values() if c.enabled and c.notifications.enabled
    ]
    if not (notifications_enabled or camera_notifications_enabled):
        return JSONResponse(
            content=({"success": False, "message": "Notifications are not enabled."}),
            status_code=400,
        )

    key = Vapid01.from_file(os.path.join(CONFIG_DIR, "notifications.pem"))
    raw_pub = key.public_key.public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    return JSONResponse(content=utils.b64urlencode(raw_pub), status_code=200)


@router.post(
    "/notifications/register",
    dependencies=[Depends(allow_any_authenticated())],
    summary="Register notifications",
    description="""Registers a notifications subscription.
    Returns a success message or an error if the subscription is not provided.
    """,
)
def register_notifications(request: Request, body: dict = None):
    if request.app.frigate_config.auth.enabled:
        # FIXME: For FastAPI the remote-user is not being populated
        username = request.headers.get("remote-user") or "admin"
    else:
        username = "admin"

    json: dict[str, Any] = body or {}
    sub = json.get("sub")

    if not sub:
        return JSONResponse(
            content={"success": False, "message": "Subscription must be provided."},
            status_code=400,
        )

    reason = _validate_subscription(sub)

    if reason:
        logger.warning(
            "Rejected notification registration for %s: %s", username, reason
        )
        return JSONResponse(
            content={"success": False, "message": f"Invalid subscription: {reason}"},
            status_code=400,
        )

    updated = (
        User.update(notification_tokens=User.notification_tokens.append(sub))
        .where(User.username == username)
        .execute()
    )

    if not updated:
        logger.warning(
            "Rejected notification registration for unknown user %s", username
        )
        return JSONResponse(
            content=({"success": False, "message": "Could not find user."}),
            status_code=404,
        )

    return JSONResponse(
        content=({"success": True, "message": "Successfully saved token."}),
        status_code=200,
    )
