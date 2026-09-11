"""Notice kinds and the definitions that fix their severity and category."""

from dataclasses import dataclass
from enum import Enum
from typing import Any


class NoticeSeverity(str, Enum):
    error = "error"
    warning = "warning"
    info = "info"


SEVERITY_ORDER: dict[NoticeSeverity, int] = {
    NoticeSeverity.error: 0,
    NoticeSeverity.warning: 1,
    NoticeSeverity.info: 2,
}


@dataclass(frozen=True)
class NoticeKind:
    """One kind of notice. Producers pass the key; everything else comes from here.

    Attributes:
        key: Stable machine-readable name, also the translation key suffix
        severity: error, warning, or info
        category: camera, detector, model, or system; a camera scope is a
            camera name, and the UI shows it
        link: app route or absolute URL for the row, filled in from params
        counts_repeats: whether raising an existing notice counts another occurrence
        batch_repeats: whether repeats wait in memory for the next flush
        reopen_at_count: count at which a dismissed notice shows again
        keep_latest: rows of this kind to keep; a new row drops the oldest
        reportable: whether a future analytics reporter may send this kind's counts
    """

    key: str
    severity: NoticeSeverity
    category: str
    link: str | None = None
    counts_repeats: bool = True
    batch_repeats: bool = False
    reopen_at_count: int | None = None
    keep_latest: int | None = None
    reportable: bool = True

    def link_for(self, params: dict[str, Any]) -> str | None:
        """The link with params filled in, or None if a param is missing."""
        if self.link is None:
            return None

        try:
            return self.link.format(**params)
        except (KeyError, IndexError, TypeError, ValueError):
            return None


_KINDS = (
    NoticeKind(
        "detector_stuck", NoticeSeverity.warning, "detector", link="/system#general"
    ),
    NoticeKind("model_download_failed", NoticeSeverity.error, "model"),
    NoticeKind(
        "skipped_detections",
        NoticeSeverity.warning,
        "camera",
        link="/system#cameras",
    ),
    NoticeKind("shm_too_low", NoticeSeverity.warning, "system", link="/system#storage"),
    # one row per user per burst; the login log lines carry the address
    NoticeKind(
        "failed_login",
        NoticeSeverity.warning,
        "system",
        link="/logs",
        batch_repeats=True,
        reopen_at_count=5,
        keep_latest=100,
    ),
    # one row per release, so a dismissal lasts until the next release
    NoticeKind(
        "update_available",
        NoticeSeverity.info,
        "system",
        link="https://github.com/blakeblackshear/frigate/releases/tag/v{version}",
        counts_repeats=False,
        keep_latest=1,
    ),
)

NOTICE_KINDS: dict[str, NoticeKind] = {kind.key: kind for kind in _KINDS}

# the Health tab builds config and stream check rows in the browser, so a notice
# row of these kinds only records a dismissal; its other fields are placeholders
CHECK_KINDS = frozenset({"config", "stream"})


def notice_id(kind: str, scope: str | None) -> str:
    """The row id for a kind and optional scope."""
    return f"{kind}:{scope}" if scope else kind
