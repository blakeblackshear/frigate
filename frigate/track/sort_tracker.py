from collections import defaultdict
import random
import string

import numpy as np
from frigate.config import DetectConfig
from frigate.track import ObjectTracker
from frigate.util import intersection_over_union
from similari import Sort, BoundingBox, SpatioTemporalConstraints, PositionalMetricType


class SortTracker(ObjectTracker):
    def __init__(self, config: DetectConfig):
        self.tracked_objects = {}
        self.disappeared = {}
        self.positions = {}
        self.max_disappeared = config.max_disappeared
        self.detect_config = config
        self.track_id_map = {}
        self.scene_map = {}
        constraints = SpatioTemporalConstraints()
        constraints.add_constraints([(1, 1.0)])
        self.sort = Sort(
            shards=1,
            bbox_history=10,
            max_idle_epochs=config.max_disappeared,
            method=PositionalMetricType.iou(threshold=0.1),
            spatio_temporal_constraints=constraints,
        )

    def register(self, track_id, obj):
        rand_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        id = f"{obj['frame_time']}-{rand_id}"
        self.track_id_map[track_id] = id
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

    def deregister(self, id):
        del self.tracked_objects[id]
        del self.disappeared[id]

    # tracks the current position of the object based on the last N bounding boxes
    # returns False if the object has moved outside its previous position
    def update_position(self, id, box):
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

    def is_expired(self, id):
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

    def update(self, track_id, obj):
        id = self.track_id_map[track_id]
        self.disappeared[id] = 0
        # update the motionless count if the object has not moved to a new position
        if self.update_position(id, obj["box"]):
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

        self.tracked_objects[id].update(obj)

    def update_frame_times(self, frame_time):
        for id in list(self.tracked_objects.keys()):
            self.tracked_objects[id]["frame_time"] = frame_time
            self.tracked_objects[id]["motionless_count"] += 1
            if self.is_expired(id):
                self.deregister(id)

    def match_and_update(self, frame_time, detections):
        # create a dict to hold all the detections grouped by scene_id
        scene_detections = {s_id: [] for s_id in set(self.scene_map.values())}

        # populate objects for scene
        for obj in detections:
            # get the scene_id for this label or create a new one
            # TODO: consider grouping frequently swapped objects in
            #       in the same scene
            if not obj[0] in self.scene_map:
                scene_id = len(self.scene_map.keys())
                self.scene_map[obj[0]] = scene_id
                scene_detections[scene_id] = []
            else:
                scene_id = self.scene_map[obj[0]]

            # centroid is used for other things downstream
            centroid_x = int((obj[2][0] + obj[2][2]) / 2.0)
            centroid_y = int((obj[2][1] + obj[2][3]) / 2.0)

            scene_detections[scene_id].append(
                {
                    "label": obj[0],
                    "score": obj[1],
                    "box": obj[2],
                    "area": obj[3],
                    "ratio": obj[4],
                    "region": obj[5],
                    "frame_time": frame_time,
                    "centroid": (centroid_x, centroid_y),
                }
            )

        # loop over scenes
        for scene_id, objs in scene_detections.items():
            # convert objects to tracker objects
            boxes_to_predict = []
            for idx, obj in enumerate(objs):
                obj_box = obj["box"]
                box = BoundingBox(
                    obj_box[0],
                    obj_box[1],
                    obj_box[2] - obj_box[0],
                    obj_box[3] - obj_box[1],
                ).as_xyaah()
                custom_object_id = idx
                boxes_to_predict.append((box, custom_object_id))

            # run tracker prediction
            tracks = self.sort.predict_with_scene(scene_id, boxes_to_predict)

            # update or create new tracks
            for t in tracks:
                if not t.id in self.track_id_map:
                    self.register(t.id, objs[t.custom_object_id])
                else:
                    self.update(t.id, objs[t.custom_object_id])

            # clear expired tracks
            wasted = self.sort.wasted()
            for t in wasted:
                self.deregister(self.track_id_map[t.id])
                del self.track_id_map[t.id]
