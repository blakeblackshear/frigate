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
from frigate.const import (
    AUTOTRACKING_MAX_MOVE_METRICS,
    AUTOTRACKING_MOTION_MAX_POINTS,
    AUTOTRACKING_MOTION_MIN_DISTANCE,
    AUTOTRACKING_ZOOM_EDGE_THRESHOLD,
    AUTOTRACKING_ZOOM_IN_HYSTERESIS,
    AUTOTRACKING_ZOOM_OUT_HYSTERESIS,
    CONFIG_DIR,
)
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
        logger.debug(f"{config.name}: Motion estimator init")

    def motion_estimator(self, detections, frame_time, camera):
        # If we've just started up or returned to our preset, reset motion estimator for new tracking session
        if self.ptz_metrics["ptz_reset"].is_set():
            self.ptz_metrics["ptz_reset"].clear()

            # homography is nice (zooming) but slow, translation is pan/tilt only but fast.
            if (
                self.camera_config.onvif.autotracking.zooming
                != ZoomingModeEnum.disabled
            ):
                logger.debug(f"{camera}: Motion estimator reset - homography")
                transformation_type = HomographyTransformationGetter()
            else:
                logger.debug(f"{camera}: Motion estimator reset - translation")
                transformation_type = TranslationTransformationGetter()

            self.norfair_motion_estimator = MotionEstimator(
                transformations_getter=transformation_type,
                min_distance=AUTOTRACKING_MOTION_MIN_DISTANCE,
                max_points=AUTOTRACKING_MOTION_MAX_POINTS,
            )

            self.coord_transformations = None

        if ptz_moving_at_frame_time(
            frame_time, self.ptz_start_time.value, self.ptz_stop_time.value
        ):
            logger.debug(
                f"{camera}: Motion estimator running - frame time: {frame_time}"
            )

            frame_id = f"{camera}{frame_time}"
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
            except Exception:
                # sometimes opencv can't find enough features in the image to find homography, so catch this error
                # https://github.com/tryolabs/norfair/pull/278
                logger.warning(
                    f"Autotracker: motion estimator couldn't get transformations for {camera} at frame time {frame_time}"
                )
                self.coord_transformations = None

            try:
                logger.debug(
                    f"{camera}: Motion estimator transformation: {self.coord_transformations.rel_to_abs([[0,0]])}"
                )
            except Exception:
                pass

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
            for camera, camera_config in self.config.cameras.items():
                if not camera_config.enabled:
                    continue

                if camera_config.onvif.autotracking.enabled:
                    self.ptz_autotracker.camera_maintenance(camera)
                else:
                    # disabled dynamically by mqtt
                    if self.ptz_autotracker.tracked_object.get(camera):
                        self.ptz_autotracker.tracked_object[camera] = None
                        self.ptz_autotracker.tracked_object_previous[camera] = None

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
        self.previous_target_box: dict[str, object] = {}

        # if cam is set to autotrack, onvif should be set up
        for camera, camera_config in self.config.cameras.items():
            if not camera_config.enabled:
                continue

            self.autotracker_init[camera] = False
            if camera_config.onvif.autotracking.enabled:
                self._autotracker_setup(camera_config, camera)

    def _autotracker_setup(self, camera_config, camera):
        logger.debug(f"{camera}: Autotracker init")

        self.object_types[camera] = camera_config.onvif.autotracking.track
        self.required_zones[camera] = camera_config.onvif.autotracking.required_zones
        self.zoom_factor[camera] = camera_config.onvif.autotracking.zoom_factor

        self.tracked_object[camera] = None
        self.tracked_object_previous[camera] = None

        self.calibrating[camera] = False
        self.move_metrics[camera] = []
        self.intercept[camera] = None
        self.move_coefficients[camera] = []
        self.previous_target_box[camera] = 0.5

        self.move_queues[camera] = queue.Queue()
        self.move_queue_locks[camera] = threading.Lock()

        if not self.onvif.cams[camera]["init"]:
            if not self.onvif._init_onvif(camera):
                logger.warning(f"Unable to initialize onvif for {camera}")
                camera_config.onvif.autotracking.enabled = False
                self.ptz_metrics[camera]["ptz_autotracker_enabled"].value = False

                return

            if "pt-r-fov" not in self.onvif.cams[camera]["features"]:
                camera_config.onvif.autotracking.enabled = False
                self.ptz_metrics[camera]["ptz_autotracker_enabled"].value = False
                logger.warning(
                    f"Disabling autotracking for {camera}: FOV relative movement not supported"
                )

                return

            movestatus_supported = self.onvif.get_service_capabilities(camera)

            if movestatus_supported is None or movestatus_supported.lower() != "true":
                camera_config.onvif.autotracking.enabled = False
                self.ptz_metrics[camera]["ptz_autotracker_enabled"].value = False
                logger.warning(
                    f"Disabling autotracking for {camera}: ONVIF MoveStatus not supported"
                )

                return

        if self.onvif.cams[camera]["init"]:
            self.onvif.get_camera_status(camera)

            # movement thread per camera
            self.move_threads[camera] = threading.Thread(
                name=f"ptz_move_thread_{camera}",
                target=partial(self._process_move_queue, camera),
            )
            self.move_threads[camera].daemon = True
            self.move_threads[camera].start()

            if camera_config.onvif.autotracking.movement_weights:
                self.intercept[
                    camera
                ] = camera_config.onvif.autotracking.movement_weights[0]
                self.move_coefficients[
                    camera
                ] = camera_config.onvif.autotracking.movement_weights[1:]

            if camera_config.onvif.autotracking.calibrate_on_startup:
                self._calibrate_camera(camera)

        self.autotracker_init[camera] = True

    def _write_config(self, camera):
        config_file = os.environ.get("CONFIG_FILE", f"{CONFIG_DIR}/config.yml")

        logger.debug(
            f"{camera}: Writing new config with autotracker motion coefficients: {self.config.cameras[camera].onvif.autotracking.movement_weights}"
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

            logger.info(
                f"Calibration for {camera} in progress: {round((step/num_steps)*100)}% complete"
            )

        self.calibrating[camera] = False

        logger.info(f"Calibration for {camera} complete")

        # calculate and save new intercept and coefficients
        self._calculate_move_coefficients(camera, True)

    def _calculate_move_coefficients(self, camera, calibration=False):
        # calculate new coefficients when we have 50 more new values. Save up to 500
        if calibration or (
            len(self.move_metrics[camera]) % 50 == 0
            and len(self.move_metrics[camera]) != 0
            and len(self.move_metrics[camera]) <= AUTOTRACKING_MAX_MOVE_METRICS
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
                f"{camera}: New regression parameters - intercept: {self.intercept[camera]}, coefficients: {self.move_coefficients[camera]}"
            )

            self._write_config(camera)

    def _predict_movement_time(self, camera, pan, tilt):
        combined_movement = abs(pan) + abs(tilt)
        input_data = np.array([self.intercept[camera], combined_movement])

        return np.dot(self.move_coefficients[camera], input_data)

    def _process_move_queue(self, camera):
        camera_config = self.config.cameras[camera]
        camera_width = camera_config.frame_shape[1]
        camera_height = camera_config.frame_shape[0]

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
                        f"{camera}: Move queue: PTZ moving, dequeueing move request - frame time: {frame_time}, final pan: {pan}, final tilt: {tilt}, final zoom: {zoom}"
                    )
                    continue

                else:
                    if (
                        self.config.cameras[camera].onvif.autotracking.zooming
                        == ZoomingModeEnum.relative
                        # this enables us to absolutely zoom if we lost an object
                        and self.tracked_object[camera] is not None
                    ):
                        self.previous_target_box[camera] = self.tracked_object[
                            camera
                        ].obj_data["area"] / (camera_width * camera_height)
                        self.onvif._move_relative(camera, pan, tilt, zoom, 1)

                    else:
                        if pan != 0 or tilt != 0:
                            self.onvif._move_relative(camera, pan, tilt, 0, 1)

                            # Wait until the camera finishes moving
                            while not self.ptz_metrics[camera]["ptz_stopped"].is_set():
                                self.onvif.get_camera_status(camera)

                        if (
                            zoom > 0
                            and self.ptz_metrics[camera]["ptz_zoom_level"].value != zoom
                        ):
                            self.previous_target_box[camera] = self.tracked_object[
                                camera
                            ].obj_data["area"] / (camera_width * camera_height)
                            self.onvif._zoom_absolute(camera, zoom, 1)

                    # Wait until the camera finishes moving
                    while not self.ptz_metrics[camera]["ptz_stopped"].is_set():
                        self.onvif.get_camera_status(camera)

                    if self.config.cameras[camera].onvif.autotracking.movement_weights:
                        logger.debug(
                            f"{camera}: Predicted movement time: {self._predict_movement_time(camera, pan, tilt)}"
                        )
                        logger.debug(
                            f'{camera}: Actual movement time: {self.ptz_metrics[camera]["ptz_stop_time"].value-self.ptz_metrics[camera]["ptz_start_time"].value}'
                        )

                    # save metrics for better estimate calculations
                    if (
                        self.intercept[camera] is not None
                        and len(self.move_metrics[camera])
                        < AUTOTRACKING_MAX_MOVE_METRICS
                        and (pan != 0 or tilt != 0)
                        and self.config.cameras[
                            camera
                        ].onvif.autotracking.calibrate_on_startup
                    ):
                        logger.debug(f"{camera}: Adding new values to move metrics")
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
                    f"{camera}: Enqueue movement for frame time: {frame_time} pan: {pan}, tilt: {tilt}, zoom: {zoom}"
                )
                move_data = (frame_time, pan, tilt, zoom)
                self.move_queues[camera].put(move_data)

                pan = pan_excess
                tilt = tilt_excess
                zoom = zoom_excess

    def _get_valid_velocity(self, camera, obj):
        # returns a tuple and euclidean distance if the estimated velocity is valid
        # if invalid, returns [0, 0] and -1
        camera_config = self.config.cameras[camera]
        camera_width = camera_config.frame_shape[1]
        camera_height = camera_config.frame_shape[0]
        camera_fps = camera_config.detect.fps

        velocities = obj.obj_data["estimate_velocity"]
        diff = np.abs(velocities[1] - velocities[0])

        if (diff > 8).any():
            # invalid velocity
            return np.zeros(2), -1

        average_velocity = np.mean(velocities, axis=0)

        # get euclidean distance of the points, sometimes the estimate is way off
        velocity_distance = np.linalg.norm(velocities[0] - velocities[1])

        if (
            0 <= abs(average_velocity[0]) < (camera_width / camera_fps / 2)
            and 0 <= abs(average_velocity[1]) < (camera_height / camera_fps / 2)
            and velocity_distance <= 10
        ):
            return average_velocity, velocity_distance
        else:
            # invalid velocity
            return np.zeros(2), -1

    def _below_distance_threshold(self, camera, obj):
        # Returns true if Euclidean distance from object to center of frame is
        # less than 10% of the of the larger dimension (width or height) of the frame,
        # multiplied by a scaling factor for object size.
        # Distance is increased if object is not moving to prevent small ptz moves
        # Adjusting this percentage slightly lower will effectively cause the camera to move
        # more often to keep the object in the center. Raising the percentage will cause less
        # movement and will be more flexible with objects not quite being centered.
        # TODO: there's probably a better way to approach this
        camera_config = self.config.cameras[camera]

        centroid_distance = np.linalg.norm(
            [
                obj.obj_data["centroid"][0] - camera_config.detect.width / 2,
                obj.obj_data["centroid"][1] - camera_config.detect.height / 2,
            ]
        )

        obj_width = obj.obj_data["box"][2] - obj.obj_data["box"][0]
        obj_height = obj.obj_data["box"][3] - obj.obj_data["box"][1]

        max_obj = max(obj_width, obj_height)
        max_frame = (
            camera_config.detect.width
            if max_obj == obj_width
            else camera_config.detect.height
        )

        # larger objects should lower the threshold, smaller objects should raise it
        scaling_factor = 1 - np.log(max_obj / max_frame)
        distance_threshold = 0.1 * max_frame * (scaling_factor / 2)

        logger.debug(
            f"{camera}: Distance: {centroid_distance}, threshold: {distance_threshold}"
        )

        return centroid_distance < distance_threshold

    def _should_zoom_in(self, camera, obj, box):
        # returns True if we should zoom in, False if we should zoom out, None to do nothing
        camera_config = self.config.cameras[camera]
        camera_width = camera_config.frame_shape[1]
        camera_height = camera_config.frame_shape[0]
        camera_fps = camera_config.detect.fps

        average_velocity, distance = self._get_valid_velocity(camera, obj)

        bb_left, bb_top, bb_right, bb_bottom = box

        # TODO: Take into account the area changing when an object is moving out of frame
        edge_threshold = AUTOTRACKING_ZOOM_EDGE_THRESHOLD

        # calculate a velocity threshold based on movement coefficients if available
        if camera_config.onvif.autotracking.movement_weights:
            predicted_movement_time = self._predict_movement_time(camera, 1, 1)
            velocity_threshold_x = (
                camera_width / predicted_movement_time / camera_fps * 0.7
            )
            velocity_threshold_y = (
                camera_height / predicted_movement_time / camera_fps * 0.7
            )
        else:
            # use a generic velocity threshold
            velocity_threshold_x = camera_width * 0.02
            velocity_threshold_y = camera_height * 0.02

        away_from_edge = (
            bb_left > edge_threshold * camera_width
            and bb_right < (1 - edge_threshold) * camera_width
            and bb_top > edge_threshold * camera_height
            and bb_bottom < (1 - edge_threshold) * camera_height
        )

        # make sure object is centered in the frame
        below_distance_threshold = self._below_distance_threshold(camera, obj)

        # ensure object isn't too big in frame
        below_dimension_threshold = (bb_right - bb_left) / camera_width < 0.8 and (
            bb_bottom - bb_top
        ) / camera_height < 0.8

        # ensure object is not moving quickly
        below_velocity_threshold = (
            np.all(
                abs(average_velocity)
                < np.array([velocity_threshold_x, velocity_threshold_y])
            )
            or distance == -1
        )

        target_box = obj.obj_data["area"] / (camera_width * camera_height)

        below_area_threshold = target_box < 0.05

        # introduce some hysteresis to prevent a yo-yo zooming effect
        if camera_config.onvif.autotracking.zooming == ZoomingModeEnum.absolute:
            zoom_out_hysteresis = target_box > (
                self.previous_target_box[camera] * AUTOTRACKING_ZOOM_OUT_HYSTERESIS
            )
            zoom_in_hysteresis = target_box < (
                self.previous_target_box[camera] * AUTOTRACKING_ZOOM_IN_HYSTERESIS
            )

        # relative target boxes deadzone is much smaller
        if camera_config.onvif.autotracking.zooming == ZoomingModeEnum.relative:
            zoom_out_hysteresis = target_box > (self.previous_target_box[camera] * 1.1)
            zoom_in_hysteresis = target_box < (self.previous_target_box[camera] * 0.9)

        at_max_zoom = self.ptz_metrics[camera]["ptz_zoom_level"].value == 1
        at_min_zoom = self.ptz_metrics[camera]["ptz_zoom_level"].value == 0

        # debug zooming
        if True:
            logger.debug(
                f"{camera}: Zoom test: far from left edge: {bb_left > edge_threshold * camera_width}"
            )
            logger.debug(
                f"{camera}: Zoom test: far from right edge: {bb_right < (1 - edge_threshold) * camera_width}"
            )
            logger.debug(
                f"{camera}: Zoom test: far from top edge: {bb_top > edge_threshold * camera_height}"
            )
            logger.debug(
                f"{camera}: Zoom test: far from bottom edge: {bb_bottom < (1 - edge_threshold) * camera_height}"
            )
            logger.debug(
                f"{camera}: Zoom test: below distance threshold: {(below_distance_threshold)}"
            )
            logger.debug(
                f"{camera}: Zoom test: below area threshold: {(below_area_threshold)} target box: {target_box}"
            )
            logger.debug(
                f"{camera}: Zoom test: below dimension threshold: {below_dimension_threshold} width: {(bb_right - bb_left) / camera_width}, height: { (bb_bottom - bb_top) / camera_height}"
            )
            logger.debug(
                f"{camera}: Zoom test: below velocity threshold: {below_velocity_threshold} velocity x: {abs(average_velocity[0])}, x threshold: {velocity_threshold_x}, velocity y: {abs(average_velocity[1])}, y threshold: {velocity_threshold_y}"
            )
            logger.debug(f"{camera}: Zoom test: at max zoom: {at_max_zoom}")
            logger.debug(f"{camera}: Zoom test: at min zoom: {at_min_zoom}")
            logger.debug(
                f"{camera}: Zoom test: zoom in hysteresis limit: {zoom_in_hysteresis} previous: {self.previous_target_box[camera]} target: {target_box}"
            )
            logger.debug(
                f"{camera}: Zoom test: zoom out hysteresis limit: {zoom_out_hysteresis} previous: {self.previous_target_box[camera]} target: {target_box}"
            )

        # Zoom in conditions (and)
        # object area could be larger
        # object is away from the edge of the frame
        # object is not moving too quickly
        # object is centered or small in the frame
        # camera is not fully zoomed in
        if (
            zoom_in_hysteresis
            and away_from_edge
            and below_velocity_threshold
            and below_distance_threshold
            and below_dimension_threshold
            and not at_max_zoom
        ):
            return True

        # Zoom out conditions (or)
        # object area got too large, is touching an edge, and centered
        # object area got too large and has at least one dimension that is too large
        # object is touching an edge and either centered or has too large of an area
        # object is moving too quickly
        if (
            (zoom_out_hysteresis and not away_from_edge and below_distance_threshold)
            or (zoom_out_hysteresis and not below_dimension_threshold)
            or (
                not away_from_edge
                and (below_distance_threshold or not below_area_threshold)
            )
            or not below_velocity_threshold
        ) and not at_min_zoom:
            return False

        # Don't zoom at all
        return None

    def _autotrack_move_ptz(self, camera, obj):
        camera_config = self.config.cameras[camera]
        camera_width = camera_config.frame_shape[1]
        camera_height = camera_config.frame_shape[0]
        camera_fps = camera_config.detect.fps

        average_velocity = np.zeros((2, 2))
        predicted_box = obj.obj_data["box"]

        centroid_x = obj.obj_data["centroid"][0]
        centroid_y = obj.obj_data["centroid"][1]

        # Normalize coordinates. top right of the fov is (1,1), center is (0,0), bottom left is (-1, -1).
        pan = ((centroid_x / camera_width) - 0.5) * 2
        tilt = (0.5 - (centroid_y / camera_height)) * 2

        if (
            camera_config.onvif.autotracking.movement_weights
        ):  # use estimates if we have available coefficients
            predicted_movement_time = self._predict_movement_time(camera, pan, tilt)

            average_velocity, distance = self._get_valid_velocity(camera, obj)
            # don't move ptz for estimates that are way too high either

            if distance != -1:
                # this box could exceed the frame boundaries if velocity is high
                # but we'll handle that in _enqueue_move() as two separate moves
                current_box = np.array(obj.obj_data["box"])
                average_velocity = np.tile(average_velocity, 2)
                predicted_box = (
                    current_box
                    + camera_fps * predicted_movement_time * average_velocity
                )

                predicted_box = np.round(predicted_box).astype(int)

                centroid_x = round((predicted_box[0] + predicted_box[2]) / 2)
                centroid_y = round((predicted_box[1] + predicted_box[3]) / 2)

                # recalculate pan and tilt with new centroid
                pan = ((centroid_x / camera_width) - 0.5) * 2
                tilt = (0.5 - (centroid_y / camera_height)) * 2

            logger.debug(f'{camera}: Original box: {obj.obj_data["box"]}')
            logger.debug(f"{camera}: Predicted box: {tuple(predicted_box)}")
            logger.debug(
                f'{camera}: Velocity: {tuple(np.round(obj.obj_data["estimate_velocity"]).flatten().astype(int))}'
            )

        zoom = self._get_zoom_amount(camera, obj, predicted_box)

        self._enqueue_move(camera, obj.obj_data["frame_time"], pan, tilt, zoom)

    def _autotrack_move_zoom_only(self, camera, obj):
        camera_config = self.config.cameras[camera]
        camera_width = camera_config.frame_shape[1]
        camera_height = camera_config.frame_shape[0]

        if camera_config.onvif.autotracking.zooming == ZoomingModeEnum.relative:
            target_box = obj.obj_data["area"] / (camera_width * camera_height)
            self.previous_target_box[camera] = target_box ** self.zoom_factor[camera]

        zoom = self._get_zoom_amount(camera, obj, obj.obj_data["box"])

        if zoom != 0:
            self._enqueue_move(camera, obj.obj_data["frame_time"], 0, 0, zoom)

    def _get_zoom_amount(self, camera, obj, predicted_box):
        camera_config = self.config.cameras[camera]

        # frame width and height
        camera_width = camera_config.frame_shape[1]
        camera_height = camera_config.frame_shape[0]

        zoom = 0
        result = None
        current_zoom_level = self.ptz_metrics[camera]["ptz_zoom_level"].value
        target_box = obj.obj_data["area"] / (camera_width * camera_height)

        # absolute zooming separately from pan/tilt
        if camera_config.onvif.autotracking.zooming == ZoomingModeEnum.absolute:
            # don't zoom on initial move
            if self.tracked_object_previous[camera] is None:
                zoom = current_zoom_level
            else:
                if (
                    result := self._should_zoom_in(camera, obj, obj.obj_data["box"])
                ) is not None:
                    if result:
                        zoom = min(1.0, current_zoom_level + 0.1)
                    else:
                        zoom = max(0.0, current_zoom_level - 0.2)

        # relative zooming concurrently with pan/tilt
        if camera_config.onvif.autotracking.zooming == ZoomingModeEnum.relative:
            if self.tracked_object_previous[camera] is None:
                zoom = target_box ** self.zoom_factor[camera]
            else:
                if (
                    result := self._should_zoom_in(
                        camera,
                        obj,
                        predicted_box
                        if camera_config.onvif.autotracking.movement_weights
                        else obj.obj_data["box"],
                    )
                ) is not None:
                    # zoom value
                    zoom = (
                        2
                        * (
                            self.previous_target_box[camera]
                            / (target_box + self.previous_target_box[camera])
                        )
                        - 1
                    )
                    logger.debug(f"{camera}: Zoom calculation: {zoom}")
                    if not result:
                        # zoom out
                        zoom = -(1 - abs(zoom)) if zoom > 0 else zoom

        logger.debug(f"{camera}: Zooming: {result} Zoom amount: {zoom}")

        return zoom

    def autotrack_object(self, camera, obj):
        camera_config = self.config.cameras[camera]

        if camera_config.onvif.autotracking.enabled:
            if not self.autotracker_init[camera]:
                self._autotracker_setup(camera_config, camera)

            if self.calibrating[camera]:
                logger.debug(f"{camera}: Calibrating camera")
                return

            # this is a brand new object that's on our camera, has our label, entered the zone,
            # is not a false positive, and is not initially motionless
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
                    f"{camera}: New object: {obj.obj_data['id']} {obj.obj_data['box']} {obj.obj_data['frame_time']}"
                )
                self.tracked_object[camera] = obj
                self._autotrack_move_ptz(camera, obj)
                self.tracked_object_previous[camera] = copy.deepcopy(obj)
                self.previous_frame_time[camera] = obj.obj_data["frame_time"]

                return

            if (
                # already tracking an object
                self.tracked_object[camera] is not None
                and self.tracked_object_previous[camera] is not None
                and obj.obj_data["id"] == self.tracked_object[camera].obj_data["id"]
                and obj.obj_data["frame_time"] != self.previous_frame_time
                and not ptz_moving_at_frame_time(
                    obj.obj_data["frame_time"],
                    self.ptz_metrics[camera]["ptz_start_time"].value,
                    self.ptz_metrics[camera]["ptz_stop_time"].value,
                )
            ):
                if self._below_distance_threshold(camera, obj):
                    logger.debug(
                        f"{camera}: Existing object (do NOT move ptz): {obj.obj_data['id']} {obj.obj_data['box']} {obj.obj_data['frame_time']}"
                    )

                    # no need to move, but try zooming
                    self._autotrack_move_zoom_only(camera, obj)
                else:
                    logger.debug(
                        f"{camera}: Existing object (need to move ptz): {obj.obj_data['id']} {obj.obj_data['box']} {obj.obj_data['frame_time']}"
                    )

                    self._autotrack_move_ptz(camera, obj)

                self.tracked_object_previous[camera] = copy.deepcopy(obj)
                self.previous_frame_time[camera] = obj.obj_data["frame_time"]

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
                if (
                    intersection_over_union(
                        self.tracked_object_previous[camera].obj_data["region"],
                        obj.obj_data["box"],
                    )
                    < 0.2
                ):
                    logger.debug(
                        f"{camera}: Reacquired object: {obj.obj_data['id']} {obj.obj_data['box']} {obj.obj_data['frame_time']}"
                    )
                    self.tracked_object[camera] = obj
                    self._autotrack_move_ptz(camera, obj)
                    self.tracked_object_previous[camera] = copy.deepcopy(obj)
                    self.previous_frame_time[camera] = obj.obj_data["frame_time"]

                return

    def end_object(self, camera, obj):
        if self.config.cameras[camera].onvif.autotracking.enabled:
            if (
                self.tracked_object[camera] is not None
                and obj.obj_data["id"] == self.tracked_object[camera].obj_data["id"]
            ):
                logger.debug(
                    f"{camera}: End object: {obj.obj_data['id']} {obj.obj_data['box']}"
                )
                self.tracked_object[camera] = None

    def camera_maintenance(self, camera):
        # bail and don't check anything if we're calibrating or tracking an object
        if (
            not self.autotracker_init[camera]
            or self.calibrating[camera]
            or self.tracked_object[camera] is not None
        ):
            return

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
                >= autotracker_config.timeout
            )
            and autotracker_config.return_preset
        ):
            # clear tracked object and reset zoom level
            self.tracked_object[camera] = None
            self.tracked_object_previous[camera] = None
            self.previous_target_box[camera] = 0.5

            # empty move queue
            while not self.move_queues[camera].empty():
                self.move_queues[camera].get()

            self.ptz_metrics[camera]["ptz_stopped"].wait()
            logger.debug(
                f"{camera}: Time is {self.ptz_metrics[camera]['ptz_frame_time'].value}, returning to preset: {autotracker_config.return_preset}"
            )
            self.onvif._move_to_preset(
                camera,
                autotracker_config.return_preset.lower(),
            )

            # update stored zoom level from preset
            if not self.ptz_metrics[camera]["ptz_stopped"].is_set():
                self.onvif.get_camera_status(camera)

            self.ptz_metrics[camera]["ptz_reset"].set()
