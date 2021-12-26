import datetime
import logging
import threading
import time
import os
import signal

from frigate.util import (
    restart_frigate,
)

logger = logging.getLogger(__name__)


class FrigateWatchdog(threading.Thread):
    def __init__(self, detectors, stop_event):
        threading.Thread.__init__(self)
        self.name = "frigate_watchdog"
        self.detectors = detectors
        self.stop_event = stop_event

    def run(self):
        time.sleep(10)
        while not self.stop_event.wait(10):
            now = datetime.datetime.now().timestamp()

            # check the detection processes
            for detector in self.detectors.values():
                detection_start = detector.detection_start.value
                if detection_start > 0.0 and now - detection_start > 30:
                    logger.info(
                        "Detection appears to be stuck. Restarting detection process..."
                    )
                    detector.start_or_restart()
                elif not detector.detect_process.is_alive():
                    logger.info("Detection appears to have stopped. Exiting frigate...")
                    restart_frigate()

        logger.info(f"Exiting watchdog...")
