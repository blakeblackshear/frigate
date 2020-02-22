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
from frigate.util import draw_box_with_label
from frigate.edgetpu import load_labels

PATH_TO_LABELS = '/labelmap.txt'

LABELS = load_labels(PATH_TO_LABELS)
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
            'tracked_objects': {},
            'current_frame_time': datetime.datetime.now().timestamp()
        })
        
    def get_best(self, camera, label):
        if label in self.camera_data[camera]['best_objects']:
            return self.camera_data[camera]['best_objects'][label]['frame']
        else:
            return None
    
    def get_current_frame(self, camera):
        return self.camera_data[camera]['current_frame']
    
    def get_current_frame_time(self, camera):
        return self.camera_data[camera]['current_frame_time']

    def run(self):
        while True:
            camera, frame_time, tracked_objects = self.tracked_objects_queue.get()

            config = self.config[camera]
            best_objects = self.camera_data[camera]['best_objects']
            current_object_status = self.camera_data[camera]['object_status']
            self.camera_data[camera]['tracked_objects'] = tracked_objects

            ###
            # Draw tracked objects on the frame
            ###
            object_id_hash = hashlib.sha1(str.encode(f"{camera}{frame_time}"))
            object_id_bytes = object_id_hash.digest()
            object_id = plasma.ObjectID(object_id_bytes)
            current_frame = self.plasma_client.get(object_id)

            # draw the bounding boxes on the frame
            for obj in tracked_objects.values():
                thickness = 2
                color = COLOR_MAP[obj['label']]
                
                if obj['frame_time'] != frame_time:
                    thickness = 1
                    color = (255,0,0)

                # draw the bounding boxes on the frame
                box = obj['box']
                draw_box_with_label(current_frame, box[0], box[1], box[2], box[3], obj['label'], f"{int(obj['score']*100)}% {int(obj['area'])}", thickness=thickness, color=color)
                # draw the regions on the frame
                region = obj['region']
                cv2.rectangle(current_frame, (region[0], region[1]), (region[2], region[3]), (0,255,0), 1)
            
            if config['snapshots']['show_timestamp']:
                time_to_show = datetime.datetime.fromtimestamp(frame_time).strftime("%m/%d/%Y %H:%M:%S")
                cv2.putText(current_frame, time_to_show, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, fontScale=.8, color=(255, 255, 255), thickness=2)

            ###
            # Set the current frame as ready
            ###
            self.camera_data[camera]['current_frame'] = current_frame
            self.camera_data[camera]['current_frame_time'] = frame_time
            
            ###
            # Maintain the highest scoring recent object and frame for each label
            ###
            for obj in tracked_objects.values():
                # if the object wasn't seen on the current frame, skip it
                if obj['frame_time'] != frame_time:
                    continue
                if obj['label'] in best_objects:
                    now = datetime.datetime.now().timestamp()
                    # if the object is a higher score than the current best score 
                    # or the current object is more than 1 minute old, use the new object
                    if obj['score'] > best_objects[obj['label']]['score'] or (now - best_objects[obj['label']]['frame_time']) > 60:
                        obj['frame'] = np.copy(current_frame)
                        best_objects[obj['label']] = obj
                else:
                    obj['frame'] = np.copy(current_frame)
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