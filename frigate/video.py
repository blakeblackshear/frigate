import datetime
import logging
import multiprocessing as mp
import os
import queue
import random
import signal
import subprocess as sp
import threading
import time
from collections import defaultdict

import numpy as np
import cv2
from setproctitle import setproctitle

from frigate.config import CameraConfig, DetectConfig, PixelFormatEnum
from frigate.const import CACHE_DIR
from frigate.object_detection import RemoteObjectDetector
from frigate.log import LogPipe
from frigate.motion import MotionDetector
from frigate.objects import ObjectTracker
from frigate.util import (
    EventsPerSecond,
    FrameManager,
    SharedMemoryFrameManager,
    area,
    calculate_region,
    clipped,
    intersection,
    intersection_over_union,
    listen,
    yuv_region_2_rgb,
    yuv_region_2_bgr,
    yuv_region_2_yuv,
)

logger = logging.getLogger(__name__)


def filtered(obj, objects_to_track, object_filters):
    object_name = obj[0]
    object_score = obj[1]
    object_box = obj[2]
    object_area = obj[3]
    object_ratio = obj[4]

    if not object_name in objects_to_track:
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

        if not obj_settings.mask is None:
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


def create_tensor_input(frame, model_config, region):
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
            dsize=(model_config.height, model_config.width),
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
        skipped_fps = skipped_eps.eps()

        current_frame.value = datetime.datetime.now().timestamp()
        frame_name = f"{camera_name}{current_frame.value}"
        frame_buffer = frame_manager.create(frame_name, frame_size)
        try:
            frame_buffer[:] = ffmpeg_process.stdout.read(frame_size)
        except Exception as e:
            # shutdown has been initiated
            if stop_event.is_set():
                break
            logger.error(f"{camera_name}: Unable to read frames from ffmpeg process.")

            if ffmpeg_process.poll() != None:
                logger.error(
                    f"{camera_name}: ffmpeg process is not running. exiting capture thread..."
                )
                frame_manager.delete(frame_name)
                break
            continue

        frame_rate.update()

        # if the queue is full, skip this frame
        if frame_queue.full():
            skipped_eps.update()
            frame_manager.delete(frame_name)
            continue

        # close the frame
        frame_manager.close(frame_name)

        # add to the queue
        frame_queue.put(current_frame.value)


class CameraWatchdog(threading.Thread):
    def __init__(
        self,
        camera_name,
        config: CameraConfig,
        frame_queue,
        camera_fps,
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
        self.ffmpeg_pid = ffmpeg_pid
        self.frame_queue = frame_queue
        self.frame_shape = self.config.frame_shape_yuv
        self.frame_size = self.frame_shape[0] * self.frame_shape[1]
        self.stop_event = stop_event

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

        time.sleep(10)
        while not self.stop_event.wait(10):
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
        self, camera_name, ffmpeg_process, frame_shape, frame_queue, fps, stop_event
    ):
        threading.Thread.__init__(self)
        self.name = f"capture:{camera_name}"
        self.camera_name = camera_name
        self.frame_shape = frame_shape
        self.frame_queue = frame_queue
        self.fps = fps
        self.stop_event = stop_event
        self.skipped_fps = EventsPerSecond()
        self.frame_manager = SharedMemoryFrameManager()
        self.ffmpeg_process = ffmpeg_process
        self.current_frame = mp.Value("d", 0.0)
        self.last_frame = 0

    def run(self):
        self.skipped_fps.start()
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

    motion_detector = MotionDetector(
        frame_shape,
        config.motion,
        improve_contrast_enabled,
        motion_threshold,
        motion_contour_area,
    )
    object_detector = RemoteObjectDetector(
        name, labelmap, detection_queue, result_connection, model_config, stop_event
    )

    object_tracker = ObjectTracker(config.detect)

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


def process_frames(
    camera_name: str,
    frame_queue: mp.Queue,
    frame_shape,
    model_config,
    detect_config: DetectConfig,
    frame_manager: FrameManager,
    motion_detector: MotionDetector,
    object_detector: RemoteObjectDetector,
    object_tracker: ObjectTracker,
    detected_objects_queue: mp.Queue,
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

    while not stop_event.is_set():
        if exit_on_empty and frame_queue.empty():
            logger.info(f"Exiting track_objects...")
            break

        try:
            frame_time = frame_queue.get(True, 1)
        except queue.Empty:
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
                # if there hasn't been motion for 10 frames
                if obj["motionless_count"] >= 10
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
                obj["box"]
                for obj in object_tracker.tracked_objects.values()
                if not obj["id"] in stationary_object_ids
            ]

            # combine motion boxes with known locations of existing objects
            combined_boxes = reduce_boxes(motion_boxes + tracked_object_boxes)

            region_min_size = max(model_config.height, model_config.width)
            # compute regions
            regions = [
                calculate_region(
                    frame_shape,
                    a[0],
                    a[1],
                    a[2],
                    a[3],
                    region_min_size,
                    multiplier=random.uniform(1.2, 1.5),
                )
                for a in combined_boxes
            ]

            # consolidate regions with heavy overlap
            regions = [
                calculate_region(
                    frame_shape, a[0], a[1], a[2], a[3], region_min_size, multiplier=1.0
                )
                for a in reduce_boxes(regions, 0.4)
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
            # merge objects, check for clipped objects and look again up to 4 times
            #########
            refining = len(regions) > 0
            refine_count = 0
            while refining and refine_count < 4:
                refining = False

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

                    for index in idxs:
                        index = index if isinstance(index, np.int32) else index[0]
                        obj = group[index]
                        if clipped(obj, frame_shape):
                            box = obj[2]
                            # calculate a new region that will hopefully get the entire object
                            region = calculate_region(
                                frame_shape,
                                box[0],
                                box[1],
                                box[2],
                                box[3],
                                region_min_size,
                            )

                            regions.append(region)

                            selected_objects.extend(
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

                            refining = True
                        else:
                            selected_objects.append(obj)

                # set the detections list to only include top, complete objects
                # and new detections
                detections = selected_objects

                if refining:
                    refine_count += 1

            ## drop detections that overlap too much
            consolidated_detections = []

            # if detection was run on this frame, consolidate
            if len(regions) > 0:
                # group by name
                detected_object_groups = defaultdict(lambda: [])
                for detection in detections:
                    detected_object_groups[detection[0]].append(detection)

                # loop over detections grouped by label
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
                            # if 90% of smaller detection is inside of another detection, consolidate
                            if (
                                area(intersection(current_detection, to_check))
                                / area(current_detection)
                                > 0.9
                            ):
                                overlap = 1
                                break
                        if overlap == 0:
                            consolidated_detections.append(
                                sorted_by_area[current_detection_idx]
                            )
                # now that we have refined our detections, we need to track objects
                object_tracker.match_and_update(frame_time, consolidated_detections)
            # else, just update the frame times for the stationary objects
            else:
                object_tracker.update_frame_times(frame_time)

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
                    object_tracker.tracked_objects,
                    motion_boxes,
                    regions,
                )
            )
            detection_fps.value = object_detector.fps.eps()
            frame_manager.close(f"{camera_name}{frame_time}")
