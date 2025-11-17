import logging
import random
import string
from typing import Any, Sequence, cast

import cv2
import numpy as np
from norfair.drawing.draw_boxes import draw_boxes
from norfair.drawing.drawer import Drawable, Drawer
from norfair.filter import OptimizedKalmanFilterFactory
from norfair.tracker import Detection, TrackedObject, Tracker
from rich import print
from rich.console import Console
from rich.table import Table

from frigate.camera import PTZMetrics
from frigate.config import CameraConfig
from frigate.ptz.autotrack import PtzMotionEstimator
from frigate.track import ObjectTracker
from frigate.track.stationary_classifier import (
    StationaryMotionClassifier,
    StationaryThresholds,
    get_stationary_threshold,
)
from frigate.util.image import (
    SharedMemoryFrameManager,
    get_histogram,
    intersection_over_union,
)
from frigate.util.object import average_boxes, median_of_boxes

logger = logging.getLogger(__name__)


# Normalizes distance from estimate relative to object size
# Other ideas:
# - if estimates are inaccurate for first N detections, compare with last_detection (may be fine)
# - could be variable based on time since last_detection
# - include estimated velocity in the distance (car driving by of a parked car)
# - include some visual similarity factor in the distance for occlusions
def distance(detection: np.ndarray, estimate: np.ndarray) -> float:
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
    return float(np.linalg.norm(change))


def frigate_distance(detection: Detection, tracked_object: TrackedObject) -> float:
    return distance(detection.points, tracked_object.estimate)


def histogram_distance(
    matched_not_init_trackers: TrackedObject, unmatched_trackers: TrackedObject
) -> float:
    snd_embedding = unmatched_trackers.last_detection.embedding

    if snd_embedding is None:
        for detection in reversed(unmatched_trackers.past_detections):
            if detection.embedding is not None:
                snd_embedding = detection.embedding
                break
        else:
            return 1

    for detection_fst in matched_not_init_trackers.past_detections:
        if detection_fst.embedding is None:
            continue

        distance = 1 - cv2.compareHist(
            snd_embedding, detection_fst.embedding, cv2.HISTCMP_CORREL
        )
        if distance < 0.5:
            return distance
    return 1


class NorfairTracker(ObjectTracker):
    def __init__(
        self,
        config: CameraConfig,
        ptz_metrics: PTZMetrics,
    ):
        self.frame_manager = SharedMemoryFrameManager()
        self.tracked_objects: dict[str, dict[str, Any]] = {}
        self.untracked_object_boxes: list[list[int]] = []
        self.disappeared: dict[str, int] = {}
        self.positions: dict[str, dict[str, Any]] = {}
        self.stationary_box_history: dict[str, list[list[int]]] = {}
        self.camera_config = config
        self.detect_config = config.detect
        self.ptz_metrics = ptz_metrics
        self.ptz_motion_estimator: PtzMotionEstimator | None = None
        self.camera_name = config.name
        self.track_id_map: dict[str, str] = {}
        self.stationary_classifier = StationaryMotionClassifier()

        # Define tracker configurations for static camera
        self.object_type_configs = {
            "car": {
                "filter_factory": OptimizedKalmanFilterFactory(R=3.4, Q=0.03),
                "distance_function": frigate_distance,
                "distance_threshold": 2.5,
            },
            "license_plate": {
                "filter_factory": OptimizedKalmanFilterFactory(R=2.5, Q=0.05),
                "distance_function": frigate_distance,
                "distance_threshold": 3.75,
            },
        }

        # Define autotracking PTZ-specific configurations
        self.ptz_object_type_configs = {
            "person": {
                "filter_factory": OptimizedKalmanFilterFactory(
                    R=4.5,
                    Q=0.25,
                ),
                "distance_function": frigate_distance,
                "distance_threshold": 2,
                "past_detections_length": 5,
                "reid_distance_function": histogram_distance,
                "reid_distance_threshold": 0.5,
                "reid_hit_counter_max": 10,
            },
        }

        # Default tracker configuration
        # use default filter factory with custom values
        # R is the multiplier for the sensor measurement noise matrix, default of 4.0
        # lowering R means that we trust the position of the bounding boxes more
        # testing shows that the prediction was being relied on a bit too much
        self.default_tracker_config = {
            "filter_factory": OptimizedKalmanFilterFactory(R=3.4),
            "distance_function": frigate_distance,
            "distance_threshold": 2.5,
        }

        self.default_ptz_tracker_config = {
            "filter_factory": OptimizedKalmanFilterFactory(R=4, Q=0.2),
            "distance_function": frigate_distance,
            "distance_threshold": 3,
        }

        self.trackers: dict[str, dict[str, Tracker]] = {}
        # Handle static trackers
        for obj_type, tracker_config in self.object_type_configs.items():
            if obj_type in self.camera_config.objects.track:
                if obj_type not in self.trackers:
                    self.trackers[obj_type] = {}
                self.trackers[obj_type]["static"] = self._create_tracker(
                    obj_type, tracker_config
                )

        # Handle PTZ trackers
        for obj_type, tracker_config in self.ptz_object_type_configs.items():
            if (
                obj_type in self.camera_config.onvif.autotracking.track
                and self.camera_config.onvif.autotracking.enabled_in_config
            ):
                if obj_type not in self.trackers:
                    self.trackers[obj_type] = {}
                self.trackers[obj_type]["ptz"] = self._create_tracker(
                    obj_type, tracker_config
                )

        # Initialize default trackers
        self.default_tracker = {
            "static": Tracker(
                distance_function=frigate_distance,
                distance_threshold=self.default_tracker_config[  # type: ignore[arg-type]
                    "distance_threshold"
                ],
                initialization_delay=self.detect_config.min_initialized,
                hit_counter_max=self.detect_config.max_disappeared,  # type: ignore[arg-type]
                filter_factory=self.default_tracker_config["filter_factory"],  # type: ignore[arg-type]
            ),
            "ptz": Tracker(
                distance_function=frigate_distance,
                distance_threshold=self.default_ptz_tracker_config[
                    "distance_threshold"
                ],  # type: ignore[arg-type]
                initialization_delay=self.detect_config.min_initialized,
                hit_counter_max=self.detect_config.max_disappeared,  # type: ignore[arg-type]
                filter_factory=self.default_ptz_tracker_config["filter_factory"],  # type: ignore[arg-type]
            ),
        }

        if self.ptz_metrics.autotracker_enabled.value:
            self.ptz_motion_estimator = PtzMotionEstimator(
                self.camera_config, self.ptz_metrics
            )

    def _create_tracker(self, obj_type: str, tracker_config: dict[str, Any]) -> Tracker:
        """Helper function to create a tracker with given configuration."""
        tracker_params = {
            "distance_function": tracker_config["distance_function"],
            "distance_threshold": tracker_config["distance_threshold"],
            "initialization_delay": self.detect_config.min_initialized,
            "hit_counter_max": self.detect_config.max_disappeared,
            "filter_factory": tracker_config["filter_factory"],
        }

        # Add reid parameters if max_frames is None
        if (
            self.detect_config.stationary.max_frames.objects.get(
                obj_type, self.detect_config.stationary.max_frames.default
            )
            is None
        ):
            reid_keys = [
                "past_detections_length",
                "reid_distance_function",
                "reid_distance_threshold",
                "reid_hit_counter_max",
            ]
            tracker_params.update(
                {key: tracker_config[key] for key in reid_keys if key in tracker_config}
            )

        return Tracker(**tracker_params)

    def get_tracker(self, object_type: str) -> Tracker:
        """Get the appropriate tracker based on object type and camera mode."""
        mode = (
            "ptz"
            if self.camera_config.onvif.autotracking.enabled_in_config
            and object_type in self.camera_config.onvif.autotracking.track
            and object_type in self.ptz_object_type_configs.keys()
            else "static"
        )
        if object_type in self.trackers:
            return self.trackers[object_type][mode]
        return self.default_tracker[mode]

    def register(self, track_id: str, obj: dict[str, Any]) -> None:
        rand_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        id = f"{obj['frame_time']}-{rand_id}"
        self.track_id_map[track_id] = id
        obj["id"] = id
        obj["start_time"] = obj["frame_time"]
        obj["motionless_count"] = 0
        obj["position_changes"] = 0

        # Get the correct tracker for this object's label
        tracker = self.get_tracker(obj["label"])
        obj_match = next(
            (o for o in tracker.tracked_objects if str(o.global_id) == track_id), None
        )
        # if we don't have a match, we have a new object
        obj["score_history"] = (
            [p.data["score"] for p in obj_match.past_detections] if obj_match else []
        )
        self.tracked_objects[id] = obj
        self.disappeared[id] = 0
        if obj_match:
            boxes = [p.data["box"] for p in obj_match.past_detections]
        else:
            boxes = [obj["box"]]

        xmins, ymins, xmaxs, ymaxs = zip(*boxes)

        self.positions[id] = {
            "xmins": list(xmins),
            "ymins": list(ymins),
            "xmaxs": list(xmaxs),
            "ymaxs": list(ymaxs),
            "xmin": 0,
            "ymin": 0,
            "xmax": self.detect_config.width,
            "ymax": self.detect_config.height,
        }
        self.stationary_box_history[id] = boxes

    def deregister(self, id: str, track_id: str) -> None:
        obj = self.tracked_objects[id]

        del self.tracked_objects[id]
        del self.disappeared[id]

        # only manually deregister objects from norfair's list if max_frames is defined
        if (
            self.detect_config.stationary.max_frames.objects.get(
                obj["label"], self.detect_config.stationary.max_frames.default
            )
            is not None
        ):
            tracker = self.get_tracker(obj["label"])
            tracker.tracked_objects = [
                o
                for o in tracker.tracked_objects
                if str(o.global_id) != track_id and o.hit_counter < 0
            ]

        del self.track_id_map[track_id]

    # tracks the current position of the object based on the last N bounding boxes
    # returns False if the object has moved outside its previous position
    def update_position(
        self,
        id: str,
        box: list[int],
        stationary: bool,
        thresholds: StationaryThresholds,
        yuv_frame: np.ndarray | None,
    ) -> bool:
        def reset_position(xmin: int, ymin: int, xmax: int, ymax: int) -> None:
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

        xmin, ymin, xmax, ymax = box
        position = self.positions[id]
        self.stationary_box_history[id].append(box)

        if len(self.stationary_box_history[id]) > thresholds.max_stationary_history:
            self.stationary_box_history[id] = self.stationary_box_history[id][
                -thresholds.max_stationary_history :
            ]

        avg_box = average_boxes(self.stationary_box_history[id])
        avg_iou = intersection_over_union(box, avg_box)
        median_box = median_of_boxes(self.stationary_box_history[id])

        # Establish anchor early when stationary and stable
        if stationary and yuv_frame is not None:
            history = self.stationary_box_history[id]
            if id not in self.stationary_classifier.anchor_crops and len(history) >= 5:
                stability_iou = intersection_over_union(avg_box, median_box)
                if stability_iou >= 0.7:
                    self.stationary_classifier.ensure_anchor(
                        id, yuv_frame, cast(tuple[int, int, int, int], median_box)
                    )

        # object has minimal or zero iou
        # assume object is active
        if avg_iou < thresholds.known_active_iou:
            if stationary and yuv_frame is not None:
                if not self.stationary_classifier.evaluate(
                    id, yuv_frame, cast(tuple[int, int, int, int], tuple(box))
                ):
                    reset_position(xmin, ymin, xmax, ymax)
                    return False
            else:
                reset_position(xmin, ymin, xmax, ymax)
                return False

        threshold = (
            thresholds.stationary_check_iou
            if stationary
            else thresholds.active_check_iou
        )

        # object has iou below threshold, check median and optionally crop similarity
        if avg_iou < threshold:
            median_iou = intersection_over_union(
                (
                    position["xmin"],
                    position["ymin"],
                    position["xmax"],
                    position["ymax"],
                ),
                median_box,
            )

            # if the median iou drops below the threshold
            # assume object is no longer stationary
            if median_iou < threshold:
                # If we have a yuv_frame to check before flipping to active, check with classifier if we have YUV frame
                if stationary and yuv_frame is not None:
                    if not self.stationary_classifier.evaluate(
                        id, yuv_frame, cast(tuple[int, int, int, int], tuple(box))
                    ):
                        reset_position(xmin, ymin, xmax, ymax)
                        return False
                else:
                    reset_position(xmin, ymin, xmax, ymax)
                    return False

        # if there are more than 5 and less than 10 entries for the position, add the bounding box
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

    def update(
        self,
        track_id: str,
        obj: dict[str, Any],
        thresholds: StationaryThresholds,
        yuv_frame: np.ndarray | None,
    ) -> None:
        id = self.track_id_map[track_id]
        self.disappeared[id] = 0
        stationary = (
            self.tracked_objects[id]["motionless_count"]
            >= self.detect_config.stationary.threshold
        )
        # update the motionless count if the object has not moved to a new position
        if self.update_position(id, obj["box"], stationary, thresholds, yuv_frame):
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
            self.stationary_classifier.on_active(id)

        self.tracked_objects[id].update(obj)

    def update_frame_times(self, frame_name: str, frame_time: float) -> None:
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
        self.match_and_update(frame_name, frame_time, detections=detections)

    def match_and_update(
        self,
        frame_name: str,
        frame_time: float,
        detections: list[tuple[Any, Any, Any, Any, Any, Any]],
    ) -> None:
        # Group detections by object type
        detections_by_type: dict[str, list[Detection]] = {}
        yuv_frame: np.ndarray | None = None

        if (
            self.ptz_metrics.autotracker_enabled.value
            or self.detect_config.stationary.classifier
        ):
            yuv_frame = self.frame_manager.get(
                frame_name, self.camera_config.frame_shape_yuv
            )
        for obj in detections:
            label = obj[0]
            if label not in detections_by_type:
                detections_by_type[label] = []

            # centroid is used for other things downstream
            centroid_x = int((obj[2][0] + obj[2][2]) / 2.0)
            centroid_y = int((obj[2][1] + obj[2][3]) / 2.0)

            # track based on top,left and bottom,right corners instead of centroid
            points = np.array([[obj[2][0], obj[2][1]], [obj[2][2], obj[2][3]]])

            embedding = None
            if self.ptz_metrics.autotracker_enabled.value:
                embedding = get_histogram(
                    yuv_frame, obj[2][0], obj[2][1], obj[2][2], obj[2][3]
                )

            detection = Detection(
                points=points,
                label=label,
                # TODO: stationary objects won't have embeddings
                embedding=embedding,
                data={
                    "label": label,
                    "score": obj[1],
                    "box": obj[2],
                    "area": obj[3],
                    "ratio": obj[4],
                    "region": obj[5],
                    "frame_time": frame_time,
                    "centroid": (centroid_x, centroid_y),
                },
            )
            detections_by_type[label].append(detection)

        coord_transformations = None

        if self.ptz_metrics.autotracker_enabled.value:
            # we must have been enabled by mqtt, so set up the estimator
            if not self.ptz_motion_estimator:
                self.ptz_motion_estimator = PtzMotionEstimator(
                    self.camera_config, self.ptz_metrics
                )

            coord_transformations = self.ptz_motion_estimator.motion_estimator(
                detections, frame_name, frame_time, self.camera_name
            )

        # Update all configured trackers
        all_tracked_objects = []
        for label in self.trackers:
            tracker = self.get_tracker(label)
            tracked_objects = tracker.update(
                detections=detections_by_type.get(label, []),
                coord_transformations=coord_transformations,
            )
            all_tracked_objects.extend(tracked_objects)

        # Collect detections for objects without specific trackers
        default_detections = []
        for label, dets in detections_by_type.items():
            if label not in self.trackers:
                default_detections.extend(dets)

        # Update default tracker with untracked detections
        mode = (
            "ptz"
            if self.camera_config.onvif.autotracking.enabled_in_config
            else "static"
        )
        tracked_objects = self.default_tracker[mode].update(
            detections=default_detections, coord_transformations=coord_transformations
        )
        all_tracked_objects.extend(tracked_objects)

        # update or create new tracks
        active_ids = []
        for t in all_tracked_objects:
            estimate = tuple(t.estimate.flatten().astype(int))
            # keep the estimate within the bounds of the image
            estimate = (
                max(0, estimate[0]),
                max(0, estimate[1]),
                min(self.detect_config.width - 1, estimate[2]),  # type: ignore[operator]
                min(self.detect_config.height - 1, estimate[3]),  # type: ignore[operator]
            )
            new_obj = {
                **t.last_detection.data,
                "estimate": estimate,
                "estimate_velocity": t.estimate_velocity,
            }
            active_ids.append(str(t.global_id))
            if str(t.global_id) not in self.track_id_map:
                self.register(str(t.global_id), new_obj)
            # if there wasn't a detection in this frame, increment disappeared
            elif t.last_detection.data["frame_time"] != frame_time:
                id = self.track_id_map[str(t.global_id)]
                self.disappeared[id] += 1
                # sometimes the estimate gets way off
                # only update if the upper left corner is actually upper left
                if estimate[0] < estimate[2] and estimate[1] < estimate[3]:
                    self.tracked_objects[id]["estimate"] = new_obj["estimate"]
            # else update it
            else:
                thresholds = get_stationary_threshold(new_obj["label"])
                self.update(
                    str(t.global_id),
                    new_obj,
                    thresholds,
                    yuv_frame if thresholds.motion_classifier_enabled else None,
                )

        # clear expired tracks
        expired_ids = [k for k in self.track_id_map.keys() if k not in active_ids]
        for e_id in expired_ids:
            self.deregister(self.track_id_map[e_id], e_id)

        # update list of object boxes that don't have a tracked object yet
        tracked_object_boxes = [obj["box"] for obj in self.tracked_objects.values()]
        self.untracked_object_boxes = [
            o[2] for o in detections if o[2] not in tracked_object_boxes
        ]

    def print_objects_as_table(self, tracked_objects: Sequence) -> None:
        """Used for helping in debugging"""
        print()
        console = Console()
        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("Id", style="yellow", justify="center")
        table.add_column("Age", justify="right")
        table.add_column("Hit Counter", justify="right")
        table.add_column("Last distance", justify="right")
        table.add_column("Init Id", justify="center")
        for obj in tracked_objects:
            table.add_row(
                str(obj.id),
                str(obj.age),
                str(obj.hit_counter),
                f"{obj.last_distance:.4f}" if obj.last_distance is not None else "N/A",
                str(obj.initializing_id),
            )
        console.print(table)

    def debug_draw(self, frame: np.ndarray, frame_time: float) -> None:
        # Collect all tracked objects from each tracker
        all_tracked_objects: list[TrackedObject] = []

        # print a table to the console with norfair tracked object info
        if False:
            if len(self.trackers["license_plate"]["static"].tracked_objects) > 0:  # type: ignore[unreachable]
                self.print_objects_as_table(
                    self.trackers["license_plate"]["static"].tracked_objects
                )

        # Get tracked objects from type-specific trackers
        for object_trackers in self.trackers.values():
            for tracker in object_trackers.values():
                all_tracked_objects.extend(tracker.tracked_objects)

        # Get tracked objects from default trackers
        for tracker in self.default_tracker.values():
            all_tracked_objects.extend(tracker.tracked_objects)

        active_detections = [
            Drawable(id=obj.id, points=obj.last_detection.points, label=obj.label)
            for obj in all_tracked_objects
            if obj.last_detection.data["frame_time"] == frame_time
        ]
        missing_detections = [
            Drawable(id=obj.id, points=obj.last_detection.points, label=obj.label)
            for obj in all_tracked_objects
            if obj.last_detection.data["frame_time"] != frame_time
        ]
        # draw the estimated bounding box
        draw_boxes(frame, all_tracked_objects, color="green", draw_ids=True)
        # draw the detections that were detected in the current frame
        draw_boxes(frame, active_detections, color="blue", draw_ids=True)  # type: ignore[arg-type]
        # draw the detections that are missing in the current frame
        draw_boxes(frame, missing_detections, color="red", draw_ids=True)  # type: ignore[arg-type]

        # draw the distance calculation for the last detection
        # estimate vs detection
        for obj in all_tracked_objects:
            ld = obj.last_detection
            # bottom right
            text_anchor = (
                ld.points[1, 0],  # type: ignore[index]
                ld.points[1, 1],  # type: ignore[index]
            )
            frame = Drawer.text(
                frame,
                f"{obj.id}: {str(obj.last_distance)}",
                position=text_anchor,
                size=None,
                color=(255, 0, 0),
                thickness=None,
            )

        if False:
            # draw the current formatted time on the frame
            from datetime import datetime  # type: ignore[unreachable]

            formatted_time = datetime.fromtimestamp(frame_time).strftime(
                "%m/%d/%Y %I:%M:%S %p"
            )

            frame = Drawer.text(
                frame,
                formatted_time,
                position=(10, 50),
                size=1.5,
                color=(255, 255, 255),
                thickness=None,
            )
