import queue
import threading

class ExternalTriggerProcessor(threading.Thread):
    def __init__(self, event_queue, external_trigger_queue):
        threading.Thread.__init__(self)
        self.event_queue = event_queue
        self.active_events = external_trigger_queue

    def trigger_snapshot(self, camera_name, runtime):
        # Triggering a snapshot is a additive event, meaning a already running snapshots runtime will be extended

    def end_snapshot(self, camera_name)
        pass

    def run(self):
        pass
