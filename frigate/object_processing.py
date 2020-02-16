import json
import hashlib
import datetime
import copy
import cv2
import threading
import numpy as np
from collections import Counter, defaultdict
import itertools
import pyarrow.plasma as plasma
import SharedArray as sa
import matplotlib.pyplot as plt
from frigate.util import draw_box_with_label, ReadLabelFile

PATH_TO_LABELS = '/lab/labelmap.txt'

LABELS = ReadLabelFile(PATH_TO_LABELS)
cmap = plt.cm.get_cmap('tab10', len(LABELS.keys()))

COLOR_MAP = {}
for key, val in LABELS.items():
    COLOR_MAP[val] = tuple(int(round(255 * c)) for c in cmap(key)[:3])

class TrackedObjectProcessor(threading.Thread):
    def __init__(self, config, client, topic_prefix, tracked_objects_queue):
        threading.Thread.__init__(self)
        self.config = config
        self.client = client
        self.topic_prefix = topic_prefix
        self.tracked_objects_queue = tracked_objects_queue
        self.plasma_client = plasma.connect("/tmp/plasma")
        self.camera_data = defaultdict(lambda: {
            'best_objects': {},
            'object_status': defaultdict(lambda: defaultdict(lambda: 'OFF')),
            'tracked_objects': {}
        })
        
    def get_best(self, camera, label):
        if label in self.camera_data[camera]['best_objects']:
            return self.camera_data[camera]['best_objects'][label]['frame']
        else:
            return None

    def get_frame(self, config, camera, obj):
        object_id_hash = hashlib.sha1(str.encode(f"{camera}{obj['frame_time']}"))
        object_id_bytes = object_id_hash.digest()
        object_id = plasma.ObjectID(object_id_bytes)
        best_frame = self.plasma_client.get(object_id)
        box = obj['box']
        draw_box_with_label(best_frame, box[0], box[1], box[2], box[3], obj['label'], f"{int(obj['score']*100)}% {int(obj['area'])}")
        # print a timestamp
        if config['snapshots']['show_timestamp']:
            time_to_show = datetime.datetime.fromtimestamp(obj['frame_time']).strftime("%m/%d/%Y %H:%M:%S")
            cv2.putText(best_frame, time_to_show, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, fontScale=.8, color=(255, 255, 255), thickness=2)
        return best_frame
    
    def current_frame_with_objects(self, camera):
        frame_time = self.camera_data[camera]['current_frame']
        object_id_hash = hashlib.sha1(str.encode(f"{camera}{frame_time}"))
        object_id_bytes = object_id_hash.digest()
        object_id = plasma.ObjectID(object_id_bytes)
        current_frame = self.plasma_client.get(object_id)
            
        tracked_objects = copy.deepcopy(self.camera_data[camera]['tracked_objects'])

        # draw the bounding boxes on the screen
        for obj in tracked_objects.values():
            thickness = 2
            color = COLOR_MAP[obj['label']]
            
            if obj['frame_time'] != frame_time:
                thickness = 1
                color = (255,0,0)

            box = obj['box']
            draw_box_with_label(current_frame, box[0], box[1], box[2], box[3], obj['label'], f"{int(obj['score']*100)}% {int(obj['area'])}", thickness=thickness, color=color)
        
        # # print fps
        # cv2.putText(frame, str(self.fps.eps())+'FPS', (10, 60), cv2.FONT_HERSHEY_SIMPLEX, fontScale=.8, color=(255, 255, 255), thickness=2)

        # convert to BGR
        frame = cv2.cvtColor(current_frame, cv2.COLOR_RGB2BGR)

        # encode the image into a jpg
        ret, jpg = cv2.imencode('.jpg', frame)

        return jpg.tobytes()

    def run(self):
        while True:
            camera, frame_time, tracked_objects = self.tracked_objects_queue.get()

            config = self.config[camera]
            best_objects = self.camera_data[camera]['best_objects']
            current_object_status = self.camera_data[camera]['object_status']
            self.camera_data[camera]['tracked_objects'] = tracked_objects
            self.camera_data[camera]['current_frame'] = frame_time
            
            ###
            # Maintain the highest scoring recent object and frame for each label
            ###
            for obj in tracked_objects.values():
                if obj['label'] in best_objects:
                    now = datetime.datetime.now().timestamp()
                    # if the object is a higher score than the current best score 
                    # or the current object is more than 1 minute old, use the new object
                    if obj['score'] > best_objects[obj['label']]['score'] or (now - best_objects[obj['label']]['frame_time']) > 60:
                        obj['frame'] = self.get_frame(config, camera, obj)
                        best_objects[obj['label']] = obj
                else:
                    obj['frame'] = self.get_frame(config, camera, obj)
                    best_objects[obj['label']] = obj

            ###
            # Report over MQTT
            ###
            # count objects with more than 2 entries in history by type
            obj_counter = Counter()
            for obj in tracked_objects.values():
                if len(obj['history']) > 1:
                    obj_counter[obj['label']] += 1
                    
            # report on detected objects
            for obj_name, count in obj_counter.items():
                new_status = 'ON' if count > 0 else 'OFF'
                if new_status != current_object_status[obj_name]:
                    current_object_status[obj_name] = new_status
                    self.client.publish(f"{self.topic_prefix}/{camera}/{obj_name}", new_status, retain=False)
                    # send the best snapshot over mqtt
                    best_frame = cv2.cvtColor(best_objects[obj_name]['frame'], cv2.COLOR_RGB2BGR)
                    ret, jpg = cv2.imencode('.jpg', best_frame)
                    if ret:
                        jpg_bytes = jpg.tobytes()
                        self.client.publish(f"{self.topic_prefix}/{camera}/{obj_name}/snapshot", jpg_bytes, retain=True)

            # expire any objects that are ON and no longer detected
            expired_objects = [obj_name for obj_name, status in current_object_status.items() if status == 'ON' and not obj_name in obj_counter]
            for obj_name in expired_objects:
                current_object_status[obj_name] = 'OFF'
                self.client.publish(f"{self.topic_prefix}/{camera}/{obj_name}", 'OFF', retain=False)
                # send updated snapshot over mqtt
                best_frame = cv2.cvtColor(best_objects[obj_name]['frame'], cv2.COLOR_RGB2BGR)
                ret, jpg = cv2.imencode('.jpg', best_frame)
                if ret:
                    jpg_bytes = jpg.tobytes()
                    self.client.publish(f"{self.topic_prefix}/{camera}/{obj_name}/snapshot", jpg_bytes, retain=True)