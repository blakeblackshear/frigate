import json
import cv2
import threading
from collections import Counter, defaultdict
import subprocess as sp

class MqttObjectPublisher(threading.Thread):
    def __init__(self, client, topic_prefix, objects_parsed, detected_objects, best_frames):
        threading.Thread.__init__(self)
        self.client = client
        self.topic_prefix = topic_prefix
        self.objects_parsed = objects_parsed
        self._detected_objects = detected_objects
        self.best_frames = best_frames

    def run(self):
        current_object_status = defaultdict(lambda: 'OFF')
        while True:
            # wait until objects have been parsed
            with self.objects_parsed:
                self.objects_parsed.wait()

            # make a copy of detected objects
            detected_objects = self._detected_objects.copy()
            # total up all scores by object type
            obj_counter = Counter()
            for obj in detected_objects:
                obj_counter[obj['name']] += obj['score']
            
            # report on detected objects
            for obj_name, total_score in obj_counter.items():
                new_status = 'ON' if int(total_score*100) > 100 else 'OFF'
                if new_status != current_object_status[obj_name]:
                    current_object_status[obj_name] = new_status
                    self.client.publish(self.topic_prefix+'/'+obj_name, new_status, retain=False)
                    # send the snapshot over mqtt if we have it as well
                    if obj_name in self.best_frames.best_frames:
                        ret, jpg = cv2.imencode('.jpg', self.best_frames.best_frames[obj_name])
                        if ret:
                            jpg_bytes = jpg.tobytes()
                            self.client.publish(self.topic_prefix+'/'+obj_name+'/snapshot', jpg_bytes, retain=True)

            # expire any objects that are ON and no longer detected
            expired_objects = [obj_name for obj_name, status in current_object_status.items() if status == 'ON' and not obj_name in obj_counter]
            for obj_name in expired_objects:
                current_object_status[obj_name] = 'OFF'
                self.client.publish(self.topic_prefix+'/'+obj_name, 'OFF', retain=False)
                        
class MqttObjectConsumer(threading.Thread):
    def __init__(self, client, topic_prefix, listen_queue, cameras):
        threading.Thread.__init__(self)
        self.client = client
        self.topic_prefix = topic_prefix
        self.listen_queue = listen_queue
        self.cameras = cameras
        
    def run(self):
        while True:
            # Now we want to see if there are more messages and then process them
            item = self.listen_queue.get()
            topic = item['topic']
            payload = item['payload']
            if topic == ("%s/detection" % self.topic_prefix):
                if payload == 'enable':
                    for camera in self.cameras:
                        camera.start_or_restart_capture()
                elif payload == 'disable':
                    for camera in self.cameras:
                        camera.disable_capture()
                        camera.watchdog.disable = True
                        camera.watchdog = None
