import datetime
import itertools
import logging
import multiprocessing as mp
import queue
import subprocess as sp
import signal
import threading
import time
from collections import defaultdict
from setproctitle import setproctitle
from typing import Dict, List

from cv2 import cv2
import numpy as np

from frigate.config import CameraConfig
from frigate.edgetpu import RemoteObjectDetector
from frigate.log import LogPipe
from frigate.motion import MotionDetector
from frigate.objects import ObjectTracker
from frigate.util import (
    EventsPerSecond,
    FrameManager,
    SharedMemoryFrameManager,
    calculate_region,
    clipped,
    listen,
    yuv_region_2_rgb,
)

logger = logging.getLogger(__name__)


def filtered(obj, objects_to_track, object_filters):
    object_name = obj[0]

    if not object_name in objects_to_track:
        return True

    if object_name in object_filters:
        obj_settings = object_filters[object_name]

        # if the min area is larger than the
        # detected object, don't add it to detected objects
        if obj_settings.min_area > obj[3]:
            return True

        # if the detected object is larger than the
        # max area, don't add it to detected objects
        if obj_settings.max_area < obj[3]:
            return True

        # if the score is lower than the min_score, skip
        if obj_settings.min_score > obj[1]:
            return True

        if not obj_settings.mask is None:
            # compute the coordinates of the object and make sure
            # the location isnt outside the bounds of the image (can happen from rounding)
            y_location = min(int(obj[2][3]), len(obj_settings.mask) - 1)
            x_location = min(
                int((obj[2][2] - obj[2][0]) / 2.0) + obj[2][0],
                len(obj_settings.mask[0]) - 1,
            )

            # if the object is in a masked location, don't add it to detected objects
            if obj_settings.mask[y_location][x_location] == 0:
                return True

    return False


def create_tensor_input(frame, model_shape, region):
    cropped_frame = yuv_region_2_rgb(frame, region)

    # Resize to 300x300 if needed
    if cropped_frame.shape != (model_shape[0], model_shape[1], 3):
        cropped_frame = cv2.resize(
            cropped_frame, dsize=model_shape, interpolation=cv2.INTER_LINEAR
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
            logger.info(f"{camera_name}: ffmpeg sent a broken frame. {e}")

            if ffmpeg_process.poll() != None:
                logger.info(
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
        self, camera_name, config, frame_queue, camera_fps, ffmpeg_pid, stop_event
    ):
        threading.Thread.__init__(self)
        self.logger = logging.getLogger(f"watchdog.{camera_name}")
        self.camera_name = camera_name
        self.config = config
        self.capture_thread = None
        self.ffmpeg_detect_process = None
        self.logpipe = LogPipe(f"ffmpeg.{self.camera_name}.detect", logging.ERROR)
        self.ffmpeg_other_processes = []
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
                f"ffmpeg.{self.camera_name}.{'_'.join(sorted(c['roles']))}",
                logging.ERROR,
            )
            self.ffmpeg_other_processes.append(
                {
                    "cmd": c["cmd"],
                    "logpipe": logpipe,
                    "process": start_or_restart_ffmpeg(c["cmd"], self.logger, logpipe),
                }
            )

        time.sleep(10)
        while not self.stop_event.wait(10):
            now = datetime.datetime.now().timestamp()

            if not self.capture_thread.is_alive():
                self.logpipe.dump()
                self.start_ffmpeg_detect()
            elif now - self.capture_thread.current_frame.value > 20:
                self.logger.info(
                    f"No frames received from {self.camera_name} in 20 seconds. Exiting ffmpeg..."
                )
                self.ffmpeg_detect_process.terminate()
                try:
                    self.logger.info("Waiting for ffmpeg to exit gracefully...")
                    self.ffmpeg_detect_process.communicate(timeout=30)
                except sp.TimeoutExpired:
                    self.logger.info("FFmpeg didnt exit. Force killing...")
                    self.ffmpeg_detect_process.kill()
                    self.ffmpeg_detect_process.communicate()

            for p in self.ffmpeg_other_processes:
                poll = p["process"].poll()
                if poll == None:
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
        )
        self.capture_thread.start()


class CameraCapture(threading.Thread):
    def __init__(self, camera_name, ffmpeg_process, frame_shape, frame_queue, fps):
        threading.Thread.__init__(self)
        self.name = f"capture:{camera_name}"
        self.camera_name = camera_name
        self.frame_shape = frame_shape
        self.frame_queue = frame_queue
        self.fps = fps
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
        )


def capture_camera(name, config: CameraConfig, process_info):
    stop_event = mp.Event()

    def receiveSignal(signalNumber, frame):
        stop_event.set()

    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

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
    model_shape,
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

    frame_shape = config.frame_shape
    objects_to_track = config.objects.track
    object_filters = config.objects.filters

    motion_detector = MotionDetector(frame_shape, config.motion)
    object_detector = RemoteObjectDetector(
        name, "/labelmap.txt", detection_queue, result_connection, model_shape
    )

    object_tracker = ObjectTracker(config.detect)
    nms_threshold = config.detect.nms_threshold

    frame_manager = SharedMemoryFrameManager()

    process_frames(
        name,
        frame_queue,
        frame_shape,
        model_shape,
        frame_manager,
        motion_detector,
        object_detector,
        object_tracker,
        detected_objects_queue,
        process_info,
        objects_to_track,
        object_filters,
        detection_enabled,
        nms_threshold,
        stop_event,
    )

    logger.info(f"{name}: exiting subprocess")


def reduce_boxes(boxes):
    if len(boxes) == 0:
        return []
    reduced_boxes = cv2.groupRectangles(
        [list(b) for b in itertools.chain(boxes, boxes)], 1, 0.2
    )[0]
    return [tuple(b) for b in reduced_boxes]


# modified from https://stackoverflow.com/a/40795835
def intersects_any(box_a, boxes):
    for box in boxes:
        if (
            box_a[2] < box[0]
            or box_a[0] > box[2]
            or box_a[1] > box[3]
            or box_a[3] < box[1]
        ):
            continue
        return True


def detect(
    object_detector, frame, model_shape, region, objects_to_track, object_filters
):
    tensor_input = create_tensor_input(frame, model_shape, region)

    detections = []
    region_detections = object_detector.detect(tensor_input)
    for d in region_detections:
        box = d[2]
        size = region[2] - region[0]
        x_min = int((box[1] * size) + region[0])
        y_min = int((box[0] * size) + region[1])
        x_max = int((box[3] * size) + region[0])
        y_max = int((box[2] * size) + region[1])
        det = (
            d[0],
            d[1],
            (x_min, y_min, x_max, y_max),
            (x_max - x_min) * (y_max - y_min),
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
    model_shape,
    frame_manager: FrameManager,
    motion_detector: MotionDetector,
    object_detector: RemoteObjectDetector,
    object_tracker: ObjectTracker,
    detected_objects_queue: mp.Queue,
    process_info: Dict,
    objects_to_track: List[str],
    object_filters,
    detection_enabled: mp.Value,
    stop_event,
    nms_threshold,
    exit_on_empty: bool = False,
):

    fps = process_info["process_fps"]
    detection_fps = process_info["detection_fps"]
    current_frame_time = process_info["detection_frame"]

    fps_tracker = EventsPerSecond()
    fps_tracker.start()

    while not stop_event.is_set():
        if exit_on_empty and frame_queue.empty():
            logger.info(f"Exiting track_objects...")
            break

        try:
            frame_time = frame_queue.get(True, 10)
        except queue.Empty:
            continue

        current_frame_time.value = frame_time

        frame = frame_manager.get(
            f"{camera_name}{frame_time}", (frame_shape[0] * 3 // 2, frame_shape[1])
        )

        if frame is None:
            logger.info(f"{camera_name}: frame {frame_time} is not in memory store.")
            continue

        if not detection_enabled.value:
            fps.value = fps_tracker.eps()
            object_tracker.match_and_update(frame_time, [])
            detected_objects_queue.put(
                (camera_name, frame_time, object_tracker.tracked_objects, [], [])
            )
            detection_fps.value = object_detector.fps.eps()
            frame_manager.close(f"{camera_name}{frame_time}")
            continue

        # look for motion
        motion_boxes = motion_detector.detect(frame)

        # only get the tracked object boxes that intersect with motion
        tracked_object_boxes = [
            obj["box"]
            for obj in object_tracker.tracked_objects.values()
            if intersects_any(obj["box"], motion_boxes)
        ]

        # combine motion boxes with known locations of existing objects
        combined_boxes = reduce_boxes(motion_boxes + tracked_object_boxes)

        # compute regions
        regions = [
            calculate_region(frame_shape, a[0], a[1], a[2], a[3], 1.2)
            for a in combined_boxes
        ]

        # combine overlapping regions
        combined_regions = reduce_boxes(regions)

        # re-compute regions
        regions = [
            calculate_region(frame_shape, a[0], a[1], a[2], a[3], 1.0)
            for a in combined_regions
        ]

        # resize regions and detect
        detections = []
        for region in regions:
            detections.extend(
                detect(
                    object_detector,
                    frame,
                    model_shape,
                    region,
                    objects_to_track,
                    object_filters,
                )
            )

        #########
        # merge objects, check for clipped objects and look again up to 4 times
        #########
        refining = True
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
                boxes = [
                    (o[2][0], o[2][1], o[2][2] - o[2][0], o[2][3] - o[2][1])
                    for o in group
                ]
                confidences = [o[1] for o in group]
                idxs = cv2.dnn.NMSBoxes(boxes, confidences, 0.5, nms_threshold)

                for index in idxs:
                    obj = group[index[0]]
                    if clipped(obj, frame_shape):
                        box = obj[2]
                        # calculate a new region that will hopefully get the entire object
                        region = calculate_region(
                            frame_shape, box[0], box[1], box[2], box[3]
                        )

                        regions.append(region)

                        selected_objects.extend(
                            detect(
                                object_detector,
                                frame,
                                model_shape,
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

        # Limit to the detections overlapping with motion areas
        # to avoid picking up stationary background objects
        detections_with_motion = [
            d for d in detections if intersects_any(d[2], motion_boxes)
        ]

        # now that we have refined our detections, we need to track objects
        object_tracker.match_and_update(frame_time, detections_with_motion)

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
