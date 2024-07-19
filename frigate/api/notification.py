"""Notification apis."""

import logging

from flask import (
    Blueprint,
    jsonify,
    request,
)
from peewee import DoesNotExist

from frigate.models import User

logger = logging.getLogger(__name__)

NotificationBp = Blueprint("notifications", __name__)


@NotificationBp.route("/notifications/register", methods=["POST"])
def register_notifications():
    username = request.headers.get("remote-user", type=str) or "admin"
    json: dict[str, any] = request.get_json(silent=True) or {}
    token = json["token"]

    if not token:
        return jsonify({"success": False, "message": "Token must be provided."}), 400

    try:
        User.update(notification_tokens=User.notification_tokens.append(token)).where(
            User.username == username
        ).execute()
        return jsonify({"success": True, "message": "Successfully saved token."}), 200
    except DoesNotExist:
        return jsonify({"success": False, "message": "Could not find user."}), 404
