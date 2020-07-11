import json
import hashlib
import datetime
import time
import copy
import cv2
import threading
import numpy as np
from collections import Counter, defaultdict
import itertools
import pyarrow.plasma as plasma
import matplotlib.pyplot as plt
from frigate.util import draw_box_with_label, PlasmaManager
from frigate.edgetpu import load_labels

PATH_TO_LABELS = '/labelmap.txt'

LABELS = load_labels(PATH_TO_LABELS)
cmap = plt.cm.get_cmap('tab10', len(LABELS.keys()))

COLOR_MAP = {}
for key, val in LABELS.items():
    COLOR_MAP[val] = tuple(int(round(255 * c)) for c in cmap(key)[:3])

def filter_false_positives(event):
    if len(event['history']) < 2:
        return True
    return False

class TrackedObjectProcessor(threading.Thread):
    def __init__(self, config, client, topic_prefix, tracked_objects_queue, event_queue):
        threading.Thread.__init__(self)
        self.config = config
        self.client = client
        self.topic_prefix = topic_prefix
        self.tracked_objects_queue = tracked_objects_queue
        self.event_queue = event_queue
        self.camera_data = defaultdict(lambda: {
            'best_objects': {},
            'object_status': defaultdict(lambda: defaultdict(lambda: 'OFF')),
            'tracked_objects': {},
            'current_frame': np.zeros((720,1280,3), np.uint8),
            'current_frame_time': 0.0,
            'object_id': None
        })
        self.plasma_client = PlasmaManager()
        
    def get_best(self, camera, label):
        if label in self.camera_data[camera]['best_objects']:
            return self.camera_data[camera]['best_objects'][label]['frame']
        else:
            return None
    
    def get_current_frame(self, camera):
        return self.camera_data[camera]['current_frame']

    def run(self):
        while True:
            camera, frame_time, current_tracked_objects = self.tracked_objects_queue.get()

            config = self.config[camera]
            best_objects = self.camera_data[camera]['best_objects']
            current_object_status = self.camera_data[camera]['object_status']
            tracked_objects = self.camera_data[camera]['tracked_objects']

            current_ids = current_tracked_objects.keys()
            previous_ids = tracked_objects.keys()
            removed_ids = list(set(previous_ids).difference(current_ids))
            new_ids = list(set(current_ids).difference(previous_ids))
            updated_ids = list(set(current_ids).intersection(previous_ids))

            for id in new_ids:
                # only register the object here if we are sure it isnt a false positive
                if not filter_false_positives(current_tracked_objects[id]):
                    tracked_objects[id] = current_tracked_objects[id]
                    # publish events to mqtt
                    self.client.publish(f"{self.topic_prefix}/{camera}/events/start", json.dumps(tracked_objects[id]), retain=False)
                    self.event_queue.put(('start', camera, tracked_objects[id]))
            
            for id in updated_ids:
                tracked_objects[id] = current_tracked_objects[id]
            
            for id in removed_ids:
                # publish events to mqtt
                tracked_objects[id]['end_time'] = frame_time
                self.client.publish(f"{self.topic_prefix}/{camera}/events/end", json.dumps(tracked_objects[id]), retain=False)
                self.event_queue.put(('end', camera, tracked_objects[id]))
                del tracked_objects[id]

            self.camera_data[camera]['current_frame_time'] = frame_time

            ###
            # Draw tracked objects on the frame
            ###
            current_frame = self.plasma_client.get(f"{camera}{frame_time}")

            if not current_frame is plasma.ObjectNotAvailable:
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
                # Set the current frame
                ###
                self.camera_data[camera]['current_frame'] = current_frame

                # delete the previous frame from the plasma store and update the object id
                if not self.camera_data[camera]['object_id'] is None:
                    self.plasma_client.delete(self.camera_data[camera]['object_id'])
                self.camera_data[camera]['object_id'] = f"{camera}{frame_time}"
            
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
                        obj['frame'] = np.copy(self.camera_data[camera]['current_frame'])
                        best_objects[obj['label']] = obj
                else:
                    obj['frame'] = np.copy(self.camera_data[camera]['current_frame'])
                    best_objects[obj['label']] = obj

            ###
            # Report over MQTT
            ###
            # count objects by type
            obj_counter = Counter()
            for obj in tracked_objects.values():
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
