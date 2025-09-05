import random
import string
from collections import defaultdict
from typing import Any

import numpy as np
from scipy.spatial import distance as dist

from frigate.config import DetectConfig
from frigate.track import ObjectTracker
from frigate.util.image import intersection_over_union


class CentroidTracker(ObjectTracker):
    def __init__(self, config: DetectConfig):
        self.tracked_objects: dict[str, dict[str, Any]] = {}
        self.untracked_object_boxes: list[tuple[int, int, int, int]] = []
        self.disappeared: dict[str, Any] = {}
        self.positions: dict[str, Any] = {}
        self.max_disappeared = config.max_disappeared
        self.detect_config = config

    def register(self, obj: dict[str, Any]) -> None:
        rand_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        id = f"{obj['frame_time']}-{rand_id}"
        obj["id"] = id
        obj["start_time"] = obj["frame_time"]
        obj["motionless_count"] = 0
        obj["position_changes"] = 0
        self.tracked_objects[id] = obj
        self.disappeared[id] = 0
        self.positions[id] = {
            "xmins": [],
            "ymins": [],
            "xmaxs": [],
            "ymaxs": [],
            "xmin": 0,
            "ymin": 0,
            "xmax": self.detect_config.width,
            "ymax": self.detect_config.height,
        }

    def deregister(self, id: str) -> None:
        del self.tracked_objects[id]
        del self.disappeared[id]

    # tracks the current position of the object based on the last N bounding boxes
    # returns False if the object has moved outside its previous position
    def update_position(self, id: str, box: tuple[int, int, int, int]) -> bool:
        position = self.positions[id]
        position_box = (
            position["xmin"],
            position["ymin"],
            position["xmax"],
            position["ymax"],
        )

        xmin, ymin, xmax, ymax = box

        iou = intersection_over_union(position_box, box)

        # if the iou drops below the threshold
        # assume the object has moved to a new position and reset the computed box
        if iou < 0.6:
            self.positions[id] = {
                "xmins": [xmin],
                "ymins": [ymin],
                "xmaxs": [xmax],
                "ymaxs": [ymax],
                "xmin": xmin,
                "ymin": ymin,
                "xmax": xmax,
                "ymax": ymax,
            }
            return False

        # if there are less than 10 entries for the position, add the bounding box
        # and recompute the position box
        if len(position["xmins"]) < 10:
            position["xmins"].append(xmin)
            position["ymins"].append(ymin)
            position["xmaxs"].append(xmax)
            position["ymaxs"].append(ymax)
            # by using percentiles here, we hopefully remove outliers
            position["xmin"] = np.percentile(position["xmins"], 15)
            position["ymin"] = np.percentile(position["ymins"], 15)
            position["xmax"] = np.percentile(position["xmaxs"], 85)
            position["ymax"] = np.percentile(position["ymaxs"], 85)

        return True

    def is_expired(self, id: str) -> bool:
        obj = self.tracked_objects[id]
        # get the max frames for this label type or the default
        max_frames = self.detect_config.stationary.max_frames.objects.get(
            obj["label"], self.detect_config.stationary.max_frames.default
        )

        # if there is no max_frames for this label type, continue
        if max_frames is None:
            return False

        # if the object has exceeded the max_frames setting, deregister
        if (
            obj["motionless_count"] - self.detect_config.stationary.threshold
            > max_frames
        ):
            return True

        return False

    def update(self, id: str, new_obj: dict[str, Any]) -> None:
        self.disappeared[id] = 0
        # update the motionless count if the object has not moved to a new position
        if self.update_position(id, new_obj["box"]):
            self.tracked_objects[id]["motionless_count"] += 1
            if self.is_expired(id):
                self.deregister(id)
                return
        else:
            # register the first position change and then only increment if
            # the object was previously stationary
            if (
                self.tracked_objects[id]["position_changes"] == 0
                or self.tracked_objects[id]["motionless_count"]
                >= self.detect_config.stationary.threshold
            ):
                self.tracked_objects[id]["position_changes"] += 1
            self.tracked_objects[id]["motionless_count"] = 0

        self.tracked_objects[id].update(new_obj)

    def update_frame_times(self, frame_name: str, frame_time: float) -> None:
        for id in list(self.tracked_objects.keys()):
            self.tracked_objects[id]["frame_time"] = frame_time
            self.tracked_objects[id]["motionless_count"] += 1
            if self.is_expired(id):
                self.deregister(id)

    def match_and_update(
        self,
        frame_name: str,
        frame_time: float,
        detections: list[tuple[Any, Any, Any, Any, Any, Any]],
    ) -> None:
        # group by name
        detection_groups = defaultdict(lambda: [])
        for det in detections:
            detection_groups[det[0]].append(
                {
                    "label": det[0],
                    "score": det[1],
                    "box": det[2],
                    "area": det[3],
                    "ratio": det[4],
                    "region": det[5],
                    "frame_time": frame_time,
                }
            )

        # update any tracked objects with labels that are not
        # seen in the current objects and deregister if needed
        for obj in list(self.tracked_objects.values()):
            if obj["label"] not in detection_groups:
                if self.disappeared[obj["id"]] >= self.max_disappeared:
                    self.deregister(obj["id"])
                else:
                    self.disappeared[obj["id"]] += 1

        if len(detections) == 0:
            return

        # track objects for each label type
        for label, group in detection_groups.items():
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
                    self.register(obj)
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
                    self.register(group[col])
