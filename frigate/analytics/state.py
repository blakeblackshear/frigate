"""The install's analytics identity and last attempt time, kept under /config."""

import json
import logging
import os
import re
from dataclasses import dataclass
from uuid import uuid4

from frigate.const import CONFIG_DIR

logger = logging.getLogger(__name__)

STATE_PATH = os.path.join(CONFIG_DIR, ".analytics.json")
INSTALL_ID_PATTERN = re.compile(r"[0-9a-f]{32}")


@dataclass(frozen=True)
class AnalyticsState:
    install_id: str
    last_attempt_at: float


def new_state() -> AnalyticsState:
    return AnalyticsState(install_id=uuid4().hex, last_attempt_at=0.0)


def load_state(path: str = STATE_PATH) -> AnalyticsState | None:
    """The saved state, or None when the file is missing or unusable."""
    try:
        with open(path) as f:
            data = json.load(f)
    except FileNotFoundError:
        return None
    except (OSError, ValueError):
        logger.warning("Ignoring unreadable analytics state at %s", path)
        return None

    if not isinstance(data, dict):
        return None

    install_id = data.get("install_id")
    last_attempt_at = data.get("last_attempt_at")

    if (
        not isinstance(install_id, str)
        or not INSTALL_ID_PATTERN.fullmatch(install_id)
        or isinstance(last_attempt_at, bool)
        or not isinstance(last_attempt_at, int | float)
    ):
        logger.warning("Ignoring invalid analytics state at %s", path)
        return None

    return AnalyticsState(install_id=install_id, last_attempt_at=float(last_attempt_at))


def save_state(state: AnalyticsState, path: str = STATE_PATH) -> bool:
    """Write the state atomically, returning False when it can't be written."""
    temp_path = f"{path}.tmp"

    try:
        with open(temp_path, "w") as f:
            json.dump(
                {
                    "install_id": state.install_id,
                    "last_attempt_at": state.last_attempt_at,
                },
                f,
            )

        os.replace(temp_path, path)
    except OSError:
        return False

    return True


def delete_state(path: str = STATE_PATH) -> None:
    """Forget the install ID, so a later opt-in starts a fresh identity."""
    try:
        os.remove(path)
    except FileNotFoundError:
        pass
    except OSError:
        logger.warning("Unable to delete analytics state at %s", path)
