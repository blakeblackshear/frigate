"""Generic job management for long-running background tasks."""

import threading
from typing import Optional

from frigate.jobs.job import Job
from frigate.types import JobStatusTypesEnum

# Global state and locks for enforcing single concurrent job per job type
_job_locks: dict[str, threading.Lock] = {}
_current_jobs: dict[str, Optional[Job]] = {}
# Keep completed jobs for retrieval, keyed by (job_type, job_id)
_completed_jobs: dict[tuple[str, str], Job] = {}


def _get_lock(job_type: str) -> threading.Lock:
    """Get or create a lock for the specified job type."""
    if job_type not in _job_locks:
        _job_locks[job_type] = threading.Lock()
    return _job_locks[job_type]


def set_current_job(job: Job) -> None:
    """Set the current job for a given job type."""
    lock = _get_lock(job.job_type)
    with lock:
        # Store the previous job if it was completed
        old_job = _current_jobs.get(job.job_type)
        if old_job and old_job.status in (
            JobStatusTypesEnum.success,
            JobStatusTypesEnum.failed,
            JobStatusTypesEnum.cancelled,
        ):
            _completed_jobs[(job.job_type, old_job.id)] = old_job
        _current_jobs[job.job_type] = job


def clear_current_job(job_type: str, job_id: Optional[str] = None) -> None:
    """Clear the current job for a given job type, optionally checking the ID."""
    lock = _get_lock(job_type)
    with lock:
        if job_type in _current_jobs:
            current = _current_jobs[job_type]
            if current is None or (job_id is None or current.id == job_id):
                _current_jobs[job_type] = None


def get_current_job(job_type: str) -> Optional[Job]:
    """Get the current running/queued job for a given job type, if any."""
    lock = _get_lock(job_type)
    with lock:
        return _current_jobs.get(job_type)


def get_job_by_id(job_type: str, job_id: str) -> Optional[Job]:
    """Get job by ID. Checks current job first, then completed jobs."""
    lock = _get_lock(job_type)
    with lock:
        # Check if it's the current job
        current = _current_jobs.get(job_type)
        if current and current.id == job_id:
            return current
        # Check if it's a completed job
        return _completed_jobs.get((job_type, job_id))


def job_is_running(job_type: str) -> bool:
    """Check if a job of the given type is currently running or queued."""
    job = get_current_job(job_type)
    return job is not None and job.status in ("queued", "running")
