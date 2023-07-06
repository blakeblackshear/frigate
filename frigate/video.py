import datetime
import logging
import math
import multiprocessing as mp
import os
import queue
import signal
import subprocess as sp
import threading
import time
from collections import defaultdict

import cv2
import faster_fifo as ff
import numpy as np
from setproctitle import setproctitle

from frigate.config import CameraConfig, DetectConfig, ModelConfig
from frigate.const import ALL_ATTRIBUTE_LABELS, ATTRIBUTE_LABEL_MAP, CACHE_DIR
from frigate.detectors.detector_config import PixelFormatEnum
from frigate.log import LogPipe
from frigate.motion import MotionDetector
from frigate.motion.improved_motion import ImprovedMotionDetector
from frigate.object_detection import RemoteObjectDetector
from frigate.track import ObjectTracker
from frigate.track.norfair_tracker import NorfairTracker
from frigate.util import (
    EventsPerSecond,
    FrameManager,
    SharedMemoryFrameManager,
    area,
    calculate_region,
    draw_box_with_label,
    intersection,
    intersection_over_union,
    listen,
    yuv_region_2_bgr,
    yuv_region_2_rgb,
    yuv_region_2_yuv,
)

logger = logging.getLogger(__name__)


def filtered(obj, objects_to_track, object_filters):
    object_name = obj[0]
    object_score = obj[1]
    object_box = obj[2]
    object_area = obj[3]
    object_ratio = obj[4]

    if object_name not in objects_to_track:
        return True

    if object_name in object_filters:
        obj_settings = object_filters[object_name]

        # if the min area is larger than the
        # detected object, don't add it to detected objects
        if obj_settings.min_area > object_area:
            return True

        # if the detected object is larger than the
        # max area, don't add it to detected objects
        if obj_settings.max_area < object_area:
            return True

        # if the score is lower than the min_score, skip
        if obj_settings.min_score > object_score:
            return True

        # if the object is not proportionally wide enough
        if obj_settings.min_ratio > object_ratio:
            return True

        # if the object is proportionally too wide
        if obj_settings.max_ratio < object_ratio:
            return True

        if obj_settings.mask is not None:
            # compute the coordinates of the object and make sure
            # the location isn't outside the bounds of the image (can happen from rounding)
            object_xmin = object_box[0]
            object_xmax = object_box[2]
            object_ymax = object_box[3]
            y_location = min(int(object_ymax), len(obj_settings.mask) - 1)
            x_location = min(
                int((object_xmax + object_xmin) / 2.0),
                len(obj_settings.mask[0]) - 1,
            )

            # if the object is in a masked location, don't add it to detected objects
            if obj_settings.mask[y_location][x_location] == 0:
                return True

    return False


def get_min_region_size(model_config: ModelConfig) -> int:
    """Get the min region size and ensure it is divisible by 4."""
    half = int(max(model_config.height, model_config.width) / 2)

    if half % 4 == 0:
        return half

    return int((half + 3) / 4) * 4


def create_tensor_input(frame, model_config: ModelConfig, region):
    if model_config.input_pixel_format == PixelFormatEnum.rgb:
        cropped_frame = yuv_region_2_rgb(frame, region)
    elif model_config.input_pixel_format == PixelFormatEnum.bgr:
        cropped_frame = yuv_region_2_bgr(frame, region)
    else:
        cropped_frame = yuv_region_2_yuv(frame, region)

    # Resize if needed
    if cropped_frame.shape != (model_config.height, model_config.width, 3):
        cropped_frame = cv2.resize(
            cropped_frame,
            dsize=(model_config.width, model_config.height),
            interpolation=cv2.INTER_LINEAR,
        )

    # Expand dimensions since the model expects images to have shape: [1, height, width, 3]
    return np.expand_dims(cropped_frame, axis=0)


def stop_ffmpeg(ffmpeg_process, logger):
    logger.info("Terminating the existing ffmpeg process...")
    ffmpeg_process.terminate()
    try:
        logger.info("Waiting for ffmpeg to exit gracefully...")
        ffmpeg_process.communicate(timeout=30)
    except sp.TimeoutExpired:
        logger.info("FFmpeg didnt exit. Force killing...")
        ffmpeg_process.kill()
        ffmpeg_process.communicate()
    ffmpeg_process = None


def start_or_restart_ffmpeg(
    ffmpeg_cmd, logger, logpipe: LogPipe, frame_size=None, ffmpeg_process=None
):
    if ffmpeg_process is not None:
        stop_ffmpeg(ffmpeg_process, logger)

    if frame_size is None:
        process = sp.Popen(
            ffmpeg_cmd,
            stdout=sp.DEVNULL,
            stderr=logpipe,
            stdin=sp.DEVNULL,
            start_new_session=True,
        )
    else:
        process = sp.Popen(
            ffmpeg_cmd,
            stdout=sp.PIPE,
            stderr=logpipe,
            stdin=sp.DEVNULL,
            bufsize=frame_size * 10,
            start_new_session=True,
        )
    return process


def capture_frames(
    ffmpeg_process,
    camera_name,
    frame_shape,
    frame_manager: FrameManager,
    frame_queue,
    fps: mp.Value,
    skipped_fps: mp.Value,
    current_frame: mp.Value,
    stop_event: mp.Event,
):
    frame_size = frame_shape[0] * frame_shape[1]
    frame_rate = EventsPerSecond()
    frame_rate.start()
    skipped_eps = EventsPerSecond()
    skipped_eps.start()
    while True:
        fps.value = frame_rate.eps()
        skipped_fps.value = skipped_eps.eps()

        current_frame.value = datetime.datetime.now().timestamp()
        frame_name = f"{camera_name}{current_frame.value}"
        frame_buffer = frame_manager.create(frame_name, frame_size)
        try:
            frame_buffer[:] = ffmpeg_process.stdout.read(frame_size)
        except Exception:
            # shutdown has been initiated
            if stop_event.is_set():
                break
            logger.error(f"{camera_name}: Unable to read frames from ffmpeg process.")

            if ffmpeg_process.poll() is not None:
                logger.error(
                    f"{camera_name}: ffmpeg process is not running. exiting capture thread..."
                )
                frame_manager.delete(frame_name)
                break
            continue

        frame_rate.update()

        # don't lock the queue to check, just try since it should rarely be full
        try:
            # add to the queue
            frame_queue.put(current_frame.value, False)
            # close the frame
            frame_manager.close(frame_name)
        except queue.Full:
            # if the queue is full, skip this frame
            skipped_eps.update()
            frame_manager.delete(frame_name)


class CameraWatchdog(threading.Thread):
    def __init__(
        self,
        camera_name,
        config: CameraConfig,
        frame_queue,
        camera_fps,
        skipped_fps,
        ffmpeg_pid,
        stop_event,
    ):
        threading.Thread.__init__(self)
        self.logger = logging.getLogger(f"watchdog.{camera_name}")
        self.camera_name = camera_name
        self.config = config
        self.capture_thread = None
        self.ffmpeg_detect_process = None
        self.logpipe = LogPipe(f"ffmpeg.{self.camera_name}.detect")
        self.ffmpeg_other_processes: list[dict[str, any]] = []
        self.camera_fps = camera_fps
        self.skipped_fps = skipped_fps
        self.ffmpeg_pid = ffmpeg_pid
        self.frame_queue = frame_queue
        self.frame_shape = self.config.frame_shape_yuv
        self.frame_size = self.frame_shape[0] * self.frame_shape[1]
        self.stop_event = stop_event
        self.sleeptime = self.config.ffmpeg.retry_interval

    def run(self):
        self.start_ffmpeg_detect()

        for c in self.config.ffmpeg_cmds:
            if "detect" in c["roles"]:
                continue
            logpipe = LogPipe(
                f"ffmpeg.{self.camera_name}.{'_'.join(sorted(c['roles']))}"
            )
            self.ffmpeg_other_processes.append(
                {
                    "cmd": c["cmd"],
                    "roles": c["roles"],
                    "logpipe": logpipe,
                    "process": start_or_restart_ffmpeg(c["cmd"], self.logger, logpipe),
                }
            )

        time.sleep(self.sleeptime)
        while not self.stop_event.wait(self.sleeptime):
            now = datetime.datetime.now().timestamp()

            if not self.capture_thread.is_alive():
                self.camera_fps.value = 0
                self.logger.error(
                    f"Ffmpeg process crashed unexpectedly for {self.camera_name}."
                )
                self.logger.error(
                    "The following ffmpeg logs include the last 100 lines prior to exit."
                )
                self.logpipe.dump()
                self.start_ffmpeg_detect()
            elif now - self.capture_thread.current_frame.value > 20:
                self.camera_fps.value = 0
                self.logger.info(
                    f"No frames received from {self.camera_name} in 20 seconds. Exiting ffmpeg..."
                )
                self.ffmpeg_detect_process.terminate()
                try:
                    self.logger.info("Waiting for ffmpeg to exit gracefully...")
                    self.ffmpeg_detect_process.communicate(timeout=30)
                except sp.TimeoutExpired:
                    self.logger.info("FFmpeg did not exit. Force killing...")
                    self.ffmpeg_detect_process.kill()
                    self.ffmpeg_detect_process.communicate()
            elif self.camera_fps.value >= (self.config.detect.fps + 10):
                self.camera_fps.value = 0
                self.logger.info(
                    f"{self.camera_name} exceeded fps limit. Exiting ffmpeg..."
                )
                self.ffmpeg_detect_process.terminate()
                try:
                    self.logger.info("Waiting for ffmpeg to exit gracefully...")
                    self.ffmpeg_detect_process.communicate(timeout=30)
                except sp.TimeoutExpired:
                    self.logger.info("FFmpeg did not exit. Force killing...")
                    self.ffmpeg_detect_process.kill()
                    self.ffmpeg_detect_process.communicate()

            for p in self.ffmpeg_other_processes:
                poll = p["process"].poll()

                if self.config.record.enabled and "record" in p["roles"]:
                    latest_segment_time = self.get_latest_segment_timestamp(
                        p.get(
                            "latest_segment_time", datetime.datetime.now().timestamp()
                        )
                    )

                    if datetime.datetime.now().timestamp() > (
                        latest_segment_time + 120
                    ):
                        self.logger.error(
                            f"No new recording segments were created for {self.camera_name} in the last 120s. restarting the ffmpeg record process..."
                        )
                        p["process"] = start_or_restart_ffmpeg(
                            p["cmd"],
                            self.logger,
                            p["logpipe"],
                            ffmpeg_process=p["process"],
                        )
                        continue
                    else:
                        p["latest_segment_time"] = latest_segment_time

                if poll is None:
                    continue

                p["logpipe"].dump()
                p["process"] = start_or_restart_ffmpeg(
                    p["cmd"], self.logger, p["logpipe"], ffmpeg_process=p["process"]
                )

        stop_ffmpeg(self.ffmpeg_detect_process, self.logger)
        for p in self.ffmpeg_other_processes:
            stop_ffmpeg(p["process"], self.logger)
            p["logpipe"].close()
        self.logpipe.close()

    def start_ffmpeg_detect(self):
        ffmpeg_cmd = [
            c["cmd"] for c in self.config.ffmpeg_cmds if "detect" in c["roles"]
        ][0]
        self.ffmpeg_detect_process = start_or_restart_ffmpeg(
            ffmpeg_cmd, self.logger, self.logpipe, self.frame_size
        )
        self.ffmpeg_pid.value = self.ffmpeg_detect_process.pid
        self.capture_thread = CameraCapture(
            self.camera_name,
            self.ffmpeg_detect_process,
            self.frame_shape,
            self.frame_queue,
            self.camera_fps,
            self.skipped_fps,
            self.stop_event,
        )
        self.capture_thread.start()

    def get_latest_segment_timestamp(self, latest_timestamp) -> int:
        """Checks if ffmpeg is still writing recording segments to cache."""
        cache_files = sorted(
            [
                d
                for d in os.listdir(CACHE_DIR)
                if os.path.isfile(os.path.join(CACHE_DIR, d))
                and d.endswith(".mp4")
                and not d.startswith("clip_")
            ]
        )
        newest_segment_timestamp = latest_timestamp

        for file in cache_files:
            if self.camera_name in file:
                basename = os.path.splitext(file)[0]
                _, date = basename.rsplit("-", maxsplit=1)
                ts = datetime.datetime.strptime(date, "%Y%m%d%H%M%S").timestamp()
                if ts > newest_segment_timestamp:
                    newest_segment_timestamp = ts

        return newest_segment_timestamp


class CameraCapture(threading.Thread):
    def __init__(
        self,
        camera_name,
        ffmpeg_process,
        frame_shape,
        frame_queue,
        fps,
        skipped_fps,
        stop_event,
    ):
        threading.Thread.__init__(self)
        self.name = f"capture:{camera_name}"
        self.camera_name = camera_name
        self.frame_shape = frame_shape
        self.frame_queue = frame_queue
        self.fps = fps
        self.stop_event = stop_event
        self.skipped_fps = skipped_fps
        self.frame_manager = SharedMemoryFrameManager()
        self.ffmpeg_process = ffmpeg_process
        self.current_frame = mp.Value("d", 0.0)
        self.last_frame = 0

    def run(self):
        capture_frames(
            self.ffmpeg_process,
            self.camera_name,
            self.frame_shape,
            self.frame_manager,
            self.frame_queue,
            self.fps,
            self.skipped_fps,
            self.current_frame,
            self.stop_event,
        )


def capture_camera(name, config: CameraConfig, process_info):
    stop_event = mp.Event()

    def receiveSignal(signalNumber, frame):
        stop_event.set()

    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    threading.current_thread().name = f"capture:{name}"
    setproctitle(f"frigate.capture:{name}")

    frame_queue = process_info["frame_queue"]
    camera_watchdog = CameraWatchdog(
        name,
        config,
        frame_queue,
        process_info["camera_fps"],
        process_info["skipped_fps"],
        process_info["ffmpeg_pid"],
        stop_event,
    )
    camera_watchdog.start()
    camera_watchdog.join()


def track_camera(
    name,
    config: CameraConfig,
    model_config,
    labelmap,
    detection_queue,
    result_connection,
    detected_objects_queue,
    process_info,
):
    stop_event = mp.Event()

    def receiveSignal(signalNumber, frame):
        stop_event.set()

    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    threading.current_thread().name = f"process:{name}"
    setproctitle(f"frigate.process:{name}")
    listen()

    frame_queue = process_info["frame_queue"]
    detection_enabled = process_info["detection_enabled"]
    motion_enabled = process_info["motion_enabled"]
    improve_contrast_enabled = process_info["improve_contrast_enabled"]
    motion_threshold = process_info["motion_threshold"]
    motion_contour_area = process_info["motion_contour_area"]

    frame_shape = config.frame_shape
    objects_to_track = config.objects.track
    object_filters = config.objects.filters

    motion_detector = ImprovedMotionDetector(
        frame_shape,
        config.motion,
        config.detect.fps,
        improve_contrast_enabled,
        motion_threshold,
        motion_contour_area,
    )
    object_detector = RemoteObjectDetector(
        name, labelmap, detection_queue, result_connection, model_config, stop_event
    )

    object_tracker = NorfairTracker(config.detect)

    frame_manager = SharedMemoryFrameManager()

    process_frames(
        name,
        frame_queue,
        frame_shape,
        model_config,
        config.detect,
        frame_manager,
        motion_detector,
        object_detector,
        object_tracker,
        detected_objects_queue,
        process_info,
        objects_to_track,
        object_filters,
        detection_enabled,
        motion_enabled,
        stop_event,
    )

    logger.info(f"{name}: exiting subprocess")


def box_overlaps(b1, b2):
    if b1[2] < b2[0] or b1[0] > b2[2] or b1[1] > b2[3] or b1[3] < b2[1]:
        return False
    return True


def box_inside(b1, b2):
    # check if b2 is inside b1
    if b2[0] >= b1[0] and b2[1] >= b1[1] and b2[2] <= b1[2] and b2[3] <= b1[3]:
        return True
    return False


def reduce_boxes(boxes, iou_threshold=0.0):
    clusters = []

    for box in boxes:
        matched = 0
        for cluster in clusters:
            if intersection_over_union(box, cluster) > iou_threshold:
                matched = 1
                cluster[0] = min(cluster[0], box[0])
                cluster[1] = min(cluster[1], box[1])
                cluster[2] = max(cluster[2], box[2])
                cluster[3] = max(cluster[3], box[3])

        if not matched:
            clusters.append(list(box))

    return [tuple(c) for c in clusters]


def intersects_any(box_a, boxes):
    for box in boxes:
        if box_overlaps(box_a, box):
            return True
    return False


def detect(
    detect_config: DetectConfig,
    object_detector,
    frame,
    model_config,
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
        ratio = width / height
        det = (
            d[0],
            d[1],
            (x_min, y_min, x_max, y_max),
            area,
            ratio,
            region,
        )
        # apply object filters
        if filtered(det, objects_to_track, object_filters):
            continue
        detections.append(det)
    return detections


def get_cluster_boundary(box, min_region):
    # compute the max region size for the current box (box is 10% of region)
    box_width = box[2] - box[0]
    box_height = box[3] - box[1]
    max_region_area = abs(box_width * box_height) / 0.1
    max_region_size = max(min_region, int(math.sqrt(max_region_area)))

    centroid = (box_width / 2 + box[0], box_height / 2 + box[1])

    max_x_dist = int(max_region_size - box_width / 2 * 1.1)
    max_y_dist = int(max_region_size - box_height / 2 * 1.1)

    return [
        int(centroid[0] - max_x_dist),
        int(centroid[1] - max_y_dist),
        int(centroid[0] + max_x_dist),
        int(centroid[1] + max_y_dist),
    ]


def get_cluster_candidates(frame_shape, min_region, boxes):
    # and create a cluster of other boxes using it's max region size
    # only include boxes where the region is an appropriate(except the region could possibly be smaller?)
    # size in the cluster. in order to be in the cluster, the furthest corner needs to be within x,y offset
    # determined by the max_region size minus half the box + 20%
    # TODO: see if we can do this with numpy
    cluster_candidates = []
    used_boxes = []
    # loop over each box
    for current_index, b in enumerate(boxes):
        if current_index in used_boxes:
            continue
        cluster = [current_index]
        used_boxes.append(current_index)
        cluster_boundary = get_cluster_boundary(b, min_region)
        # find all other boxes that fit inside the boundary
        for compare_index, compare_box in enumerate(boxes):
            if compare_index in used_boxes:
                continue

            # if the box is not inside the potential cluster area, cluster them
            if not box_inside(cluster_boundary, compare_box):
                continue

            # get the region if you were to add this box to the cluster
            potential_cluster = cluster + [compare_index]
            cluster_region = get_cluster_region(
                frame_shape, min_region, potential_cluster, boxes
            )
            # if region could be smaller and either box would be too small
            # for the resulting region, dont cluster
            should_cluster = True
            if (cluster_region[2] - cluster_region[0]) > min_region:
                for b in potential_cluster:
                    box = boxes[b]
                    # boxes should be more than 5% of the area of the region
                    if area(box) / area(cluster_region) < 0.05:
                        should_cluster = False
                        break

            if should_cluster:
                cluster.append(compare_index)
                used_boxes.append(compare_index)
        cluster_candidates.append(cluster)

    # return the unique clusters only
    unique = {tuple(sorted(c)) for c in cluster_candidates}
    return [list(tup) for tup in unique]


def get_cluster_region(frame_shape, min_region, cluster, boxes):
    min_x = frame_shape[1]
    min_y = frame_shape[0]
    max_x = 0
    max_y = 0
    for b in cluster:
        min_x = min(boxes[b][0], min_x)
        min_y = min(boxes[b][1], min_y)
        max_x = max(boxes[b][2], max_x)
        max_y = max(boxes[b][3], max_y)
    return calculate_region(
        frame_shape, min_x, min_y, max_x, max_y, min_region, multiplier=1.2
    )


def get_consolidated_object_detections(detected_object_groups):
    """Drop detections that overlap too much"""
    consolidated_detections = []
    for group in detected_object_groups.values():
        # if the group only has 1 item, skip
        if len(group) == 1:
            consolidated_detections.append(group[0])
            continue

        # sort smallest to largest by area
        sorted_by_area = sorted(group, key=lambda g: g[3])

        for current_detection_idx in range(0, len(sorted_by_area)):
            current_detection = sorted_by_area[current_detection_idx][2]
            overlap = 0
            for to_check_idx in range(
                min(current_detection_idx + 1, len(sorted_by_area)),
                len(sorted_by_area),
            ):
                to_check = sorted_by_area[to_check_idx][2]
                intersect_box = intersection(current_detection, to_check)
                # if 90% of smaller detection is inside of another detection, consolidate
                if (
                    intersect_box is not None
                    and area(intersect_box) / area(current_detection) > 0.9
                ):
                    overlap = 1
                    break
            if overlap == 0:
                consolidated_detections.append(sorted_by_area[current_detection_idx])

    return consolidated_detections


def process_frames(
    camera_name: str,
    frame_queue: ff.Queue,
    frame_shape,
    model_config: ModelConfig,
    detect_config: DetectConfig,
    frame_manager: FrameManager,
    motion_detector: MotionDetector,
    object_detector: RemoteObjectDetector,
    object_tracker: ObjectTracker,
    detected_objects_queue: ff.Queue,
    process_info: dict,
    objects_to_track: list[str],
    object_filters,
    detection_enabled: mp.Value,
    motion_enabled: mp.Value,
    stop_event,
    exit_on_empty: bool = False,
):
    fps = process_info["process_fps"]
    detection_fps = process_info["detection_fps"]
    current_frame_time = process_info["detection_frame"]

    fps_tracker = EventsPerSecond()
    fps_tracker.start()

    startup_scan_counter = 0

    region_min_size = get_min_region_size(model_config)

    while not stop_event.is_set():
        try:
            if exit_on_empty:
                frame_time = frame_queue.get(False)
            else:
                frame_time = frame_queue.get(True, 1)
        except queue.Empty:
            if exit_on_empty:
                logger.info("Exiting track_objects...")
                break
            continue

        current_frame_time.value = frame_time

        frame = frame_manager.get(
            f"{camera_name}{frame_time}", (frame_shape[0] * 3 // 2, frame_shape[1])
        )

        if frame is None:
            logger.info(f"{camera_name}: frame {frame_time} is not in memory store.")
            continue

        # look for motion if enabled
        motion_boxes = motion_detector.detect(frame) if motion_enabled.value else []

        regions = []
        consolidated_detections = []

        # if detection is disabled
        if not detection_enabled.value:
            object_tracker.match_and_update(frame_time, [])
        else:
            # get stationary object ids
            # check every Nth frame for stationary objects
            # disappeared objects are not stationary
            # also check for overlapping motion boxes
            stationary_object_ids = [
                obj["id"]
                for obj in object_tracker.tracked_objects.values()
                # if it has exceeded the stationary threshold
                if obj["motionless_count"] >= detect_config.stationary.threshold
                # and it isn't due for a periodic check
                and (
                    detect_config.stationary.interval == 0
                    or obj["motionless_count"] % detect_config.stationary.interval != 0
                )
                # and it hasn't disappeared
                and object_tracker.disappeared[obj["id"]] == 0
                # and it doesn't overlap with any current motion boxes
                and not intersects_any(obj["box"], motion_boxes)
            ]

            # get tracked object boxes that aren't stationary
            tracked_object_boxes = [
                obj["estimate"]
                for obj in object_tracker.tracked_objects.values()
                if obj["id"] not in stationary_object_ids
            ]

            combined_boxes = motion_boxes + tracked_object_boxes

            cluster_candidates = get_cluster_candidates(
                frame_shape, region_min_size, combined_boxes
            )

            regions = [
                get_cluster_region(
                    frame_shape, region_min_size, candidate, combined_boxes
                )
                for candidate in cluster_candidates
            ]

            # if starting up, get the next startup scan region
            if startup_scan_counter < 9:
                ymin = int(frame_shape[0] / 3 * startup_scan_counter / 3)
                ymax = int(frame_shape[0] / 3 + ymin)
                xmin = int(frame_shape[1] / 3 * startup_scan_counter / 3)
                xmax = int(frame_shape[1] / 3 + xmin)
                regions.append(
                    calculate_region(
                        frame_shape,
                        xmin,
                        ymin,
                        xmax,
                        ymax,
                        region_min_size,
                        multiplier=1.2,
                    )
                )
                startup_scan_counter += 1

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
                        detect_config,
                        object_detector,
                        frame,
                        model_config,
                        region,
                        objects_to_track,
                        object_filters,
                    )
                )

            #########
            # merge objects
            #########
            # group by name
            detected_object_groups = defaultdict(lambda: [])
            for detection in detections:
                detected_object_groups[detection[0]].append(detection)

            selected_objects = []
            for group in detected_object_groups.values():
                # apply non-maxima suppression to suppress weak, overlapping bounding boxes
                # o[2] is the box of the object: xmin, ymin, xmax, ymax
                # apply max/min to ensure values do not exceed the known frame size
                boxes = [
                    (
                        o[2][0],
                        o[2][1],
                        o[2][2] - o[2][0],
                        o[2][3] - o[2][1],
                    )
                    for o in group
                ]
                confidences = [o[1] for o in group]
                idxs = cv2.dnn.NMSBoxes(boxes, confidences, 0.5, 0.4)

                # add objects
                for index in idxs:
                    index = index if isinstance(index, np.int32) else index[0]
                    obj = group[index]
                    selected_objects.append(obj)

            # set the detections list to only include top objects
            detections = selected_objects

            # if detection was run on this frame, consolidate
            if len(regions) > 0:
                # group by name
                detected_object_groups = defaultdict(lambda: [])
                for detection in detections:
                    detected_object_groups[detection[0]].append(detection)

                consolidated_detections = get_consolidated_object_detections(
                    detected_object_groups
                )
                tracked_detections = [
                    d
                    for d in consolidated_detections
                    if d[0] not in ALL_ATTRIBUTE_LABELS
                ]
                # now that we have refined our detections, we need to track objects
                object_tracker.match_and_update(frame_time, tracked_detections)
            # else, just update the frame times for the stationary objects
            else:
                object_tracker.update_frame_times(frame_time)

        # group the attribute detections based on what label they apply to
        attribute_detections = {}
        for label, attribute_labels in ATTRIBUTE_LABEL_MAP.items():
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
                    color = model_config.colormap[obj["label"]]
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
                f"debug/frames/{camera_name}-{'{:.6f}'.format(frame_time)}.jpg",
                bgr_frame,
            )
        # add to the queue if not full
        if detected_objects_queue.full():
            frame_manager.delete(f"{camera_name}{frame_time}")
            continue
        else:
            fps_tracker.update()
            fps.value = fps_tracker.eps()
            detected_objects_queue.put(
                (
                    camera_name,
                    frame_time,
                    detections,
                    motion_boxes,
                    regions,
                )
            )
            detection_fps.value = object_detector.fps.eps()
            frame_manager.close(f"{camera_name}{frame_time}")
