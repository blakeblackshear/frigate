import copy
import datetime
import hashlib
import itertools
import json
import logging
import os
import queue
import threading
import time
from collections import Counter, defaultdict
from statistics import mean, median
from typing import Callable, Dict

import cv2
import matplotlib.pyplot as plt
import numpy as np

from frigate.config import FrigateConfig, CameraConfig
from frigate.edgetpu import load_labels
from frigate.util import SharedMemoryFrameManager, draw_box_with_label

logger = logging.getLogger(__name__)

PATH_TO_LABELS = '/labelmap.txt'

LABELS = load_labels(PATH_TO_LABELS)
cmap = plt.cm.get_cmap('tab10', len(LABELS.keys()))

COLOR_MAP = {}
for key, val in LABELS.items():
    COLOR_MAP[val] = tuple(int(round(255 * c)) for c in cmap(key)[:3])

def on_edge(box, frame_shape):
    if (
        box[0] == 0 or
        box[1] == 0 or
        box[2] == frame_shape[1]-1 or
        box[3] == frame_shape[0]-1
    ):
        return True

def is_better_thumbnail(current_thumb, new_obj, frame_shape) -> bool:
    # larger is better
    # cutoff images are less ideal, but they should also be smaller?
    # better scores are obviously better too

    # if the new_thumb is on an edge, and the current thumb is not
    if on_edge(new_obj['box'], frame_shape) and not on_edge(current_thumb['box'], frame_shape):
        return False

    # if the score is better by more than 5%
    if new_obj['score'] > current_thumb['score']+.05:
        return True
    
    # if the area is 10% larger
    if new_obj['area'] > current_thumb['area']*1.1:
        return True
    
    return False

class TrackedObject():
    def __init__(self, camera, camera_config: CameraConfig, thumbnail_frames, obj_data):
        self.obj_data = obj_data
        self.camera = camera
        self.camera_config = camera_config
        self.thumbnail_frames = thumbnail_frames
        self.current_zones = []
        self.entered_zones = set()
        self.false_positive = True
        self.top_score = self.computed_score = 0.0
        self.thumbnail_data = {
            'frame_time': obj_data['frame_time'],
            'box': obj_data['box'],
            'area': obj_data['area'],
            'region': obj_data['region'],
            'score': obj_data['score']
        }
        self.frame = None
        self._snapshot_jpg_time = 0
        ret, jpg = cv2.imencode('.jpg', np.zeros((300,300,3), np.uint8))
        self._snapshot_jpg = jpg.tobytes()

        # start the score history
        self.score_history = [self.obj_data['score']]

    def _is_false_positive(self):
        # once a true positive, always a true positive
        if not self.false_positive:
            return False

        threshold = self.camera_config.objects.filters[self.obj_data['label']].threshold
        if self.computed_score < threshold:
            return True
        return False

    def compute_score(self):
        scores = self.score_history[:]
        # pad with zeros if you dont have at least 3 scores
        if len(scores) < 3:
            scores += [0.0]*(3 - len(scores))
        return median(scores)
    
    def update(self, current_frame_time, obj_data):
        self.obj_data.update(obj_data)
        # if the object is not in the current frame, add a 0.0 to the score history
        if self.obj_data['frame_time'] != current_frame_time:
            self.score_history.append(0.0)
        else:
            self.score_history.append(self.obj_data['score'])
        # only keep the last 10 scores
        if len(self.score_history) > 10:
            self.score_history = self.score_history[-10:]

        # calculate if this is a false positive
        self.computed_score = self.compute_score()
        if self.computed_score > self.top_score:
            self.top_score = self.computed_score
        self.false_positive = self._is_false_positive()

        # determine if this frame is a better thumbnail
        if is_better_thumbnail(self.thumbnail_data, self.obj_data, self.camera_config.frame_shape):
            self.thumbnail_data = {
                'frame_time': self.obj_data['frame_time'],
                'box': self.obj_data['box'],
                'area': self.obj_data['area'],
                'region': self.obj_data['region'],
                'score': self.obj_data['score']
            }
        
        # check zones
        current_zones = []
        bottom_center = (self.obj_data['centroid'][0], self.obj_data['box'][3])
        # check each zone
        for name, zone in self.camera_config.zones.items():
            contour = zone.contour
            # check if the object is in the zone
            if (cv2.pointPolygonTest(contour, bottom_center, False) >= 0):
                # if the object passed the filters once, dont apply again
                if name in self.current_zones or not zone_filtered(self, zone.filters):
                    current_zones.append(name)
                    self.entered_zones.add(name)
                
        self.current_zones = current_zones
    
    def to_dict(self):
        return {
            'id': self.obj_data['id'],
            'camera': self.camera,
            'frame_time': self.obj_data['frame_time'],
            'label': self.obj_data['label'],
            'top_score': self.top_score,
            'false_positive': self.false_positive,
            'start_time': self.obj_data['start_time'],
            'end_time': self.obj_data.get('end_time', None),
            'score': self.obj_data['score'],
            'box': self.obj_data['box'],
            'area': self.obj_data['area'],
            'region': self.obj_data['region'],
            'current_zones': self.current_zones.copy(),
            'entered_zones': list(self.entered_zones).copy()
        }
    
    @property
    def snapshot_jpg(self):
        if self._snapshot_jpg_time == self.thumbnail_data['frame_time']:
            return self._snapshot_jpg
        
        if not self.thumbnail_data['frame_time'] in self.thumbnail_frames:
            logger.error(f"Unable to create thumbnail for {self.obj_data['id']}")
            logger.error(f"Looking for frame_time of {self.thumbnail_data['frame_time']}")
            logger.error(f"Thumbnail frames: {','.join([str(k) for k in self.thumbnail_frames.keys()])}")
            return self._snapshot_jpg

        # TODO: crop first to avoid converting the entire frame?
        snapshot_config = self.camera_config.snapshots
        best_frame = cv2.cvtColor(self.thumbnail_frames[self.thumbnail_data['frame_time']], cv2.COLOR_YUV2BGR_I420)

        if snapshot_config.draw_bounding_boxes:
            thickness = 2
            color = COLOR_MAP[self.obj_data['label']]
            box = self.thumbnail_data['box']
            draw_box_with_label(best_frame, box[0], box[1], box[2], box[3], self.obj_data['label'], 
                f"{int(self.thumbnail_data['score']*100)}% {int(self.thumbnail_data['area'])}", thickness=thickness, color=color)
            
        if snapshot_config.crop_to_region:
            region = self.thumbnail_data['region']
            best_frame = best_frame[region[1]:region[3], region[0]:region[2]]

        if snapshot_config.height: 
            height = snapshot_config.height
            width = int(height*best_frame.shape[1]/best_frame.shape[0])
            best_frame = cv2.resize(best_frame, dsize=(width, height), interpolation=cv2.INTER_AREA)
        
        if snapshot_config.show_timestamp:
            time_to_show = datetime.datetime.fromtimestamp(self.thumbnail_data['frame_time']).strftime("%m/%d/%Y %H:%M:%S")
            size = cv2.getTextSize(time_to_show, cv2.FONT_HERSHEY_SIMPLEX, fontScale=1, thickness=2)
            text_width = size[0][0]
            desired_size = max(200, 0.33*best_frame.shape[1])
            font_scale = desired_size/text_width
            cv2.putText(best_frame, time_to_show, (5, best_frame.shape[0]-7), cv2.FONT_HERSHEY_SIMPLEX, 
                fontScale=font_scale, color=(255, 255, 255), thickness=2)

        ret, jpg = cv2.imencode('.jpg', best_frame)
        if ret:
            self._snapshot_jpg = jpg.tobytes()
        
        return self._snapshot_jpg

def zone_filtered(obj: TrackedObject, object_config):
    object_name = obj.obj_data['label']

    if object_name in object_config:
        obj_settings = object_config[object_name]

        # if the min area is larger than the
        # detected object, don't add it to detected objects
        if obj_settings.min_area > obj.obj_data['area']:
            return True
        
        # if the detected object is larger than the
        # max area, don't add it to detected objects
        if obj_settings.max_area < obj.obj_data['area']:
            return True

        # if the score is lower than the threshold, skip
        if obj_settings.threshold > obj.computed_score:
            return True
        
    return False

# Maintains the state of a camera
class CameraState():
    def __init__(self, name, config, frame_manager):
        self.name = name
        self.config = config
        self.camera_config = config.cameras[name]
        self.frame_manager = frame_manager
        self.best_objects: Dict[str, TrackedObject] = {}
        self.object_status = defaultdict(lambda: 'OFF')
        self.tracked_objects: Dict[str, TrackedObject] = {}
        self.thumbnail_frames = {}
        self.zone_objects = defaultdict(lambda: [])
        self._current_frame = np.zeros(self.camera_config.frame_shape_yuv, np.uint8)
        self.current_frame_lock = threading.Lock()
        self.current_frame_time = 0.0
        self.previous_frame_id = None
        self.callbacks = defaultdict(lambda: [])

    def get_current_frame(self, draw=False):
        with self.current_frame_lock:
            frame_copy = np.copy(self._current_frame)
            frame_time = self.current_frame_time
            tracked_objects = {k: v.to_dict() for k,v in self.tracked_objects.items()}
        
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
            
            if self.camera_config.snapshots.show_timestamp:
                time_to_show = datetime.datetime.fromtimestamp(frame_time).strftime("%m/%d/%Y %H:%M:%S")
                cv2.putText(frame_copy, time_to_show, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, fontScale=.8, color=(255, 255, 255), thickness=2)

            if self.camera_config.snapshots.draw_zones:
                for name, zone in self.camera_config.zones.items():
                    thickness = 8 if any([name in obj['current_zones'] for obj in tracked_objects.values()]) else 2
                    cv2.drawContours(frame_copy, [zone.contour], -1, zone.color, thickness)
        
        return frame_copy

    def on(self, event_type: str, callback: Callable[[Dict], None]):
        self.callbacks[event_type].append(callback)

    def update(self, frame_time, tracked_objects):
        self.current_frame_time = frame_time
        # get the new frame
        frame_id = f"{self.name}{frame_time}"
        current_frame = self.frame_manager.get(frame_id, self.camera_config.frame_shape_yuv)

        current_ids = tracked_objects.keys()
        previous_ids = self.tracked_objects.keys()
        removed_ids = list(set(previous_ids).difference(current_ids))
        new_ids = list(set(current_ids).difference(previous_ids))
        updated_ids = list(set(current_ids).intersection(previous_ids))

        for id in new_ids:
            new_obj = self.tracked_objects[id] = TrackedObject(self.name, self.camera_config, self.thumbnail_frames, tracked_objects[id])

            # call event handlers
            for c in self.callbacks['start']:
                c(self.name, new_obj)
        
        for id in updated_ids:
            updated_obj = self.tracked_objects[id]
            updated_obj.update(frame_time, tracked_objects[id])

            if (not updated_obj.false_positive 
                and updated_obj.thumbnail_data['frame_time'] == frame_time 
                and frame_time not in self.thumbnail_frames):
                self.thumbnail_frames[frame_time] = np.copy(current_frame)

            # call event handlers
            for c in self.callbacks['update']:
                c(self.name, updated_obj)
        
        for id in removed_ids:
            # publish events to mqtt
            removed_obj = self.tracked_objects[id]
            removed_obj.obj_data['end_time'] = frame_time
            for c in self.callbacks['end']:
                c(self.name, removed_obj)
            del self.tracked_objects[id]

        # TODO: can i switch to looking this up and only changing when an event ends?
        #       maybe make an api endpoint that pulls the thumbnail from the file system?
        # maintain best objects
        for obj in self.tracked_objects.values():
            object_type = obj.obj_data['label']
            # if the object's thumbnail is not from the current frame
            if obj.thumbnail_data['frame_time'] != self.current_frame_time or obj.false_positive:
                continue
            if object_type in self.best_objects:
                current_best = self.best_objects[object_type]
                now = datetime.datetime.now().timestamp()
                # if the object is a higher score than the current best score 
                # or the current object is older than desired, use the new object
                if (is_better_thumbnail(current_best.thumbnail_data, obj.thumbnail_data, self.camera_config.frame_shape) 
                    or (now - current_best.thumbnail_data['frame_time']) > self.camera_config.best_image_timeout):
                    self.best_objects[object_type] = obj
                    for c in self.callbacks['snapshot']:
                        c(self.name, self.best_objects[object_type])
            else:
                self.best_objects[object_type] = obj
                for c in self.callbacks['snapshot']:
                    c(self.name, self.best_objects[object_type])
        
        # update overall camera state for each object type
        obj_counter = Counter()
        for obj in self.tracked_objects.values():
            if not obj.false_positive:
                obj_counter[obj.obj_data['label']] += 1
                
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
        
        # cleanup thumbnail frame cache
        current_thumb_frames = set([obj.thumbnail_data['frame_time'] for obj in self.tracked_objects.values() if not obj.false_positive])
        current_best_frames = set(obj.thumbnail_data['frame_time'] for obj in self.best_objects.values())
        thumb_frames_to_delete = [t for t in self.thumbnail_frames.keys() if not t in current_thumb_frames and not t in current_best_frames]
        for t in thumb_frames_to_delete:
            del self.thumbnail_frames[t]
        
        with self.current_frame_lock:
            self._current_frame = current_frame
            if not self.previous_frame_id is None:
                self.frame_manager.delete(self.previous_frame_id)
            self.previous_frame_id = frame_id

class TrackedObjectProcessor(threading.Thread):
    def __init__(self, config: FrigateConfig, client, topic_prefix, tracked_objects_queue, event_queue, stop_event):
        threading.Thread.__init__(self)
        self.name = "detected_frames_processor"
        self.config = config
        self.client = client
        self.topic_prefix = topic_prefix
        self.tracked_objects_queue = tracked_objects_queue
        self.event_queue = event_queue
        self.stop_event = stop_event
        self.camera_states: Dict[str, CameraState] = {}
        self.frame_manager = SharedMemoryFrameManager()

        def start(camera, obj: TrackedObject):
            self.client.publish(f"{self.topic_prefix}/{camera}/events/start", json.dumps(obj.to_dict()), retain=False)
            self.event_queue.put(('start', camera, obj.to_dict()))

        def update(camera, obj: TrackedObject):
            pass

        def end(camera, obj: TrackedObject):
            self.client.publish(f"{self.topic_prefix}/{camera}/events/end", json.dumps(obj.to_dict()), retain=False)
            if self.config.cameras[camera].save_clips.enabled and not obj.false_positive:
                thumbnail_file_name = f"{camera}-{obj.obj_data['id']}.jpg"
                with open(os.path.join(self.config.save_clips.clips_dir, thumbnail_file_name), 'wb') as f:
                    f.write(obj.snapshot_jpg)
            self.event_queue.put(('end', camera, obj.to_dict()))
        
        def snapshot(camera, obj: TrackedObject):
            self.client.publish(f"{self.topic_prefix}/{camera}/{obj.obj_data['label']}/snapshot", obj.snapshot_jpg, retain=True)
        
        def object_status(camera, object_name, status):
            self.client.publish(f"{self.topic_prefix}/{camera}/{object_name}", status, retain=False)

        for camera in self.config.cameras.keys():
            camera_state = CameraState(camera, self.config, self.frame_manager)
            camera_state.on('start', start)
            camera_state.on('update', update)
            camera_state.on('end', end)
            camera_state.on('snapshot', snapshot)
            camera_state.on('object_status', object_status)
            self.camera_states[camera] = camera_state

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
                logger.info(f"Exiting object processor...")
                break

            try:
                camera, frame_time, current_tracked_objects = self.tracked_objects_queue.get(True, 10)
            except queue.Empty:
                continue

            camera_state = self.camera_states[camera]

            camera_state.update(frame_time, current_tracked_objects)

            # update zone status for each label
            for zone in self.config.cameras[camera].zones.keys():
                # get labels for current camera and all labels in current zone
                labels_for_camera = set([obj.obj_data['label'] for obj in camera_state.tracked_objects.values() if zone in obj.current_zones and not obj.false_positive])
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
