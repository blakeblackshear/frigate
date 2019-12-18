import json
import cv2
import threading
import subprocess as sp

class MqttObjectPublisher(threading.Thread):
    def __init__(self, client, topic_prefix, objects_parsed, detected_objects, best_person_frame):
        threading.Thread.__init__(self)
        self.client = client
        self.topic_prefix = topic_prefix
        self.objects_parsed = objects_parsed
        self._detected_objects = detected_objects
        self.best_person_frame = best_person_frame

    def run(self):
        last_sent_payload = ""
        while True:

            # initialize the payload
            payload = {}

            # wait until objects have been parsed
            with self.objects_parsed:
                self.objects_parsed.wait()

            # add all the person scores in detected objects
            detected_objects = self._detected_objects.copy()
            person_score = sum([obj['score'] for obj in detected_objects if obj['name'] == 'person'])
            # if the person score is more than 100, set person to ON
            payload['person'] = 'ON' if int(person_score*100) > 100 else 'OFF'

            # send message for objects if different
            new_payload = json.dumps(payload, sort_keys=True)
            if new_payload != last_sent_payload:
                last_sent_payload = new_payload
                self.client.publish(self.topic_prefix+'/objects', new_payload, retain=False)
                # send the snapshot over mqtt as well
                if not self.best_person_frame.best_frame is None:
                    ret, jpg = cv2.imencode('.jpg', self.best_person_frame.best_frame)
                    if ret:
                        jpg_bytes = jpg.tobytes()
                        self.client.publish(self.topic_prefix+'/snapshot', jpg_bytes, retain=True)
                        
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