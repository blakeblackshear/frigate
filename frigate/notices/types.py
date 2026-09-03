"""Notice kinds and the definitions that fix their mode, severity, and category."""

from dataclasses import dataclass
from enum import Enum


class NoticeMode(str, Enum):
    """Whether a producer resolves the notice itself or the user dismisses it."""

    state = "state"
    event = "event"


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
        mode: state notices are resolved by their producer, event notices by the user
        severity: error, warning, or info
        category: what the scope names: camera, detector, and model kinds carry a scope
        reportable: whether a future analytics reporter may send this kind's counts
    """

    key: str
    mode: NoticeMode
    severity: NoticeSeverity
    category: str
    reportable: bool = True


SCOPED_CATEGORIES = frozenset({"camera", "detector", "model"})

_KINDS = (
    NoticeKind("ffmpeg_crash_loop", NoticeMode.state, NoticeSeverity.error, "camera"),
    NoticeKind("detector_stuck", NoticeMode.event, NoticeSeverity.warning, "detector"),
    NoticeKind(
        "model_download_failed", NoticeMode.event, NoticeSeverity.error, "model"
    ),
    NoticeKind("retention_unmet", NoticeMode.state, NoticeSeverity.error, "storage"),
    NoticeKind("update_available", NoticeMode.state, NoticeSeverity.info, "system"),
)

NOTICE_KINDS: dict[str, NoticeKind] = {kind.key: kind for kind in _KINDS}


def notice_id(kind: str, scope: str | None) -> str:
    """The row id for a kind and optional scope."""
    return f"{kind}:{scope}" if scope else kind
