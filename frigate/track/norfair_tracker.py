import logging
import random
import string

import numpy as np
from norfair import (
    Detection,
    Drawable,
    OptimizedKalmanFilterFactory,
    Tracker,
    draw_boxes,
)
from norfair.drawing.drawer import Drawer

from frigate.config import CameraConfig
from frigate.ptz.autotrack import PtzMotionEstimator
from frigate.track import ObjectTracker
from frigate.types import PTZMetricsTypes
from frigate.util.image import intersection_over_union
from frigate.util.object import average_boxes, median_of_boxes

logger = logging.getLogger(__name__)


THRESHOLD_ACTIVE_IOU = 0.2
THRESHOLD_STATIONARY_IOU = 0.6
MAX_STATIONARY_HISTORY = 10


# Normalizes distance from estimate relative to object size
# Other ideas:
# - if estimates are inaccurate for first N detections, compare with last_detection (may be fine)
# - could be variable based on time since last_detection
# - include estimated velocity in the distance (car driving by of a parked car)
# - include some visual similarity factor in the distance for occlusions
def distance(detection: np.array, estimate: np.array) -> float:
    # ultimately, this should try and estimate distance in 3-dimensional space
    # consider change in location, width, and height

    estimate_dim = np.diff(estimate, axis=0).flatten()
    detection_dim = np.diff(detection, axis=0).flatten()

    # get bottom center positions
    detection_position = np.array(
        [np.average(detection[:, 0]), np.max(detection[:, 1])]
    )
    estimate_position = np.array([np.average(estimate[:, 0]), np.max(estimate[:, 1])])

    distance = (detection_position - estimate_position).astype(float)
    # change in x relative to w
    distance[0] /= estimate_dim[0]
    # change in y relative to h
    distance[1] /= estimate_dim[1]

    # get ratio of widths and heights
    # normalize to 1
    widths = np.sort([estimate_dim[0], detection_dim[0]])
    heights = np.sort([estimate_dim[1], detection_dim[1]])
    width_ratio = widths[1] / widths[0] - 1.0
    height_ratio = heights[1] / heights[0] - 1.0

    # change vector is relative x,y change and w,h ratio
    change = np.append(distance, np.array([width_ratio, height_ratio]))

    # calculate euclidean distance of the change vector
    return np.linalg.norm(change)


def frigate_distance(detection: Detection, tracked_object) -> float:
    return distance(detection.points, tracked_object.estimate)


class NorfairTracker(ObjectTracker):
    def __init__(
        self,
        config: CameraConfig,
        ptz_metrics: PTZMetricsTypes,
    ):
        self.tracked_objects = {}
        self.untracked_object_boxes: list[list[int]] = []
        self.disappeared = {}
        self.positions = {}
        self.stationary_box_history: dict[str, list[list[int, int, int, int]]] = {}
        self.camera_config = config
        self.detect_config = config.detect
        self.ptz_metrics = ptz_metrics
        self.ptz_autotracker_enabled = ptz_metrics["ptz_autotracker_enabled"]
        self.ptz_motion_estimator = {}
        self.camera_name = config.name
        self.track_id_map = {}
        # TODO: could also initialize a tracker per object class if there
        #       was a good reason to have different distance calculations
        self.tracker = Tracker(
            distance_function=frigate_distance,
            distance_threshold=2.5,
            initialization_delay=self.detect_config.min_initialized,
            hit_counter_max=self.detect_config.max_disappeared,
            # use default filter factory with custom values
            # R is the multiplier for the sensor measurement noise matrix, default of 4.0
            # lowering R means that we trust the position of the bounding boxes more
            # testing shows that the prediction was being relied on a bit too much
            # TODO: could use different kalman filter values along with
            #       the different tracker per object class
            filter_factory=OptimizedKalmanFilterFactory(R=3.4),
        )
        if self.ptz_autotracker_enabled.value:
            self.ptz_motion_estimator = PtzMotionEstimator(
                self.camera_config, self.ptz_metrics
            )

    def register(self, track_id, obj):
        rand_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        id = f"{obj['frame_time']}-{rand_id}"
        self.track_id_map[track_id] = id
        obj["id"] = id
        obj["start_time"] = obj["frame_time"]
        obj["motionless_count"] = 0
        obj["position_changes"] = 0
        obj["score_history"] = [
            p.data["score"]
            for p in next(
                (o for o in self.tracker.tracked_objects if o.global_id == track_id)
            ).past_detections
        ]
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
        self.stationary_box_history[id] = []

    def deregister(self, id, track_id):
        del self.tracked_objects[id]
        del self.disappeared[id]
        self.tracker.tracked_objects = [
            o for o in self.tracker.tracked_objects if o.global_id != track_id
        ]
        del self.track_id_map[track_id]

    # tracks the current position of the object based on the last N bounding boxes
    # returns False if the object has moved outside its previous position
    def update_position(self, id: str, box: list[int, int, int, int]):
        xmin, ymin, xmax, ymax = box
        position = self.positions[id]
        self.stationary_box_history[id].append(box)

        if len(self.stationary_box_history[id]) > MAX_STATIONARY_HISTORY:
            self.stationary_box_history[id] = self.stationary_box_history[id][
                -MAX_STATIONARY_HISTORY:
            ]

        avg_iou = intersection_over_union(
            box, average_boxes(self.stationary_box_history[id])
        )

        # object has minimal or zero iou
        # assume object is active
        if avg_iou < THRESHOLD_ACTIVE_IOU:
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

        # object has iou below threshold, check median to reduce outliers
        if avg_iou < THRESHOLD_STATIONARY_IOU:
            median_iou = intersection_over_union(
                (
                    position["xmin"],
                    position["ymin"],
                    position["xmax"],
                    position["ymax"],
                ),
                median_of_boxes(self.stationary_box_history[id]),
            )

            # if the median iou drops below the threshold
            # assume object is no longer stationary
            if median_iou < THRESHOLD_STATIONARY_IOU:
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
                self.deregister(id, track_id)
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
            self.stationary_box_history[id] = []

        self.tracked_objects[id].update(obj)

    def update_frame_times(self, frame_time):
        # if the object was there in the last frame, assume it's still there
        detections = [
            (
                obj["label"],
                obj["score"],
                obj["box"],
                obj["area"],
                obj["ratio"],
                obj["region"],
            )
            for id, obj in self.tracked_objects.items()
            if self.disappeared[id] == 0
        ]
        self.match_and_update(frame_time, detections=detections)

    def match_and_update(self, frame_time, detections):
        norfair_detections = []

        for obj in detections:
            # centroid is used for other things downstream
            centroid_x = int((obj[2][0] + obj[2][2]) / 2.0)
            centroid_y = int((obj[2][1] + obj[2][3]) / 2.0)

            # track based on top,left and bottom,right corners instead of centroid
            points = np.array([[obj[2][0], obj[2][1]], [obj[2][2], obj[2][3]]])

            norfair_detections.append(
                Detection(
                    points=points,
                    label=obj[0],
                    data={
                        "label": obj[0],
                        "score": obj[1],
                        "box": obj[2],
                        "area": obj[3],
                        "ratio": obj[4],
                        "region": obj[5],
                        "frame_time": frame_time,
                        "centroid": (centroid_x, centroid_y),
                    },
                )
            )

        coord_transformations = None

        if self.ptz_autotracker_enabled.value:
            # we must have been enabled by mqtt, so set up the estimator
            if not self.ptz_motion_estimator:
                self.ptz_motion_estimator = PtzMotionEstimator(
                    self.camera_config, self.ptz_metrics
                )

            coord_transformations = self.ptz_motion_estimator.motion_estimator(
                detections, frame_time, self.camera_name
            )

        tracked_objects = self.tracker.update(
            detections=norfair_detections, coord_transformations=coord_transformations
        )

        # update or create new tracks
        active_ids = []
        for t in tracked_objects:
            estimate = tuple(t.estimate.flatten().astype(int))
            # keep the estimate within the bounds of the image
            estimate = (
                max(0, estimate[0]),
                max(0, estimate[1]),
                min(self.detect_config.width - 1, estimate[2]),
                min(self.detect_config.height - 1, estimate[3]),
            )
            obj = {
                **t.last_detection.data,
                "estimate": estimate,
                "estimate_velocity": t.estimate_velocity,
            }
            active_ids.append(t.global_id)
            if t.global_id not in self.track_id_map:
                self.register(t.global_id, obj)
            # if there wasn't a detection in this frame, increment disappeared
            elif t.last_detection.data["frame_time"] != frame_time:
                id = self.track_id_map[t.global_id]
                self.disappeared[id] += 1
                # sometimes the estimate gets way off
                # only update if the upper left corner is actually upper left
                if estimate[0] < estimate[2] and estimate[1] < estimate[3]:
                    self.tracked_objects[id]["estimate"] = obj["estimate"]
            # else update it
            else:
                self.update(t.global_id, obj)

        # clear expired tracks
        expired_ids = [k for k in self.track_id_map.keys() if k not in active_ids]
        for e_id in expired_ids:
            self.deregister(self.track_id_map[e_id], e_id)

        # update list of object boxes that don't have a tracked object yet
        tracked_object_boxes = [obj["box"] for obj in self.tracked_objects.values()]
        self.untracked_object_boxes = [
            o[2] for o in detections if o[2] not in tracked_object_boxes
        ]

    def debug_draw(self, frame, frame_time):
        active_detections = [
            Drawable(id=obj.id, points=obj.last_detection.points, label=obj.label)
            for obj in self.tracker.tracked_objects
            if obj.last_detection.data["frame_time"] == frame_time
        ]
        missing_detections = [
            Drawable(id=obj.id, points=obj.last_detection.points, label=obj.label)
            for obj in self.tracker.tracked_objects
            if obj.last_detection.data["frame_time"] != frame_time
        ]
        # draw the estimated bounding box
        draw_boxes(frame, self.tracker.tracked_objects, color="green", draw_ids=True)
        # draw the detections that were detected in the current frame
        draw_boxes(frame, active_detections, color="blue", draw_ids=True)
        # draw the detections that are missing in the current frame
        draw_boxes(frame, missing_detections, color="red", draw_ids=True)

        # draw the distance calculation for the last detection
        # estimate vs detection
        for obj in self.tracker.tracked_objects:
            ld = obj.last_detection
            # bottom right
            text_anchor = (
                ld.points[1, 0],
                ld.points[1, 1],
            )
            frame = Drawer.text(
                frame,
                f"{obj.id}: {str(obj.last_distance)}",
                position=text_anchor,
                size=None,
                color=(255, 0, 0),
                thickness=None,
            )
