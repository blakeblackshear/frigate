"""Automatically pan, tilt, and zoom on detected objects via onvif."""

import copy
import logging
import math
import queue
import threading
import time
from functools import partial
from multiprocessing.synchronize import Event as MpEvent

import cv2
import numpy as np
from norfair.camera_motion import MotionEstimator, TranslationTransformationGetter

from frigate.config import CameraConfig, FrigateConfig
from frigate.ptz.onvif import OnvifController
from frigate.types import PTZMetricsTypes
from frigate.util.image import SharedMemoryFrameManager, intersection_over_union

logger = logging.getLogger(__name__)


def ptz_moving_at_frame_time(frame_time, ptz_start_time, ptz_stop_time):
    # Determine if the PTZ was in motion at the set frame time
    # for non ptz/autotracking cameras, this will always return False
    # ptz_start_time is initialized to 0 on startup and only changes
    # when autotracking movements are made

    # the offset "primes" the motion estimator with a few frames before movement
    offset = 0.5

    return (ptz_start_time != 0.0 and frame_time >= ptz_start_time - offset) and (
        ptz_stop_time == 0.0 or (ptz_start_time - offset <= frame_time <= ptz_stop_time)
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
            logger.debug("Motion estimator reset")
            # homography is nice (zooming) but slow, translation is pan/tilt only but fast.
            self.norfair_motion_estimator = MotionEstimator(
                transformations_getter=TranslationTransformationGetter(),
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

            self.coord_transformations = self.norfair_motion_estimator.update(
                frame, mask
            )

            self.frame_manager.close(frame_id)

            logger.debug(
                f"Motion estimator transformation: {self.coord_transformations.rel_to_abs((0,0))}"
            )

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
        self.previous_frame_time = None
        self.object_types = {}
        self.required_zones = {}
        self.move_queues = {}
        self.move_threads = {}
        self.autotracker_init = {}

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

        self.tracked_object[camera_name] = None
        self.tracked_object_previous[camera_name] = None

        self.move_queues[camera_name] = queue.Queue()

        if not self.onvif.cams[camera_name]["init"]:
            if not self.onvif._init_onvif(camera_name):
                logger.warning(f"Unable to initialize onvif for {camera_name}")
                cam.onvif.autotracking.enabled = False
                self.ptz_metrics[camera_name]["ptz_autotracker_enabled"].value = False

                return

            if not self.onvif.cams[camera_name]["relative_fov_supported"]:
                cam.onvif.autotracking.enabled = False
                self.ptz_metrics[camera_name]["ptz_autotracker_enabled"].value = False
                logger.warning(
                    f"Disabling autotracking for {camera_name}: FOV relative movement not supported"
                )

                return

            # movement thread per camera
            if not self.move_threads or not self.move_threads[camera_name]:
                self.move_threads[camera_name] = threading.Thread(
                    name=f"move_thread_{camera_name}",
                    target=partial(self._process_move_queue, camera_name),
                )
                self.move_threads[camera_name].daemon = True
                self.move_threads[camera_name].start()

        self.autotracker_init[camera_name] = True

    def _process_move_queue(self, camera):
        while True:
            try:
                move_data = self.move_queues[camera].get()
                frame_time, pan, tilt = move_data

                # if we're receiving move requests during a PTZ move, ignore them
                if ptz_moving_at_frame_time(
                    frame_time,
                    self.ptz_metrics[camera]["ptz_start_time"].value,
                    self.ptz_metrics[camera]["ptz_stop_time"].value,
                ):
                    # instead of dequeueing this might be a good place to preemptively move based
                    # on an estimate - for fast moving objects, etc.
                    logger.debug(
                        f"Move queue: PTZ moving, dequeueing move request - frame time: {frame_time}, final pan: {pan}, final tilt: {tilt}"
                    )
                    continue

                else:
                    # on some cameras with cheaper motors it seems like small values can cause jerky movement
                    # TODO: double check, might not need this
                    if abs(pan) > 0.02 or abs(tilt) > 0.02:
                        self.onvif._move_relative(camera, pan, tilt, 1)
                    else:
                        logger.debug(
                            f"Not moving, pan and tilt too small: {pan}, {tilt}"
                        )

                    # Wait until the camera finishes moving
                    while not self.ptz_metrics[camera]["ptz_stopped"].is_set():
                        # check if ptz is moving
                        self.onvif.get_camera_status(camera)

            except queue.Empty:
                continue

    def _enqueue_move(self, camera, frame_time, pan, tilt):
        move_data = (frame_time, pan, tilt)
        if (
            frame_time > self.ptz_metrics[camera]["ptz_start_time"].value
            and frame_time > self.ptz_metrics[camera]["ptz_stop_time"].value
        ):
            logger.debug(f"enqueue pan: {pan}, enqueue tilt: {tilt}")
            self.move_queues[camera].put(move_data)

    def _autotrack_move_ptz(self, camera, obj):
        camera_config = self.config.cameras[camera]

        # # frame width and height
        camera_width = camera_config.frame_shape[1]
        camera_height = camera_config.frame_shape[0]

        # Normalize coordinates. top right of the fov is (1,1), center is (0,0), bottom left is (-1, -1).
        pan = ((obj.obj_data["centroid"][0] / camera_width) - 0.5) * 2
        tilt = (0.5 - (obj.obj_data["centroid"][1] / camera_height)) * 2

        # ideas: check object velocity for camera speed?
        self._enqueue_move(camera, obj.obj_data["frame_time"], pan, tilt)

    def autotrack_object(self, camera, obj):
        camera_config = self.config.cameras[camera]

        if camera_config.onvif.autotracking.enabled:
            if not self.autotracker_init[camera]:
                self._autotracker_setup(self.config.cameras[camera], camera)

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
                self.previous_frame_time = obj.obj_data["frame_time"]
                self._autotrack_move_ptz(camera, obj)

                return

            if (
                # already tracking an object
                self.tracked_object[camera] is not None
                and self.tracked_object_previous[camera] is not None
                and obj.obj_data["id"] == self.tracked_object[camera].obj_data["id"]
                and obj.obj_data["frame_time"] != self.previous_frame_time
            ):
                self.previous_frame_time = obj.obj_data["frame_time"]
                # Don't move ptz if Euclidean distance from object to center of frame is
                # less than 15% of the of the larger dimension (width or height) of the frame,
                # multiplied by a scaling factor for object size.
                # Adjusting this percentage slightly lower will effectively cause the camera to move
                # more often to keep the object in the center. Raising the percentage will cause less
                # movement and will be more flexible with objects not quite being centered.
                # TODO: there's probably a better way to approach this
                distance = math.sqrt(
                    (obj.obj_data["centroid"][0] - camera_config.detect.width / 2) ** 2
                    + (obj.obj_data["centroid"][1] - camera_config.detect.height / 2)
                    ** 2
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
                    return

                logger.debug(
                    f"Autotrack: Existing object (need to move ptz): {obj.obj_data['id']} {obj.obj_data['box']} {obj.obj_data['frame_time']}"
                )
                self.tracked_object_previous[camera] = copy.deepcopy(obj)
                self._autotrack_move_ptz(camera, obj)

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
                and obj.obj_data["motionless_count"] == 0
                and self.tracked_object_previous[camera] is not None
            ):
                self.previous_frame_time = obj.obj_data["frame_time"]
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
                time.time()
                - self.tracked_object_previous[camera].obj_data["frame_time"]
                > autotracker_config.timeout
            )
            and autotracker_config.return_preset
        ):
            self.ptz_metrics[camera]["ptz_stopped"].wait()
            logger.debug(
                f"Autotrack: Time is {time.time()}, returning to preset: {autotracker_config.return_preset}"
            )
            self.onvif._move_to_preset(
                camera,
                autotracker_config.return_preset.lower(),
            )
            self.ptz_metrics[camera]["ptz_reset"].set()
            self.tracked_object_previous[camera] = None
