"""Registry of notices and per-kind occurrence counts."""

import logging
import threading
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from frigate.const import REPLAY_CAMERA_PREFIX
from frigate.models import Notice, NoticeStats
from frigate.notices.types import CHECK_KINDS, NOTICE_KINDS, SEVERITY_ORDER, notice_id

logger = logging.getLogger(__name__)


@dataclass
class _HeldRepeats:
    kind: str
    count: int
    last_seen: float
    params: dict[str, Any]


class NoticeRegistry:
    """Owns the notice tables. Lives in the main process only.

    Producers call the functions in frigate.notices, which reach this object
    directly in the main process and through the dispatcher everywhere else.
    It holds no rules for particular kinds; those live in NOTICE_KINDS.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._listeners: list[Callable[[], None]] = []

        # row id -> repeats of a batch_repeats kind that flush() writes
        self._held: dict[str, _HeldRepeats] = {}

    def subscribe(self, listener: Callable[[], None]) -> None:
        """Call listener after every change to the notices."""
        self._listeners.append(listener)

    def _notify(self) -> None:
        for listener in self._listeners:
            try:
                listener()
            except Exception:
                logger.exception("Notice listener failed")

    def apply(self, update: dict[str, Any]) -> None:
        """Apply one update message built by frigate.notices."""
        kind = update.get("kind")

        if not isinstance(kind, str):
            logger.warning("Ignoring notice update without a kind")
            return

        match update.get("action"):
            case "raise":
                self.raise_notice(
                    kind, scope=update.get("scope"), params=update.get("params")
                )
            case "resolve":
                self.resolve(kind, update.get("scope"))
            case "resolve_kind":
                self.resolve_kind(kind)
            case action:
                logger.warning("Ignoring notice update with action %s", action)

    def raise_notice(
        self,
        kind: str,
        *,
        scope: str | None = None,
        params: dict[str, Any] | None = None,
    ) -> None:
        """Insert a notice or count another occurrence of it.

        A dismissed notice stays dismissed when it is raised again, unless its
        kind sets reopen_at_count. A kind that should come back after a
        dismissal gives each episode its own scope.
        """
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
                # repeats held for a row that has since been deleted are stale
                self._held.pop(row_id, None)
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
                self._bump_occurrences(kind, 1, now)

                if definition.keep_latest is not None:
                    self._prune(kind, definition.keep_latest)
            elif not definition.counts_repeats:
                return
            elif definition.batch_repeats:
                held = self._held.setdefault(row_id, _HeldRepeats(kind, 0, now, params))
                held.count += 1
                held.last_seen = now
                held.params = params
                return
            else:
                self._write_repeats(existing, kind, 1, now, params)

        self._notify()

    def flush(self) -> None:
        """Write the repeats that batch_repeats kinds held back."""
        with self._lock:
            held, self._held = self._held, {}
            written = False

            for row_id, repeats in held.items():
                row = Notice.get_or_none(Notice.id == row_id)

                # resolved while its repeats waited
                if row is None:
                    continue

                self._write_repeats(
                    row,
                    repeats.kind,
                    repeats.count,
                    repeats.last_seen,
                    repeats.params,
                )
                written = True

        if written:
            self._notify()

    def resolve(self, kind: str, scope: str | None = None) -> None:
        """Delete a notice if present. Safe to call when it is absent."""
        with self._lock:
            deleted = (
                Notice.delete().where(Notice.id == notice_id(kind, scope)).execute()
            )

        if deleted:
            self._notify()

    def resolve_kind(self, kind: str) -> None:
        """Delete every notice of a kind."""
        with self._lock:
            deleted = Notice.delete().where(Notice.kind == kind).execute()

        if deleted:
            self._notify()

    def resolve_camera(self, camera: str) -> None:
        """Drop the notices and check dismissals of a camera being deleted."""
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

            # a stream id names its camera first; a config id ends with camera.<name>
            for check in self.dismissed_checks():
                check_id = check["id"]

                if check_id.startswith(f"stream:{camera}:") or (
                    check_id.startswith("config:")
                    and check_id.endswith(f":camera.{camera}")
                ):
                    Notice.delete_by_id(check_id)

        if deleted:
            self._notify()

    def purge_dismissed(self) -> int:
        """Delete every dismissed row so each can show again. Returns how many."""
        with self._lock:
            return int(
                Notice.delete().where(Notice.dismissed_at.is_null(False)).execute()
            )

    def dismiss(self, row_id: str) -> bool:
        """Hide a notice or check row for good. Returns False for an unknown id."""
        with self._lock:
            existing = Notice.get_or_none(Notice.id == row_id)

            if existing is None:
                # a check row gets a notice row only once it is dismissed
                kind, _, scope = row_id.partition(":")

                if kind not in CHECK_KINDS or not scope:
                    return False

                now = datetime.now().timestamp()
                Notice.create(
                    id=row_id,
                    kind=kind,
                    scope=scope,
                    params={},
                    first_seen=now,
                    last_seen=now,
                    count=1,
                    dismissed_at=now,
                )
                return True

            if existing.dismissed_at is not None:
                return True

            if existing.kind not in NOTICE_KINDS:
                return False

            Notice.update(dismissed_at=datetime.now().timestamp()).where(
                Notice.id == row_id
            ).execute()
            NoticeStats.update(dismissals=NoticeStats.dismissals + 1).where(
                NoticeStats.kind == existing.kind
            ).execute()

        self._notify()
        return True

    def dismissed_checks(self) -> list[dict[str, Any]]:
        """Dismissed config and stream check rows, newest first."""
        rows = (
            Notice.select()
            .where(Notice.kind.in_(list(CHECK_KINDS)))  # type: ignore[call-arg, arg-type, misc]
            .order_by(Notice.dismissed_at.desc())
        )
        return [{"id": row.id, "dismissed_at": row.dismissed_at} for row in rows]

    def active(self, include_dismissed: bool = False) -> list[dict[str, Any]]:
        """Notices most severe first, then most recent first.

        Args:
            include_dismissed: Also return dismissed notices, for the history view
        """
        rows = []

        for row in Notice.select():
            definition = NOTICE_KINDS.get(row.kind)

            if definition is None:
                continue

            if row.dismissed_at is not None and not include_dismissed:
                continue

            rows.append(
                {
                    "id": row.id,
                    "kind": row.kind,
                    "severity": definition.severity.value,
                    "category": definition.category,
                    "scope": row.scope,
                    "params": row.params,
                    "link": definition.link_for(row.params),
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
        """Lifetime counts per kind, for later analytics."""
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

    def _write_repeats(
        self,
        row: Notice,
        kind: str,
        count: int,
        last_seen: float,
        params: dict[str, Any],
    ) -> None:
        # called with the lock held
        fields: dict[str, Any] = {
            "count": row.count + count,
            "last_seen": last_seen,
            "params": params,
        }
        reopen_at = NOTICE_KINDS[kind].reopen_at_count

        if reopen_at is not None and row.count < reopen_at <= row.count + count:
            fields["dismissed_at"] = None

        Notice.update(**fields).where(Notice.id == row.id).execute()
        self._bump_occurrences(kind, count, last_seen)

    def _prune(self, kind: str, keep: int) -> None:
        # called with the lock held
        newest = (
            Notice.select(Notice.id)
            .where(Notice.kind == kind)
            .order_by(Notice.first_seen.desc())
            .limit(keep)
        )
        Notice.delete().where(
            Notice.kind == kind,
            Notice.id.not_in(newest),  # type: ignore[call-arg, misc]
        ).execute()

    def _bump_occurrences(self, kind: str, count: int, now: float) -> None:
        # called with the lock held
        stats = NoticeStats.get_or_none(NoticeStats.kind == kind)

        if stats is None:
            NoticeStats.create(
                kind=kind,
                occurrences=count,
                dismissals=0,
                first_seen=now,
                last_seen=now,
            )
        else:
            NoticeStats.update(
                occurrences=NoticeStats.occurrences + count, last_seen=now
            ).where(NoticeStats.kind == kind).execute()
