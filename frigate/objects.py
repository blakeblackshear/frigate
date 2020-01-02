import time
import datetime
import threading
import cv2
import prctl
import itertools
import numpy as np
from scipy.spatial import distance as dist
from . util import draw_box_with_label, LABELS, compute_intersection_rectangle, compute_intersection_over_union, calculate_region

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

            # print(f"Processing objects for: {frame['size']} {frame['x_offset']} {frame['y_offset']}")

            # if len(objects) == 0:
            #     continue

            for raw_obj in objects:
                obj = {
                    'name': str(LABELS[raw_obj.label_id]),
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

                if not obj['name'] == 'bicycle':
                    continue
                
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

                # find the matching region
                # region = self.camera.regions[frame['region_id']]
                

                # object_name = obj['name']
                # TODO: move all this to wherever we manage "tracked objects"
                # if object_name in region['objects']:
                #     obj_settings = region['objects'][object_name]

                #     # if the min area is larger than the
                #     # detected object, don't add it to detected objects
                #     if obj_settings.get('min_area',-1) > obj['area']:
                #         continue
                    
                #     # if the detected object is larger than the
                #     # max area, don't add it to detected objects
                #     if obj_settings.get('max_area', region['size']**2) < obj['area']:
                #         continue

                #     # if the score is lower than the threshold, skip
                #     if obj_settings.get('threshold', 0) > obj['score']:
                #         continue
                
                #     # compute the coordinates of the object and make sure
                #     # the location isnt outside the bounds of the image (can happen from rounding)
                #     y_location = min(int(obj['ymax']), len(self.mask)-1)
                #     x_location = min(int((obj['xmax']-obj['xmin'])/2.0)+obj['xmin'], len(self.mask[0])-1)

                #     # if the object is in a masked location, don't add it to detected objects
                #     if self.camera.mask[y_location][x_location] == [0]:
                #         continue

                self.camera.detected_objects[frame['frame_time']].append(obj)
            
            with self.camera.regions_in_process_lock:
                self.camera.regions_in_process[frame['frame_time']] -= 1
                # print(f"{frame['frame_time']} remaining regions {self.camera.regions_in_process[frame['frame_time']]}")

                if self.camera.regions_in_process[frame['frame_time']] == 0:
                    del self.camera.regions_in_process[frame['frame_time']]
                    # print(f"{frame['frame_time']} no remaining regions")
                    self.camera.finished_frame_queue.put(frame['frame_time'])

            with self.camera.objects_parsed:
                self.camera.objects_parsed.notify_all()

# Thread that checks finished frames for clipped objects and sends back
# for processing if needed
class RegionRefiner(threading.Thread):
    def __init__(self, camera):
        threading.Thread.__init__(self)
        self.camera = camera

    def run(self):
        prctl.set_name(self.__class__.__name__)
        while True:
            # TODO: I need to process the frames in order for tracking...
            frame_time = self.camera.finished_frame_queue.get()

            # print(f"{frame_time} finished")

            object_groups = []

            # group all the duplicate objects together
            # TODO: should I be grouping by object type too? also, the order can determine how well they group...
            for new_obj in self.camera.detected_objects[frame_time]:
                matching_group = self.find_group(new_obj, object_groups)
                if matching_group is None:
                    object_groups.append([new_obj])
                else:
                    object_groups[matching_group].append(new_obj)
            
            # just keep the unclipped objects
            self.camera.detected_objects[frame_time] = [obj for obj in self.camera.detected_objects[frame_time] if obj['clipped'] == False]

            # print(f"{frame_time} found {len(object_groups)} groups")
            clipped_object = False
            # find the largest unclipped object in each group
            for group in object_groups:
                unclipped_objects = [obj for obj in group if obj['clipped'] == False]
                # if no unclipped objects, we need to look again
                if len(unclipped_objects) == 0:
                    # print(f"{frame_time} no unclipped objects in group")
                    with self.camera.regions_in_process_lock:
                        if not frame_time in self.camera.regions_in_process:
                            self.camera.regions_in_process[frame_time] = 1
                        else:
                            self.camera.regions_in_process[frame_time] += 1
                    xmin = min([obj['box']['xmin'] for obj in group])
                    ymin = min([obj['box']['ymin'] for obj in group])
                    xmax = max([obj['box']['xmax'] for obj in group])
                    ymax = max([obj['box']['ymax'] for obj in group])
                    # calculate a new region that will hopefully get the entire object
                    (size, x_offset, y_offset) = calculate_region(self.camera.frame_shape, 
                        xmin, ymin,
                        xmax, ymax)
                    # print(f"{frame_time} new region: {size} {x_offset} {y_offset}")

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
                    clipped_object = True

            # if we found a clipped object, then this frame is not ready for processing
            if clipped_object:
                continue

            # dedupe the unclipped objects
            deduped_objects = []
            for obj in self.camera.detected_objects[frame_time]:
                duplicate = None
                for index, deduped_obj in enumerate(deduped_objects):
                    # if the IOU is more than 0.7, consider it a duplicate
                    if self.has_overlap(obj, deduped_obj, .5):
                        duplicate = index
                        break
                
                # get the higher scoring object
                if duplicate is None:
                    deduped_objects.append(obj)
                else:
                    if deduped_objects[duplicate]['score'] < obj['score']:
                        deduped_objects[duplicate] = obj
            self.camera.detected_objects[frame_time] = deduped_objects
            
            # print(f"{frame_time} is actually finished")

            # keep adding frames to the refined queue as long as they are finished
            with self.camera.regions_in_process_lock:
                while self.camera.frame_queue.qsize() > 0 and self.camera.frame_queue.queue[0] not in self.camera.regions_in_process:
                    self.camera.refined_frame_queue.put(self.camera.frame_queue.get())
             
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
            # TODO: track objects
            frame_time = self.camera.refined_frame_queue.get()
            f = open(f"/debug/{str(frame_time)}.jpg", 'wb')
            f.write(self.camera.frame_with_objects(frame_time))
            f.close()


    def register(self, index, obj):
        id = f"{str(obj.frame_time)}-{index}"
        self.tracked_objects[id] = obj
        self.disappeared[id] = 0

    def deregister(self, id):
        del self.disappeared[id]
        del self.tracked_objects[id]
    
    def update(self, id, new_obj):
        new_obj.detections = self.tracked_objects[id].detections
        new_obj.detections.append({

        })

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
            obj.centroid = (centroid_x, centroid_y)

        if len(self.tracked_objects) == 0:
            for index, obj in enumerate(new_objects):
                self.register(index, obj)
            return
        
        new_centroids = np.array([o.centroid for o in new_objects])
        current_ids = list(self.tracked_objects.keys())
        current_centroids = np.array([o.centroid for o in self.tracked_objects])

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


        # -------------

        # # initialize an array of input centroids for the current frame
        # inputCentroids = np.zeros((len(rects), 2), dtype="int")

        # # loop over the bounding box rectangles
        # for (i, (startX, startY, endX, endY)) in enumerate(rects):
        #     # use the bounding box coordinates to derive the centroid
        #     cX = int((startX + endX) / 2.0)
        #     cY = int((startY + endY) / 2.0)
        #     inputCentroids[i] = (cX, cY)

        # # if we are currently not tracking any objects take the input
        # # centroids and register each of them
        # if len(self.objects) == 0:
        #     for i in range(0, len(inputCentroids)):
        #         self.register(inputCentroids[i])
        # # otherwise, are are currently tracking objects so we need to
        # # try to match the input centroids to existing object
        # # centroids
        # else:
        #     # grab the set of object IDs and corresponding centroids
        #     objectIDs = list(self.objects.keys())
        #     objectCentroids = list(self.objects.values())

        #     # compute the distance between each pair of object
        #     # centroids and input centroids, respectively -- our
        #     # goal will be to match an input centroid to an existing
        #     # object centroid
        #     D = dist.cdist(np.array(objectCentroids), inputCentroids)

        #     # in order to perform this matching we must (1) find the
        #     # smallest value in each row and then (2) sort the row
        #     # indexes based on their minimum values so that the row
        #     # with the smallest value is at the *front* of the index
        #     # list
        #     rows = D.min(axis=1).argsort()

        #     # next, we perform a similar process on the columns by
        #     # finding the smallest value in each column and then
        #     # sorting using the previously computed row index list
        #     cols = D.argmin(axis=1)[rows]

        #     # in order to determine if we need to update, register,
        #     # or deregister an object we need to keep track of which
        #     # of the rows and column indexes we have already examined
        #     usedRows = set()
        #     usedCols = set()

        #     # loop over the combination of the (row, column) index
        #     # tuples
        #     for (row, col) in zip(rows, cols):
        #         # if we have already examined either the row or
        #         # column value before, ignore it
        #         # val
        #         if row in usedRows or col in usedCols:
        #             continue

        #         # otherwise, grab the object ID for the current row,
        #         # set its new centroid, and reset the disappeared
        #         # counter
        #         objectID = objectIDs[row]
        #         self.objects[objectID] = inputCentroids[col]
        #         self.disappeared[objectID] = 0

        #         # indicate that we have examined each of the row and
        #         # column indexes, respectively
        #         usedRows.add(row)
        #         usedCols.add(col)

        #     # compute both the row and column index we have NOT yet
        #     # examined
        #     unusedRows = set(range(0, D.shape[0])).difference(usedRows)
        #     unusedCols = set(range(0, D.shape[1])).difference(usedCols)

        #     # in the event that the number of object centroids is
        #     # equal or greater than the number of input centroids
        #     # we need to check and see if some of these objects have
        #     # potentially disappeared
        #     if D.shape[0] >= D.shape[1]:
        #         # loop over the unused row indexes
        #         for row in unusedRows:
        #             # grab the object ID for the corresponding row
        #             # index and increment the disappeared counter
        #             objectID = objectIDs[row]
        #             self.disappeared[objectID] += 1

        #             # check to see if the number of consecutive
        #             # frames the object has been marked "disappeared"
        #             # for warrants deregistering the object
        #             if self.disappeared[objectID] > self.maxDisappeared:
        #                 self.deregister(objectID)

        #     # otherwise, if the number of input centroids is greater
        #     # than the number of existing object centroids we need to
        #     # register each new input centroid as a trackable object
        #     else:
        #         for col in unusedCols:
        #             self.register(inputCentroids[col])

        # # return the set of trackable objects
        # return self.objects

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