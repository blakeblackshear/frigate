import time
import datetime
import threading

class ObjectParser(threading.Thread):
    def __init__(self, object_queue, objects_parsed, detected_objects):
        threading.Thread.__init__(self)
        self._object_queue = object_queue
        self._objects_parsed = objects_parsed
        self._detected_objects = detected_objects

    def run(self):
        while True:
            obj = self._object_queue.get()
            self._detected_objects.append(obj)

            # notify that objects were parsed
            with self._objects_parsed:
                self._objects_parsed.notify_all()

class ObjectCleaner(threading.Thread):
    def __init__(self, objects_parsed, detected_objects):
        threading.Thread.__init__(self)
        self._objects_parsed = objects_parsed
        self._detected_objects = detected_objects

    def run(self):
        while True:

            # expire the objects that are more than 1 second old
            now = datetime.datetime.now().timestamp()
            # look for the first object found within the last second
            # (newest objects are appended to the end)
            detected_objects = self._detected_objects.copy()
            num_to_delete = 0
            for obj in detected_objects:
                if now-obj['frame_time']<1:
                    break
                num_to_delete += 1
            if num_to_delete > 0:
                del self._detected_objects[:num_to_delete]

                # notify that parsed objects were changed
                with self._objects_parsed:
                    self._objects_parsed.notify_all()
            
            # wait a bit before checking for more expired frames
            time.sleep(0.2)