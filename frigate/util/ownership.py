"""Helpers for aligning created files with the non-root runtime user."""

import logging
import os
import pwd

logger = logging.getLogger(__name__)

RUNTIME_USER = "frigate"


def get_runtime_ids() -> tuple[int, int] | None:
    """Return (uid, gid) that services run as, or None when chown is not applicable.

    None when: not root (docker --user, so the host already mapped us),
    FRIGATE_RUN_AS_ROOT=true (escape hatch must not mutate ownership),
    or outside the Frigate container image (no frigate user).
    """
    if os.geteuid() != 0:
        return None

    if os.environ.get("FRIGATE_RUN_AS_ROOT", "false") == "true":
        return None

    try:
        user = pwd.getpwnam(RUNTIME_USER)
    except KeyError:
        return None

    return (user.pw_uid, user.pw_gid)


def chown_to_runtime(path: str) -> None:
    """Best-effort chown of path to the runtime user."""
    ids = get_runtime_ids()

    if ids is None:
        return

    try:
        os.chown(path, *ids)
    except OSError as err:
        logger.warning(f"Unable to set ownership of {path}: {err}")
