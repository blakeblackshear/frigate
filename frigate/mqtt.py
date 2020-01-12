import json
import cv2
import threading
import prctl
from collections import Counter, defaultdict
import itertools

class MqttObjectPublisher(threading.Thread):
    def __init__(self, client, topic_prefix, camera):
        threading.Thread.__init__(self)
        self.client = client
        self.topic_prefix = topic_prefix
        self.camera = camera

    def run(self):
        prctl.set_name(self.__class__.__name__)
        current_object_status = defaultdict(lambda: 'OFF')
        while True:
            # wait until objects have been tracked
            with self.camera.objects_tracked:
                self.camera.objects_tracked.wait()

            # count objects with more than 2 entries in history by type
            obj_counter = Counter()
            for obj in self.camera.object_tracker.tracked_objects.values():
                if len(obj['history']) > 1:
                    obj_counter[obj['name']] += 1
            
            # report on detected objects
            for obj_name, count in obj_counter.items():
                new_status = 'ON' if count > 0 else 'OFF'
                if new_status != current_object_status[obj_name]:
                    current_object_status[obj_name] = new_status
                    self.client.publish(self.topic_prefix+'/'+obj_name, new_status, retain=False)
                    # send the snapshot over mqtt if we have it as well
                    if obj_name in self.camera.best_frames.best_frames:
                        best_frame = cv2.cvtColor(self.camera.best_frames.best_frames[obj_name], cv2.COLOR_RGB2BGR)
                        ret, jpg = cv2.imencode('.jpg', best_frame)
                        if ret:
                            jpg_bytes = jpg.tobytes()
                            self.client.publish(self.topic_prefix+'/'+obj_name+'/snapshot', jpg_bytes, retain=True)

            # expire any objects that are ON and no longer detected
            expired_objects = [obj_name for obj_name, status in current_object_status.items() if status == 'ON' and not obj_name in obj_counter]
            for obj_name in expired_objects:
                current_object_status[obj_name] = 'OFF'
                self.client.publish(self.topic_prefix+'/'+obj_name, 'OFF', retain=False)
                # send updated snapshot snapshot over mqtt if we have it as well
                if obj_name in self.camera.best_frames.best_frames:
                    best_frame = cv2.cvtColor(self.camera.best_frames.best_frames[obj_name], cv2.COLOR_RGB2BGR)
                    ret, jpg = cv2.imencode('.jpg', best_frame)
                    if ret:
                        jpg_bytes = jpg.tobytes()
                        self.client.publish(self.topic_prefix+'/'+obj_name+'/snapshot', jpg_bytes, retain=True)