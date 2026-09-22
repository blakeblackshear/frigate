"""Health section: uptime, CPU, enrichment speed, and notice counts."""

from typing import Any

from frigate.analytics.collectors.common import rate
from frigate.analytics.context import ReportContext
from frigate.analytics.schema import (
    EnrichmentTiming,
    HealthSection,
    NoticeCounts,
    NoticeKindKey,
)

TIMING_STATS = {
    EnrichmentTiming.face: "face_recognition_speed",
    EnrichmentTiming.lpr: "plate_recognition_speed",
    EnrichmentTiming.plate_detection: "yolov9_plate_detection_speed",
    EnrichmentTiming.image_embedding: "image_embedding_speed",
    EnrichmentTiming.text_embedding: "text_embedding_speed",
    EnrichmentTiming.review_description: "review_description_speed",
    EnrichmentTiming.object_description: "object_description_speed",
}
REPORTABLE_KINDS = frozenset(key.value for key in NoticeKindKey)


def notice_deltas(notice_stats: list[dict[str, Any]]) -> dict[Any, NoticeCounts]:
    """What changed since the last accepted report, per reportable kind."""
    deltas: dict[Any, NoticeCounts] = {}

    for row in notice_stats:
        if row["kind"] not in REPORTABLE_KINDS:
            continue

        occurrences = max(row["occurrences"] - row["reported_occurrences"], 0)
        dismissals = max(row["dismissals"] - row["reported_dismissals"], 0)

        if occurrences or dismissals:
            deltas[NoticeKindKey(row["kind"])] = NoticeCounts(
                occurrences=occurrences, dismissals=dismissals
            )

    return deltas


def collect(ctx: ReportContext) -> HealthSection:
    service = ctx.stats.get("service", {})
    embeddings = ctx.stats.get("embeddings", {})
    cpu = ctx.stats.get("cpu_usages", {}).get("frigate.full_system", {}).get("cpu")
    timings = {
        timing: rate(embeddings.get(key)) for timing, key in TIMING_STATS.items()
    }

    return HealthSection(
        uptime_hours=int(rate(service.get("uptime")) // 3600),
        cpu_percent=min(round(rate(cpu)), 100),
        enrichment_ms={timing: value for timing, value in timings.items() if value > 0},
        retention_unmet=bool(service.get("retention_unmet", False)),
        notices=notice_deltas(ctx.notice_stats),
    )
