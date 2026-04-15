"""Local only processors for handling real time object processing."""

import logging
import threading
from abc import ABC, abstractmethod
from collections import deque
from concurrent.futures import Future
from queue import Empty, Full, Queue
from typing import Any, Callable

import numpy as np

from frigate.config import FrigateConfig

from ..types import DataProcessorMetrics

logger = logging.getLogger(__name__)


class RealTimeProcessorApi(ABC):
    @abstractmethod
    def __init__(
        self,
        config: FrigateConfig,
        metrics: DataProcessorMetrics,
    ) -> None:
        self.config = config
        self.metrics = metrics
        pass

    @abstractmethod
    def process_frame(self, obj_data: dict[str, Any], frame: np.ndarray) -> None:
        """Processes the frame with object data.
        Args:
            obj_data (dict): containing data about focused object in frame.
            frame (ndarray): full yuv frame.

        Returns:
            None.
        """
        pass

    @abstractmethod
    def handle_request(
        self, topic: str, request_data: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Handle metadata requests.
        Args:
            topic (str): topic that dictates what work is requested.
            request_data (dict): containing data about requested change to process.

        Returns:
            None if request was not handled, otherwise return response.
        """
        pass

    @abstractmethod
    def expire_object(self, object_id: str, camera: str) -> None:
        """Handle objects that are no longer detected.
        Args:
            object_id (str): id of object that is no longer detected.
            camera (str): name of camera that object was detected on.

        Returns:
            None.
        """
        pass

    def update_config(self, topic: str, payload: Any) -> None:
        """Handle a config change notification.

        Called for every config update published under ``config/``.
        Processors should override this to check the topic and act only
        on changes relevant to them. Default is a no-op.

        Args:
            topic: The config topic that changed.
            payload: The updated configuration object.
        """
        pass

    def drain_results(self) -> list[dict[str, Any]]:
        """Return pending results that need IPC side-effects.

        Deferred processors accumulate results on a worker thread.
        The maintainer calls this each loop iteration to collect them
        and perform publishes on the main thread.

        Synchronous processors return an empty list (default).
        """
        return []

    def shutdown(self) -> None:
        """Stop any background work and release resources.

        Called when the processor is being removed or the maintainer
        is shutting down. Default is a no-op for synchronous processors.
        """
        pass


class DeferredRealtimeProcessorApi(RealTimeProcessorApi):
    """Base class for processors that offload heavy work to a background thread.

    Subclasses implement:
      - process_frame(): do cheap gating + crop + copy, then call _enqueue_task()
      - _process_task(task): heavy work (inference, consensus) on the worker thread
      - handle_request(): optionally use _enqueue_request() for sync request/response
      - expire_object(): call _enqueue_task() with a control message

    The worker thread owns all processor state. No locks are needed because
    only the worker mutates state. Results that need IPC are placed in
    _pending_results via _emit_result(), and the maintainer drains them
    each loop iteration.
    """

    def __init__(
        self,
        config: FrigateConfig,
        metrics: DataProcessorMetrics,
        max_queue: int = 8,
    ) -> None:
        super().__init__(config, metrics)
        self._task_queue: Queue = Queue(maxsize=max_queue)
        self._pending_results: deque[dict[str, Any]] = deque()
        self._results_lock = threading.Lock()
        self._stop_event = threading.Event()
        self._worker = threading.Thread(
            target=self._drain_loop,
            daemon=True,
            name=f"{type(self).__name__}_worker",
        )
        self._worker.start()

    def _drain_loop(self) -> None:
        """Worker thread main loop — drains the task queue until stopped."""
        while not self._stop_event.is_set():
            try:
                task = self._task_queue.get(timeout=0.5)
            except Empty:
                continue

            if (
                isinstance(task, tuple)
                and len(task) == 2
                and isinstance(task[1], Future)
            ):
                # Request/response: (callable_and_args, future)
                (func, args), future = task
                try:
                    result = func(args)
                    future.set_result(result)
                except Exception as e:
                    future.set_exception(e)
            else:
                try:
                    self._process_task(task)
                except Exception:
                    logger.exception("Error processing deferred task")

    def _enqueue_task(self, task: Any) -> bool:
        """Enqueue a task for the worker. Returns False if queue is full (dropped)."""
        try:
            self._task_queue.put_nowait(task)
            return True
        except Full:
            logger.debug("Deferred processor queue full, dropping task")
            return False

    def _enqueue_request(self, func: Callable, args: Any, timeout: float = 10.0) -> Any:
        """Enqueue a request and block until the worker returns a result."""
        future: Future = Future()
        self._task_queue.put(((func, args), future), timeout=timeout)
        return future.result(timeout=timeout)

    def _emit_result(self, result: dict[str, Any]) -> None:
        """Called by the worker thread to stage a result for the maintainer."""
        with self._results_lock:
            self._pending_results.append(result)

    def drain_results(self) -> list[dict[str, Any]]:
        """Called by the maintainer on the main thread to collect pending results."""
        with self._results_lock:
            results = list(self._pending_results)
            self._pending_results.clear()
        return results

    def shutdown(self) -> None:
        """Signal the worker to stop and wait for it to finish."""
        self._stop_event.set()
        self._worker.join(timeout=5.0)

    @abstractmethod
    def _process_task(self, task: Any) -> None:
        """Process a single task on the worker thread.

        Subclasses implement inference, consensus, training image saves here.
        Call _emit_result() to stage results for the maintainer to publish.
        """
        pass
