import copy
import datetime
import itertools
import multiprocessing as mp
import random
import string
import threading
import time
from collections import defaultdict

import cv2
import numpy as np
from scipy.spatial import distance as dist

from frigate.config import DetectConfig
from frigate.util import draw_box_with_label


class ObjectTracker:
    def __init__(self, config: DetectConfig):
        self.tracked_objects = {}
        self.disappeared = {}
        self.max_disappeared = config.max_disappeared

    def register(self, index, obj):
        rand_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        id = f"{obj['frame_time']}-{rand_id}"
        obj["id"] = id
        obj["start_time"] = obj["frame_time"]
        self.tracked_objects[id] = obj
        self.disappeared[id] = 0

    def deregister(self, id):
        del self.tracked_objects[id]
        del self.disappeared[id]

    def update(self, id, new_obj):
        self.disappeared[id] = 0
        self.tracked_objects[id].update(new_obj)

    def match_and_update(self, frame_time, new_objects):
        # group by name
        new_object_groups = defaultdict(lambda: [])
        for obj in new_objects:
            new_object_groups[obj[0]].append(
                {
                    "label": obj[0],
                    "score": obj[1],
                    "box": obj[2],
                    "area": obj[3],
                    "region": obj[4],
                    "frame_time": frame_time,
                }
            )

        # update any tracked objects with labels that are not
        # seen in the current objects and deregister if needed
        for obj in list(self.tracked_objects.values()):
            if not obj["label"] in new_object_groups:
                if self.disappeared[obj["id"]] >= self.max_disappeared:
                    self.deregister(obj["id"])
                else:
                    self.disappeared[obj["id"]] += 1

        if len(new_objects) == 0:
            return

        # track objects for each label type
        for label, group in new_object_groups.items():
            current_objects = [
                o for o in self.tracked_objects.values() if o["label"] == label
            ]
            current_ids = [o["id"] for o in current_objects]
            current_centroids = np.array([o["centroid"] for o in current_objects])

            # compute centroids of new objects
            for obj in group:
                centroid_x = int((obj["box"][0] + obj["box"][2]) / 2.0)
                centroid_y = int((obj["box"][1] + obj["box"][3]) / 2.0)
                obj["centroid"] = (centroid_x, centroid_y)

            if len(current_objects) == 0:
                for index, obj in enumerate(group):
                    self.register(index, obj)
                continue

            new_centroids = np.array([o["centroid"] for o in group])

            # compute the distance between each pair of tracked
            # centroids and new centroids, respectively -- our
            # goal will be to match each current centroid to a new
            # object centroid
            D = dist.cdist(current_centroids, new_centroids)

            # in order to perform this matching we must (1) find the smallest
            # value in each row (i.e. the distance from each current object to
            # the closest new object) and then (2) sort the row indexes based
            # on their minimum values so that the row with the smallest
            # distance (the best match) is at the *front* of the index list
            rows = D.min(axis=1).argsort()

            # next, we determine which new object each existing object matched
            # against, and apply the same sorting as was applied previously
            cols = D.argmin(axis=1)[rows]

            # many current objects may register with each new object, so only
            # match the closest ones.  unique returns the indices of the first
            # occurrences of each value, and because the rows are sorted by
            # distance, this will be index of the closest match
            _, index = np.unique(cols, return_index=True)
            rows = rows[index]
            cols = cols[index]

            # loop over the combination of the (row, column) index tuples
            for row, col in zip(rows, cols):
                # grab the object ID for the current row, set its new centroid,
                # and reset the disappeared counter
                objectID = current_ids[row]
                self.update(objectID, group[col])

            # compute the row and column indices we have NOT yet examined
            unusedRows = set(range(D.shape[0])).difference(rows)
            unusedCols = set(range(D.shape[1])).difference(cols)

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
