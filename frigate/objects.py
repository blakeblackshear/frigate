import time
import datetime
import threading
import cv2
import numpy as np
from . util import draw_box_with_label

class ObjectCleaner(threading.Thread):
    def __init__(self, objects_parsed, detected_objects):
        threading.Thread.__init__(self)
        self._objects_parsed = objects_parsed
        self._detected_objects = detected_objects

    def run(self):
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

                    label = "{}: {}% {}".format(name,int(obj['score']*100),int(obj['area']))
                    draw_box_with_label(best_frame, obj['xmin'], obj['ymin'], 
                        obj['xmax'], obj['ymax'], label)
                    
                    # print a timestamp
                    time_to_show = datetime.datetime.fromtimestamp(obj['frame_time']).strftime("%m/%d/%Y %H:%M:%S")
                    cv2.putText(best_frame, time_to_show, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, fontScale=.8, color=(255, 255, 255), thickness=2)
                    
                    self.best_frames[name] = cv2.cvtColor(best_frame, cv2.COLOR_RGB2BGR)