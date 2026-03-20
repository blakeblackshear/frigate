import datetime
import logging
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from multiprocessing.synchronize import Event as MpEvent
from typing import Callable

from frigate.object_detection.base import ObjectDetectProcess
from frigate.util.process import FrigateProcess
from frigate.util.services import restart_frigate

logger = logging.getLogger(__name__)

MAX_RESTARTS = 5
RESTART_WINDOW_S = 60


@dataclass
class MonitoredProcess:
    """A process monitored by the watchdog for automatic restart."""

    name: str
    process: FrigateProcess
    factory: Callable[[], FrigateProcess]
    on_restart: Callable[[FrigateProcess], None] | None = None
    restart_timestamps: deque[float] = field(
        default_factory=lambda: deque(maxlen=MAX_RESTARTS)
    )

    def is_restarting_too_fast(self, now: float) -> bool:
        while (
            self.restart_timestamps
            and now - self.restart_timestamps[0] > RESTART_WINDOW_S
        ):
            self.restart_timestamps.popleft()
        return len(self.restart_timestamps) >= MAX_RESTARTS


class FrigateWatchdog(threading.Thread):
    def __init__(
        self,
        detectors: dict[str, ObjectDetectProcess],
        stop_event: MpEvent,
    ):
        super().__init__(name="frigate_watchdog")
        self.detectors = detectors
        self.stop_event = stop_event
        self._monitored: list[MonitoredProcess] = []

    def register(
        self,
        name: str,
        process: FrigateProcess,
        factory: Callable[[], FrigateProcess],
        on_restart: Callable[[FrigateProcess], None] | None = None,
    ) -> None:
        """Register a FrigateProcess for monitoring and automatic restart."""
        self._monitored.append(
            MonitoredProcess(
                name=name,
                process=process,
                factory=factory,
                on_restart=on_restart,
            )
        )

    def _check_process(self, entry: MonitoredProcess) -> None:
        if entry.process.is_alive():
            return

        exitcode = entry.process.exitcode
        if exitcode == 0:
            logger.info("Process %s exited cleanly, not restarting", entry.name)
            return

        logger.warning(
            "Process %s (PID %s) exited with code %s",
            entry.name,
            entry.process.pid,
            exitcode,
        )

        now = datetime.datetime.now().timestamp()

        if entry.is_restarting_too_fast(now):
            logger.error(
                "Process %s restarting too frequently (%d times in %ds), backing off",
                entry.name,
                MAX_RESTARTS,
                RESTART_WINDOW_S,
            )
            return

        try:
            entry.process.close()
            new_process = entry.factory()
            new_process.start()

            entry.process = new_process
            entry.restart_timestamps.append(now)

            if entry.on_restart:
                entry.on_restart(new_process)

            logger.info("Restarted %s (PID %s)", entry.name, new_process.pid)
        except Exception:
            logger.exception("Failed to restart %s", entry.name)

    def run(self) -> None:
        time.sleep(10)
        while not self.stop_event.wait(10):
            now = datetime.datetime.now().timestamp()

            # check the detection processes
            for detector in self.detectors.values():
                detection_start = detector.detection_start.value  # type: ignore[attr-defined]
                # issue https://github.com/python/typeshed/issues/8799
                # from mypy 0.981 onwards
                if detection_start > 0.0 and now - detection_start > 10:
                    logger.info(
                        "Detection appears to be stuck. Restarting detection process..."
                    )
                    detector.start_or_restart()
                elif (
                    detector.detect_process is not None
                    and not detector.detect_process.is_alive()
                ):
                    logger.info("Detection appears to have stopped. Exiting Frigate...")
                    restart_frigate()

            for entry in self._monitored:
                self._check_process(entry)

        logger.info("Exiting watchdog...")
