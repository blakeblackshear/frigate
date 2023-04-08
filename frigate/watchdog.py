import datetime
import logging
import threading
import time
import os
import signal

from frigate.object_detection import ObjectDetectProcess
from frigate.util import restart_frigate
from multiprocessing.synchronize import Event as MpEvent

logger = logging.getLogger(__name__)


class FrigateWatchdog(threading.Thread):
    def __init__(self, detectors: dict[str, ObjectDetectProcess], stop_event: MpEvent):
        threading.Thread.__init__(self)
        self.name = "frigate_watchdog"
        self.detectors = detectors
        self.stop_event = stop_event

    def run(self) -> None:
        time.sleep(10)
        while not self.stop_event.wait(10):
            now = datetime.datetime.now().timestamp()

            # check the detection processes
            for detector in self.detectors.values():
                detection_start = detector.detection_start.value
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

        logger.info(f"Exiting watchdog...")
