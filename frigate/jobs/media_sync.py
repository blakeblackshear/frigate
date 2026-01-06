"""Media sync job management with background execution."""

import logging
import threading
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from frigate.comms.inter_process import InterProcessRequestor
from frigate.const import UPDATE_JOB_STATE
from frigate.jobs.job import Job
from frigate.jobs.manager import (
    get_current_job,
    get_job_by_id,
    job_is_running,
    set_current_job,
)
from frigate.types import JobStatusTypesEnum
from frigate.util.media import sync_all_media

logger = logging.getLogger(__name__)


@dataclass
class MediaSyncJob(Job):
    """In-memory job state for media sync operations."""

    job_type: str = "media_sync"
    dry_run: bool = False
    media_types: list[str] = field(default_factory=lambda: ["all"])
    force: bool = False


class MediaSyncRunner(threading.Thread):
    """Thread-based runner for media sync jobs."""

    def __init__(self, job: MediaSyncJob) -> None:
        super().__init__(daemon=True, name="media_sync")
        self.job = job
        self.requestor = InterProcessRequestor()

    def run(self) -> None:
        """Execute the media sync job and broadcast status updates."""
        try:
            # Update job status to running
            self.job.status = JobStatusTypesEnum.running
            self.job.start_time = datetime.now().timestamp()
            self._broadcast_status()

            # Execute sync with provided parameters
            logger.debug(
                f"Starting media sync job {self.job.id}: "
                f"media_types={self.job.media_types}, "
                f"dry_run={self.job.dry_run}, "
                f"force={self.job.force}"
            )

            results = sync_all_media(
                dry_run=self.job.dry_run,
                media_types=self.job.media_types,
                force=self.job.force,
            )

            # Store results and mark as complete
            self.job.results = results.to_dict()
            self.job.status = JobStatusTypesEnum.success
            self.job.end_time = datetime.now().timestamp()

            logger.debug(f"Media sync job {self.job.id} completed successfully")
            self._broadcast_status()

        except Exception as e:
            logger.error(f"Media sync job {self.job.id} failed: {e}", exc_info=True)
            self.job.status = JobStatusTypesEnum.failed
            self.job.error_message = str(e)
            self.job.end_time = datetime.now().timestamp()
            self._broadcast_status()

        finally:
            if self.requestor:
                self.requestor.stop()

    def _broadcast_status(self) -> None:
        """Broadcast job status update via IPC to all WebSocket subscribers."""
        try:
            self.requestor.send_data(
                UPDATE_JOB_STATE,
                self.job.to_dict(),
            )
        except Exception as e:
            logger.warning(f"Failed to broadcast media sync status: {e}")


def start_media_sync_job(
    dry_run: bool = False,
    media_types: Optional[list[str]] = None,
    force: bool = False,
) -> Optional[str]:
    """Start a new media sync job if none is currently running.

    Returns job ID on success, None if job already running.
    """
    # Check if a job is already running
    if job_is_running("media_sync"):
        current = get_current_job("media_sync")
        logger.warning(
            f"Media sync job {current.id} is already running. Rejecting new request."
        )
        return None

    # Create and start new job
    job = MediaSyncJob(
        dry_run=dry_run,
        media_types=media_types or ["all"],
        force=force,
    )

    logger.debug(f"Creating new media sync job: {job.id}")
    set_current_job(job)

    # Start the background runner
    runner = MediaSyncRunner(job)
    runner.start()

    return job.id


def get_current_media_sync_job() -> Optional[MediaSyncJob]:
    """Get the current running/queued media sync job, if any."""
    return get_current_job("media_sync")


def get_media_sync_job_by_id(job_id: str) -> Optional[MediaSyncJob]:
    """Get media sync job by ID. Currently only tracks the current job."""
    return get_job_by_id("media_sync", job_id)
