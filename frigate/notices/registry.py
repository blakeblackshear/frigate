"""Registry of active notices and per-kind occurrence counts."""

import logging
import threading
from collections.abc import Callable
from datetime import datetime
from enum import Enum
from typing import Any

from frigate.const import REPLAY_CAMERA_PREFIX
from frigate.models import Notice, NoticeStats
from frigate.notices.types import (
    NOTICE_KINDS,
    SEVERITY_ORDER,
    NoticeMode,
    notice_id,
)

logger = logging.getLogger(__name__)


class DismissResult(str, Enum):
    ok = "ok"
    not_found = "not_found"
    not_dismissable = "not_dismissable"


# last_seen value of a state notice that has not been raised since startup
UNCONFIRMED = 0


class NoticeRegistry:
    """Owns the notice tables. Lives in the main process only.

    Producers in the main process call it directly. Other processes send an
    update_notice request that the dispatcher forwards here. The FastAPI app
    runs inside the main process too, so the API's dismiss shares this exact
    object, its lock, and its listeners.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._listeners: list[Callable[[], None]] = []

    def subscribe(self, listener: Callable[[], None]) -> None:
        """Call listener after every change to the active list."""
        self._listeners.append(listener)

    def _notify(self) -> None:
        for listener in self._listeners:
            try:
                listener()
            except Exception:
                logger.exception("Notice listener failed")

    def raise_notice(
        self,
        kind: str,
        *,
        scope: str | None = None,
        params: dict[str, Any] | None = None,
    ) -> None:
        """Insert or update a notice. See the counting rule in the spec."""
        definition = NOTICE_KINDS.get(kind)

        if definition is None:
            logger.warning("Ignoring notice of unknown kind %s", kind)
            return

        if (
            definition.category == "camera"
            and scope
            and scope.startswith(REPLAY_CAMERA_PREFIX)
        ):
            return

        now = datetime.now().timestamp()
        row_id = notice_id(kind, scope)
        params = params or {}

        with self._lock:
            existing = Notice.get_or_none(Notice.id == row_id)

            if existing is None:
                Notice.create(
                    id=row_id,
                    kind=kind,
                    scope=scope,
                    params=params,
                    first_seen=now,
                    last_seen=now,
                    count=1,
                    dismissed_at=None,
                )
                self._bump_occurrences(kind, now)
            elif definition.mode == NoticeMode.event:
                Notice.update(
                    count=Notice.count + 1,
                    last_seen=now,
                    params=params,
                    dismissed_at=None,
                ).where(Notice.id == row_id).execute()
                self._bump_occurrences(kind, now)
            else:
                # one episode counts once; a repeat with nothing new is free
                confirmed = existing.last_seen != UNCONFIRMED

                if confirmed and existing.params == params:
                    return

                Notice.update(last_seen=now, params=params).where(
                    Notice.id == row_id
                ).execute()

        self._notify()

    def resolve(self, kind: str, scope: str | None = None) -> None:
        """Delete a notice if present. Safe to call when it is absent."""
        with self._lock:
            deleted = (
                Notice.delete().where(Notice.id == notice_id(kind, scope)).execute()
            )

        if deleted:
            self._notify()

    def resolve_camera(self, camera: str) -> None:
        """Drop every camera-category notice scoped to a camera being deleted."""
        camera_kinds = [
            key
            for key, definition in NOTICE_KINDS.items()
            if definition.category == "camera"
        ]

        with self._lock:
            deleted = (
                Notice.delete()
                .where(
                    Notice.kind.in_(camera_kinds),  # type: ignore[call-arg, arg-type, misc]
                    Notice.scope == camera,
                )
                .execute()
            )

        if deleted:
            self._notify()

    def dismiss(self, row_id: str) -> DismissResult:
        """Hide an event notice until it is raised again."""
        with self._lock:
            existing = Notice.get_or_none(Notice.id == row_id)

            if existing is None:
                return DismissResult.not_found

            definition = NOTICE_KINDS.get(existing.kind)

            if definition is None or definition.mode == NoticeMode.state:
                return DismissResult.not_dismissable

            now = datetime.now().timestamp()
            Notice.update(dismissed_at=now).where(Notice.id == row_id).execute()
            NoticeStats.update(dismissals=NoticeStats.dismissals + 1).where(
                NoticeStats.kind == existing.kind
            ).execute()

        self._notify()
        return DismissResult.ok

    def active(self, include_dismissed: bool = False) -> list[dict[str, Any]]:
        """The active notices, most severe first, then most recent first."""
        rows = []

        for row in Notice.select():
            definition = NOTICE_KINDS.get(row.kind)

            if definition is None:
                continue

            if row.dismissed_at is not None and not include_dismissed:
                continue

            if definition.mode == NoticeMode.state and row.last_seen == UNCONFIRMED:
                continue

            rows.append(
                {
                    "id": row.id,
                    "kind": row.kind,
                    "mode": definition.mode.value,
                    "severity": definition.severity.value,
                    "category": definition.category,
                    "scope": row.scope,
                    "params": row.params,
                    "first_seen": row.first_seen,
                    "last_seen": row.last_seen,
                    "count": row.count,
                    "dismissed_at": row.dismissed_at,
                }
            )

        rows.sort(
            key=lambda n: (
                SEVERITY_ORDER[NOTICE_KINDS[n["kind"]].severity],
                -n["last_seen"],
            )
        )
        return rows

    def stats(self) -> list[dict[str, Any]]:
        """Lifetime counts per kind, for the UI meta line and later analytics."""
        return [
            {
                "kind": row.kind,
                "occurrences": row.occurrences,
                "dismissals": row.dismissals,
                "first_seen": row.first_seen,
                "last_seen": row.last_seen,
                "reported_occurrences": row.reported_occurrences,
                "reported_dismissals": row.reported_dismissals,
            }
            for row in NoticeStats.select()
            if row.kind in NOTICE_KINDS
        ]

    def mark_state_notices_unconfirmed(self) -> None:
        """Hide state notices until their producer raises them again.

        Rows already unconfirmed from the previous run are deleted. Hiding
        rather than deleting keeps one episode that spans a restart at one
        occurrence.
        """
        state_kinds = [
            key
            for key, definition in NOTICE_KINDS.items()
            if definition.mode == NoticeMode.state
        ]

        with self._lock:
            Notice.delete().where(
                Notice.kind.in_(state_kinds),  # type: ignore[call-arg, arg-type, misc]
                Notice.last_seen == UNCONFIRMED,
            ).execute()
            Notice.update(last_seen=UNCONFIRMED).where(
                Notice.kind.in_(state_kinds)  # type: ignore[call-arg, arg-type, misc]
            ).execute()

    def _bump_occurrences(self, kind: str, now: float) -> None:
        # called with the lock held
        stats = NoticeStats.get_or_none(NoticeStats.kind == kind)

        if stats is None:
            NoticeStats.create(
                kind=kind,
                occurrences=1,
                dismissals=0,
                first_seen=now,
                last_seen=now,
            )
        else:
            NoticeStats.update(
                occurrences=NoticeStats.occurrences + 1, last_seen=now
            ).where(NoticeStats.kind == kind).execute()
