"""Export job management with queued background execution."""

import logging
import threading
import time
from dataclasses import dataclass
from queue import Full, Queue
from typing import Any, Optional

from peewee import DoesNotExist

from frigate.config import FrigateConfig
from frigate.jobs.job import Job
from frigate.models import Export
from frigate.record.export import PlaybackSourceEnum, RecordingExporter
from frigate.types import JobStatusTypesEnum

logger = logging.getLogger(__name__)

# Maximum number of jobs that can sit in the queue waiting to run.
# Prevents a runaway client from unbounded memory growth.
MAX_QUEUED_EXPORT_JOBS = 100


class ExportQueueFullError(RuntimeError):
    """Raised when the export queue is at capacity."""


@dataclass
class ExportJob(Job):
    """Job state for export operations."""

    job_type: str = "export"
    camera: str = ""
    name: Optional[str] = None
    image_path: Optional[str] = None
    export_case_id: Optional[str] = None
    request_start_time: float = 0.0
    request_end_time: float = 0.0
    playback_source: str = PlaybackSourceEnum.recordings.value
    ffmpeg_input_args: Optional[str] = None
    ffmpeg_output_args: Optional[str] = None
    cpu_fallback: bool = False

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for API responses.

        Only exposes fields that are part of the public ExportJobModel schema.
        Internal execution details (image_path, ffmpeg args, cpu_fallback) are
        intentionally omitted so they don't leak through the API.
        """
        return {
            "id": self.id,
            "job_type": self.job_type,
            "status": self.status,
            "camera": self.camera,
            "name": self.name,
            "export_case_id": self.export_case_id,
            "request_start_time": self.request_start_time,
            "request_end_time": self.request_end_time,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "error_message": self.error_message,
            "results": self.results,
        }


class ExportQueueWorker(threading.Thread):
    """Worker that executes queued exports."""

    def __init__(self, manager: "ExportJobManager", worker_index: int) -> None:
        super().__init__(
            daemon=True,
            name=f"export_queue_worker_{worker_index}",
        )
        self.manager = manager

    def run(self) -> None:
        while True:
            job = self.manager.queue.get()

            try:
                self.manager.run_job(job)
            except Exception:
                logger.exception(
                    "Export queue worker failed while processing %s", job.id
                )
            finally:
                self.manager.queue.task_done()


class ExportJobManager:
    """Concurrency-limited manager for queued export jobs."""

    def __init__(
        self,
        config: FrigateConfig,
        max_concurrent: int,
        max_queued: int = MAX_QUEUED_EXPORT_JOBS,
    ) -> None:
        self.config = config
        self.max_concurrent = max(1, max_concurrent)
        self.queue: Queue[ExportJob] = Queue(maxsize=max(1, max_queued))
        self.jobs: dict[str, ExportJob] = {}
        self.lock = threading.Lock()
        self.workers: list[ExportQueueWorker] = []
        self.started = False

    def ensure_started(self) -> None:
        """Ensure worker threads are started exactly once."""
        with self.lock:
            if self.started:
                self._restart_dead_workers_locked()
                return

            for index in range(self.max_concurrent):
                worker = ExportQueueWorker(self, index)
                worker.start()
                self.workers.append(worker)

            self.started = True

    def _restart_dead_workers_locked(self) -> None:
        for index, worker in enumerate(self.workers):
            if worker.is_alive():
                continue

            logger.error(
                "Export queue worker %s died unexpectedly, restarting", worker.name
            )
            replacement = ExportQueueWorker(self, index)
            replacement.start()
            self.workers[index] = replacement

    def enqueue(self, job: ExportJob) -> str:
        """Queue a job for background execution.

        Raises ExportQueueFullError if the queue is at capacity.
        """
        self.ensure_started()

        try:
            self.queue.put_nowait(job)
        except Full as err:
            raise ExportQueueFullError(
                "Export queue is full; try again once current exports finish"
            ) from err

        with self.lock:
            self.jobs[job.id] = job

        return job.id

    def get_job(self, job_id: str) -> Optional[ExportJob]:
        """Get a job by ID."""
        with self.lock:
            return self.jobs.get(job_id)

    def list_active_jobs(self) -> list[ExportJob]:
        """List queued and running jobs."""
        with self.lock:
            return [
                job
                for job in self.jobs.values()
                if job.status in (JobStatusTypesEnum.queued, JobStatusTypesEnum.running)
            ]

    def available_slots(self) -> int:
        """Approximate number of additional jobs that could be queued right now.

        Uses Queue.qsize() which is best-effort; callers should treat the
        result as advisory since another thread could enqueue between
        checking and enqueueing.
        """
        return max(0, self.queue.maxsize - self.queue.qsize())

    def run_job(self, job: ExportJob) -> None:
        """Execute a queued export job."""
        job.status = JobStatusTypesEnum.running
        job.start_time = time.time()

        exporter = RecordingExporter(
            self.config,
            job.id,
            job.camera,
            job.name,
            job.image_path,
            int(job.request_start_time),
            int(job.request_end_time),
            PlaybackSourceEnum(job.playback_source),
            job.export_case_id,
            job.ffmpeg_input_args,
            job.ffmpeg_output_args,
            job.cpu_fallback,
        )

        try:
            exporter.run()
            export = Export.get_or_none(Export.id == job.id)
            if export is None:
                job.status = JobStatusTypesEnum.failed
                job.error_message = "Export failed"
            elif export.in_progress:
                job.status = JobStatusTypesEnum.failed
                job.error_message = "Export did not complete"
            else:
                job.status = JobStatusTypesEnum.success
                job.results = {
                    "export_id": export.id,
                    "export_case_id": export.export_case_id,
                    "video_path": export.video_path,
                    "thumb_path": export.thumb_path,
                }
        except DoesNotExist:
            job.status = JobStatusTypesEnum.failed
            job.error_message = "Export not found"
        except Exception as err:
            logger.exception("Export job %s failed: %s", job.id, err)
            job.status = JobStatusTypesEnum.failed
            job.error_message = str(err)
        finally:
            job.end_time = time.time()


_job_manager: Optional[ExportJobManager] = None
_job_manager_lock = threading.Lock()


def _get_max_concurrent(config: FrigateConfig) -> int:
    return int(config.record.export.max_concurrent)


def get_export_job_manager(config: FrigateConfig) -> ExportJobManager:
    """Get or create the singleton export job manager."""
    global _job_manager

    with _job_manager_lock:
        if _job_manager is None:
            _job_manager = ExportJobManager(config, _get_max_concurrent(config))
        _job_manager.ensure_started()
        return _job_manager


def start_export_job(config: FrigateConfig, job: ExportJob) -> str:
    """Queue an export job and return its ID."""
    return get_export_job_manager(config).enqueue(job)


def get_export_job(config: FrigateConfig, job_id: str) -> Optional[ExportJob]:
    """Get a queued or completed export job by ID."""
    return get_export_job_manager(config).get_job(job_id)


def list_active_export_jobs(config: FrigateConfig) -> list[ExportJob]:
    """List queued and running export jobs."""
    return get_export_job_manager(config).list_active_jobs()


def available_export_queue_slots(config: FrigateConfig) -> int:
    """Approximate number of additional export jobs that could be queued now."""
    return get_export_job_manager(config).available_slots()
