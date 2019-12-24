import json
import cv2
import threading

class MqttObjectPublisher(threading.Thread):
    def __init__(self, client, topic_prefix, objects_parsed, detected_objects, best_person_frame, label, dedupe_snapshot_publish):
        threading.Thread.__init__(self)
        self.client = client
        self.topic_prefix = topic_prefix
        self.objects_parsed = objects_parsed
        self._detected_objects = detected_objects
        self.best_person_frame = best_person_frame
        self.label = label
        self.dedupe_snapshot_publish = dedupe_snapshot_publish

    def run(self):
        last_sent_payload = ""
        last_sent_snapshot_time = 0
        while True:

            # initialize the payload
            payload = {}

            # wait until objects have been parsed
            with self.objects_parsed:
                self.objects_parsed.wait()

            # add all the person scores in detected objects
            detected_objects = self._detected_objects.copy()
            person_score = sum([obj['score'] for obj in detected_objects if obj['name'] == self.label])
            # if the person score is more than 100, set person to ON
            payload['person'] = 'ON' if int(person_score*100) > 100 else 'OFF'

            # send message for objects if different
            new_payload = json.dumps(payload, sort_keys=True)
            if new_payload != last_sent_payload:
                last_sent_payload = new_payload
                self.client.publish(self.topic_prefix+'/objects', new_payload, retain=False)
                # send the snapshot over mqtt as well
                if not self.best_person_frame.best_frame is None and not self.best_person_frame.best_person is None:
                    snapshot_time = self.best_person_frame.best_person['frame_time']
                    if self.dedupe_snapshot_publish and snapshot_time == last_sent_snapshot_time:
                        continue
                    last_sent_snapshot_time = snapshot_time
                    ret, jpg = cv2.imencode('.jpg', self.best_person_frame.best_frame)
                    if ret:
                        jpg_bytes = jpg.tobytes()
                        self.client.publish(self.topic_prefix+'/snapshot', jpg_bytes, retain=True)