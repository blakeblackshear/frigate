import json
import hashlib
import datetime
import time
import copy
import cv2
import threading
import queue
import copy
import numpy as np
from collections import Counter, defaultdict
import itertools
import matplotlib.pyplot as plt
from frigate.util import draw_box_with_label, SharedMemoryFrameManager
from frigate.edgetpu import load_labels
from frigate.config import CameraConfig
from typing import Callable, Dict
from statistics import mean, median

PATH_TO_LABELS = '/labelmap.txt'

LABELS = load_labels(PATH_TO_LABELS)
cmap = plt.cm.get_cmap('tab10', len(LABELS.keys()))

COLOR_MAP = {}
for key, val in LABELS.items():
    COLOR_MAP[val] = tuple(int(round(255 * c)) for c in cmap(key)[:3])

def zone_filtered(obj, object_config):
    object_name = obj['label']

    if object_name in object_config:
        obj_settings = object_config[object_name]

        # if the min area is larger than the
        # detected object, don't add it to detected objects
        if obj_settings.min_area > obj['area']:
            return True
        
        # if the detected object is larger than the
        # max area, don't add it to detected objects
        if obj_settings.max_area < obj['area']:
            return True

        # if the score is lower than the threshold, skip
        if obj_settings.threshold > obj['computed_score']:
            return True
        
    return False

# Maintains the state of a camera
class CameraState():
    def __init__(self, name, config, frame_manager):
        self.name = name
        self.config = config
        self.frame_manager = frame_manager

        self.best_objects = {}
        self.object_status = defaultdict(lambda: 'OFF')
        self.tracked_objects = {}
        self.zone_objects = defaultdict(lambda: [])
        self._current_frame = np.zeros(self.config.frame_shape_yuv, np.uint8)
        self.current_frame_lock = threading.Lock()
        self.current_frame_time = 0.0
        self.previous_frame_id = None
        self.callbacks = defaultdict(lambda: [])

    def get_current_frame(self, draw=False):
        with self.current_frame_lock:
            frame_copy = np.copy(self._current_frame)
            frame_time = self.current_frame_time
            tracked_objects = copy.deepcopy(self.tracked_objects)
        
        frame_copy = cv2.cvtColor(frame_copy, cv2.COLOR_YUV2BGR_I420)
        # draw on the frame
        if draw:
            # draw the bounding boxes on the frame
            for obj in tracked_objects.values():
                thickness = 2
                color = COLOR_MAP[obj['label']]
                
                if obj['frame_time'] != frame_time:
                    thickness = 1
                    color = (255,0,0)

                # draw the bounding boxes on the frame
                box = obj['box']
                draw_box_with_label(frame_copy, box[0], box[1], box[2], box[3], obj['label'], f"{int(obj['score']*100)}% {int(obj['area'])}", thickness=thickness, color=color)
                # draw the regions on the frame
                region = obj['region']
                cv2.rectangle(frame_copy, (region[0], region[1]), (region[2], region[3]), (0,255,0), 1)
            
            if self.config.snapshots.show_timestamp:
                time_to_show = datetime.datetime.fromtimestamp(frame_time).strftime("%m/%d/%Y %H:%M:%S")
                cv2.putText(frame_copy, time_to_show, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, fontScale=.8, color=(255, 255, 255), thickness=2)

            if self.config.snapshots.draw_zones:
                for name, zone in self.config.zones.items():
                    thickness = 8 if any([name in obj['zones'] for obj in tracked_objects.values()]) else 2
                    cv2.drawContours(frame_copy, [zone.contour], -1, zone.color, thickness)
        
        return frame_copy

    def false_positive(self, obj):
        # once a true positive, always a true positive
        if not obj.get('false_positive', True):
            return False

        threshold = self.config.objects.filters[obj['label']].threshold
        if obj['computed_score'] < threshold:
            return True
        return False

    def compute_score(self, obj):
        scores = obj['score_history'][:]
        # pad with zeros if you dont have at least 3 scores
        if len(scores) < 3:
            scores += [0.0]*(3 - len(scores))
        return median(scores)

    def on(self, event_type: str, callback: Callable[[Dict], None]):
        self.callbacks[event_type].append(callback)

    def update(self, frame_time, tracked_objects):
        self.current_frame_time = frame_time
        # get the new frame and delete the old frame
        frame_id = f"{self.name}{frame_time}"
        current_frame = self.frame_manager.get(frame_id, self.config.frame_shape_yuv)

        current_ids = tracked_objects.keys()
        previous_ids = self.tracked_objects.keys()
        removed_ids = list(set(previous_ids).difference(current_ids))
        new_ids = list(set(current_ids).difference(previous_ids))
        updated_ids = list(set(current_ids).intersection(previous_ids))

        for id in new_ids:
            self.tracked_objects[id] = tracked_objects[id]
            self.tracked_objects[id]['zones'] = []
            self.tracked_objects[id]['entered_zones'] = set()

            # start the score history
            self.tracked_objects[id]['score_history'] = [self.tracked_objects[id]['score']]

            # calculate if this is a false positive
            self.tracked_objects[id]['computed_score'] = self.compute_score(self.tracked_objects[id])
            self.tracked_objects[id]['top_score'] = self.tracked_objects[id]['computed_score']
            self.tracked_objects[id]['false_positive'] = self.false_positive(self.tracked_objects[id])

            # call event handlers
            for c in self.callbacks['start']:
                c(self.name, tracked_objects[id])
        
        for id in updated_ids:
            self.tracked_objects[id].update(tracked_objects[id])

            # if the object is not in the current frame, add a 0.0 to the score history
            if self.tracked_objects[id]['frame_time'] != self.current_frame_time:
                self.tracked_objects[id]['score_history'].append(0.0)
            else:
                self.tracked_objects[id]['score_history'].append(self.tracked_objects[id]['score'])
            # only keep the last 10 scores
            if len(self.tracked_objects[id]['score_history']) > 10:
                self.tracked_objects[id]['score_history'] = self.tracked_objects[id]['score_history'][-10:]

            # calculate if this is a false positive
            computed_score = self.compute_score(self.tracked_objects[id])
            self.tracked_objects[id]['computed_score'] = computed_score
            if computed_score > self.tracked_objects[id]['top_score']:
              self.tracked_objects[id]['top_score'] = computed_score
            self.tracked_objects[id]['false_positive'] = self.false_positive(self.tracked_objects[id])

            # call event handlers
            for c in self.callbacks['update']:
                c(self.name, self.tracked_objects[id])
        
        for id in removed_ids:
            # publish events to mqtt
            self.tracked_objects[id]['end_time'] = frame_time
            for c in self.callbacks['end']:
                c(self.name, self.tracked_objects[id])
            del self.tracked_objects[id]

        # check to see if the objects are in any zones
        for obj in self.tracked_objects.values():
            current_zones = []
            bottom_center = (obj['centroid'][0], obj['box'][3])
            # check each zone
            for name, zone in self.config.zones.items():
                contour = zone.contour
                # check if the object is in the zone
                if (cv2.pointPolygonTest(contour, bottom_center, False) >= 0):
                    # if the object passed the filters once, dont apply again
                    if name in obj.get('zones', []) or not zone_filtered(obj, zone.filters):
                        current_zones.append(name)
                        obj['entered_zones'].add(name)

                    
            obj['zones'] = current_zones

        # maintain best objects
        for obj in self.tracked_objects.values():
            object_type = obj['label']
            # if the object wasn't seen on the current frame, skip it
            if obj['frame_time'] != self.current_frame_time or obj['false_positive']:
                continue
            obj_copy = copy.deepcopy(obj)
            if object_type in self.best_objects:
                current_best = self.best_objects[object_type]
                now = datetime.datetime.now().timestamp()
                # if the object is a higher score than the current best score 
                # or the current object is older than desired, use the new object
                if obj_copy['score'] > current_best['score'] or (now - current_best['frame_time']) > self.config.best_image_timeout:
                    obj_copy['frame'] = np.copy(current_frame)
                    self.best_objects[object_type] = obj_copy
                    for c in self.callbacks['snapshot']:
                        c(self.name, self.best_objects[object_type])
            else:
                obj_copy['frame'] = np.copy(current_frame)
                self.best_objects[object_type] = obj_copy
                for c in self.callbacks['snapshot']:
                    c(self.name, self.best_objects[object_type])
        
        # update overall camera state for each object type
        obj_counter = Counter()
        for obj in self.tracked_objects.values():
            if not obj['false_positive']:
                obj_counter[obj['label']] += 1
                
        # report on detected objects
        for obj_name, count in obj_counter.items():
            new_status = 'ON' if count > 0 else 'OFF'
            if new_status != self.object_status[obj_name]:
                self.object_status[obj_name] = new_status
                for c in self.callbacks['object_status']:
                    c(self.name, obj_name, new_status)

        # expire any objects that are ON and no longer detected
        expired_objects = [obj_name for obj_name, status in self.object_status.items() if status == 'ON' and not obj_name in obj_counter]
        for obj_name in expired_objects:
            self.object_status[obj_name] = 'OFF'
            for c in self.callbacks['object_status']:
                c(self.name, obj_name, 'OFF')
            for c in self.callbacks['snapshot']:
                c(self.name, self.best_objects[obj_name])
        
        with self.current_frame_lock:
            self._current_frame = current_frame
            if not self.previous_frame_id is None:
                self.frame_manager.delete(self.previous_frame_id)
            self.previous_frame_id = frame_id

class TrackedObjectProcessor(threading.Thread):
    def __init__(self, camera_config: Dict[str, CameraConfig], client, topic_prefix, tracked_objects_queue, event_queue, stop_event):
        threading.Thread.__init__(self)
        self.camera_config = camera_config
        self.client = client
        self.topic_prefix = topic_prefix
        self.tracked_objects_queue = tracked_objects_queue
        self.event_queue = event_queue
        self.stop_event = stop_event
        self.camera_states: Dict[str, CameraState] = {}
        self.frame_manager = SharedMemoryFrameManager()

        def start(camera, obj):
            # publish events to mqtt
            event_data = {
              'id': obj['id'],
              'label': obj['label'],
              'camera': camera,
              'start_time': obj['start_time'],
              'top_score': obj['top_score'],
              'false_positive': obj['false_positive'],
              'zones': list(obj['entered_zones'])
            }
            self.client.publish(f"{self.topic_prefix}/{camera}/events/start", json.dumps(event_data), retain=False)
            self.event_queue.put(('start', camera, obj))

        def update(camera, obj):
            pass

        def end(camera, obj):
            event_data = {
              'id': obj['id'],
              'label': obj['label'],
              'camera': camera,
              'start_time': obj['start_time'],
              'end_time': obj['end_time'],
              'top_score': obj['top_score'],
              'false_positive': obj['false_positive'],
              'zones': list(obj['entered_zones'])
            }
            self.client.publish(f"{self.topic_prefix}/{camera}/events/end", json.dumps(event_data), retain=False)
            self.event_queue.put(('end', camera, obj))
        
        def snapshot(camera, obj):
            if not 'frame' in obj:
                return
            
            best_frame = cv2.cvtColor(obj['frame'], cv2.COLOR_YUV2BGR_I420)
            if self.camera_config[camera].snapshots.draw_bounding_boxes:
                thickness = 2
                color = COLOR_MAP[obj['label']]
                box = obj['box']
                draw_box_with_label(best_frame, box[0], box[1], box[2], box[3], obj['label'], f"{int(obj['score']*100)}% {int(obj['area'])}", thickness=thickness, color=color)
                
            mqtt_config = self.camera_config[camera].mqtt
            if mqtt_config.crop_to_region:
                region = obj['region']
                best_frame = best_frame[region[1]:region[3], region[0]:region[2]]
            if mqtt_config.snapshot_height: 
                height = mqtt_config.snapshot_height
                width = int(height*best_frame.shape[1]/best_frame.shape[0])
                best_frame = cv2.resize(best_frame, dsize=(width, height), interpolation=cv2.INTER_AREA)
            
            if self.camera_config[camera].snapshots.show_timestamp:
                time_to_show = datetime.datetime.fromtimestamp(obj['frame_time']).strftime("%m/%d/%Y %H:%M:%S")
                size = cv2.getTextSize(time_to_show, cv2.FONT_HERSHEY_SIMPLEX, fontScale=1, thickness=2)
                text_width = size[0][0]
                text_height = size[0][1]
                desired_size = max(200, 0.33*best_frame.shape[1])
                font_scale = desired_size/text_width
                cv2.putText(best_frame, time_to_show, (5, best_frame.shape[0]-7), cv2.FONT_HERSHEY_SIMPLEX, fontScale=font_scale, color=(255, 255, 255), thickness=2)

            ret, jpg = cv2.imencode('.jpg', best_frame)
            if ret:
                jpg_bytes = jpg.tobytes()
                self.client.publish(f"{self.topic_prefix}/{camera}/{obj['label']}/snapshot", jpg_bytes, retain=True)
        
        def object_status(camera, object_name, status):
            self.client.publish(f"{self.topic_prefix}/{camera}/{object_name}", status, retain=False)

        for camera in self.camera_config.keys():
            camera_state = CameraState(camera, self.camera_config[camera], self.frame_manager)
            camera_state.on('start', start)
            camera_state.on('update', update)
            camera_state.on('end', end)
            camera_state.on('snapshot', snapshot)
            camera_state.on('object_status', object_status)
            self.camera_states[camera] = camera_state

        self.camera_data = defaultdict(lambda: {
            'best_objects': {},
            'object_status': defaultdict(lambda: defaultdict(lambda: 'OFF')),
            'tracked_objects': {},
            'current_frame': np.zeros((720,1280,3), np.uint8),
            'current_frame_time': 0.0,
            'object_id': None
        })
        # {
        #   'zone_name': {
        #       'person': ['camera_1', 'camera_2']
        #   }
        # }
        self.zone_data = defaultdict(lambda: defaultdict(lambda: set()))
        
    def get_best(self, camera, label):
        best_objects = self.camera_states[camera].best_objects
        if label in best_objects:
            return best_objects[label]
        else:
            return {}
    
    def get_current_frame(self, camera, draw=False):
        return self.camera_states[camera].get_current_frame(draw)

    def run(self):
        while True:
            if self.stop_event.is_set():
                print(f"Exiting object processor...")
                break

            try:
                camera, frame_time, current_tracked_objects = self.tracked_objects_queue.get(True, 10)
            except queue.Empty:
                continue

            camera_state = self.camera_states[camera]

            camera_state.update(frame_time, current_tracked_objects)

            # update zone status for each label
            for zone in camera_state.config.zones.keys():
                # get labels for current camera and all labels in current zone
                labels_for_camera = set([obj['label'] for obj in camera_state.tracked_objects.values() if zone in obj['zones'] and not obj['false_positive']])
                labels_to_check = labels_for_camera | set(self.zone_data[zone].keys())
                # for each label in zone
                for label in labels_to_check:
                    camera_list = self.zone_data[zone][label]
                    # remove or add the camera to the list for the current label
                    previous_state = len(camera_list) > 0
                    if label in labels_for_camera:
                        camera_list.add(camera_state.name)
                    elif camera_state.name in camera_list:
                        camera_list.remove(camera_state.name)
                    new_state = len(camera_list) > 0
                    # if the value is changing, send over MQTT
                    if previous_state == False and new_state == True:
                        self.client.publish(f"{self.topic_prefix}/{zone}/{label}", 'ON', retain=False)
                    elif previous_state == True and new_state == False:
                        self.client.publish(f"{self.topic_prefix}/{zone}/{label}", 'OFF', retain=False)
