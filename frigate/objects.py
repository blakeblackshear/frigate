import time
import datetime
import threading
import cv2
import prctl
import numpy as np
from . util import draw_box_with_label, LABELS

class ObjectCleaner(threading.Thread):
    def __init__(self, objects_parsed, detected_objects):
        threading.Thread.__init__(self)
        self._objects_parsed = objects_parsed
        self._detected_objects = detected_objects

    def run(self):
        prctl.set_name("ObjectCleaner")
        while True:

            # wait a bit before checking for expired frames
            time.sleep(0.2)

            # expire the objects that are more than 1 second old
            now = datetime.datetime.now().timestamp()
            # look for the first object found within the last second
            # (newest objects are appended to the end)
            detected_objects = self._detected_objects.copy()

            num_to_delete = 0
            for obj in detected_objects:
                if now-obj['frame_time']<2:
                    break
                num_to_delete += 1
            if num_to_delete > 0:
                del self._detected_objects[:num_to_delete]

                # notify that parsed objects were changed
                with self._objects_parsed:
                    self._objects_parsed.notify_all()

class DetectedObjectsProcessor(threading.Thread):
    def __init__(self, camera):
        threading.Thread.__init__(self)
        self.camera = camera

    def run(self):
        prctl.set_name(self.__class__.__name__)
        while True:
            frame = self.camera.detected_objects_queue.get()

            objects = frame['detected_objects']

            if len(objects) == 0:
                return

            for raw_obj in objects:
                obj = {
                    'score': float(raw_obj.score),
                    'box': raw_obj.bounding_box.flatten().tolist(),
                    'name': str(LABELS[raw_obj.label_id]),
                    'frame_time': frame['frame_time'],
                    'region_id': frame['region_id']
                }

                # find the matching region
                region = self.camera.regions[frame['region_id']]

                # Compute some extra properties
                obj.update({
                    'xmin': int((obj['box'][0] * frame['size']) + frame['x_offset']),
                    'ymin': int((obj['box'][1] * frame['size']) + frame['y_offset']),
                    'xmax': int((obj['box'][2] * frame['size']) + frame['x_offset']),
                    'ymax': int((obj['box'][3] * frame['size']) + frame['y_offset'])
                })
                
                # Compute the area
                obj['area'] = (obj['xmax']-obj['xmin'])*(obj['ymax']-obj['ymin'])

                object_name = obj['name']

                if object_name in region['objects']:
                    obj_settings = region['objects'][object_name]

                    # if the min area is larger than the
                    # detected object, don't add it to detected objects
                    if obj_settings.get('min_area',-1) > obj['area']:
                        continue
                    
                    # if the detected object is larger than the
                    # max area, don't add it to detected objects
                    if obj_settings.get('max_area', region['size']**2) < obj['area']:
                        continue

                    # if the score is lower than the threshold, skip
                    if obj_settings.get('threshold', 0) > obj['score']:
                        continue
                
                    # compute the coordinates of the object and make sure
                    # the location isnt outside the bounds of the image (can happen from rounding)
                    y_location = min(int(obj['ymax']), len(self.mask)-1)
                    x_location = min(int((obj['xmax']-obj['xmin'])/2.0)+obj['xmin'], len(self.mask[0])-1)

                    # if the object is in a masked location, don't add it to detected objects
                    if self.camera.mask[y_location][x_location] == [0]:
                        continue
                
                # look to see if the bounding box is too close to the region border and the region border is not the edge of the frame
                # if ((frame['x_offset'] > 0 and obj['box'][0] < 0.01) or 
                #     (frame['y_offset'] > 0 and obj['box'][1] < 0.01) or
                #     (frame['x_offset']+frame['size'] < self.frame_shape[1] and obj['box'][2] > 0.99) or
                #     (frame['y_offset']+frame['size'] < self.frame_shape[0] and obj['box'][3] > 0.99)):

                #     size, x_offset, y_offset = calculate_region(self.frame_shape, obj['xmin'], obj['ymin'], obj['xmax'], obj['ymax'])
                    # This triggers WAY too often with stationary objects on the edge of a region. 
                    # Every frame triggers it and fills the queue...
                    # I need to create a new region and add it to the list of regions, but 
                    # it needs to check for a duplicate region first.

                    # self.resize_queue.put({
                    #     'camera_name': self.name,
                    #     'frame_time': frame['frame_time'],
                    #     'region_id': frame['region_id'],
                    #     'size': size,
                    #     'x_offset': x_offset,
                    #     'y_offset': y_offset
                    # })
                    # print('object too close to region border')
                    #continue

                self.camera.detected_objects.append(obj)

            with self.camera.objects_parsed:
                self.camera.objects_parsed.notify_all()


# Maintains the frame and object with the highest score
class BestFrames(threading.Thread):
    def __init__(self, objects_parsed, recent_frames, detected_objects):
        threading.Thread.__init__(self)
        self.objects_parsed = objects_parsed
        self.recent_frames = recent_frames
        self.detected_objects = detected_objects
        self.best_objects = {}
        self.best_frames = {}

    def run(self):
        prctl.set_name("BestFrames")
        while True:

            # wait until objects have been parsed
            with self.objects_parsed:
                self.objects_parsed.wait()

            # make a copy of detected objects
            detected_objects = self.detected_objects.copy()

            for obj in detected_objects:
                if obj['name'] in self.best_objects:
                    now = datetime.datetime.now().timestamp()
                    # if the object is a higher score than the current best score 
                    # or the current object is more than 1 minute old, use the new object
                    if obj['score'] > self.best_objects[obj['name']]['score'] or (now - self.best_objects[obj['name']]['frame_time']) > 60:
                        self.best_objects[obj['name']] = obj
                else:
                    self.best_objects[obj['name']] = obj
            
            # make a copy of the recent frames
            recent_frames = self.recent_frames.copy()

            for name, obj in self.best_objects.items():
                if obj['frame_time'] in recent_frames:
                    best_frame = recent_frames[obj['frame_time']] #, np.zeros((720,1280,3), np.uint8))

                    draw_box_with_label(best_frame, obj['xmin'], obj['ymin'], 
                        obj['xmax'], obj['ymax'], obj['name'], obj['score'], obj['area'])
                    
                    # print a timestamp
                    time_to_show = datetime.datetime.fromtimestamp(obj['frame_time']).strftime("%m/%d/%Y %H:%M:%S")
                    cv2.putText(best_frame, time_to_show, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, fontScale=.8, color=(255, 255, 255), thickness=2)
                    
                    self.best_frames[name] = best_frame