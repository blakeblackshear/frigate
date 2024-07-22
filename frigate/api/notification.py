"""Notification apis."""

import logging
import os

from cryptography.hazmat.primitives import serialization
from flask import (
    Blueprint,
    current_app,
    jsonify,
    make_response,
    request,
)
from peewee import DoesNotExist
from py_vapid import Vapid01, utils

from frigate.const import CONFIG_DIR
from frigate.models import User

logger = logging.getLogger(__name__)

NotificationBp = Blueprint("notifications", __name__)


@NotificationBp.route("/notifications/pubkey", methods=["GET"])
def get_vapid_pub_key():
    if not current_app.frigate_config.notifications.enabled:
        return make_response(
            jsonify({"success": False, "message": "Notifications are not enabled."}),
            400,
        )

    key = Vapid01.from_file(os.path.join(CONFIG_DIR, "notifications.pem"))
    raw_pub = key.public_key.public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    return jsonify(utils.b64urlencode(raw_pub)), 200


@NotificationBp.route("/notifications/register", methods=["POST"])
def register_notifications():
    if current_app.frigate_config.auth.enabled:
        username = request.headers.get("remote-user", type=str) or "admin"
    else:
        username = "admin"

    json: dict[str, any] = request.get_json(silent=True) or {}
    sub = json.get("sub")

    if not sub:
        return jsonify(
            {"success": False, "message": "Subscription must be provided."}
        ), 400

    try:
        User.update(notification_tokens=User.notification_tokens.append(sub)).where(
            User.username == username
        ).execute()
        return make_response(
            jsonify({"success": True, "message": "Successfully saved token."}), 200
        )
    except DoesNotExist:
        return make_response(
            jsonify({"success": False, "message": "Could not find user."}), 404
        )
