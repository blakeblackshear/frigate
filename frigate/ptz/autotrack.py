"""Automatically pan, tilt, and zoom on detected objects via onvif."""

import copy
import logging
import os
import queue
import threading
import time
from functools import partial
from multiprocessing.synchronize import Event as MpEvent

import cv2
import numpy as np
from norfair.camera_motion import (
    HomographyTransformationGetter,
    MotionEstimator,
    TranslationTransformationGetter,
)

from frigate.config import CameraConfig, FrigateConfig, ZoomingModeEnum
from frigate.const import CONFIG_DIR
from frigate.ptz.onvif import OnvifController
from frigate.types import PTZMetricsTypes
from frigate.util.builtin import update_yaml_file
from frigate.util.image import SharedMemoryFrameManager, intersection_over_union

logger = logging.getLogger(__name__)


def ptz_moving_at_frame_time(frame_time, ptz_start_time, ptz_stop_time):
    # Determine if the PTZ was in motion at the set frame time
    # for non ptz/autotracking cameras, this will always return False
    # ptz_start_time is initialized to 0 on startup and only changes
    # when autotracking movements are made
    return (ptz_start_time != 0.0 and frame_time > ptz_start_time) and (
        ptz_stop_time == 0.0 or (ptz_start_time <= frame_time <= ptz_stop_time)
    )


class PtzMotionEstimator:
    def __init__(
        self, config: CameraConfig, ptz_metrics: dict[str, PTZMetricsTypes]
    ) -> None:
        self.frame_manager = SharedMemoryFrameManager()
        self.norfair_motion_estimator = None
        self.camera_config = config
        self.coord_transformations = None
        self.ptz_metrics = ptz_metrics
        self.ptz_start_time = self.ptz_metrics["ptz_start_time"]
        self.ptz_stop_time = self.ptz_metrics["ptz_stop_time"]

        self.ptz_metrics["ptz_reset"].set()
        logger.debug(f"Motion estimator init for cam: {config.name}")

    def motion_estimator(self, detections, frame_time, camera_name):
        # If we've just started up or returned to our preset, reset motion estimator for new tracking session
        if self.ptz_metrics["ptz_reset"].is_set():
            self.ptz_metrics["ptz_reset"].clear()

            # homography is nice (zooming) but slow, translation is pan/tilt only but fast.
            if (
                self.camera_config.onvif.autotracking.zooming
                != ZoomingModeEnum.disabled
            ):
                logger.debug("Motion estimator reset - homography")
                transformation_type = HomographyTransformationGetter()
            else:
                logger.debug("Motion estimator reset - translation")
                transformation_type = TranslationTransformationGetter()

            self.norfair_motion_estimator = MotionEstimator(
                transformations_getter=transformation_type,
                min_distance=30,
                max_points=900,
            )

            self.coord_transformations = None

        if ptz_moving_at_frame_time(
            frame_time, self.ptz_start_time.value, self.ptz_stop_time.value
        ):
            logger.debug(
                f"Motion estimator running for {camera_name} - frame time: {frame_time}, {self.ptz_start_time.value}, {self.ptz_stop_time.value}"
            )

            frame_id = f"{camera_name}{frame_time}"
            yuv_frame = self.frame_manager.get(
                frame_id, self.camera_config.frame_shape_yuv
            )

            frame = cv2.cvtColor(yuv_frame, cv2.COLOR_YUV2GRAY_I420)

            # mask out detections for better motion estimation
            mask = np.ones(frame.shape[:2], frame.dtype)

            detection_boxes = [x[2] for x in detections]
            for detection in detection_boxes:
                x1, y1, x2, y2 = detection
                mask[y1:y2, x1:x2] = 0

            # merge camera config motion mask with detections. Norfair function needs 0,1 mask
            mask = np.bitwise_and(mask, self.camera_config.motion.mask).clip(max=1)

            # Norfair estimator function needs color so it can convert it right back to gray
            frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGRA)

            try:
                self.coord_transformations = self.norfair_motion_estimator.update(
                    frame, mask
                )
                logger.debug(
                    f"Motion estimator transformation: {self.coord_transformations.rel_to_abs([[0,0]])}"
                )
            except Exception:
                # sometimes opencv can't find enough features in the image to find homography, so catch this error
                logger.warning(
                    f"Autotracker: motion estimator couldn't get transformations for {camera_name} at frame time {frame_time}"
                )
                self.coord_transformations = None

            self.frame_manager.close(frame_id)

        return self.coord_transformations


class PtzAutoTrackerThread(threading.Thread):
    def __init__(
        self,
        config: FrigateConfig,
        onvif: OnvifController,
        ptz_metrics: dict[str, PTZMetricsTypes],
        stop_event: MpEvent,
    ) -> None:
        threading.Thread.__init__(self)
        self.name = "ptz_autotracker"
        self.ptz_autotracker = PtzAutoTracker(config, onvif, ptz_metrics)
        self.stop_event = stop_event
        self.config = config

    def run(self):
        while not self.stop_event.wait(1):
            for camera_name, cam in self.config.cameras.items():
                if not cam.enabled:
                    continue

                if cam.onvif.autotracking.enabled:
                    self.ptz_autotracker.camera_maintenance(camera_name)
                else:
                    # disabled dynamically by mqtt
                    if self.ptz_autotracker.tracked_object.get(camera_name):
                        self.ptz_autotracker.tracked_object[camera_name] = None
                        self.ptz_autotracker.tracked_object_previous[camera_name] = None

        logger.info("Exiting autotracker...")


class PtzAutoTracker:
    def __init__(
        self,
        config: FrigateConfig,
        onvif: OnvifController,
        ptz_metrics: PTZMetricsTypes,
    ) -> None:
        self.config = config
        self.onvif = onvif
        self.ptz_metrics = ptz_metrics
        self.tracked_object: dict[str, object] = {}
        self.tracked_object_previous: dict[str, object] = {}
        self.previous_frame_time: dict[str, object] = {}
        self.object_types: dict[str, object] = {}
        self.required_zones: dict[str, object] = {}
        self.move_queues: dict[str, object] = {}
        self.move_queue_locks: dict[str, object] = {}
        self.move_threads: dict[str, object] = {}
        self.autotracker_init: dict[str, object] = {}
        self.move_metrics: dict[str, object] = {}
        self.calibrating: dict[str, object] = {}
        self.intercept: dict[str, object] = {}
        self.move_coefficients: dict[str, object] = {}
        self.zoom_factor: dict[str, object] = {}

        # if cam is set to autotrack, onvif should be set up
        for camera_name, cam in self.config.cameras.items():
            if not cam.enabled:
                continue

            self.autotracker_init[camera_name] = False
            if cam.onvif.autotracking.enabled:
                self._autotracker_setup(cam, camera_name)

    def _autotracker_setup(self, cam, camera_name):
        logger.debug(f"Autotracker init for cam: {camera_name}")

        self.object_types[camera_name] = cam.onvif.autotracking.track
        self.required_zones[camera_name] = cam.onvif.autotracking.required_zones
        self.zoom_factor[camera_name] = cam.onvif.autotracking.zoom_factor

        self.tracked_object[camera_name] = None
        self.tracked_object_previous[camera_name] = None

        self.calibrating[camera_name] = False
        self.move_metrics[camera_name] = []
        self.intercept[camera_name] = None
        self.move_coefficients[camera_name] = []

        self.move_queues[camera_name] = queue.Queue()
        self.move_queue_locks[camera_name] = threading.Lock()

        if not self.onvif.cams[camera_name]["init"]:
            if not self.onvif._init_onvif(camera_name):
                logger.warning(f"Unable to initialize onvif for {camera_name}")
                cam.onvif.autotracking.enabled = False
                self.ptz_metrics[camera_name]["ptz_autotracker_enabled"].value = False

                return

            if "pt-r-fov" not in self.onvif.cams[camera_name]["features"]:
                cam.onvif.autotracking.enabled = False
                self.ptz_metrics[camera_name]["ptz_autotracker_enabled"].value = False
                logger.warning(
                    f"Disabling autotracking for {camera_name}: FOV relative movement not supported"
                )

                return

            movestatus_supported = self.onvif.get_service_capabilities(camera_name)

            if movestatus_supported is None or movestatus_supported.lower() != "true":
                cam.onvif.autotracking.enabled = False
                self.ptz_metrics[camera_name]["ptz_autotracker_enabled"].value = False
                logger.warning(
                    f"Disabling autotracking for {camera_name}: ONVIF MoveStatus not supported"
                )

                return

            self.onvif.get_camera_status(camera_name)

            # movement thread per camera
            if not self.move_threads or not self.move_threads[camera_name]:
                self.move_threads[camera_name] = threading.Thread(
                    name=f"move_thread_{camera_name}",
                    target=partial(self._process_move_queue, camera_name),
                )
                self.move_threads[camera_name].daemon = True
                self.move_threads[camera_name].start()

            if cam.onvif.autotracking.movement_weights:
                self.intercept[camera_name] = cam.onvif.autotracking.movement_weights[0]
                self.move_coefficients[
                    camera_name
                ] = cam.onvif.autotracking.movement_weights[1:]

            if cam.onvif.autotracking.calibrate_on_startup:
                self._calibrate_camera(camera_name)

        self.autotracker_init[camera_name] = True

    def write_config(self, camera):
        config_file = os.environ.get("CONFIG_FILE", f"{CONFIG_DIR}/config.yml")

        logger.debug(
            f"Writing new config with autotracker motion coefficients: {self.config.cameras[camera].onvif.autotracking.movement_weights}"
        )

        update_yaml_file(
            config_file,
            ["cameras", camera, "onvif", "autotracking", "movement_weights"],
            self.config.cameras[camera].onvif.autotracking.movement_weights,
        )

    def _calibrate_camera(self, camera):
        # move the camera from the preset in steps and measure the time it takes to move that amount
        # this will allow us to predict movement times with a simple linear regression
        # start with 0 so we can determine a baseline (to be used as the intercept in the regression calc)
        # TODO: take zooming into account too
        num_steps = 30
        step_sizes = np.linspace(0, 1, num_steps)

        self.calibrating[camera] = True

        logger.info(f"Camera calibration for {camera} in progress")

        self.onvif._move_to_preset(
            camera,
            self.config.cameras[camera].onvif.autotracking.return_preset.lower(),
        )
        self.ptz_metrics[camera]["ptz_reset"].set()
        self.ptz_metrics[camera]["ptz_stopped"].clear()

        # Wait until the camera finishes moving
        while not self.ptz_metrics[camera]["ptz_stopped"].is_set():
            self.onvif.get_camera_status(camera)

        for step in range(num_steps):
            pan = step_sizes[step]
            tilt = step_sizes[step]

            start_time = time.time()
            self.onvif._move_relative(camera, pan, tilt, 0, 1)

            # Wait until the camera finishes moving
            while not self.ptz_metrics[camera]["ptz_stopped"].is_set():
                self.onvif.get_camera_status(camera)
            stop_time = time.time()

            self.move_metrics[camera].append(
                {
                    "pan": pan,
                    "tilt": tilt,
                    "start_timestamp": start_time,
                    "end_timestamp": stop_time,
                }
            )

            self.onvif._move_to_preset(
                camera,
                self.config.cameras[camera].onvif.autotracking.return_preset.lower(),
            )
            self.ptz_metrics[camera]["ptz_reset"].set()
            self.ptz_metrics[camera]["ptz_stopped"].clear()

            # Wait until the camera finishes moving
            while not self.ptz_metrics[camera]["ptz_stopped"].is_set():
                self.onvif.get_camera_status(camera)

        self.calibrating[camera] = False

        logger.info(f"Calibration for {camera} complete")

        # calculate and save new intercept and coefficients
        self._calculate_move_coefficients(camera, True)

    def _calculate_move_coefficients(self, camera, calibration=False):
        # calculate new coefficients when we have 50 more new values. Save up to 500
        if calibration or (
            len(self.move_metrics[camera]) % 50 == 0
            and len(self.move_metrics[camera]) != 0
            and len(self.move_metrics[camera]) <= 500
        ):
            X = np.array(
                [abs(d["pan"]) + abs(d["tilt"]) for d in self.move_metrics[camera]]
            )
            y = np.array(
                [
                    d["end_timestamp"] - d["start_timestamp"]
                    for d in self.move_metrics[camera]
                ]
            )

            # simple linear regression with intercept
            X_with_intercept = np.column_stack((np.ones(X.shape[0]), X))
            self.move_coefficients[camera] = np.linalg.lstsq(
                X_with_intercept, y, rcond=None
            )[0]

            # only assign a new intercept if we're calibrating
            if calibration:
                self.intercept[camera] = y[0]

            # write the intercept and coefficients back to the config file as a comma separated string
            movement_weights = np.concatenate(
                ([self.intercept[camera]], self.move_coefficients[camera])
            )
            self.config.cameras[camera].onvif.autotracking.movement_weights = ", ".join(
                map(str, movement_weights)
            )

            logger.debug(
                f"New regression parameters - intercept: {self.intercept[camera]}, coefficients: {self.move_coefficients[camera]}"
            )

            self.write_config(camera)

    def _predict_movement_time(self, camera, pan, tilt):
        combined_movement = abs(pan) + abs(tilt)
        input_data = np.array([self.intercept[camera], combined_movement])

        return np.dot(self.move_coefficients[camera], input_data)

    def _process_move_queue(self, camera):
        while True:
            move_data = self.move_queues[camera].get()

            with self.move_queue_locks[camera]:
                frame_time, pan, tilt, zoom = move_data

                # if we're receiving move requests during a PTZ move, ignore them
                if ptz_moving_at_frame_time(
                    frame_time,
                    self.ptz_metrics[camera]["ptz_start_time"].value,
                    self.ptz_metrics[camera]["ptz_stop_time"].value,
                ):
                    # instead of dequeueing this might be a good place to preemptively move based
                    # on an estimate - for fast moving objects, etc.
                    logger.debug(
                        f"Move queue: PTZ moving, dequeueing move request - frame time: {frame_time}, final pan: {pan}, final tilt: {tilt}, final zoom: {zoom}"
                    )
                    continue

                else:
                    if (
                        self.config.cameras[camera].onvif.autotracking.zooming
                        == ZoomingModeEnum.relative
                    ):
                        self.onvif._move_relative(camera, pan, tilt, zoom, 1)
                    else:
                        if zoom > 0:
                            self.onvif._zoom_absolute(camera, zoom, 1)
                        else:
                            self.onvif._move_relative(camera, pan, tilt, 0, 1)

                    # Wait until the camera finishes moving
                    while not self.ptz_metrics[camera]["ptz_stopped"].is_set():
                        # check if ptz is moving
                        self.onvif.get_camera_status(camera)

                    if self.config.cameras[camera].onvif.autotracking.movement_weights:
                        logger.debug(
                            f"Predicted movement time: {self._predict_movement_time(camera, pan, tilt)}"
                        )
                        logger.debug(
                            f'Actual movement time: {self.ptz_metrics[camera]["ptz_stop_time"].value-self.ptz_metrics[camera]["ptz_start_time"].value}'
                        )

                    # save metrics for better estimate calculations
                    if (
                        self.intercept[camera] is not None
                        and len(self.move_metrics[camera]) < 500
                    ):
                        logger.debug("Adding new values to move metrics")
                        self.move_metrics[camera].append(
                            {
                                "pan": pan,
                                "tilt": tilt,
                                "start_timestamp": self.ptz_metrics[camera][
                                    "ptz_start_time"
                                ].value,
                                "end_timestamp": self.ptz_metrics[camera][
                                    "ptz_stop_time"
                                ].value,
                            }
                        )

                    # calculate new coefficients if we have enough data
                    self._calculate_move_coefficients(camera)

    def _enqueue_move(self, camera, frame_time, pan, tilt, zoom):
        def split_value(value):
            clipped = np.clip(value, -1, 1)
            return clipped, value - clipped

        if (
            frame_time > self.ptz_metrics[camera]["ptz_start_time"].value
            and frame_time > self.ptz_metrics[camera]["ptz_stop_time"].value
            and not self.move_queue_locks[camera].locked()
        ):
            # don't make small movements
            if abs(pan) < 0.02:
                pan = 0
            if abs(tilt) < 0.02:
                tilt = 0

            # split up any large moves caused by velocity estimated movements
            while pan != 0 or tilt != 0 or zoom != 0:
                pan, pan_excess = split_value(pan)
                tilt, tilt_excess = split_value(tilt)
                zoom, zoom_excess = split_value(zoom)

                logger.debug(
                    f"Enqueue movement for frame time: {frame_time} pan: {pan}, enqueue tilt: {tilt}, enqueue zoom: {zoom}"
                )
                move_data = (frame_time, pan, tilt, zoom)
                self.move_queues[camera].put(move_data)

                pan = pan_excess
                tilt = tilt_excess
                zoom = zoom_excess

    def _should_zoom_in(self, camera, box, area, average_velocity):
        camera_config = self.config.cameras[camera]
        camera_width = camera_config.frame_shape[1]
        camera_height = camera_config.frame_shape[0]
        camera_area = camera_width * camera_height

        bb_left, bb_top, bb_right, bb_bottom = box

        # If bounding box is not within 5% of an edge
        # If object area is less than 70% of frame
        # Then zoom in, otherwise try zooming out
        # should we make these configurable?
        #
        # TODO: Take into account the area changing when an object is moving out of frame
        edge_threshold = 0.15
        area_threshold = self.zoom_factor[camera]
        velocity_threshold = 0.1

        # if we have a fast moving object, let's zoom out
        # fast moving is defined as a velocity of more than 10% of the camera's width or height
        # so an object with an x velocity of 15 pixels on a 1280x720 camera would trigger a zoom out
        velocity_threshold = average_velocity[0] > (
            camera_width * velocity_threshold
        ) or average_velocity[1] > (camera_height * velocity_threshold)

        # returns True to zoom in, False to zoom out
        return (
            bb_left > edge_threshold * camera_width
            and bb_right < (1 - edge_threshold) * camera_width
            and bb_top > edge_threshold * camera_height
            and bb_bottom < (1 - edge_threshold) * camera_height
            and area < area_threshold * camera_area
            and not velocity_threshold
        )

    def _autotrack_move_ptz(self, camera, obj):
        camera_config = self.config.cameras[camera]
        average_velocity = (0,) * 4

        # # frame width and height
        camera_width = camera_config.frame_shape[1]
        camera_height = camera_config.frame_shape[0]
        camera_fps = camera_config.detect.fps

        centroid_x = obj.obj_data["centroid"][0]
        centroid_y = obj.obj_data["centroid"][1]

        # Normalize coordinates. top right of the fov is (1,1), center is (0,0), bottom left is (-1, -1).
        pan = ((centroid_x / camera_width) - 0.5) * 2
        tilt = (0.5 - (centroid_y / camera_height)) * 2

        if (
            camera_config.onvif.autotracking.movement_weights
        ):  # use estimates if we have available coefficients
            predicted_movement_time = self._predict_movement_time(camera, pan, tilt)

            # Norfair gives us two points for the velocity of an object represented as x1, y1, x2, y2
            x1, y1, x2, y2 = obj.obj_data["estimate_velocity"]
            average_velocity = (
                (x1 + x2) / 2,
                (y1 + y2) / 2,
                (x1 + x2) / 2,
                (y1 + y2) / 2,
            )

            # get euclidean distance of the two points, sometimes the estimate is way off
            distance = np.linalg.norm([x2 - x1, y2 - y1])

            if distance <= 5:
                # this box could exceed the frame boundaries if velocity is high
                # but we'll handle that in _enqueue_move() as two separate moves
                predicted_box = [
                    round(x + camera_fps * predicted_movement_time * v)
                    for x, v in zip(obj.obj_data["box"], average_velocity)
                ]
            else:
                # estimate was bad
                predicted_box = obj.obj_data["box"]

            centroid_x = round((predicted_box[0] + predicted_box[2]) / 2)
            centroid_y = round((predicted_box[1] + predicted_box[3]) / 2)

            # recalculate pan and tilt with new centroid
            pan = ((centroid_x / camera_width) - 0.5) * 2
            tilt = (0.5 - (centroid_y / camera_height)) * 2

            logger.debug(f'Original box: {obj.obj_data["box"]}')
            logger.debug(f"Predicted box: {predicted_box}")
            logger.debug(f'Velocity: {obj.obj_data["estimate_velocity"]}')

        if camera_config.onvif.autotracking.zooming == ZoomingModeEnum.relative:
            # relative zooming concurrently with pan/tilt
            zoom = min(
                obj.obj_data["area"]
                / (camera_width * camera_height)
                * 100
                * self.zoom_factor[camera],
                1,
            )

            logger.debug(f"Zoom value: {zoom}")

            # test if we need to zoom out
            if not self._should_zoom_in(
                camera,
                predicted_box
                if camera_config.onvif.autotracking.movement_weights
                else obj.obj_data["box"],
                obj.obj_data["area"],
                average_velocity,
            ):
                zoom = -(1 - zoom)

            # don't make small movements to zoom in if area hasn't changed significantly
            # but always zoom out if necessary
            if (
                "area" in obj.previous
                and abs(obj.obj_data["area"] - obj.previous["area"])
                / obj.obj_data["area"]
                < 0.2
                and zoom > 0
            ):
                zoom = 0
        else:
            zoom = 0

        self._enqueue_move(camera, obj.obj_data["frame_time"], pan, tilt, zoom)

    def _autotrack_zoom_only(self, camera, obj):
        camera_config = self.config.cameras[camera]

        # absolute zooming separately from pan/tilt
        if camera_config.onvif.autotracking.zooming == ZoomingModeEnum.absolute:
            zoom_level = self.ptz_metrics[camera]["ptz_zoom_level"].value

            if 0 < zoom_level <= 1:
                if self._should_zoom_in(
                    camera, obj.obj_data["box"], obj.obj_data["area"], (0, 0, 0, 0)
                ):
                    zoom = min(1.0, zoom_level + 0.1)
                else:
                    zoom = max(0.0, zoom_level - 0.1)

                if zoom != zoom_level:
                    self._enqueue_move(camera, obj.obj_data["frame_time"], 0, 0, zoom)

    def autotrack_object(self, camera, obj):
        camera_config = self.config.cameras[camera]

        if camera_config.onvif.autotracking.enabled:
            if not self.autotracker_init[camera]:
                self._autotracker_setup(self.config.cameras[camera], camera)

            if self.calibrating[camera]:
                logger.debug("Calibrating camera")
                return

            # either this is a brand new object that's on our camera, has our label, entered the zone, is not a false positive,
            # and is not initially motionless - or one we're already tracking, which assumes all those things are already true
            if (
                # new object
                self.tracked_object[camera] is None
                and obj.camera == camera
                and obj.obj_data["label"] in self.object_types[camera]
                and set(obj.entered_zones) & set(self.required_zones[camera])
                and not obj.previous["false_positive"]
                and not obj.false_positive
                and self.tracked_object_previous[camera] is None
                and obj.obj_data["motionless_count"] == 0
            ):
                logger.debug(
                    f"Autotrack: New object: {obj.obj_data['id']} {obj.obj_data['box']} {obj.obj_data['frame_time']}"
                )
                self.tracked_object[camera] = obj
                self.tracked_object_previous[camera] = copy.deepcopy(obj)
                self.previous_frame_time[camera] = obj.obj_data["frame_time"]
                self._autotrack_move_ptz(camera, obj)

                return

            if (
                # already tracking an object
                self.tracked_object[camera] is not None
                and self.tracked_object_previous[camera] is not None
                and obj.obj_data["id"] == self.tracked_object[camera].obj_data["id"]
                and obj.obj_data["frame_time"] != self.previous_frame_time
            ):
                self.previous_frame_time[camera] = obj.obj_data["frame_time"]
                # Don't move ptz if Euclidean distance from object to center of frame is
                # less than 15% of the of the larger dimension (width or height) of the frame,
                # multiplied by a scaling factor for object size.
                # Adjusting this percentage slightly lower will effectively cause the camera to move
                # more often to keep the object in the center. Raising the percentage will cause less
                # movement and will be more flexible with objects not quite being centered.
                # TODO: there's probably a better way to approach this
                distance = np.linalg.norm(
                    [
                        obj.obj_data["centroid"][0] - camera_config.detect.width / 2,
                        obj.obj_data["centroid"][1] - camera_config.detect.height / 2,
                    ]
                )

                obj_width = obj.obj_data["box"][2] - obj.obj_data["box"][0]
                obj_height = obj.obj_data["box"][3] - obj.obj_data["box"][1]

                max_obj = max(obj_width, obj_height)
                max_frame = max(camera_config.detect.width, camera_config.detect.height)

                # larger objects should lower the threshold, smaller objects should raise it
                scaling_factor = 1 - (max_obj / max_frame)

                distance_threshold = 0.15 * (max_frame) * scaling_factor

                iou = intersection_over_union(
                    self.tracked_object_previous[camera].obj_data["box"],
                    obj.obj_data["box"],
                )

                logger.debug(
                    f"Distance: {distance}, threshold: {distance_threshold}, iou: {iou}"
                )

                if distance < distance_threshold and iou > 0.2:
                    logger.debug(
                        f"Autotrack: Existing object (do NOT move ptz): {obj.obj_data['id']} {obj.obj_data['box']} {obj.obj_data['frame_time']}"
                    )

                    # no need to move, but try absolute zooming
                    self._autotrack_zoom_only(camera, obj)

                    return

                logger.debug(
                    f"Autotrack: Existing object (need to move ptz): {obj.obj_data['id']} {obj.obj_data['box']} {obj.obj_data['frame_time']}"
                )
                self.tracked_object_previous[camera] = copy.deepcopy(obj)
                self._autotrack_move_ptz(camera, obj)

                # try absolute zooming too
                self._autotrack_zoom_only(camera, obj)

                return

            if (
                # The tracker lost an object, so let's check the previous object's region and compare it with the incoming object
                # If it's within bounds, start tracking that object.
                # Should we check region (maybe too broad) or expand the previous object's box a bit and check that?
                self.tracked_object[camera] is None
                and obj.camera == camera
                and obj.obj_data["label"] in self.object_types[camera]
                and not obj.previous["false_positive"]
                and not obj.false_positive
                and self.tracked_object_previous[camera] is not None
            ):
                self.previous_frame_time[camera] = obj.obj_data["frame_time"]
                if (
                    intersection_over_union(
                        self.tracked_object_previous[camera].obj_data["region"],
                        obj.obj_data["box"],
                    )
                    < 0.2
                ):
                    logger.debug(
                        f"Autotrack: Reacquired object: {obj.obj_data['id']} {obj.obj_data['box']} {obj.obj_data['frame_time']}"
                    )
                    self.tracked_object[camera] = obj
                    self.tracked_object_previous[camera] = copy.deepcopy(obj)
                    self._autotrack_move_ptz(camera, obj)

                return

    def end_object(self, camera, obj):
        if self.config.cameras[camera].onvif.autotracking.enabled:
            if (
                self.tracked_object[camera] is not None
                and obj.obj_data["id"] == self.tracked_object[camera].obj_data["id"]
            ):
                logger.debug(
                    f"Autotrack: End object: {obj.obj_data['id']} {obj.obj_data['box']}"
                )
                self.tracked_object[camera] = None

    def camera_maintenance(self, camera):
        # bail and don't check anything if we're calibrating or tracking an object
        if self.calibrating[camera] or self.tracked_object[camera] is not None:
            return

        logger.debug("Running camera maintenance")

        # calls get_camera_status to check/update ptz movement
        # returns camera to preset after timeout when tracking is over
        autotracker_config = self.config.cameras[camera].onvif.autotracking

        if not self.autotracker_init[camera]:
            self._autotracker_setup(self.config.cameras[camera], camera)
        # regularly update camera status
        if not self.ptz_metrics[camera]["ptz_stopped"].is_set():
            self.onvif.get_camera_status(camera)

        # return to preset if tracking is over
        if (
            self.tracked_object[camera] is None
            and self.tracked_object_previous[camera] is not None
            and (
                # might want to use a different timestamp here?
                self.ptz_metrics[camera]["ptz_frame_time"].value
                - self.tracked_object_previous[camera].obj_data["frame_time"]
                > autotracker_config.timeout
            )
            and autotracker_config.return_preset
        ):
            # empty move queue
            while not self.move_queues[camera].empty():
                self.move_queues[camera].get()

            # clear tracked object
            self.tracked_object[camera] = None
            self.tracked_object_previous[camera] = None

            self.ptz_metrics[camera]["ptz_stopped"].wait()
            logger.debug(
                f"Autotrack: Time is {self.ptz_metrics[camera]['ptz_frame_time'].value}, returning to preset: {autotracker_config.return_preset}"
            )
            self.onvif._move_to_preset(
                camera,
                autotracker_config.return_preset.lower(),
            )
            self.ptz_metrics[camera]["ptz_reset"].set()
