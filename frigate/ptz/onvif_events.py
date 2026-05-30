"""ONVIF PullPoint subscriber for camera-side motion events.

Long-running per-camera coroutine that subscribes to the camera's PullPoint
service via `onvif-zeep-async`'s `PullPointManager` (which owns subscription
creation, renewal, and lifecycle), pulls notification messages, parses
IsMotion/State on each round-trip, and invokes a callback on transitions.

Lives on the OnvifController's dedicated asyncio loop (see
`frigate/ptz/onvif.py` for the loop setup).
"""

from __future__ import annotations

import asyncio
import datetime as dt
import logging
from typing import TYPE_CHECKING, Awaitable, Callable

if TYPE_CHECKING:
    from onvif import ONVIFCamera

try:
    from zeep.exceptions import Fault
except ImportError:  # tests can run without zeep installed

    class Fault(Exception):  # type: ignore[no-redef]
        pass


logger = logging.getLogger(__name__)

# Names of the boolean state SimpleItem we accept inside the message Data
# block. Spec calls it IsMotion; the legacy MotionAlarm topic uses State.
_STATE_NAMES = ("IsMotion", "State")

# Bounds on backoff between subscription failures.
_BACKOFF_INITIAL_S = 1.0
_BACKOFF_MAX_S = 60.0


def _parse_motion_state(msg) -> bool | None:
    """Walk a NotificationMessage and return the IsMotion/State value, or
    None if not present. The Message body is often an `lxml.etree._Element`
    that python-onvif-zeep returns for ##any wildcards — walk via .iter()."""
    body = getattr(msg, "Message", None)
    if body is None:
        return None
    raw = getattr(body, "_value_1", body)
    if not hasattr(raw, "iter"):
        return None
    for el in raw.iter():
        if not el.tag.endswith("}SimpleItem"):
            continue
        name = el.attrib.get("Name", "")
        if name not in _STATE_NAMES:
            continue
        val = el.attrib.get("Value", "").strip().lower()
        if val in ("true", "1"):
            return True
        if val in ("false", "0"):
            return False
    return None


async def run_pullpoint_subscription(
    onvif_cam: "ONVIFCamera",
    cam_name: str,
    timeout_seconds: int,
    on_state: Callable[[bool], None] | Callable[[bool], Awaitable[None]],
    stop_event: asyncio.Event,
) -> None:
    """Loop until stop_event: create a PullPointManager, pull messages,
    dispatch on_state on transitions, reconnect on Fault with exponential
    backoff."""
    backoff = _BACKOFF_INITIAL_S
    last_state: bool | None = None

    while not stop_event.is_set():
        manager = None
        sub_lost = asyncio.Event()

        def _subscription_lost() -> None:
            sub_lost.set()

        try:
            manager = await onvif_cam.create_pullpoint_manager(
                dt.timedelta(seconds=timeout_seconds),
                _subscription_lost,
            )
            service = manager.get_service()
            logger.info(f"ONVIF PullPoint subscribed for {cam_name}")

            while not stop_event.is_set() and not sub_lost.is_set():
                # Long-poll up to 10s. The subscription manager keeps the
                # subscription itself alive in the background — we just pull.
                msgs = await service.PullMessages(
                    {"Timeout": "PT10S", "MessageLimit": 32}
                )
                for m in msgs.NotificationMessage or []:
                    state = _parse_motion_state(m)
                    if state is None or state == last_state:
                        continue
                    last_state = state
                    try:
                        result = on_state(state)
                        if asyncio.iscoroutine(result):
                            await result
                    except Exception:
                        logger.exception(f"on_state callback error for {cam_name}")

            if sub_lost.is_set():
                raise Fault("PullPoint subscription lost")

            # Clean exit (stop_event set) — leave the loop.
            backoff = _BACKOFF_INITIAL_S
            break
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.warning(
                f"ONVIF PullPoint subscription error for {cam_name}: {e!r}; "
                f"reconnecting in {backoff:.1f}s"
            )
        finally:
            if manager is not None:
                try:
                    await manager.shutdown()
                except Exception:
                    pass

        if stop_event.is_set():
            return
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=backoff)
            return
        except asyncio.TimeoutError:
            pass
        backoff = min(backoff * 2, _BACKOFF_MAX_S)
