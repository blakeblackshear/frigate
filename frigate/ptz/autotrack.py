"""Automatically pan, tilt, and zoom on detected objects via onvif."""

import asyncio
import copy
import logging
import threading
import time
from collections import deque
from multiprocessing.synchronize import Event as MpEvent
from typing import Any

import cv2
import numpy as np
from norfair.camera_motion import (
    HomographyTransformationGetter,
    MotionEstimator,
    TranslationTransformationGetter,
)

from frigate.camera import PTZMetrics
from frigate.comms.dispatcher import Dispatcher
from frigate.config import CameraConfig, FrigateConfig, ZoomingModeEnum
from frigate.const import (
    AUTOTRACKING_MAX_AREA_RATIO,
    AUTOTRACKING_MAX_MOVE_METRICS,
    AUTOTRACKING_MOTION_MAX_POINTS,
    AUTOTRACKING_MOTION_MIN_DISTANCE,
    AUTOTRACKING_ZOOM_EDGE_THRESHOLD,
    AUTOTRACKING_ZOOM_IN_HYSTERESIS,
    AUTOTRACKING_ZOOM_OUT_HYSTERESIS,
)
from frigate.ptz.onvif import OnvifController
from frigate.track.tracked_object import TrackedObject
from frigate.util.builtin import update_yaml_file_bulk
from frigate.util.config import find_config_file
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
    def __init__(self, config: CameraConfig, ptz_metrics: PTZMetrics) -> None:
        self.frame_manager = SharedMemoryFrameManager()
        self.norfair_motion_estimator = None
        self.camera_config = config
        self.coord_transformations = None
        self.ptz_metrics = ptz_metrics
        self.ptz_metrics.reset.set()
        logger.debug(f"{config.name}: Motion estimator init")

    def motion_estimator(
        self,
        detections: list[tuple[Any, Any, Any, Any, Any, Any]],
        frame_name: str,
        frame_time: float,
        camera: str | None,
    ):
        # If we've just started up or returned to our preset, reset motion estimator for new tracking session
        if self.ptz_metrics.reset.is_set():
            self.ptz_metrics.reset.clear()

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
            frame_time,
            self.ptz_metrics.start_time.value,
            self.ptz_metrics.stop_time.value,
        ):
            logger.debug(
                f"{camera}: Motion estimator running - frame time: {frame_time}"
            )

            yuv_frame = self.frame_manager.get(
                frame_name, self.camera_config.frame_shape_yuv
            )

            if yuv_frame is None:
                self.coord_transformations = None
                return None

            frame = cv2.cvtColor(yuv_frame, cv2.COLOR_YUV2GRAY_I420)

            # mask out detections for better motion estimation
            mask = np.ones(frame.shape[:2], frame.dtype)

            detection_boxes = [x[2] for x in detections]
            for detection in detection_boxes:
                x1, y1, x2, y2 = detection
                mask[y1:y2, x1:x2] = 0

            # merge camera config motion mask with detections. Norfair function needs 0,1 mask
            mask = np.bitwise_and(mask, self.camera_config.motion.rasterized_mask).clip(
                max=1
            )

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
                    f"{camera}: Motion estimator transformation: {self.coord_transformations.rel_to_abs([[0, 0]])}"
                )
            except Exception:
                pass

            self.frame_manager.close(frame_name)

        return self.coord_transformations


class PtzAutoTrackerThread(threading.Thread):
    def __init__(
        self,
        config: FrigateConfig,
        onvif: OnvifController,
        ptz_metrics: dict[str, PTZMetrics],
        dispatcher: Dispatcher,
        stop_event: MpEvent,
    ) -> None:
        super().__init__(name="ptz_autotracker")
        self.ptz_autotracker = PtzAutoTracker(
            config, onvif, ptz_metrics, dispatcher, stop_event
        )
        self.stop_event = stop_event
        self.config = config

    def run(self):
        while not self.stop_event.wait(1):
            for camera, camera_config in self.config.cameras.items():
                if not camera_config.enabled:
                    continue

                if camera_config.onvif.autotracking.enabled:
                    future = asyncio.run_coroutine_threadsafe(
                        self.ptz_autotracker.camera_maintenance(camera),
                        self.ptz_autotracker.onvif.loop,
                    )
                    # Wait for the coroutine to complete
                    future.result()
                else:
                    # disabled dynamically by mqtt
                    if self.ptz_autotracker.tracked_object.get(camera):
                        self.ptz_autotracker.tracked_object[camera] = None
                        self.ptz_autotracker.tracked_object_history[camera].clear()

        logger.info("Exiting autotracker...")


class PtzAutoTracker:
    def __init__(
        self,
        config: FrigateConfig,
        onvif: OnvifController,
        ptz_metrics: PTZMetrics,
        dispatcher: Dispatcher,
        stop_event: MpEvent,
    ) -> None:
        self.config = config
        self.onvif = onvif
        self.ptz_metrics = ptz_metrics
        self.dispatcher = dispatcher
        self.stop_event = stop_event
        self.tracked_object: dict[str, object] = {}
        self.tracked_object_history: dict[str, object] = {}
        self.tracked_object_metrics: dict[str, object] = {}
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
        self.zoom_time: dict[str, float] = {}
        self.zoom_factor: dict[str, object] = {}

        # if cam is set to autotrack, onvif should be set up
        for camera, camera_config in self.config.cameras.items():
            if not camera_config.enabled:
                continue

            self.autotracker_init[camera] = False
            if (
                camera_config.onvif.autotracking.enabled
                and camera_config.onvif.autotracking.enabled_in_config
            ):
                future = asyncio.run_coroutine_threadsafe(
                    self._autotracker_setup(camera_config, camera), self.onvif.loop
                )
                # Wait for the coroutine to complete
                future.result()

    async def _autotracker_setup(self, camera_config: CameraConfig, camera: str):
        logger.debug(f"{camera}: Autotracker init")

        self.object_types[camera] = camera_config.onvif.autotracking.track
        self.required_zones[camera] = camera_config.onvif.autotracking.required_zones
        self.zoom_factor[camera] = camera_config.onvif.autotracking.zoom_factor

        self.tracked_object[camera] = None
        self.tracked_object_history[camera] = deque(
            maxlen=round(camera_config.detect.fps * 1.5)
        )
        self.tracked_object_metrics[camera] = {
            "max_target_box": AUTOTRACKING_MAX_AREA_RATIO
            ** (1 / self.zoom_factor[camera])
        }

        self.calibrating[camera] = False
        self.move_metrics[camera] = []
        self.intercept[camera] = None
        self.move_coefficients[camera] = []

        self.move_queues[camera] = asyncio.Queue()
        self.move_queue_locks[camera] = asyncio.Lock()

        # handle onvif constructor failing due to no connection
        if camera not in self.onvif.cams:
            logger.warning(
                f"Disabling autotracking for {camera}: onvif connection failed"
            )
            camera_config.onvif.autotracking.enabled = False
            self.ptz_metrics[camera].autotracker_enabled.value = False
            return

        if not self.onvif.cams[camera]["init"]:
            if not await self.onvif._init_onvif(camera):
                logger.warning(
                    f"Disabling autotracking for {camera}: Unable to initialize onvif"
                )
                camera_config.onvif.autotracking.enabled = False
                self.ptz_metrics[camera].autotracker_enabled.value = False
                return

            if "pt-r-fov" not in self.onvif.cams[camera]["features"]:
                logger.warning(
                    f"Disabling autotracking for {camera}: FOV relative movement not supported"
                )
                camera_config.onvif.autotracking.enabled = False
                self.ptz_metrics[camera].autotracker_enabled.value = False
                return

            move_status_supported = await self.onvif.get_service_capabilities(camera)

            if not (
                isinstance(move_status_supported, bool) and move_status_supported
            ) and not (
                isinstance(move_status_supported, str)
                and move_status_supported.lower() == "true"
            ):
                logger.warning(
                    f"Disabling autotracking for {camera}: ONVIF MoveStatus not supported"
                )
                camera_config.onvif.autotracking.enabled = False
                self.ptz_metrics[camera].autotracker_enabled.value = False
                return

        if self.onvif.cams[camera]["init"]:
            await self.onvif.get_camera_status(camera)

            # movement queue with asyncio on OnvifController loop
            asyncio.run_coroutine_threadsafe(
                self._process_move_queue(camera), self.onvif.loop
            )

            if camera_config.onvif.autotracking.movement_weights:
                if len(camera_config.onvif.autotracking.movement_weights) == 6:
                    camera_config.onvif.autotracking.movement_weights = [
                        float(val)
                        for val in camera_config.onvif.autotracking.movement_weights
                    ]
                    self.ptz_metrics[
                        camera
                    ].min_zoom.value = (
                        camera_config.onvif.autotracking.movement_weights[0]
                    )
                    self.ptz_metrics[
                        camera
                    ].max_zoom.value = (
                        camera_config.onvif.autotracking.movement_weights[1]
                    )
                    self.intercept[camera] = (
                        camera_config.onvif.autotracking.movement_weights[2]
                    )
                    self.move_coefficients[camera] = (
                        camera_config.onvif.autotracking.movement_weights[3:5]
                    )
                    self.zoom_time[camera] = (
                        camera_config.onvif.autotracking.movement_weights[5]
                    )
                else:
                    camera_config.onvif.autotracking.enabled = False
                    self.ptz_metrics[camera].autotracker_enabled.value = False
                    logger.warning(
                        f"Autotracker recalibration is required for {camera}. Disabling autotracking."
                    )

            if camera_config.onvif.autotracking.calibrate_on_startup:
                await self._calibrate_camera(camera)

        self.ptz_metrics[camera].tracking_active.clear()
        self.dispatcher.publish(f"{camera}/ptz_autotracker/active", "OFF", retain=False)
        self.autotracker_init[camera] = True

    def _write_config(self, camera):
        config_file = find_config_file()

        logger.debug(
            f"{camera}: Writing new config with autotracker motion coefficients: {self.config.cameras[camera].onvif.autotracking.movement_weights}"
        )

        update_yaml_file_bulk(
            config_file,
            {
                f"cameras.{camera}.onvif.autotracking.movement_weights": self.config.cameras[
                    camera
                ].onvif.autotracking.movement_weights
            },
        )

    async def _calibrate_camera(self, camera):
        # move the camera from the preset in steps and measure the time it takes to move that amount
        # this will allow us to predict movement times with a simple linear regression
        # start with 0 so we can determine a baseline (to be used as the intercept in the regression calc)
        # TODO: take zooming into account too
        num_steps = 30
        step_sizes = np.linspace(0, 1, num_steps)
        zoom_in_values = []
        zoom_out_values = []

        self.calibrating[camera] = True

        logger.info(f"Camera calibration for {camera} in progress")

        # zoom levels test
        self.zoom_time[camera] = 0

        if (
            self.config.cameras[camera].onvif.autotracking.zooming
            != ZoomingModeEnum.disabled
        ):
            logger.info(f"Calibration for {camera} in progress: 0% complete")

            for i in range(2):
                # absolute move to 0 - fully zoomed out
                await self.onvif._zoom_absolute(
                    camera,
                    self.onvif.cams[camera]["absolute_zoom_range"]["XRange"]["Min"],
                    1,
                )

                while not self.ptz_metrics[camera].motor_stopped.is_set():
                    await self.onvif.get_camera_status(camera)

                zoom_out_values.append(self.ptz_metrics[camera].zoom_level.value)

                await self.onvif._zoom_absolute(
                    camera,
                    self.onvif.cams[camera]["absolute_zoom_range"]["XRange"]["Max"],
                    1,
                )

                while not self.ptz_metrics[camera].motor_stopped.is_set():
                    await self.onvif.get_camera_status(camera)

                zoom_in_values.append(self.ptz_metrics[camera].zoom_level.value)

                if (
                    self.config.cameras[camera].onvif.autotracking.zooming
                    == ZoomingModeEnum.relative
                ):
                    # relative move to -0.01
                    await self.onvif._move_relative(
                        camera,
                        0,
                        0,
                        -1e-2,
                        1,
                    )

                    while not self.ptz_metrics[camera].motor_stopped.is_set():
                        await self.onvif.get_camera_status(camera)

                    zoom_out_values.append(self.ptz_metrics[camera].zoom_level.value)

                    zoom_start_time = time.time()
                    # relative move to 0.01
                    await self.onvif._move_relative(
                        camera,
                        0,
                        0,
                        1e-2,
                        1,
                    )

                    while not self.ptz_metrics[camera].motor_stopped.is_set():
                        await self.onvif.get_camera_status(camera)

                    zoom_stop_time = time.time()

                    full_relative_start_time = time.time()

                    await self.onvif._move_relative(
                        camera,
                        -1,
                        -1,
                        -1e-2,
                        1,
                    )

                    while not self.ptz_metrics[camera].motor_stopped.is_set():
                        await self.onvif.get_camera_status(camera)

                    full_relative_stop_time = time.time()

                    await self.onvif._move_relative(
                        camera,
                        1,
                        1,
                        1e-2,
                        1,
                    )

                    while not self.ptz_metrics[camera].motor_stopped.is_set():
                        await self.onvif.get_camera_status(camera)

                    self.zoom_time[camera] = (
                        full_relative_stop_time - full_relative_start_time
                    ) - (zoom_stop_time - zoom_start_time)

                    zoom_in_values.append(self.ptz_metrics[camera].zoom_level.value)

            self.ptz_metrics[camera].max_zoom.value = max(zoom_in_values)
            self.ptz_metrics[camera].min_zoom.value = min(zoom_out_values)

            logger.debug(
                f"{camera}: Calibration values: max zoom: {self.ptz_metrics[camera].max_zoom.value}, min zoom: {self.ptz_metrics[camera].min_zoom.value}, zoom time: {self.zoom_time[camera]}"
            )

        else:
            self.ptz_metrics[camera].max_zoom.value = 1
            self.ptz_metrics[camera].min_zoom.value = 0

        await self.onvif._move_to_preset(
            camera,
            self.config.cameras[camera].onvif.autotracking.return_preset.lower(),
        )
        self.ptz_metrics[camera].reset.set()
        self.ptz_metrics[camera].motor_stopped.clear()

        # Wait until the camera finishes moving
        while not self.ptz_metrics[camera].motor_stopped.is_set():
            await self.onvif.get_camera_status(camera)

        for step in range(num_steps):
            pan = step_sizes[step]
            tilt = step_sizes[step]

            start_time = time.time()
            await self.onvif._move_relative(camera, pan, tilt, 0, 1)

            # Wait until the camera finishes moving
            while not self.ptz_metrics[camera].motor_stopped.is_set():
                await self.onvif.get_camera_status(camera)
            stop_time = time.time()

            self.move_metrics[camera].append(
                {
                    "pan": pan,
                    "tilt": tilt,
                    "start_timestamp": start_time,
                    "end_timestamp": stop_time,
                }
            )

            await self.onvif._move_to_preset(
                camera,
                self.config.cameras[camera].onvif.autotracking.return_preset.lower(),
            )
            self.ptz_metrics[camera].reset.set()
            self.ptz_metrics[camera].motor_stopped.clear()

            # Wait until the camera finishes moving
            while not self.ptz_metrics[camera].motor_stopped.is_set():
                await self.onvif.get_camera_status(camera)

            logger.info(
                f"Calibration for {camera} in progress: {round((step / num_steps) * 100)}% complete"
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
            coefficients = np.linalg.lstsq(X_with_intercept, y, rcond=None)[0]

            intercept, slope = coefficients

            # Define reasonable bounds for PTZ movement times
            MIN_MOVEMENT_TIME = 0.1  # Minimum time for any movement (100ms)
            MAX_MOVEMENT_TIME = 10.0  # Maximum time for any movement
            MAX_SLOPE = 2.0  # Maximum seconds per unit of movement

            coefficients_valid = (
                MIN_MOVEMENT_TIME <= intercept <= MAX_MOVEMENT_TIME
                and 0 < slope <= MAX_SLOPE
            )

            if not coefficients_valid:
                logger.warning(
                    f"{camera}: Autotracking calibration failed. See the Frigate documentation."
                )
                return False

            # If coefficients are valid, proceed with updates
            self.move_coefficients[camera] = coefficients

            # only assign a new intercept if we're calibrating
            if calibration:
                self.intercept[camera] = y[0]

            # write the min zoom, max zoom, intercept, and coefficients
            # back to the config file as a comma separated string
            self.config.cameras[camera].onvif.autotracking.movement_weights = ", ".join(
                str(v)
                for v in [
                    self.ptz_metrics[camera].min_zoom.value,
                    self.ptz_metrics[camera].max_zoom.value,
                    self.intercept[camera],
                    *self.move_coefficients[camera],
                    self.zoom_time[camera],
                ]
            )

            logger.debug(
                f"{camera}: New regression parameters - intercept: {self.intercept[camera]}, coefficients: {self.move_coefficients[camera]}"
            )

            self._write_config(camera)

    def _predict_movement_time(self, camera, pan, tilt):
        combined_movement = abs(pan) + abs(tilt)
        input_data = np.array([self.intercept[camera], combined_movement])

        return np.dot(self.move_coefficients[camera], input_data)

    def _predict_area_after_time(self, camera, time):
        return np.dot(
            self.tracked_object_metrics[camera]["area_coefficients"],
            [self.tracked_object_history[camera][-1]["frame_time"] + time],
        )

    def _calculate_tracked_object_metrics(self, camera, obj):
        def remove_outliers(data):
            areas = [item["area"] for item in data]

            Q1 = np.percentile(areas, 25)
            Q3 = np.percentile(areas, 75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR

            filtered_data = [
                item for item in data if lower_bound <= item["area"] <= upper_bound
            ]

            # Find and log the removed values
            removed_values = [item for item in data if item not in filtered_data]
            logger.debug(f"{camera}: Removed area outliers: {removed_values}")

            return filtered_data

        camera_config = self.config.cameras[camera]
        camera_width = camera_config.frame_shape[1]
        camera_height = camera_config.frame_shape[0]

        # Extract areas and calculate weighted average
        # grab the largest dimension of the bounding box and create a square from that
        # Filter out the initial frame and use a recent time window
        current_time = obj.obj_data["frame_time"]
        time_window = 1.5  # seconds
        history = [
            entry
            for entry in self.tracked_object_history[camera]
            if not entry.get("is_initial_frame", False)
            and current_time - entry["frame_time"] <= time_window
        ]
        if not history:  # Fallback to latest if no recent entries
            history = [self.tracked_object_history[camera][-1]]

        areas = [
            {
                "frame_time": entry["frame_time"],
                "box": entry["box"],
                "area": max(
                    entry["box"][2] - entry["box"][0], entry["box"][3] - entry["box"][1]
                )
                ** 2,
            }
            for entry in history
        ]

        filtered_areas = remove_outliers(areas) if len(areas) > 3 else areas

        # Filter entries that are not touching the frame edge
        filtered_areas_not_touching_edge = [
            entry
            for entry in filtered_areas
            if self._touching_frame_edges(camera, entry["box"]) == 0
        ]

        # Calculate regression for area change predictions
        if len(filtered_areas_not_touching_edge):
            X = np.array(
                [item["frame_time"] for item in filtered_areas_not_touching_edge]
            )
            y = np.array([item["area"] for item in filtered_areas_not_touching_edge])

            self.tracked_object_metrics[camera]["area_coefficients"] = np.linalg.lstsq(
                X.reshape(-1, 1), y, rcond=None
            )[0]
        else:
            self.tracked_object_metrics[camera]["area_coefficients"] = np.array([0])

        weights = np.arange(1, len(filtered_areas) + 1)
        weighted_area = np.average(
            [item["area"] for item in filtered_areas], weights=weights
        )

        self.tracked_object_metrics[camera]["target_box"] = (
            weighted_area / (camera_width * camera_height)
        ) ** self.zoom_factor[camera]

        if "original_target_box" not in self.tracked_object_metrics[camera]:
            self.tracked_object_metrics[camera]["original_target_box"] = (
                self.tracked_object_metrics[camera]["target_box"]
            )

        (
            self.tracked_object_metrics[camera]["valid_velocity"],
            self.tracked_object_metrics[camera]["velocity"],
        ) = self._get_valid_velocity(camera, obj)
        self.tracked_object_metrics[camera]["distance"] = self._get_distance_threshold(
            camera, obj
        )

        centroid_distance = np.linalg.norm(
            [
                obj.obj_data["centroid"][0] - camera_config.detect.width / 2,
                obj.obj_data["centroid"][1] - camera_config.detect.height / 2,
            ]
        )

        logger.debug(f"{camera}: Centroid distance: {centroid_distance}")

        self.tracked_object_metrics[camera]["below_distance_threshold"] = (
            centroid_distance < self.tracked_object_metrics[camera]["distance"]
        )

    async def _process_move_queue(self, camera):
        move_queue = self.move_queues[camera]

        while not self.stop_event.is_set():
            try:
                # Asynchronously wait for move data with a timeout
                move_data = await asyncio.wait_for(move_queue.get(), timeout=0.1)
            except asyncio.TimeoutError:
                continue

            async with self.move_queue_locks[camera]:
                frame_time, pan, tilt, zoom = move_data

                # if we're receiving move requests during a PTZ move, ignore them
                if ptz_moving_at_frame_time(
                    frame_time,
                    self.ptz_metrics[camera].start_time.value,
                    self.ptz_metrics[camera].stop_time.value,
                ):
                    logger.debug(
                        f"{camera}: Move queue: PTZ moving, dequeueing move request - frame time: {frame_time}, final pan: {pan}, final tilt: {tilt}, final zoom: {zoom}"
                    )
                    continue

                else:
                    if (
                        self.config.cameras[camera].onvif.autotracking.zooming
                        == ZoomingModeEnum.relative
                    ):
                        await self.onvif._move_relative(camera, pan, tilt, zoom, 1)
                    else:
                        if pan != 0 or tilt != 0:
                            await self.onvif._move_relative(camera, pan, tilt, 0, 1)

                            # Wait until the camera finishes moving
                            while not self.ptz_metrics[camera].motor_stopped.is_set():
                                await self.onvif.get_camera_status(camera)

                        if (
                            zoom > 0
                            and self.ptz_metrics[camera].zoom_level.value != zoom
                        ):
                            await self.onvif._zoom_absolute(camera, zoom, 1)

                    # Wait until the camera finishes moving
                    while not self.ptz_metrics[camera].motor_stopped.is_set():
                        await self.onvif.get_camera_status(camera)

                    if self.config.cameras[camera].onvif.autotracking.movement_weights:
                        logger.debug(
                            f"{camera}: Predicted movement time: {self._predict_movement_time(camera, pan, tilt)}"
                        )
                        logger.debug(
                            f"{camera}: Actual movement time: {self.ptz_metrics[camera].stop_time.value - self.ptz_metrics[camera].start_time.value}"
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
                                "start_timestamp": self.ptz_metrics[
                                    camera
                                ].start_time.value,
                                "end_timestamp": self.ptz_metrics[
                                    camera
                                ].stop_time.value,
                            }
                        )

                    # calculate new coefficients if we have enough data
                    self._calculate_move_coefficients(camera)

        # Clean up the queue on exit
        while not move_queue.empty():
            await move_queue.get()

    def _enqueue_move(self, camera, frame_time, pan, tilt, zoom):
        def split_value(value, suppress_diff=True):
            clipped = np.clip(value, -1, 1)

            # don't make small movements
            if -0.05 < clipped < 0.05 and suppress_diff:
                diff = 0.0
            else:
                diff = value - clipped

            return clipped, diff

        if (
            frame_time > self.ptz_metrics[camera].start_time.value
            and frame_time > self.ptz_metrics[camera].stop_time.value
            and not self.move_queue_locks[camera].locked()
        ):
            # we can split up any large moves caused by velocity estimated movements if necessary
            # get an excess amount and assign it instead of 0 below
            while pan != 0 or tilt != 0 or zoom != 0:
                pan, _ = split_value(pan)
                tilt, _ = split_value(tilt)
                zoom, _ = split_value(zoom, False)

                logger.debug(
                    f"{camera}: Enqueue movement for frame time: {frame_time} pan: {pan}, tilt: {tilt}, zoom: {zoom}"
                )
                move_data = (frame_time, pan, tilt, zoom)
                self.onvif.loop.call_soon_threadsafe(
                    self.move_queues[camera].put_nowait, move_data
                )

                # reset values to not split up large movements
                pan = 0
                tilt = 0
                zoom = 0

    def _touching_frame_edges(self, camera, box):
        camera_config = self.config.cameras[camera]
        camera_width = camera_config.frame_shape[1]
        camera_height = camera_config.frame_shape[0]
        bb_left, bb_top, bb_right, bb_bottom = box

        edge_threshold = AUTOTRACKING_ZOOM_EDGE_THRESHOLD

        return int(
            (bb_left < edge_threshold * camera_width)
            + (bb_right > (1 - edge_threshold) * camera_width)
            + (bb_top < edge_threshold * camera_height)
            + (bb_bottom > (1 - edge_threshold) * camera_height)
        )

    def _get_valid_velocity(self, camera, obj):
        # returns a tuple and euclidean distance if the estimated velocity is valid
        # if invalid, returns [0, 0] and -1
        camera_config = self.config.cameras[camera]
        camera_width = camera_config.frame_shape[1]
        camera_height = camera_config.frame_shape[0]
        camera_fps = camera_config.detect.fps

        # estimate_velocity is a numpy array of bbox top,left and bottom,right velocities
        velocities = obj.obj_data["estimate_velocity"]
        logger.debug(
            f"{camera}: Velocity (Norfair): {tuple(np.round(velocities).flatten().astype(int))}"
        )

        # if we are close enough to zero, return right away
        if np.all(np.round(velocities) == 0):
            return True, np.zeros((4,))

        # Thresholds
        x_mags_thresh = camera_width / camera_fps / 2
        y_mags_thresh = camera_height / camera_fps / 2
        dir_thresh = 0.93
        delta_thresh = 20
        var_thresh = 10

        # Check magnitude
        x_mags = np.abs(velocities[:, 0])
        y_mags = np.abs(velocities[:, 1])
        invalid_x_mags = np.any(x_mags > x_mags_thresh)
        invalid_y_mags = np.any(y_mags > y_mags_thresh)

        # Check delta
        delta = np.abs(velocities[0] - velocities[1])
        invalid_delta = np.any(delta > delta_thresh)

        # Check variance
        stdev_list = np.std(velocities, axis=0)
        high_variances = np.any(stdev_list > var_thresh)

        # Check direction difference
        velocities = np.round(velocities)
        invalid_dirs = False
        if not np.any(np.linalg.norm(velocities, axis=1)):
            cosine_sim = np.dot(velocities[0], velocities[1]) / (
                np.linalg.norm(velocities[0]) * np.linalg.norm(velocities[1])
            )
            dir_thresh = 0.6 if np.all(delta < delta_thresh / 2) else dir_thresh
            invalid_dirs = cosine_sim < dir_thresh

        # Combine
        invalid = (
            invalid_x_mags
            or invalid_y_mags
            or invalid_dirs
            or invalid_delta
            or high_variances
        )

        if invalid:
            logger.debug(
                f"{camera}: Invalid velocity: {tuple(np.round(velocities, 2).flatten().astype(int))}: Invalid because: "
                + ", ".join(
                    [
                        var_name
                        for var_name, is_invalid in [
                            ("invalid_x_mags", invalid_x_mags),
                            ("invalid_y_mags", invalid_y_mags),
                            ("invalid_dirs", invalid_dirs),
                            ("invalid_delta", invalid_delta),
                            ("high_variances", high_variances),
                        ]
                        if is_invalid
                    ]
                )
            )
            # invalid velocity
            return False, np.zeros((4,))
        else:
            logger.debug(f"{camera}: Valid velocity ")
            return True, velocities.flatten()

    def _get_distance_threshold(self, camera: str, obj: TrackedObject):
        # Returns true if Euclidean distance from object to center of frame is
        # less than 10% of the of the larger dimension (width or height) of the frame,
        # multiplied by a scaling factor for object size.
        # Distance is increased if object is not moving to prevent small ptz moves
        # Adjusting this percentage slightly lower will effectively cause the camera to move
        # more often to keep the object in the center. Raising the percentage will cause less
        # movement and will be more flexible with objects not quite being centered.
        # TODO: there's probably a better way to approach this
        camera_config = self.config.cameras[camera]

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

        percentage = (
            0.08
            if camera_config.onvif.autotracking.movement_weights
            and self.tracked_object_metrics[camera]["valid_velocity"]
            else 0.03
        )
        distance_threshold = percentage * max_frame * scaling_factor

        logger.debug(f"{camera}: Distance threshold: {distance_threshold}")

        return distance_threshold

    def _should_zoom_in(
        self, camera: str, obj: TrackedObject, box, predicted_time, debug_zooming=False
    ):
        # returns True if we should zoom in, False if we should zoom out, None to do nothing
        camera_config = self.config.cameras[camera]
        camera_width = camera_config.frame_shape[1]
        camera_height = camera_config.frame_shape[0]
        camera_fps = camera_config.detect.fps

        average_velocity = self.tracked_object_metrics[camera]["velocity"]

        bb_left, bb_top, bb_right, bb_bottom = box

        # calculate a velocity threshold based on movement coefficients if available
        if camera_config.onvif.autotracking.movement_weights:
            predicted_movement_time = self._predict_movement_time(camera, 1, 1)
            velocity_threshold_x = camera_width / predicted_movement_time / camera_fps
            velocity_threshold_y = camera_height / predicted_movement_time / camera_fps
        else:
            # use a generic velocity threshold
            velocity_threshold_x = camera_width * 0.02
            velocity_threshold_y = camera_height * 0.02

        # return a count of the number of frame edges the bounding box is touching
        touching_frame_edges = self._touching_frame_edges(camera, box)

        # make sure object is centered in the frame
        below_distance_threshold = self.tracked_object_metrics[camera][
            "below_distance_threshold"
        ]

        below_dimension_threshold = (bb_right - bb_left) <= camera_width * (
            self.zoom_factor[camera] + 0.1
        ) and (bb_bottom - bb_top) <= camera_height * (self.zoom_factor[camera] + 0.1)

        # ensure object is not moving quickly
        below_velocity_threshold = np.all(
            np.abs(average_velocity)
            < np.tile([velocity_threshold_x, velocity_threshold_y], 2)
        ) or np.all(average_velocity == 0)

        if not predicted_time:
            calculated_target_box = self.tracked_object_metrics[camera]["target_box"]
        else:
            calculated_target_box = self.tracked_object_metrics[camera][
                "target_box"
            ] + self._predict_area_after_time(camera, predicted_time) / (
                camera_width * camera_height
            )

        below_area_threshold = (
            calculated_target_box
            < self.tracked_object_metrics[camera]["max_target_box"]
        )

        # introduce some hysteresis to prevent a yo-yo zooming effect
        zoom_out_hysteresis = (
            calculated_target_box
            > self.tracked_object_metrics[camera]["max_target_box"]
            * AUTOTRACKING_ZOOM_OUT_HYSTERESIS
        )
        zoom_in_hysteresis = (
            calculated_target_box
            < self.tracked_object_metrics[camera]["max_target_box"]
            * AUTOTRACKING_ZOOM_IN_HYSTERESIS
        )

        at_max_zoom = (
            self.ptz_metrics[camera].zoom_level.value
            == self.ptz_metrics[camera].max_zoom.value
        )
        at_min_zoom = (
            self.ptz_metrics[camera].zoom_level.value
            == self.ptz_metrics[camera].min_zoom.value
        )

        # debug zooming
        if debug_zooming:
            logger.debug(
                f"{camera}: Zoom test: touching edges: count: {touching_frame_edges} left: {bb_left < AUTOTRACKING_ZOOM_EDGE_THRESHOLD * camera_width}, right: {bb_right > (1 - AUTOTRACKING_ZOOM_EDGE_THRESHOLD) * camera_width}, top: {bb_top < AUTOTRACKING_ZOOM_EDGE_THRESHOLD * camera_height}, bottom: {bb_bottom > (1 - AUTOTRACKING_ZOOM_EDGE_THRESHOLD) * camera_height}"
            )
            logger.debug(
                f"{camera}: Zoom test: below distance threshold: {(below_distance_threshold)}"
            )
            logger.debug(
                f"{camera}: Zoom test: below area threshold: {(below_area_threshold)} target: {self.tracked_object_metrics[camera]['target_box']}, calculated: {calculated_target_box}, max: {self.tracked_object_metrics[camera]['max_target_box']}"
            )
            logger.debug(
                f"{camera}: Zoom test: below dimension threshold: {below_dimension_threshold} width: {bb_right - bb_left}, max width: {camera_width * (self.zoom_factor[camera] + 0.1)}, height: {bb_bottom - bb_top}, max height: {camera_height * (self.zoom_factor[camera] + 0.1)}"
            )
            logger.debug(
                f"{camera}: Zoom test: below velocity threshold: {below_velocity_threshold} velocity x: {abs(average_velocity[0])}, x threshold: {velocity_threshold_x}, velocity y: {abs(average_velocity[0])}, y threshold: {velocity_threshold_y}"
            )
            logger.debug(f"{camera}: Zoom test: at max zoom: {at_max_zoom}")
            logger.debug(f"{camera}: Zoom test: at min zoom: {at_min_zoom}")
            logger.debug(
                f"{camera}: Zoom test: zoom in hysteresis limit: {zoom_in_hysteresis} value: {AUTOTRACKING_ZOOM_IN_HYSTERESIS} original: {self.tracked_object_metrics[camera]['original_target_box']} max: {self.tracked_object_metrics[camera]['max_target_box']} target: {calculated_target_box if calculated_target_box else self.tracked_object_metrics[camera]['target_box']}"
            )
            logger.debug(
                f"{camera}: Zoom test: zoom out hysteresis limit: {zoom_out_hysteresis} value: {AUTOTRACKING_ZOOM_OUT_HYSTERESIS} original: {self.tracked_object_metrics[camera]['original_target_box']} max: {self.tracked_object_metrics[camera]['max_target_box']} target: {calculated_target_box if calculated_target_box else self.tracked_object_metrics[camera]['target_box']}"
            )

        # Zoom in conditions (and)
        if (
            zoom_in_hysteresis
            and touching_frame_edges == 0
            and below_velocity_threshold
            and below_dimension_threshold
            and below_area_threshold
            and not at_max_zoom
        ):
            return True

        # Zoom out conditions (or)
        if (
            (
                zoom_out_hysteresis
                and not at_max_zoom
                and (not below_area_threshold or not below_dimension_threshold)
            )
            or (zoom_out_hysteresis and not below_area_threshold and at_max_zoom)
            or (
                touching_frame_edges == 1
                and (below_distance_threshold or not below_dimension_threshold)
            )
            or touching_frame_edges > 1
            or not below_velocity_threshold
        ) and not at_min_zoom:
            return False

        # Don't zoom at all
        return None

    def _autotrack_move_ptz(self, camera: str, obj: TrackedObject):
        camera_config = self.config.cameras[camera]
        camera_width = camera_config.frame_shape[1]
        camera_height = camera_config.frame_shape[0]
        camera_fps = camera_config.detect.fps
        predicted_movement_time = 0
        zoom_distance = 0

        average_velocity = np.zeros((4,))
        predicted_box = obj.obj_data["box"]
        zoom_predicted_box = obj.obj_data["box"]

        centroid_x = obj.obj_data["centroid"][0]
        centroid_y = obj.obj_data["centroid"][1]

        # Normalize coordinates. top right of the fov is (1,1), center is (0,0), bottom left is (-1, -1).
        pan = ((centroid_x / camera_width) - 0.5) * 2
        tilt = (0.5 - (centroid_y / camera_height)) * 2

        _, average_velocity = (
            self._get_valid_velocity(camera, obj)
            if "velocity" not in self.tracked_object_metrics[camera]
            else (
                self.tracked_object_metrics[camera]["valid_velocity"],
                self.tracked_object_metrics[camera]["velocity"],
            )
        )

        if (
            camera_config.onvif.autotracking.movement_weights
        ):  # use estimates if we have available coefficients
            predicted_movement_time = self._predict_movement_time(camera, pan, tilt)

            if np.any(average_velocity):
                # this box could exceed the frame boundaries if velocity is high
                # but we'll handle that in _enqueue_move() as two separate moves
                current_box = np.array(obj.obj_data["box"])
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

            logger.debug(f"{camera}: Original box: {obj.obj_data['box']}")
            logger.debug(f"{camera}: Predicted box: {tuple(predicted_box)}")
            logger.debug(
                f"{camera}: Velocity: {tuple(np.round(average_velocity).flatten().astype(int))}"
            )

        zoom = self._get_zoom_amount(
            camera, obj, predicted_box, predicted_movement_time, debug_zoom=True
        )

        if (
            camera_config.onvif.autotracking.movement_weights
            and camera_config.onvif.autotracking.zooming == ZoomingModeEnum.relative
            and zoom != 0
        ):
            zoom_predicted_movement_time = 0

            if np.any(average_velocity):
                # Calculate the intended change in zoom level
                zoom_change = (1 - abs(zoom)) * (1 if zoom >= 0 else -1)

                # Calculate new zoom level and clamp to [0, 1]
                new_zoom = max(
                    0, min(1, self.ptz_metrics[camera].zoom_level.value + zoom_change)
                )

                # Calculate the actual zoom distance
                zoom_distance = abs(
                    new_zoom - self.ptz_metrics[camera].zoom_level.value
                )

                zoom_predicted_movement_time = zoom_distance * self.zoom_time[camera]

                zoom_predicted_box = (
                    predicted_box
                    + camera_fps * zoom_predicted_movement_time * average_velocity
                )

                zoom_predicted_box = np.round(zoom_predicted_box).astype(int)

                centroid_x = round((zoom_predicted_box[0] + zoom_predicted_box[2]) / 2)
                centroid_y = round((zoom_predicted_box[1] + zoom_predicted_box[3]) / 2)

                # recalculate pan and tilt with new centroid
                pan = ((centroid_x / camera_width) - 0.5) * 2
                tilt = (0.5 - (centroid_y / camera_height)) * 2

            logger.debug(
                f"{camera}: Zoom amount: {zoom}, zoom distance: {zoom_distance}, zoom predicted time: {zoom_predicted_movement_time}, zoom predicted box: {tuple(zoom_predicted_box)}"
            )

        self._enqueue_move(camera, obj.obj_data["frame_time"], pan, tilt, zoom)

    def _autotrack_move_zoom_only(self, camera, obj):
        camera_config = self.config.cameras[camera]

        if camera_config.onvif.autotracking.zooming != ZoomingModeEnum.disabled:
            zoom = self._get_zoom_amount(camera, obj, obj.obj_data["box"], 0)

            if zoom != 0:
                self._enqueue_move(camera, obj.obj_data["frame_time"], 0, 0, zoom)

    def _get_zoom_amount(
        self,
        camera: str,
        obj: TrackedObject,
        predicted_box,
        predicted_movement_time,
        debug_zoom=True,
    ):
        camera_config = self.config.cameras[camera]

        # frame width and height
        camera_width = camera_config.frame_shape[1]
        camera_height = camera_config.frame_shape[0]

        zoom = 0
        result = None
        current_zoom_level = self.ptz_metrics[camera].zoom_level.value
        target_box = max(
            obj.obj_data["box"][2] - obj.obj_data["box"][0],
            obj.obj_data["box"][3] - obj.obj_data["box"][1],
        ) ** 2 / (camera_width * camera_height)

        # absolute zooming separately from pan/tilt
        if camera_config.onvif.autotracking.zooming == ZoomingModeEnum.absolute:
            # don't zoom on initial move
            if "target_box" not in self.tracked_object_metrics[camera]:
                zoom = current_zoom_level
            else:
                if (
                    result := self._should_zoom_in(
                        camera,
                        obj,
                        obj.obj_data["box"],
                        predicted_movement_time,
                        debug_zoom,
                    )
                ) is not None:
                    # divide zoom in 10 increments and always zoom out more than in
                    level = (
                        self.ptz_metrics[camera].max_zoom.value
                        - self.ptz_metrics[camera].min_zoom.value
                    ) / 20
                    if result:
                        zoom = min(1.0, current_zoom_level + level)
                    else:
                        zoom = max(0.0, current_zoom_level - 2 * level)

        # relative zooming concurrently with pan/tilt
        if camera_config.onvif.autotracking.zooming == ZoomingModeEnum.relative:
            # this is our initial zoom in on a new object
            if "target_box" not in self.tracked_object_metrics[camera]:
                zoom = target_box ** self.zoom_factor[camera]
                if zoom > self.tracked_object_metrics[camera]["max_target_box"]:
                    zoom = -(1 - zoom)
                logger.debug(
                    f"{camera}: target box: {target_box}, max: {self.tracked_object_metrics[camera]['max_target_box']}, calc zoom: {zoom}"
                )
            else:
                if (
                    result := self._should_zoom_in(
                        camera,
                        obj,
                        predicted_box
                        if camera_config.onvif.autotracking.movement_weights
                        else obj.obj_data["box"],
                        predicted_movement_time,
                        debug_zoom,
                    )
                ) is not None:
                    if predicted_movement_time:
                        calculated_target_box = self.tracked_object_metrics[camera][
                            "target_box"
                        ] + self._predict_area_after_time(
                            camera, predicted_movement_time
                        ) / (camera_width * camera_height)
                        logger.debug(
                            f"{camera}: Zooming prediction: predicted movement time: {predicted_movement_time}, original box: {self.tracked_object_metrics[camera]['target_box']}, calculated box: {calculated_target_box}"
                        )
                    else:
                        calculated_target_box = self.tracked_object_metrics[camera][
                            "target_box"
                        ]
                    # zoom value
                    ratio = (
                        self.tracked_object_metrics[camera]["max_target_box"]
                        / calculated_target_box
                    )
                    zoom = (ratio - 1) / (ratio + 1)
                    logger.debug(
                        f"{camera}: limit: {self.tracked_object_metrics[camera]['max_target_box']}, ratio: {ratio} zoom calculation: {zoom}"
                    )
                    if not result:
                        # zoom out with special condition if zooming out because of velocity, edges, etc.
                        zoom = -(1 - zoom) if zoom > 0 else -(zoom * 2 + 1)
                    if result:
                        # zoom in
                        zoom = 1 - zoom if zoom > 0 else (zoom * 2 + 1)

        logger.debug(f"{camera}: Zooming: {result} Zoom amount: {zoom}")

        return zoom

    def is_autotracking(self, camera: str):
        return self.tracked_object[camera] is not None

    def autotracked_object_region(self, camera: str):
        return self.tracked_object[camera]["region"]

    def autotrack_object(self, camera: str, obj: TrackedObject):
        camera_config = self.config.cameras[camera]

        if camera_config.onvif.autotracking.enabled:
            if not self.autotracker_init[camera]:
                future = asyncio.run_coroutine_threadsafe(
                    self._autotracker_setup(camera_config, camera), self.onvif.loop
                )
                # Wait for the coroutine to complete
                future.result()

            if self.calibrating[camera]:
                logger.debug(f"{camera}: Calibrating camera")
                return

            # this is a brand new object that's on our camera, has our label, entered the zone,
            # is not a false positive, and is active
            if (
                # new object
                self.tracked_object[camera] is None
                and obj.camera_config.name == camera
                and obj.obj_data["label"] in self.object_types[camera]
                and set(obj.entered_zones) & set(self.required_zones[camera])
                and not obj.previous["false_positive"]
                and not obj.false_positive
                and not self.tracked_object_history[camera]
                and obj.active
            ):
                logger.debug(
                    f"{camera}: New object: {obj.obj_data['id']} {obj.obj_data['box']} {obj.obj_data['frame_time']}"
                )
                self.ptz_metrics[camera].tracking_active.set()
                self.dispatcher.publish(
                    f"{camera}/ptz_autotracker/active", "ON", retain=False
                )
                self.tracked_object[camera] = obj

                self.tracked_object_history[camera].append(copy.deepcopy(obj.obj_data))
                self._autotrack_move_ptz(camera, obj)

                return

            if (
                # already tracking an object
                self.tracked_object[camera] is not None
                and self.tracked_object_history[camera]
                and obj.obj_data["id"] == self.tracked_object[camera].obj_data["id"]
                and obj.obj_data["frame_time"]
                != self.tracked_object_history[camera][-1]["frame_time"]
            ):
                self.tracked_object_history[camera].append(copy.deepcopy(obj.obj_data))
                self._calculate_tracked_object_metrics(camera, obj)

                if not ptz_moving_at_frame_time(
                    obj.obj_data["frame_time"],
                    self.ptz_metrics[camera].start_time.value,
                    self.ptz_metrics[camera].stop_time.value,
                ):
                    if self.tracked_object_metrics[camera]["below_distance_threshold"]:
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

                return

            if (
                # The tracker lost an object, so let's check the previous object's region and compare it with the incoming object
                # If it's within bounds, start tracking that object.
                # Should we check region (maybe too broad) or expand the previous object's box a bit and check that?
                self.tracked_object[camera] is None
                and obj.camera_config.name == camera
                and obj.obj_data["label"] in self.object_types[camera]
                and not obj.previous["false_positive"]
                and not obj.false_positive
                and self.tracked_object_history[camera]
            ):
                if (
                    intersection_over_union(
                        self.tracked_object_history[camera][-1]["region"],
                        obj.obj_data["box"],
                    )
                    < 0.2
                ):
                    logger.debug(
                        f"{camera}: Reacquired object: {obj.obj_data['id']} {obj.obj_data['box']} {obj.obj_data['frame_time']}"
                    )
                    self.tracked_object[camera] = obj

                    self.tracked_object_history[camera].clear()
                    self.tracked_object_history[camera].append(
                        copy.deepcopy(obj.obj_data)
                    )
                    self._calculate_tracked_object_metrics(camera, obj)
                    self._autotrack_move_ptz(camera, obj)

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
                self.tracked_object_metrics[camera] = {
                    "max_target_box": AUTOTRACKING_MAX_AREA_RATIO
                    ** (1 / self.zoom_factor[camera])
                }

    async def camera_maintenance(self, camera):
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
        if not self.ptz_metrics[camera].motor_stopped.is_set():
            await self.onvif.get_camera_status(camera)

        # return to preset if tracking is over
        if (
            self.tracked_object[camera] is None
            and self.tracked_object_history[camera]
            and (
                # might want to use a different timestamp here?
                self.ptz_metrics[camera].frame_time.value
                - self.tracked_object_history[camera][-1]["frame_time"]
                >= autotracker_config.timeout
            )
            and autotracker_config.return_preset
        ):
            # clear tracked object and reset zoom level
            self.tracked_object[camera] = None
            self.tracked_object_history[camera].clear()

            while not self.ptz_metrics[camera].motor_stopped.is_set():
                await self.onvif.get_camera_status(camera)
            logger.debug(
                f"{camera}: Time is {self.ptz_metrics[camera].frame_time.value}, returning to preset: {autotracker_config.return_preset}"
            )
            await self.onvif._move_to_preset(
                camera,
                autotracker_config.return_preset.lower(),
            )

            # update stored zoom level from preset
            while not self.ptz_metrics[camera].motor_stopped.is_set():
                await self.onvif.get_camera_status(camera)

            self.ptz_metrics[camera].tracking_active.clear()
            self.dispatcher.publish(
                f"{camera}/ptz_autotracker/active", "OFF", retain=False
            )
            self.ptz_metrics[camera].reset.set()
