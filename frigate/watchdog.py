import datetime
import time
import threading

class FrigateWatchdog(threading.Thread):
    def __init__(self, detectors, stop_event):
        threading.Thread.__init__(self)
        self.detectors = detectors
        self.stop_event = stop_event

    def run(self):
        time.sleep(10)
        while True:
            # wait a bit before checking
            time.sleep(10)

            if self.stop_event.is_set():
                print(f"Exiting watchdog...")
                break

            now = datetime.datetime.now().timestamp()

            # check the detection processes
            for detector in self.detectors.values():
                detection_start = detector.detection_start.value
                if (detection_start > 0.0 and 
                    now - detection_start > 10):
                    print("Detection appears to be stuck. Restarting detection process")
                    detector.start_or_restart()
                elif not detector.detect_process.is_alive():
                    print("Detection appears to have stopped. Restarting detection process")
                    detector.start_or_restart()
