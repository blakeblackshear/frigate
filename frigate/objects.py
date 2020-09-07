import time
import datetime
import threading
import cv2
import itertools
import copy
import numpy as np
import random
import string
import multiprocessing as mp
from collections import defaultdict
from scipy.spatial import distance as dist
from frigate.util import draw_box_with_label, calculate_region

class ObjectTracker():
    def __init__(self, max_disappeared):
        self.tracked_objects = {}
        self.disappeared = {}
        self.max_disappeared = max_disappeared

    def register(self, index, obj):
        rand_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        id = f"{obj['frame_time']}-{rand_id}"
        obj['id'] = id
        obj['start_time'] = obj['frame_time']
        obj['top_score'] = obj['score']
        self.tracked_objects[id] = obj
        self.disappeared[id] = 0

    def deregister(self, id):
        del self.tracked_objects[id]
        del self.disappeared[id]
    
    def update(self, id, new_obj):
        self.disappeared[id] = 0
        self.tracked_objects[id].update(new_obj)
        if self.tracked_objects[id]['score'] > self.tracked_objects[id]['top_score']:
            self.tracked_objects[id]['top_score'] = self.tracked_objects[id]['score']

    def match_and_update(self, frame_time, new_objects):
        # group by name
        new_object_groups = defaultdict(lambda: [])
        for obj in new_objects:
            new_object_groups[obj[0]].append({
                'label': obj[0],
                'score': obj[1],
                'box': obj[2],
                'area': obj[3],
                'region': obj[4],
                'frame_time': frame_time
            })
        
        # update any tracked objects with labels that are not
        # seen in the current objects and deregister if needed
        for obj in list(self.tracked_objects.values()):
            if not obj['label'] in new_object_groups:
                if self.disappeared[obj['id']] >= self.max_disappeared:
                    self.deregister(obj['id'])
                else:
                    self.disappeared[obj['id']] += 1
        
        if len(new_objects) == 0:
            return
        
        # track objects for each label type
        for label, group in new_object_groups.items():
            current_objects = [o for o in self.tracked_objects.values() if o['label'] == label]
            current_ids = [o['id'] for o in current_objects]
            current_centroids = np.array([o['centroid'] for o in current_objects])

            # compute centroids of new objects
            for obj in group:
                centroid_x = int((obj['box'][0]+obj['box'][2]) / 2.0)
                centroid_y = int((obj['box'][1]+obj['box'][3]) / 2.0)
                obj['centroid'] = (centroid_x, centroid_y)

            if len(current_objects) == 0:
                for index, obj in enumerate(group):
                    self.register(index, obj)
                return
            
            new_centroids = np.array([o['centroid'] for o in group])

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
                if row in usedRows or col in usedCols:
                    continue

                # otherwise, grab the object ID for the current row,
                # set its new centroid, and reset the disappeared
                # counter
                objectID = current_ids[row]
                self.update(objectID, group[col])

                # indicate that we have examined each of the row and
                # column indexes, respectively
                usedRows.add(row)
                usedCols.add(col)

            # compute the column index we have NOT yet examined
            unusedRows = set(range(0, D.shape[0])).difference(usedRows)
            unusedCols = set(range(0, D.shape[1])).difference(usedCols)

            # in the event that the number of object centroids is
			# equal or greater than the number of input centroids
			# we need to check and see if some of these objects have
			# potentially disappeared
            if D.shape[0] >= D.shape[1]:
                for row in unusedRows:
                    id = current_ids[row]

                    if self.disappeared[id] >= self.max_disappeared:
                        self.deregister(id)
                    else:
                        self.disappeared[id] += 1
            # if the number of input centroids is greater
            # than the number of existing object centroids we need to
            # register each new input centroid as a trackable object
            else:
                for col in unusedCols:
                    self.register(col, group[col])
