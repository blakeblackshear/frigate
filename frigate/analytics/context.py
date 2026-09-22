"""What the collectors read, gathered once per report."""

from dataclasses import dataclass, field
from typing import Any

from frigate.config import FrigateConfig


@dataclass(frozen=True)
class ReportContext:
    config: FrigateConfig
    stats: dict[str, Any]
    notice_stats: list[dict[str, Any]] = field(default_factory=list)
