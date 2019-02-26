import json
import threading

class MqttMotionPublisher(threading.Thread):
    def __init__(self, client, topic_prefix, motion_changed, motion_flags):
        threading.Thread.__init__(self)
        self.client = client
        self.topic_prefix = topic_prefix
        self.motion_changed = motion_changed
        self.motion_flags = motion_flags

    def run(self):
        last_sent_motion = ""
        while True:
            with self.motion_changed:
                self.motion_changed.wait()
            
            # send message for motion
            motion_status = 'OFF'
            if any(obj.is_set() for obj in self.motion_flags):
                motion_status = 'ON'

            if last_sent_motion != motion_status:
                last_sent_motion = motion_status
                self.client.publish(self.topic_prefix+'/motion', motion_status, retain=False)

class MqttObjectPublisher(threading.Thread):
    def __init__(self, client, topic_prefix, objects_parsed, object_classes, detected_objects):
        threading.Thread.__init__(self)
        self.client = client
        self.topic_prefix = topic_prefix
        self.objects_parsed = objects_parsed
        self.object_classes = object_classes
        self._detected_objects = detected_objects

    def run(self):
        last_sent_payload = ""
        while True:

            # initialize the payload
            payload = {}

            # wait until objects have been parsed
            with self.objects_parsed:
                self.objects_parsed.wait()

            # add all the person scores in detected objects and 
            # average over past 1 seconds (5fps)
            detected_objects = self._detected_objects.copy()
            avg_person_score = sum([obj['score'] for obj in detected_objects if obj['name'] == 'person'])/5
            payload['person'] = int(avg_person_score*100)

            # send message for objects if different
            new_payload = json.dumps(payload, sort_keys=True)
            if new_payload != last_sent_payload:
                last_sent_payload = new_payload
                self.client.publish(self.topic_prefix+'/objects', new_payload, retain=False)