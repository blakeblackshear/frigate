import time
import datetime
import threading
import cv2
import prctl
import itertools
import numpy as np
from collections import defaultdict
from scipy.spatial import distance as dist
from frigate.util import draw_box_with_label, LABELS, compute_intersection_rectangle, compute_intersection_over_union, calculate_region

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

            objects_removed = False
            for frame_time in detected_objects.keys():
                if now-frame_time>2:
                    del self._detected_objects[frame_time]
                    objects_removed = True

            if objects_removed:
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

            for raw_obj in objects:
                name = str(LABELS[raw_obj.label_id])

                if not name in self.camera.objects_to_track:
                    continue

                obj = {
                    'name': name,
                    'score': float(raw_obj.score),
                    'box': {
                        'xmin': int((raw_obj.bounding_box[0][0] * frame['size']) + frame['x_offset']),
                        'ymin': int((raw_obj.bounding_box[0][1] * frame['size']) + frame['y_offset']),
                        'xmax': int((raw_obj.bounding_box[1][0] * frame['size']) + frame['x_offset']),
                        'ymax': int((raw_obj.bounding_box[1][1] * frame['size']) + frame['y_offset'])
                    },
                    'region': {
                        'xmin': frame['x_offset'],
                        'ymin': frame['y_offset'],
                        'xmax': frame['x_offset']+frame['size'],
                        'ymax': frame['y_offset']+frame['size']
                    },
                    'frame_time': frame['frame_time'],
                    'region_id': frame['region_id']
                }
                
                # if the object is within 5 pixels of the region border, and the region is not on the edge
                # consider the object to be clipped
                obj['clipped'] = False
                if ((obj['region']['xmin'] > 5 and obj['box']['xmin']-obj['region']['xmin'] <= 5) or 
                    (obj['region']['ymin'] > 5 and obj['box']['ymin']-obj['region']['ymin'] <= 5) or
                    (self.camera.frame_shape[1]-obj['region']['xmax'] > 5 and obj['region']['xmax']-obj['box']['xmax'] <= 5) or
                    (self.camera.frame_shape[0]-obj['region']['ymax'] > 5 and obj['region']['ymax']-obj['box']['ymax'] <= 5)):
                    obj['clipped'] = True
                
                # Compute the area
                obj['area'] = (obj['box']['xmax']-obj['box']['xmin'])*(obj['box']['ymax']-obj['box']['ymin'])

                self.camera.detected_objects[frame['frame_time']].append(obj)
            
            with self.camera.regions_in_process_lock:
                self.camera.regions_in_process[frame['frame_time']] -= 1
                # print(f"{frame['frame_time']} remaining regions {self.camera.regions_in_process[frame['frame_time']]}")

                if self.camera.regions_in_process[frame['frame_time']] == 0:
                    del self.camera.regions_in_process[frame['frame_time']]
                    # print(f"{frame['frame_time']} no remaining regions")
                    self.camera.finished_frame_queue.put(frame['frame_time'])

# Thread that checks finished frames for clipped objects and sends back
# for processing if needed
class RegionRefiner(threading.Thread):
    def __init__(self, camera):
        threading.Thread.__init__(self)
        self.camera = camera

    def run(self):
        prctl.set_name(self.__class__.__name__)
        while True:
            frame_time = self.camera.finished_frame_queue.get()

            detected_objects = self.camera.detected_objects[frame_time].copy()
            # print(f"{frame_time} finished")

            detected_object_groups = defaultdict(lambda: [])
            # group by name
            for obj in detected_objects:
                detected_object_groups[obj['name']].append(obj)

            look_again = False
            selected_objects = []
            for group in detected_object_groups.values():

                # apply non-maxima suppression to suppress weak, overlapping bounding boxes
                boxes = [(o['box']['xmin'], o['box']['ymin'], o['box']['xmax']-o['box']['xmin'], o['box']['ymax']-o['box']['ymin'])
                    for o in group]
                confidences = [o['score'] for o in group]
                idxs = cv2.dnn.NMSBoxes(boxes, confidences, 0.5, 0.4)

                for index in idxs:
                    obj = group[index[0]]
                    selected_objects.append(obj)
                    if obj['clipped']:
                        box = obj['box']
                        # calculate a new region that will hopefully get the entire object
                        (size, x_offset, y_offset) = calculate_region(self.camera.frame_shape, 
                            box['xmin'], box['ymin'],
                            box['xmax'], box['ymax'])
                        # print(f"{frame_time} new region: {size} {x_offset} {y_offset}")

                        with self.camera.regions_in_process_lock:
                            if not frame_time in self.camera.regions_in_process:
                                self.camera.regions_in_process[frame_time] = 1
                            else:
                                self.camera.regions_in_process[frame_time] += 1

                        # add it to the queue
                        self.camera.resize_queue.put({
                            'camera_name': self.camera.name,
                            'frame_time': frame_time,
                            'region_id': -1,
                            'size': size,
                            'x_offset': x_offset,
                            'y_offset': y_offset
                        })
                        self.camera.dynamic_region_fps.update()
                        look_again = True

            # if we are looking again, then this frame is not ready for processing
            if look_again:
                # remove the clipped objects
                self.camera.detected_objects[frame_time] = [o for o in selected_objects if not o['clipped']]
                continue

            # filter objects based on camera settings
            selected_objects = [o for o in selected_objects if not self.filtered(o)]

            self.camera.detected_objects[frame_time] = selected_objects

            with self.camera.objects_parsed:
                self.camera.objects_parsed.notify_all()
            
            # print(f"{frame_time} is actually finished")

            # keep adding frames to the refined queue as long as they are finished
            with self.camera.regions_in_process_lock:
                while self.camera.frame_queue.qsize() > 0 and self.camera.frame_queue.queue[0] not in self.camera.regions_in_process:
                    self.camera.last_processed_frame = self.camera.frame_queue.get()
                    self.camera.refined_frame_queue.put(self.camera.last_processed_frame)

    def filtered(self, obj):
        object_name = obj['name']
        
        if object_name in self.camera.object_filters:
            obj_settings = self.camera.object_filters[object_name]

            # if the min area is larger than the
            # detected object, don't add it to detected objects
            if obj_settings.get('min_area',-1) > obj['area']:
                return True
            
            # if the detected object is larger than the
            # max area, don't add it to detected objects
            if obj_settings.get('max_area', self.camera.frame_shape[0]*self.camera.frame_shape[1]) < obj['area']:
                return True

            # if the score is lower than the threshold, skip
            if obj_settings.get('threshold', 0) > obj['score']:
                return True
        
            # compute the coordinates of the object and make sure
            # the location isnt outside the bounds of the image (can happen from rounding)
            y_location = min(int(obj['ymax']), len(self.camera.mask)-1)
            x_location = min(int((obj['xmax']-obj['xmin'])/2.0)+obj['xmin'], len(self.camera.mask[0])-1)

            # if the object is in a masked location, don't add it to detected objects
            if self.camera.mask[y_location][x_location] == [0]:
                return True
            
            return False
             
    def has_overlap(self, new_obj, obj, overlap=.7):
        # compute intersection rectangle with existing object and new objects region
        existing_obj_current_region = compute_intersection_rectangle(obj['box'], new_obj['region'])

        # compute intersection rectangle with new object and existing objects region
        new_obj_existing_region = compute_intersection_rectangle(new_obj['box'], obj['region'])

        # compute iou for the two intersection rectangles that were just computed
        iou = compute_intersection_over_union(existing_obj_current_region, new_obj_existing_region)

        # if intersection is greater than overlap
        if iou > overlap:
            return True
        else:
            return False
    
    def find_group(self, new_obj, groups):
        for index, group in enumerate(groups):
            for obj in group:
                if self.has_overlap(new_obj, obj):
                    return index
        return None

class ObjectTracker(threading.Thread):
    def __init__(self, camera, max_disappeared):
        threading.Thread.__init__(self)
        self.camera = camera
        self.tracked_objects = {}
        self.disappeared = {}
        self.max_disappeared = max_disappeared
    
    def run(self):
        prctl.set_name(self.__class__.__name__)
        while True:
            frame_time = self.camera.refined_frame_queue.get()
            self.match_and_update(self.camera.detected_objects[frame_time])
            self.camera.frame_tracked_queue.put(frame_time)

    def register(self, index, obj):
        id = f"{str(obj['frame_time'])}-{index}"
        self.tracked_objects[id] = obj
        self.disappeared[id] = 0

    def deregister(self, id):
        del self.disappeared[id]
        del self.tracked_objects[id]
    
    def update(self, id, new_obj):
        self.tracked_objects[id].update(new_obj)
        # TODO: am i missing anything? history?  

    def match_and_update(self, new_objects):
        # check to see if the list of input bounding box rectangles
        # is empty
        if len(new_objects) == 0:
            # loop over any existing tracked objects and mark them
            # as disappeared
            for objectID in list(self.disappeared.keys()):
                self.disappeared[objectID] += 1

                # if we have reached a maximum number of consecutive
                # frames where a given object has been marked as
                # missing, deregister it
                if self.disappeared[objectID] > self.max_disappeared:
                    self.deregister(objectID)

            # return early as there are no centroids or tracking info
            # to update
            return

        # compute centroids
        for obj in new_objects:
            centroid_x = int((obj['box']['xmin']+obj['box']['xmax']) / 2.0)
            centroid_y = int((obj['box']['ymin']+obj['box']['ymax']) / 2.0)
            obj['centroid'] = (centroid_x, centroid_y)

        if len(self.tracked_objects) == 0:
            for index, obj in enumerate(new_objects):
                self.register(index, obj)
            return
        
        new_centroids = np.array([o['centroid'] for o in new_objects])
        current_ids = list(self.tracked_objects.keys())
        current_centroids = np.array([o['centroid'] for o in self.tracked_objects.values()])

        # compute the distance between each pair of tracked
        # centroids and new centroids, respectively -- our
        # goal will be to match each new centroid to an existing
        # object centroid
        D = dist.cdist(current_centroids, new_centroids)

        # in order to perform this matching we must (1) find the
        # smallest value in each row and then (2) sort the row
        # indexes based on their minimum values so that the row
        # with the smallest value is at the *front* of the index
        # list
        rows = D.min(axis=1).argsort()

        # next, we perform a similar process on the columns by
        # finding the smallest value in each column and then
        # sorting using the previously computed row index list
        cols = D.argmin(axis=1)[rows]

        # in order to determine if we need to update, register,
        # or deregister an object we need to keep track of which
        # of the rows and column indexes we have already examined
        usedRows = set()
        usedCols = set()

        # loop over the combination of the (row, column) index
        # tuples
        for (row, col) in zip(rows, cols):
            # if we have already examined either the row or
            # column value before, ignore it
            # val
            if row in usedRows or col in usedCols:
                continue

            # otherwise, grab the object ID for the current row,
            # set its new centroid, and reset the disappeared
            # counter
            objectID = current_ids[row]
            self.update(objectID, new_objects[col])
            self.disappeared[objectID] = 0

            # indicate that we have examined each of the row and
            # column indexes, respectively
            usedRows.add(row)
            usedCols.add(col)

        # compute both the row and column index we have NOT yet
        # examined
        unusedRows = set(range(0, D.shape[0])).difference(usedRows)
        unusedCols = set(range(0, D.shape[1])).difference(usedCols)

        # in the event that the number of object centroids is
        # equal or greater than the number of input centroids
        # we need to check and see if some of these objects have
        # potentially disappeared
        if D.shape[0] >= D.shape[1]:
            # loop over the unused row indexes
            for row in unusedRows:
                # grab the object ID for the corresponding row
                # index and increment the disappeared counter
                objectID = current_ids[row]
                self.disappeared[objectID] += 1

                # check to see if the number of consecutive
                # frames the object has been marked "disappeared"
                # for warrants deregistering the object
                if self.disappeared[objectID] > self.max_disappeared:
                    self.deregister(objectID)

        # otherwise, if the number of input centroids is greater
        # than the number of existing object centroids we need to
        # register each new input centroid as a trackable object
        else:
            for col in unusedCols:
                self.register(col, new_objects[col])

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

            for obj in itertools.chain.from_iterable(detected_objects.values()):
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

                    draw_box_with_label(best_frame, obj['box']['xmin'], obj['box']['ymin'], 
                        obj['box']['xmax'], obj['box']['ymax'], obj['name'], f"{int(obj['score']*100)}% {obj['area']}")
                    
                    # print a timestamp
                    time_to_show = datetime.datetime.fromtimestamp(obj['frame_time']).strftime("%m/%d/%Y %H:%M:%S")
                    cv2.putText(best_frame, time_to_show, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, fontScale=.8, color=(255, 255, 255), thickness=2)
                    
                    self.best_frames[name] = best_frame