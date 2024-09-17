"""Notification apis."""

import logging
import os

from cryptography.hazmat.primitives import serialization
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from peewee import DoesNotExist
from py_vapid import Vapid01, utils

from frigate.api.defs.tags import Tags
from frigate.const import CONFIG_DIR
from frigate.models import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.notifications])


@router.get("/notifications/pubkey")
def get_vapid_pub_key(request: Request):
    if not request.app.frigate_config.notifications.enabled:
        return JSONResponse(
            content=({"success": False, "message": "Notifications are not enabled."}),
            status_code=400,
        )

    key = Vapid01.from_file(os.path.join(CONFIG_DIR, "notifications.pem"))
    raw_pub = key.public_key.public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    return JSONResponse(content=utils.b64urlencode(raw_pub), status_code=200)


@router.post("/notifications/register")
def register_notifications(request: Request, body: dict = None):
    if request.app.frigate_config.auth.enabled:
        # FIXME: For FastAPI the remote-user is not being populated
        username = request.headers.get("remote-user") or "admin"
    else:
        username = "admin"

    json: dict[str, any] = body or {}
    sub = json.get("sub")

    if not sub:
        return JSONResponse(
            content={"success": False, "message": "Subscription must be provided."},
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
