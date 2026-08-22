"""Notification apis."""

import ipaddress
import logging
import os
from typing import Any
from urllib.parse import urlparse

from cryptography.hazmat.primitives import serialization
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from peewee import DoesNotExist
from py_vapid import Vapid01, utils

from frigate.api.auth import allow_any_authenticated
from frigate.api.defs.tags import Tags
from frigate.const import CONFIG_DIR
from frigate.models import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.notifications])

# Push endpoints are opaque URLs but stay well under this in practice
MAX_ENDPOINT_LENGTH = 2048

# Suffixes that only ever resolve on the local network
INTERNAL_HOST_SUFFIXES = (".local", ".localdomain", ".internal", ".home.arpa")


def _validate_push_endpoint(endpoint: Any) -> str | None:
    """Return a reason the endpoint is unusable, or None when it is valid.

    Subscriptions are issued by the browser vendor's push service, so a valid
    endpoint is always a public https URL. Anything else is either a broken
    registration or an attempt to aim the notification sender somewhere it
    should not reach.
    """
    if not isinstance(endpoint, str) or not endpoint:
        return "endpoint must be a url"

    if len(endpoint) > MAX_ENDPOINT_LENGTH:
        return "endpoint is too long"

    try:
        parsed = urlparse(endpoint)
        port = parsed.port
    except ValueError:
        return "endpoint is not a valid url"

    if parsed.scheme != "https":
        return "endpoint must use https"

    if parsed.username or parsed.password:
        return "endpoint must not include credentials"

    if port is not None and port != 443:
        return "endpoint must use the default https port"

    hostname = parsed.hostname

    if not hostname:
        return "endpoint must include a hostname"

    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        address = None

    if address is not None:
        # A push service is never reachable at an address only this network can
        # route, so anything non-global is a misconfiguration at best
        if not address.is_global:
            return "endpoint must not use a private address"
    elif hostname == "localhost" or "." not in hostname:
        return "endpoint must use a fully qualified hostname"
    elif hostname.endswith(INTERNAL_HOST_SUFFIXES):
        return "endpoint must not use an internal hostname"

    # The subscription token lives in the path, and webpush.py assumes there is
    # a separator after the host when it builds the VAPID audience
    if len(parsed.path) <= 1:
        return "endpoint must include a subscription path"

    return None


def _validate_subscription(sub: Any) -> str | None:
    """Return a reason the subscription is unusable, or None when it is valid."""
    if not isinstance(sub, dict):
        return "subscription must be an object"

    reason = _validate_push_endpoint(sub.get("endpoint"))

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

    try:
        User.update(notification_tokens=User.notification_tokens.append(sub)).where(
            User.username == username
        ).execute()
        return JSONResponse(
            content=({"success": True, "message": "Successfully saved token."}),
            status_code=200,
        )
    except DoesNotExist:
        return JSONResponse(
            content=({"success": False, "message": "Could not find user."}),
            status_code=404,
        )
