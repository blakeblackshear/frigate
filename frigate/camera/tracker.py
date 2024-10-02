import datetime
import multiprocessing as mp
import queue
from multiprocessing.synchronize import Event

import cv2

from frigate import util
from frigate.camera.metrics import CameraMetrics, PTZMetrics
from frigate.comms.config_updater import ConfigSubscriber
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import CameraConfig, DetectConfig, ModelConfig
from frigate.const import (
    REQUEST_REGION_GRID,
)
from frigate.motion.improved_motion import ImprovedMotionDetector
from frigate.object_detection import RemoteObjectDetector
from frigate.ptz.autotrack import ptz_moving_at_frame_time
from frigate.track.norfair_tracker import NorfairTracker
from frigate.util.builtin import EventsPerSecond, get_tomorrow_at_time
from frigate.util.image import (
    SharedMemoryFrameManager,
    draw_box_with_label,
)
from frigate.util.object import (
    box_inside,
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


class CameraTracker(util.Process):
    def __init__(
        self,
        camera_config: CameraConfig,
        model_config: ModelConfig,
        detection_queue: mp.Queue,
        result_connection: Event,
        detected_objects_queue: mp.Queue,
        camera_metrics: CameraMetrics,
        ptz_metrics: PTZMetrics,
        region_grid: list[list[dict[str, int]]],
    ):
        super().__init__(name=f"frigate.process:{camera_config.name}", daemon=True)
        self.camera_config = camera_config
        self.model_config = model_config
        self.labelmap = model_config.merged_labelmap
        self.detection_queue = detection_queue
        self.result_connection = result_connection
        self.detected_objects_queue = detected_objects_queue
        self.camera_metrics = camera_metrics
        self.ptz_metrics = ptz_metrics
        self.region_grid = region_grid

    def run(self):
        frame_shape = self.camera_config.frame_shape

        motion_detector = ImprovedMotionDetector(
            frame_shape,
            self.camera_config.motion,
            self.camera_config.detect.fps,
            name=self.camera_config.name,
        )
        object_detector = RemoteObjectDetector(
            self.camera_config.name,
            self.labelmap,
            self.detection_queue,
            self.result_connection,
            self.model_config,
            self.stop_event,
        )

        object_tracker = NorfairTracker(self.camera_config, self.ptz_metrics)

        frame_manager = SharedMemoryFrameManager()

        # create communication for region grid updates
        requestor = InterProcessRequestor()

        detect_config = self.camera_config.detect
        next_region_update = get_tomorrow_at_time(2)
        config_subscriber = ConfigSubscriber(f"config/detect/{self.camera_config.name}")

        fps_tracker = EventsPerSecond()
        fps_tracker.start()

        startup_scan = True
        stationary_frame_counter = 0

        region_min_size = get_min_region_size(self.model_config)

        while not self.stop_event.is_set():
            # check for updated detect config
            _, updated_detect_config = config_subscriber.check_for_update()

            if updated_detect_config:
                detect_config = updated_detect_config

            if (
                datetime.datetime.now().astimezone(datetime.timezone.utc)
                > next_region_update
            ):
                self.region_grid = requestor.send_data(
                    REQUEST_REGION_GRID, self.camera_config.name
                )
                next_region_update = get_tomorrow_at_time(2)

            try:
                frame_time = self.camera_metrics.frame_queue.get(timeout=1)
            except queue.Empty:
                continue

            self.camera_metrics.detection_frame.value = frame_time
            self.ptz_metrics.frame_time.value = frame_time

            frame = frame_manager.get(
                f"{self.camera_config.name}{frame_time}",
                (frame_shape[0] * 3 // 2, frame_shape[1]),
            )

            if frame is None:
                self.logger.debug(
                    f"{self.camera_config.name}: frame {frame_time} is not in memory store."
                )
                continue

            # look for motion if enabled
            motion_boxes = motion_detector.detect(frame)

            regions = []
            consolidated_detections = []

            # if detection is disabled
            if not detect_config.enabled:
                object_tracker.match_and_update(frame_time, [])
            else:
                # get stationary object ids
                # check every Nth frame for stationary objects
                # disappeared objects are not stationary
                # also check for overlapping motion boxes
                if stationary_frame_counter == detect_config.stationary.interval:
                    stationary_frame_counter = 0
                    stationary_object_ids = []
                else:
                    stationary_frame_counter += 1
                    stationary_object_ids = [
                        obj["id"]
                        for obj in object_tracker.tracked_objects.values()
                        # if it has exceeded the stationary threshold
                        if obj["motionless_count"] >= detect_config.stationary.threshold
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
                        if obj["motionless_count"] < detect_config.stationary.threshold
                        else obj["box"]
                    )
                    for obj in object_tracker.tracked_objects.values()
                    if obj["id"] not in stationary_object_ids
                ]
                object_boxes = (
                    tracked_object_boxes + object_tracker.untracked_object_boxes
                )

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
                if (
                    not motion_detector.is_calibrating()
                    and not ptz_moving_at_frame_time(
                        frame_time,
                        self.ptz_metrics.start_time.value,
                        self.ptz_metrics.stop_time.value,
                    )
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
                                self.region_grid,
                            )
                            for candidate in motion_clusters
                        ]
                        regions += motion_regions

                # if starting up, get the next startup scan region
                if startup_scan:
                    for region in get_startup_regions(
                        frame_shape, region_min_size, self.region_grid
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
                        self.detect(
                            detect_config,
                            object_detector,
                            frame,
                            self.model_config,
                            region,
                        )
                    )

                consolidated_detections = reduce_detections(frame_shape, detections)

                # if detection was run on this frame, consolidate
                if len(regions) > 0:
                    tracked_detections = [
                        d
                        for d in consolidated_detections
                        if d[0] not in self.model_config.all_attributes
                    ]
                    # now that we have refined our detections, we need to track objects
                    object_tracker.match_and_update(frame_time, tracked_detections)
                # else, just update the frame times for the stationary objects
                else:
                    object_tracker.update_frame_times(frame_time)

            # group the attribute detections based on what label they apply to
            attribute_detections = {}
            for label, attribute_labels in self.model_config.attributes_map.items():
                attribute_detections[label] = [
                    d for d in consolidated_detections if d[0] in attribute_labels
                ]

            # build detections and add attributes
            detections = {}
            for obj in object_tracker.tracked_objects.values():
                attributes = []
                # if the objects label has associated attribute detections
                if obj["label"] in attribute_detections.keys():
                    # add them to attributes if they intersect
                    for attribute_detection in attribute_detections[obj["label"]]:
                        if box_inside(obj["box"], (attribute_detection[2])):
                            attributes.append(
                                {
                                    "label": attribute_detection[0],
                                    "score": attribute_detection[1],
                                    "box": attribute_detection[2],
                                }
                            )
                detections[obj["id"]] = {**obj, "attributes": attributes}

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
                        color = self.model_config.colormap[obj["label"]]
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
                    f"debug/frames/{self.camera_config.name}-{'{:.6f}'.format(frame_time)}.jpg",
                    bgr_frame,
                )
            # add to the queue if not full
            if self.detected_objects_queue.full():
                frame_manager.delete(f"{self.camera_config.name}{frame_time}")
                continue
            else:
                fps_tracker.update()
                self.camera_metrics.process_fps.value = fps_tracker.eps()
                self.detected_objects_queue.put(
                    (
                        self.camera_config.name,
                        frame_time,
                        detections,
                        motion_boxes,
                        regions,
                    )
                )
                self.camera_metrics.detection_fps.value = object_detector.fps.eps()
                frame_manager.close(f"{self.camera_config.name}{frame_time}")

        motion_detector.stop()
        requestor.stop()
        config_subscriber.stop()

        # Empty the frame queue
        self.logger.info("Emptying frame queue")
        while not self.camera_metrics.frame_queue.empty():
            frame_time = self.camera_metrics.frame_queue.get(False)
            frame_manager.delete(f"{self.name}{frame_time}")

        self.logger.info("Exiting the camera tracker")

    def detect(
        self,
        detect_config: DetectConfig,
        object_detector,
        frame,
        model_config,
        region,
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
            if (x_min >= detect_config.width - 1) or (
                y_min >= detect_config.height - 1
            ):
                continue

            width = x_max - x_min
            height = y_max - y_min
            area = width * height
            ratio = width / max(1, height)
            det = (
                d[0],
                d[1],
                (x_min, y_min, x_max, y_max),
                area,
                ratio,
                region,
            )
            # apply object filters
            if is_object_filtered(
                det,
                self.camera_config.objects.track,
                self.camera_config.objects.filters,
            ):
                continue
            detections.append(det)
        return detections
