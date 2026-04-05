"""Manages camera object detection processes."""

import logging
import queue
import time
from datetime import datetime, timezone
from multiprocessing import Queue
from multiprocessing.synchronize import Event as MpEvent
from typing import Any

import cv2

from frigate.camera import CameraMetrics, PTZMetrics
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import CameraConfig, DetectConfig, LoggerConfig, ModelConfig
from frigate.config.camera.camera import CameraTypeEnum
from frigate.config.camera.updater import (
    CameraConfigUpdateEnum,
    CameraConfigUpdateSubscriber,
)
from frigate.const import (
    PROCESS_PRIORITY_HIGH,
    REQUEST_REGION_GRID,
)
from frigate.motion import MotionDetector
from frigate.motion.improved_motion import ImprovedMotionDetector
from frigate.object_detection.base import RemoteObjectDetector
from frigate.ptz.autotrack import ptz_moving_at_frame_time
from frigate.track import ObjectTracker
from frigate.track.norfair_tracker import NorfairTracker
from frigate.track.tracked_object import TrackedObjectAttribute
from frigate.util.builtin import EventsPerSecond
from frigate.util.image import (
    FrameManager,
    SharedMemoryFrameManager,
    draw_box_with_label,
)
from frigate.util.object import (
    create_tensor_input,
    get_cluster_candidates,
    get_cluster_region,
    get_cluster_region_from_grid,
    get_min_region_size,
    get_startup_regions,
    inside_any,
    intersects_any,
    is_object_filtered,
    reduce_detections,
)
from frigate.util.process import FrigateProcess
from frigate.util.time import get_tomorrow_at_time

logger = logging.getLogger(__name__)


class CameraTracker(FrigateProcess):
    def __init__(
        self,
        config: CameraConfig,
        model_config: ModelConfig,
        labelmap: dict[int, str],
        detection_queue: Queue,
        detected_objects_queue,
        camera_metrics: CameraMetrics,
        ptz_metrics: PTZMetrics,
        region_grid: list[list[dict[str, Any]]],
        stop_event: MpEvent,
        log_config: LoggerConfig | None = None,
    ) -> None:
        super().__init__(
            stop_event,
            PROCESS_PRIORITY_HIGH,
            name=f"frigate.process:{config.name}",
            daemon=True,
        )
        self.config = config
        self.model_config = model_config
        self.labelmap = labelmap
        self.detection_queue = detection_queue
        self.detected_objects_queue = detected_objects_queue
        self.camera_metrics = camera_metrics
        self.ptz_metrics = ptz_metrics
        self.region_grid = region_grid
        self.log_config = log_config

    def run(self) -> None:
        self.pre_run_setup(self.log_config)
        frame_queue = self.camera_metrics.frame_queue
        frame_shape = self.config.frame_shape

        motion_detector = ImprovedMotionDetector(
            frame_shape,
            self.config.motion,
            self.config.detect.fps,
            name=self.config.name,
            ptz_metrics=self.ptz_metrics,
        )
        object_detector = RemoteObjectDetector(
            self.config.name,
            self.labelmap,
            self.detection_queue,
            self.model_config,
            self.stop_event,
        )

        object_tracker = NorfairTracker(self.config, self.ptz_metrics)

        frame_manager = SharedMemoryFrameManager()

        # create communication for region grid updates
        requestor = InterProcessRequestor()

        process_frames(
            requestor,
            frame_queue,
            frame_shape,
            self.model_config,
            self.config,
            frame_manager,
            motion_detector,
            object_detector,
            object_tracker,
            self.detected_objects_queue,
            self.camera_metrics,
            self.stop_event,
            self.ptz_metrics,
            self.region_grid,
        )

        # empty the frame queue
        logger.info(f"{self.config.name}: emptying frame queue")
        while not frame_queue.empty():
            (frame_name, _) = frame_queue.get(False)
            frame_manager.delete(frame_name)

        logger.info(f"{self.config.name}: exiting subprocess")


def detect(
    detect_config: DetectConfig,
    object_detector,
    frame,
    model_config: ModelConfig,
    region,
    objects_to_track,
    object_filters,
):
    tensor_input = create_tensor_input(frame, model_config, region)

    detections = []
    region_detections = object_detector.detect(tensor_input)
    for d in region_detections:
        box = d[2]
        size = region[2] - region[0]
        x_min = int(max(0, (box[1] * size) + region[0]))
        y_min = int(max(0, (box[0] * size) + region[1]))
        x_max = int(min(detect_config.width - 1, (box[3] * size) + region[0]))
        y_max = int(min(detect_config.height - 1, (box[2] * size) + region[1]))

        # ignore objects that were detected outside the frame
        if (x_min >= detect_config.width - 1) or (y_min >= detect_config.height - 1):
            continue

        width = x_max - x_min
        height = y_max - y_min
        area = width * height
        ratio = width / max(1, height)
        det = (d[0], d[1], (x_min, y_min, x_max, y_max), area, ratio, region)
        # apply object filters
        if is_object_filtered(det, objects_to_track, object_filters):
            continue
        detections.append(det)
    return detections


def process_frames(
    requestor: InterProcessRequestor,
    frame_queue: Queue,
    frame_shape: tuple[int, int],
    model_config: ModelConfig,
    camera_config: CameraConfig,
    frame_manager: FrameManager,
    motion_detector: MotionDetector,
    object_detector: RemoteObjectDetector,
    object_tracker: ObjectTracker,
    detected_objects_queue: Queue,
    camera_metrics: CameraMetrics,
    stop_event: MpEvent,
    ptz_metrics: PTZMetrics,
    region_grid: list[list[dict[str, Any]]],
    exit_on_empty: bool = False,
):
    next_region_update = get_tomorrow_at_time(2)
    config_subscriber = CameraConfigUpdateSubscriber(
        None,
        {camera_config.name: camera_config},
        [
            CameraConfigUpdateEnum.detect,
            CameraConfigUpdateEnum.enabled,
            CameraConfigUpdateEnum.motion,
            CameraConfigUpdateEnum.objects,
        ],
    )

    fps_tracker = EventsPerSecond()
    fps_tracker.start()

    startup_scan = True
    stationary_frame_counter = 0
    camera_enabled = True

    region_min_size = get_min_region_size(model_config)

    attributes_map = model_config.attributes_map
    all_attributes = model_config.all_attributes

    # remove license_plate from attributes if this camera is a dedicated LPR cam
    if camera_config.type == CameraTypeEnum.lpr:
        modified_attributes_map = model_config.attributes_map.copy()

        if (
            "car" in modified_attributes_map
            and "license_plate" in modified_attributes_map["car"]
        ):
            modified_attributes_map["car"] = [
                attr
                for attr in modified_attributes_map["car"]
                if attr != "license_plate"
            ]

            attributes_map = modified_attributes_map

        all_attributes = [
            attr for attr in model_config.all_attributes if attr != "license_plate"
        ]

    while not stop_event.is_set():
        updated_configs = config_subscriber.check_for_updates()

        if "enabled" in updated_configs:
            prev_enabled = camera_enabled
            camera_enabled = camera_config.enabled

        if "motion" in updated_configs:
            motion_detector.config = camera_config.motion
            motion_detector.update_mask()

        if (
            not camera_enabled
            and prev_enabled != camera_enabled
            and camera_metrics.frame_queue.empty()
        ):
            logger.debug(
                f"Camera {camera_config.name} disabled, clearing tracked objects"
            )
            prev_enabled = camera_enabled

            # Clear norfair's dictionaries
            object_tracker.tracked_objects.clear()
            object_tracker.disappeared.clear()
            object_tracker.stationary_box_history.clear()
            object_tracker.positions.clear()
            object_tracker.track_id_map.clear()

            # Clear internal norfair states
            for trackers_by_type in object_tracker.trackers.values():
                for tracker in trackers_by_type.values():
                    tracker.tracked_objects = []
            for tracker in object_tracker.default_tracker.values():
                tracker.tracked_objects = []

        if not camera_enabled:
            time.sleep(0.1)
            continue

        if datetime.now().astimezone(timezone.utc) > next_region_update:
            region_grid = requestor.send_data(REQUEST_REGION_GRID, camera_config.name)
            next_region_update = get_tomorrow_at_time(2)

        try:
            if exit_on_empty:
                frame_name, frame_time = frame_queue.get(False)
            else:
                frame_name, frame_time = frame_queue.get(True, 1)
        except queue.Empty:
            if exit_on_empty:
                logger.info("Exiting track_objects...")
                break
            continue

        camera_metrics.detection_frame.value = frame_time
        ptz_metrics.frame_time.value = frame_time

        frame = frame_manager.get(frame_name, (frame_shape[0] * 3 // 2, frame_shape[1]))

        if frame is None:
            logger.debug(
                f"{camera_config.name}: frame {frame_time} is not in memory store."
            )
            continue

        # look for motion if enabled
        motion_boxes = motion_detector.detect(frame)

        regions = []
        consolidated_detections = []

        # if detection is disabled
        if not camera_config.detect.enabled:
            object_tracker.match_and_update(frame_name, frame_time, [])
        else:
            # get stationary object ids
            # check every Nth frame for stationary objects
            # disappeared objects are not stationary
            # also check for overlapping motion boxes
            if stationary_frame_counter == camera_config.detect.stationary.interval:
                stationary_frame_counter = 0
                stationary_object_ids = []
            else:
                stationary_frame_counter += 1
                stationary_object_ids = [
                    obj["id"]
                    for obj in object_tracker.tracked_objects.values()
                    # if it has exceeded the stationary threshold
                    if obj["motionless_count"]
                    >= camera_config.detect.stationary.threshold
                    # and it hasn't disappeared
                    and object_tracker.disappeared[obj["id"]] == 0
                    # and it doesn't overlap with any current motion boxes when not calibrating
                    and not intersects_any(
                        obj["box"],
                        [] if motion_detector.is_calibrating() else motion_boxes,
                    )
                ]

            # get tracked object boxes that aren't stationary
            tracked_object_boxes = [
                (
                    # use existing object box for stationary objects
                    obj["estimate"]
                    if obj["motionless_count"]
                    < camera_config.detect.stationary.threshold
                    else obj["box"]
                )
                for obj in object_tracker.tracked_objects.values()
                if obj["id"] not in stationary_object_ids
            ]
            object_boxes = tracked_object_boxes + object_tracker.untracked_object_boxes

            # get consolidated regions for tracked objects
            regions = [
                get_cluster_region(
                    frame_shape, region_min_size, candidate, object_boxes
                )
                for candidate in get_cluster_candidates(
                    frame_shape, region_min_size, object_boxes
                )
            ]

            # only add in the motion boxes when not calibrating and a ptz is not moving via autotracking
            # ptz_moving_at_frame_time() always returns False for non-autotracking cameras
            if not motion_detector.is_calibrating() and not ptz_moving_at_frame_time(
                frame_time,
                ptz_metrics.start_time.value,
                ptz_metrics.stop_time.value,
            ):
                # find motion boxes that are not inside tracked object regions
                standalone_motion_boxes = [
                    b for b in motion_boxes if not inside_any(b, regions)
                ]

                if standalone_motion_boxes:
                    motion_clusters = get_cluster_candidates(
                        frame_shape,
                        region_min_size,
                        standalone_motion_boxes,
                    )
                    motion_regions = [
                        get_cluster_region_from_grid(
                            frame_shape,
                            region_min_size,
                            candidate,
                            standalone_motion_boxes,
                            region_grid,
                        )
                        for candidate in motion_clusters
                    ]
                    regions += motion_regions

            # if starting up, get the next startup scan region
            if startup_scan:
                for region in get_startup_regions(
                    frame_shape, region_min_size, region_grid
                ):
                    regions.append(region)
                startup_scan = False

            # resize regions and detect
            # seed with stationary objects
            detections = [
                (
                    obj["label"],
                    obj["score"],
                    obj["box"],
                    obj["area"],
                    obj["ratio"],
                    obj["region"],
                )
                for obj in object_tracker.tracked_objects.values()
                if obj["id"] in stationary_object_ids
            ]

            for region in regions:
                detections.extend(
                    detect(
                        camera_config.detect,
                        object_detector,
                        frame,
                        model_config,
                        region,
                        camera_config.objects.track,
                        camera_config.objects.filters,
                    )
                )

            consolidated_detections = reduce_detections(frame_shape, detections)

            # if detection was run on this frame, consolidate
            if len(regions) > 0:
                tracked_detections = [
                    d for d in consolidated_detections if d[0] not in all_attributes
                ]
                # now that we have refined our detections, we need to track objects
                object_tracker.match_and_update(
                    frame_name, frame_time, tracked_detections
                )
            # else, just update the frame times for the stationary objects
            else:
                object_tracker.update_frame_times(frame_name, frame_time)

        # group the attribute detections based on what label they apply to
        attribute_detections: dict[str, list[TrackedObjectAttribute]] = {}
        for label, attribute_labels in attributes_map.items():
            attribute_detections[label] = [
                TrackedObjectAttribute(d)
                for d in consolidated_detections
                if d[0] in attribute_labels
            ]

        # build detections
        detections = {}
        for obj in object_tracker.tracked_objects.values():
            detections[obj["id"]] = {**obj, "attributes": []}

        # find the best object for each attribute to be assigned to
        all_objects: list[dict[str, Any]] = object_tracker.tracked_objects.values()
        for attributes in attribute_detections.values():
            for attribute in attributes:
                filtered_objects = filter(
                    lambda o: attribute.label in attributes_map.get(o["label"], []),
                    all_objects,
                )
                selected_object_id = attribute.find_best_object(filtered_objects)

                if selected_object_id is not None:
                    detections[selected_object_id]["attributes"].append(
                        attribute.get_tracking_data()
                    )

        # debug object tracking
        if False:
            bgr_frame = cv2.cvtColor(
                frame,
                cv2.COLOR_YUV2BGR_I420,
            )
            object_tracker.debug_draw(bgr_frame, frame_time)
            cv2.imwrite(
                f"debug/frames/track-{'{:.6f}'.format(frame_time)}.jpg", bgr_frame
            )
        # debug
        if False:
            bgr_frame = cv2.cvtColor(
                frame,
                cv2.COLOR_YUV2BGR_I420,
            )

            for m_box in motion_boxes:
                cv2.rectangle(
                    bgr_frame,
                    (m_box[0], m_box[1]),
                    (m_box[2], m_box[3]),
                    (0, 0, 255),
                    2,
                )

            for b in tracked_object_boxes:
                cv2.rectangle(
                    bgr_frame,
                    (b[0], b[1]),
                    (b[2], b[3]),
                    (255, 0, 0),
                    2,
                )

            for obj in object_tracker.tracked_objects.values():
                if obj["frame_time"] == frame_time:
                    thickness = 2
                    color = model_config.colormap.get(obj["label"], (255, 255, 255))
                else:
                    thickness = 1
                    color = (255, 0, 0)

                # draw the bounding boxes on the frame
                box = obj["box"]

                draw_box_with_label(
                    bgr_frame,
                    box[0],
                    box[1],
                    box[2],
                    box[3],
                    obj["label"],
                    obj["id"],
                    thickness=thickness,
                    color=color,
                )

            for region in regions:
                cv2.rectangle(
                    bgr_frame,
                    (region[0], region[1]),
                    (region[2], region[3]),
                    (0, 255, 0),
                    2,
                )

            cv2.imwrite(
                f"debug/frames/{camera_config.name}-{'{:.6f}'.format(frame_time)}.jpg",
                bgr_frame,
            )
        # add to the queue if not full
        if detected_objects_queue.full():
            frame_manager.close(frame_name)
            continue
        else:
            fps_tracker.update()
            camera_metrics.process_fps.value = fps_tracker.eps()
            detected_objects_queue.put(
                (
                    camera_config.name,
                    frame_name,
                    frame_time,
                    detections,
                    motion_boxes,
                    regions,
                )
            )
            camera_metrics.detection_fps.value = object_detector.fps.eps()
            frame_manager.close(frame_name)

    motion_detector.stop()
    requestor.stop()
    config_subscriber.stop()
