"""Automatically pan, tilt, and zoom on detected objects via onvif."""

import logging
import threading
import time
from multiprocessing.synchronize import Event as MpEvent

import cv2
import numpy as np
from norfair.camera_motion import MotionEstimator, TranslationTransformationGetter

from frigate.config import CameraConfig, FrigateConfig
from frigate.ptz import OnvifController
from frigate.types import CameraMetricsTypes
from frigate.util import SharedMemoryFrameManager, intersection_over_union

logger = logging.getLogger(__name__)


class PtzMotionEstimator:
    def __init__(self, config: CameraConfig, ptz_moving) -> None:
        self.frame_manager = SharedMemoryFrameManager()
        # homography is nice (zooming) but slow, translation is pan/tilt only but fast.
        self.norfair_motion_estimator = MotionEstimator(
            transformations_getter=TranslationTransformationGetter()
        )
        self.camera_config = config
        self.coord_transformations = None
        self.ptz_moving = ptz_moving
        logger.debug(f"Motion estimator init for cam: {config.name}")

    def motion_estimator(self, detections, frame_time, camera_name):
        if self.camera_config.onvif.autotracking.enabled and self.ptz_moving.value:
            logger.debug(f"Motion estimator running for {camera_name}")

            frame_id = f"{camera_name}{frame_time}"
            frame = self.frame_manager.get(frame_id, self.camera_config.frame_shape)

            # mask out detections for better motion estimation
            mask = np.ones(frame.shape[:2], frame.dtype)

            detection_boxes = [x[2] for x in detections]
            for detection in detection_boxes:
                x1, y1, x2, y2 = detection
                mask[y1:y2, x1:x2] = 0

            # merge camera config motion mask with detections. Norfair function needs 0,1 mask
            mask = np.bitwise_and(mask, self.camera_config.motion.mask).clip(max=1)

            # Norfair estimator function needs color
            frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGRA)

            self.coord_transformations = self.norfair_motion_estimator.update(
                frame, mask
            )

            self.frame_manager.close(frame_id)

            return self.coord_transformations

        return None


class PtzAutoTrackerThread(threading.Thread):
    def __init__(
        self,
        config: FrigateConfig,
        onvif: OnvifController,
        camera_metrics: CameraMetricsTypes,
        stop_event: MpEvent,
    ) -> None:
        threading.Thread.__init__(self)
        self.name = "frigate_ptz_autotracker"
        self.ptz_autotracker = PtzAutoTracker(config, onvif, camera_metrics)
        self.stop_event = stop_event
        self.config = config

    def run(self):
        while not self.stop_event.is_set():
            for camera_name, cam in self.config.cameras.items():
                if cam.onvif.autotracking.enabled:
                    self.ptz_autotracker.camera_maintenance(camera_name)
                    time.sleep(1)
        logger.info("Exiting autotracker...")


class PtzAutoTracker:
    def __init__(
        self,
        config: FrigateConfig,
        onvif: OnvifController,
        camera_metrics: CameraMetricsTypes,
    ) -> None:
        self.config = config
        self.onvif = onvif
        self.camera_metrics = camera_metrics
        self.tracked_object: dict[str, object] = {}
        self.tracked_object_previous: dict[str, object] = {}
        self.object_types = {}
        self.required_zones = {}

        # if cam is set to autotrack, onvif should be set up
        for camera_name, cam in self.config.cameras.items():
            if cam.onvif.autotracking.enabled:
                logger.debug(f"Autotracker init for cam: {camera_name}")

                self.object_types[camera_name] = cam.onvif.autotracking.track
                self.required_zones[camera_name] = cam.onvif.autotracking.required_zones

                self.tracked_object[camera_name] = None
                self.tracked_object_previous[camera_name] = None

                if not onvif.cams[camera_name]["init"]:
                    if not self.onvif._init_onvif(camera_name):
                        return
                    if not onvif.cams[camera_name]["relative_fov_supported"]:
                        cam.onvif.autotracking.enabled = False
                        self.camera_metrics[camera_name][
                            "ptz_autotracker_enabled"
                        ].value = False
                        logger.warning(
                            f"Disabling autotracking for {camera_name}: FOV relative movement not supported"
                        )

    def _autotrack_move_ptz(self, camera, obj):
        camera_config = self.config.cameras[camera]

        # # frame width and height
        camera_width = camera_config.frame_shape[1]
        camera_height = camera_config.frame_shape[0]

        # Normalize coordinates. top right of the fov is (1,1).
        pan = 0.5 - (obj.obj_data["centroid"][0] / camera_width)
        tilt = 0.5 - (obj.obj_data["centroid"][1] / camera_height)

        # Calculate zoom amount
        size_ratio = camera_config.onvif.autotracking.size_ratio
        int(size_ratio * camera_width)
        int(size_ratio * camera_height)

        # ideas: check object velocity for camera speed?
        self.onvif._move_relative(camera, -pan, tilt, 1)

    def autotrack_object(self, camera, obj):
        camera_config = self.config.cameras[camera]

        # check if ptz is moving
        self.onvif.get_camera_status(camera)

        if camera_config.onvif.autotracking.enabled:
            # either this is a brand new object that's on our camera, has our label, entered the zone, is not a false positive, and is not initially motionless
            # or one we're already tracking, which assumes all those things are already true
            if (
                # new object
                self.tracked_object[camera] is None
                and obj.camera == camera
                and obj.obj_data["label"] in self.object_types[camera]
                and set(obj.entered_zones) & set(self.required_zones[camera])
                and not obj.previous["false_positive"]
                and not obj.false_positive
                and self.tracked_object_previous[camera] is None
            ):
                logger.debug(f"Autotrack: New object: {obj.to_dict()}")
                self.tracked_object[camera] = obj
                self.tracked_object_previous[camera] = obj
                self._autotrack_move_ptz(camera, obj)

                return

            if (
                # already tracking an object
                self.tracked_object[camera] is not None
                and self.tracked_object_previous[camera] is not None
                and obj.obj_data["id"] == self.tracked_object[camera].obj_data["id"]
                and obj.obj_data["frame_time"]
                != self.tracked_object_previous[camera].obj_data["frame_time"]
            ):
                # don't move the ptz if we're relatively close to the existing box
                # should we use iou or euclidean distance or both?
                # distance = math.sqrt((obj.obj_data["centroid"][0] - camera_width/2)**2 + (obj.obj_data["centroid"][1] - obj.camera_height/2)**2)
                # if distance <= (self.camera_width * .15) or distance <= (self.camera_height * .15)
                if (
                    intersection_over_union(
                        self.tracked_object_previous[camera].obj_data["box"],
                        obj.obj_data["box"],
                    )
                    < 0.05
                ):
                    logger.debug(
                        f"Autotrack: Existing object (do NOT move ptz): {obj.to_dict()}"
                    )
                    return

                logger.debug(f"Autotrack: Existing object (move ptz): {obj.to_dict()}")
                self.tracked_object_previous[camera] = obj
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
                if (
                    intersection_over_union(
                        self.tracked_object_previous[camera].obj_data["region"],
                        obj.obj_data["box"],
                    )
                    < 0.2
                ):
                    logger.debug(f"Autotrack: Reacquired object: {obj.to_dict()}")
                    self.tracked_object[camera] = obj
                    self.tracked_object_previous[camera] = obj
                    self._autotrack_move_ptz(camera, obj)

                return

    def end_object(self, camera, obj):
        if self.config.cameras[camera].onvif.autotracking.enabled:
            if (
                self.tracked_object[camera] is not None
                and obj.obj_data["id"] == self.tracked_object[camera].obj_data["id"]
            ):
                logger.debug(f"Autotrack: End object: {obj.to_dict()}")
                self.tracked_object[camera] = None
                self.onvif.get_camera_status(camera)

    def camera_maintenance(self, camera):
        # calls get_camera_status to check/update ptz movement
        # returns camera to preset after timeout when tracking is over
        autotracker_config = self.config.cameras[camera].onvif.autotracking

        if autotracker_config.enabled:
            # regularly update camera status
            if self.camera_metrics[camera]["ptz_moving"].value:
                self.onvif.get_camera_status(camera)

            # return to preset if tracking is over
            if (
                self.tracked_object[camera] is None
                and self.tracked_object_previous[camera] is not None
                and (
                    # might want to use a different timestamp here?
                    time.time() - self.tracked_object_previous[camera].last_published
                    > autotracker_config.timeout
                )
                and autotracker_config.return_preset
                and not self.camera_metrics[camera]["ptz_moving"].value
            ):
                logger.debug(
                    f"Autotrack: Time is {time.time()}, returning to preset: {autotracker_config.return_preset}"
                )
                self.onvif._move_to_preset(
                    camera,
                    autotracker_config.return_preset.lower(),
                )
                self.tracked_object_previous[camera] = None

    def disable_autotracking(self, camera):
        # need to call this if autotracking is disabled by mqtt??
        self.tracked_object[camera] = None
