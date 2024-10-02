import datetime
import logging
import threading
from multiprocessing.synchronize import Event as MpEvent

from frigate.object_detection import ObjectDetectProcess
from frigate.util.services import restart_frigate

logger = logging.getLogger(__name__)


class FrigateWatchdog(threading.Thread):
    def __init__(self, detectors: dict[str, ObjectDetectProcess], stop_event: MpEvent):
        super().__init__(name="frigate_watchdog")
        self.detectors = detectors
        self.stop_event = stop_event

    def run(self) -> None:
        while not self.stop_event.wait(10):
            now = datetime.datetime.now().timestamp()

            # check the detection processes
            for detector_name in list(self.detectors.keys()):
                detector = self.detectors[detector_name]

                detection_start = detector.detection_start.value  # type: ignore[attr-defined]
                # issue https://github.com/python/typeshed/issues/8799
                # from mypy 0.981 onwards
                if detection_start > 0.0 and now - detection_start > 10:
                    logger.info(
                        "Detection appears to be stuck. Restarting detection process..."
                    )

                    # Stop the detector
                    detector.terminate()
                    logger.info("Waiting for detection process to exit gracefully...")
                    detector.join(timeout=30)
                    if detector.exitcode is None:
                        logger.info("Detection process didn't exit. Force killing...")
                        detector.kill()
                        detector.join()

                    # Start the detector
                    detector = ObjectDetectProcess(
                        detector_name,
                        detector.detection_queue,
                        detector.out_events,
                        detector.detector_config,
                    )
                    detector.start()

                elif not detector.is_alive():
                    logger.info("Detection appears to have stopped. Exiting Frigate...")
                    restart_frigate()

                self.detectors[detector_name] = detector

        logger.info("Exiting watchdog...")
