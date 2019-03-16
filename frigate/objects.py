import time
import datetime
import threading
import cv2
from object_detection.utils import visualization_utils as vis_util
class ObjectParser(threading.Thread):
    def __init__(self, object_queue, objects_parsed, detected_objects):
        threading.Thread.__init__(self)
        self._object_queue = object_queue
        self._objects_parsed = objects_parsed
        self._detected_objects = detected_objects

    def run(self):
        while True:
            obj = self._object_queue.get()
            self._detected_objects.append(obj)

            # notify that objects were parsed
            with self._objects_parsed:
                self._objects_parsed.notify_all()

class ObjectCleaner(threading.Thread):
    def __init__(self, objects_parsed, detected_objects, motion_changed, motion_regions):
        threading.Thread.__init__(self)
        self._objects_parsed = objects_parsed
        self._detected_objects = detected_objects
        self.motion_changed = motion_changed
        self.motion_regions = motion_regions

    def run(self):
        while True:

            # while there is motion
            while len([r for r in self.motion_regions if r.is_set()]) > 0:
                # wait a bit before checking for expired frames
                time.sleep(0.2)

                # expire the objects that are more than 1 second old
                now = datetime.datetime.now().timestamp()
                # look for the first object found within the last second
                # (newest objects are appended to the end)
                detected_objects = self._detected_objects.copy()
                num_to_delete = 0
                for obj in detected_objects:
                    if now-obj['frame_time']<1:
                        break
                    num_to_delete += 1
                if num_to_delete > 0:
                    del self._detected_objects[:num_to_delete]

                    # notify that parsed objects were changed
                    with self._objects_parsed:
                        self._objects_parsed.notify_all()

            # wait for the global motion flag to change
            with self.motion_changed:
                self.motion_changed.wait()

# Maintains the frame and person with the highest score from the most recent
# motion event
class BestPersonFrame(threading.Thread):
    def __init__(self, objects_parsed, recent_frames, detected_objects, motion_changed, motion_regions):
        threading.Thread.__init__(self)
        self.objects_parsed = objects_parsed
        self.recent_frames = recent_frames
        self.detected_objects = detected_objects
        self.motion_changed = motion_changed
        self.motion_regions = motion_regions
        self.best_person = None
        self.best_frame = None

    def run(self):
        motion_start = 0.0
        motion_end = 0.0

        while True:

             # while there is motion
            while len([r for r in self.motion_regions if r.is_set()]) > 0:
                # wait until objects have been parsed
                with self.objects_parsed:
                    self.objects_parsed.wait()

                # make a copy of detected objects
                detected_objects = self.detected_objects.copy()
                detected_people = [obj for obj in detected_objects if obj['name'] == 'person']
                # make a copy of the recent frames
                recent_frames = self.recent_frames.copy()

                # get the highest scoring person
                new_best_person = max(detected_people, key=lambda x:x['score'], default=self.best_person)

                # if there isnt a person, continue
                if new_best_person is None:
                    continue

                # if there is no current best_person
                if self.best_person is None:
                    self.best_person = new_best_person
                # if there is already a best_person
                else:
                    now = datetime.datetime.now().timestamp()
                    # if the new best person is a higher score than the current best person 
                    # or the current person is more than 1 minute old, use the new best person
                    if new_best_person['score'] > self.best_person['score'] or (now - self.best_person['frame_time']) > 60:
                        self.best_person = new_best_person

                if not self.best_person is None and self.best_person['frame_time'] in recent_frames:
                    best_frame = recent_frames[self.best_person['frame_time']]
                    best_frame = cv2.cvtColor(best_frame, cv2.COLOR_BGR2RGB)
                    # draw the bounding box on the frame
                    vis_util.draw_bounding_box_on_image_array(best_frame,
                        self.best_person['ymin'],
                        self.best_person['xmin'],
                        self.best_person['ymax'],
                        self.best_person['xmax'],
                        color='red',
                        thickness=2,
                        display_str_list=["{}: {}%".format(self.best_person['name'],int(self.best_person['score']*100))],
                        use_normalized_coordinates=False)

                    # convert back to BGR
                    self.best_frame = cv2.cvtColor(best_frame, cv2.COLOR_RGB2BGR)

            motion_end = datetime.datetime.now().timestamp()

            # wait for the global motion flag to change
            with self.motion_changed:
                self.motion_changed.wait()
            
            motion_start = datetime.datetime.now().timestamp()