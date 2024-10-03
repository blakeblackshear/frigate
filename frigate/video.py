import datetime
import logging
import multiprocessing as mp
import os
import queue
import signal
import subprocess as sp
import threading
import time

import cv2
from setproctitle import setproctitle

from frigate.camera import CameraMetrics, PTZMetrics
from frigate.comms.config_updater import ConfigSubscriber
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import CameraConfig, DetectConfig, ModelConfig
from frigate.const import (
    CACHE_DIR,
    CACHE_SEGMENT_FORMAT,
    REQUEST_REGION_GRID,
)
from frigate.log import LogPipe
from frigate.motion import MotionDetector
from frigate.motion.improved_motion import ImprovedMotionDetector
from frigate.object_detection import RemoteObjectDetector
from frigate.ptz.autotrack import ptz_moving_at_frame_time
from frigate.track import ObjectTracker
from frigate.track.norfair_tracker import NorfairTracker
from frigate.track.object_attribute import ObjectAttribute
from frigate.util.builtin import EventsPerSecond, get_tomorrow_at_time
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
from frigate.util.services import listen

logger = logging.getLogger(__name__)


def stop_ffmpeg(ffmpeg_process, logger):
    logger.info("Terminating the existing ffmpeg process...")
    ffmpeg_process.terminate()
    try:
        logger.info("Waiting for ffmpeg to exit gracefully...")
        ffmpeg_process.communicate(timeout=30)
    except sp.TimeoutExpired:
        logger.info("FFmpeg didn't exit. Force killing...")
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
    config: CameraConfig,
    shm_frame_count: int,
    shm_frames: list[str],
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
        frame_name = f"{config.name}{current_frame.value}"
        frame_buffer = frame_manager.create(frame_name, frame_size)
        try:
            frame_buffer[:] = ffmpeg_process.stdout.read(frame_size)

            # update frame cache and cleanup existing frames
            shm_frames.append(frame_name)

            if len(shm_frames) > shm_frame_count:
                expired_frame_name = shm_frames.pop(0)
                frame_manager.delete(expired_frame_name)
        except Exception:
            # always delete the frame
            frame_manager.delete(frame_name)

            # shutdown has been initiated
            if stop_event.is_set():
                break

            logger.error(f"{config.name}: Unable to read frames from ffmpeg process.")

            if ffmpeg_process.poll() is not None:
                logger.error(
                    f"{config.name}: ffmpeg process is not running. exiting capture thread..."
                )
                break

            continue

        frame_rate.update()

        # don't lock the queue to check, just try since it should rarely be full
        try:
            # add to the queue
            frame_queue.put(current_frame.value, False)
            frame_manager.close(frame_name)
        except queue.Full:
            # if the queue is full, skip this frame
            skipped_eps.update()


class CameraWatchdog(threading.Thread):
    def __init__(
        self,
        camera_name,
        config: CameraConfig,
        shm_frame_count: int,
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
        self.shm_frame_count = shm_frame_count
        self.shm_frames: list[str] = []
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
        self.fps_overflow_count = 0
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
                self.fps_overflow_count += 1

                if self.fps_overflow_count == 3:
                    self.fps_overflow_count = 0
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
            else:
                # process is running normally
                self.fps_overflow_count = 0

            for p in self.ffmpeg_other_processes:
                poll = p["process"].poll()

                if self.config.record.enabled and "record" in p["roles"]:
                    latest_segment_time = self.get_latest_segment_datetime(
                        p.get(
                            "latest_segment_time",
                            datetime.datetime.now().astimezone(datetime.timezone.utc),
                        )
                    )

                    if datetime.datetime.now().astimezone(datetime.timezone.utc) > (
                        latest_segment_time + datetime.timedelta(seconds=120)
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
            self.config,
            self.shm_frame_count,
            self.shm_frames,
            self.ffmpeg_detect_process,
            self.frame_shape,
            self.frame_queue,
            self.camera_fps,
            self.skipped_fps,
            self.stop_event,
        )
        self.capture_thread.start()

    def get_latest_segment_datetime(self, latest_segment: datetime.datetime) -> int:
        """Checks if ffmpeg is still writing recording segments to cache."""
        cache_files = sorted(
            [
                d
                for d in os.listdir(CACHE_DIR)
                if os.path.isfile(os.path.join(CACHE_DIR, d))
                and d.endswith(".mp4")
                and not d.startswith("preview_")
            ]
        )
        newest_segment_time = latest_segment

        for file in cache_files:
            if self.camera_name in file:
                basename = os.path.splitext(file)[0]
                _, date = basename.rsplit("@", maxsplit=1)
                segment_time = datetime.datetime.strptime(
                    date, CACHE_SEGMENT_FORMAT
                ).astimezone(datetime.timezone.utc)
                if segment_time > newest_segment_time:
                    newest_segment_time = segment_time

        return newest_segment_time


class CameraCapture(threading.Thread):
    def __init__(
        self,
        config: CameraConfig,
        shm_frame_count: int,
        shm_frames: list[str],
        ffmpeg_process,
        frame_shape,
        frame_queue,
        fps,
        skipped_fps,
        stop_event,
    ):
        threading.Thread.__init__(self)
        self.name = f"capture:{config.name}"
        self.config = config
        self.shm_frame_count = shm_frame_count
        self.shm_frames = shm_frames
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
            self.config,
            self.shm_frame_count,
            self.shm_frames,
            self.frame_shape,
            self.frame_manager,
            self.frame_queue,
            self.fps,
            self.skipped_fps,
            self.current_frame,
            self.stop_event,
        )


def capture_camera(
    name, config: CameraConfig, shm_frame_count: int, camera_metrics: CameraMetrics
):
    stop_event = mp.Event()

    def receiveSignal(signalNumber, frame):
        stop_event.set()

    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    threading.current_thread().name = f"capture:{name}"
    setproctitle(f"frigate.capture:{name}")

    camera_watchdog = CameraWatchdog(
        name,
        config,
        shm_frame_count,
        camera_metrics.frame_queue,
        camera_metrics.camera_fps,
        camera_metrics.skipped_fps,
        camera_metrics.ffmpeg_pid,
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
    camera_metrics: CameraMetrics,
    ptz_metrics: PTZMetrics,
    region_grid,
):
    stop_event = mp.Event()

    def receiveSignal(signalNumber, frame):
        stop_event.set()

    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    threading.current_thread().name = f"process:{name}"
    setproctitle(f"frigate.process:{name}")
    listen()

    frame_queue = camera_metrics.frame_queue

    frame_shape = config.frame_shape
    objects_to_track = config.objects.track
    object_filters = config.objects.filters

    motion_detector = ImprovedMotionDetector(
        frame_shape, config.motion, config.detect.fps, name=config.name
    )
    object_detector = RemoteObjectDetector(
        name, labelmap, detection_queue, result_connection, model_config, stop_event
    )

    object_tracker = NorfairTracker(config, ptz_metrics)

    frame_manager = SharedMemoryFrameManager()

    # create communication for region grid updates
    requestor = InterProcessRequestor()

    process_frames(
        name,
        requestor,
        frame_queue,
        frame_shape,
        model_config,
        config.detect,
        frame_manager,
        motion_detector,
        object_detector,
        object_tracker,
        detected_objects_queue,
        camera_metrics,
        objects_to_track,
        object_filters,
        stop_event,
        ptz_metrics,
        region_grid,
    )

    # empty the frame queue
    logger.info(f"{name}: emptying frame queue")
    while not frame_queue.empty():
        frame_time = frame_queue.get(False)
        frame_manager.delete(f"{name}{frame_time}")

    logger.info(f"{name}: exiting subprocess")


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
        if is_object_filtered(det, objects_to_track, object_filters):
            continue
        detections.append(det)
    return detections


def process_frames(
    camera_name: str,
    requestor: InterProcessRequestor,
    frame_queue: mp.Queue,
    frame_shape,
    model_config: ModelConfig,
    detect_config: DetectConfig,
    frame_manager: FrameManager,
    motion_detector: MotionDetector,
    object_detector: RemoteObjectDetector,
    object_tracker: ObjectTracker,
    detected_objects_queue: mp.Queue,
    camera_metrics: CameraMetrics,
    objects_to_track: list[str],
    object_filters,
    stop_event,
    ptz_metrics: PTZMetrics,
    region_grid,
    exit_on_empty: bool = False,
):
    next_region_update = get_tomorrow_at_time(2)
    config_subscriber = ConfigSubscriber(f"config/detect/{camera_name}")

    fps_tracker = EventsPerSecond()
    fps_tracker.start()

    startup_scan = True
    stationary_frame_counter = 0

    region_min_size = get_min_region_size(model_config)

    while not stop_event.is_set():
        # check for updated detect config
        _, updated_detect_config = config_subscriber.check_for_update()

        if updated_detect_config:
            detect_config = updated_detect_config

        if (
            datetime.datetime.now().astimezone(datetime.timezone.utc)
            > next_region_update
        ):
            region_grid = requestor.send_data(REQUEST_REGION_GRID, camera_name)
            next_region_update = get_tomorrow_at_time(2)

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

        camera_metrics.detection_frame.value = frame_time
        ptz_metrics.frame_time.value = frame_time

        frame = frame_manager.get(
            f"{camera_name}{frame_time}", (frame_shape[0] * 3 // 2, frame_shape[1])
        )

        if frame is None:
            logger.debug(f"{camera_name}: frame {frame_time} is not in memory store.")
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
                        detect_config,
                        object_detector,
                        frame,
                        model_config,
                        region,
                        objects_to_track,
                        object_filters,
                    )
                )

            consolidated_detections = reduce_detections(frame_shape, detections)

            # if detection was run on this frame, consolidate
            if len(regions) > 0:
                tracked_detections = [
                    d
                    for d in consolidated_detections
                    if d[0] not in model_config.all_attributes
                ]
                # now that we have refined our detections, we need to track objects
                object_tracker.match_and_update(frame_time, tracked_detections)
            # else, just update the frame times for the stationary objects
            else:
                object_tracker.update_frame_times(frame_time)

        # group the attribute detections based on what label they apply to
        attribute_detections: dict[str, list[ObjectAttribute]] = {}
        for label, attribute_labels in model_config.attributes_map.items():
            attribute_detections[label] = [
                ObjectAttribute(d)
                for d in consolidated_detections
                if d[0] in attribute_labels
            ]

        # build detections
        detections = {}
        for obj in object_tracker.tracked_objects.values():
            detections[obj["id"]] = {**obj, "attributes": []}

        # find the best object for each attribute to be assigned to
        all_objects: list[dict[str, any]] = object_tracker.tracked_objects.values()
        for attributes in attribute_detections.values():
            for attribute in attributes:
                filtered_objects = filter(
                    lambda o: attribute.label
                    in model_config.attributes_map.get(o["label"], []),
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
            camera_metrics.process_fps.value = fps_tracker.eps()
            detected_objects_queue.put(
                (
                    camera_name,
                    frame_time,
                    detections,
                    motion_boxes,
                    regions,
                )
            )
            camera_metrics.detection_fps.value = object_detector.fps.eps()
            frame_manager.close(f"{camera_name}{frame_time}")

    motion_detector.stop()
    requestor.stop()
    config_subscriber.stop()
