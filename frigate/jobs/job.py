"""Generic base class for long-running background jobs."""

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class Job:
    """Base class for long-running background jobs."""

    id: str = field(default_factory=lambda: __import__("uuid").uuid4().__str__()[:12])
    job_type: str = ""  # Must be set by subclasses
    status: str = "queued"  # queued, running, success, failed, cancelled
    results: dict[str, Any] | None = None
    start_time: float | None = None
    end_time: float | None = None
    error_message: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for WebSocket transmission."""
        return asdict(self)
