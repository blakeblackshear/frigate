"""Build a report from the section collectors."""

import logging
import time
from collections.abc import Callable
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from pydantic import BaseModel

from frigate.analytics.collectors import (
    cameras,
    detection,
    features,
    hardware,
    health,
    install,
)
from frigate.analytics.context import ReportContext
from frigate.analytics.schema import SCHEMA_VERSION, AnalyticsReport
from frigate.analytics.state import load_state
from frigate.config import FrigateConfig

if TYPE_CHECKING:
    from frigate.notices.registry import NoticeRegistry
    from frigate.stats.emitter import StatsEmitter

logger = logging.getLogger(__name__)

COLLECTORS: dict[str, Callable[[ReportContext], BaseModel | None]] = {
    "install": install.collect,
    "hardware": hardware.collect,
    "detection": detection.collect,
    "cameras": cameras.collect,
    "features": features.collect,
    "health": health.collect,
}

# shown in the preview until the first report creates a real ID
PREVIEW_INSTALL_ID = "0" * 32


def build_report(
    ctx: ReportContext, install_id: str, sent_at: int | None = None
) -> AnalyticsReport:
    """Run every collector; one that fails sends its section as null."""
    sections: dict[str, Any] = {}

    for name, collect in COLLECTORS.items():
        try:
            sections[name] = collect(ctx)
        except Exception:
            # a collector bug must cost one section, never the whole report
            logger.warning("Analytics %s section failed", name, exc_info=True)
            sections[name] = None

    return AnalyticsReport.model_validate(
        {
            "schema_version": SCHEMA_VERSION,
            "install_id": install_id,
            "report_id": str(uuid4()),
            "sent_at": int(time.time()) if sent_at is None else sent_at,
            **sections,
        }
    )


def gather_context(
    config: FrigateConfig,
    stats_emitter: "StatsEmitter | None",
    notice_registry: "NoticeRegistry | None",
) -> ReportContext:
    return ReportContext(
        config=config,
        stats=stats_emitter.get_latest_stats() if stats_emitter is not None else {},
        notice_stats=notice_registry.stats() if notice_registry is not None else [],
    )


def preview_report(
    config: FrigateConfig,
    stats_emitter: "StatsEmitter | None",
    notice_registry: "NoticeRegistry | None",
) -> AnalyticsReport:
    """The report the next send would carry, without sending it."""
    state = load_state()
    ctx = gather_context(config, stats_emitter, notice_registry)
    return build_report(ctx, state.install_id if state else PREVIEW_INSTALL_ID)
