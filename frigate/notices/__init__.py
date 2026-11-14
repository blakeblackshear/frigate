"""Raise and resolve notices from any Frigate process or thread.

A notice records something worth seeing later, such as an event or a setup
problem only the backend can detect. A condition that comes and goes belongs in
stats and the status bar, and a config problem belongs in a settings message
flagged for health.
"""

import logging
import multiprocessing as mp
import threading
from typing import TYPE_CHECKING, Any

from frigate.comms.inter_process import InterProcessRequestor
from frigate.const import UPDATE_NOTICE

if TYPE_CHECKING:
    from frigate.notices.registry import NoticeRegistry

logger = logging.getLogger(__name__)

_registry: "NoticeRegistry | None" = None

# zmq sockets are not thread safe, so every thread in a process shares one
# requestor behind a lock
_requestor: InterProcessRequestor | None = None
_requestor_lock = threading.Lock()


def install_registry(registry: "NoticeRegistry | None") -> None:
    """Send this process's notices straight to the registry.

    Only the main process installs one. Children start from the forkserver,
    so they never inherit it and send over IPC instead.
    """
    global _registry
    _registry = registry


def raise_notice(
    kind: str, *, scope: str | None = None, params: dict[str, Any] | None = None
) -> None:
    """Record a notice, or count another occurrence of it. Never raises."""
    _send({"action": "raise", "kind": kind, "scope": scope, "params": params or {}})


def resolve_notice(kind: str, scope: str | None = None) -> None:
    """Delete a notice once its problem is fixed. Never raises."""
    _send({"action": "resolve", "kind": kind, "scope": scope})


def resolve_kind(kind: str) -> None:
    """Delete every notice of a kind. Never raises."""
    _send({"action": "resolve_kind", "kind": kind})


def flush_notices() -> None:
    """Write repeats the registry held back. Only the main process has any."""
    if _registry is None:
        return

    try:
        _registry.flush()
    except Exception:
        logger.exception("Failed to flush notices")


def _send(update: dict[str, Any]) -> None:
    global _requestor

    try:
        if _registry is not None:
            _registry.apply(update)
        elif mp.parent_process() is not None:
            with _requestor_lock:
                if _requestor is None:
                    _requestor = InterProcessRequestor()

                _requestor.send_data(UPDATE_NOTICE, update)
        else:
            # the main process before startup installs the registry, or a test
            logger.debug("No notice registry for %s", update["kind"])
    except Exception:
        logger.exception("Failed to update notice %s", update["kind"])
