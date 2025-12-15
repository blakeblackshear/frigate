import logging
import queue
import subprocess as sp
import threading
import time
from collections import deque
from datetime import datetime, timedelta, timezone
from multiprocessing import Queue, Value
from multiprocessing.synchronize import Event as MpEvent
from typing import Any

import cv2

from frigate.camera import CameraMetrics, PTZMetrics
from frigate.comms.inter_process import InterProcessRequestor
from frigate.comms.recordings_updater import (
    RecordingsDataSubscriber,
    RecordingsDataTypeEnum,
)
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
from frigate.log import LogPipe
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


def stop_ffmpeg(ffmpeg_process: sp.Popen[Any], logger: logging.Logger):
    logger.info("Terminating the existing ffmpeg process...")
    ffmpeg_process.terminate()
    try:
        logger.info("Waiting for ffmpeg to exit gracefully...")
        ffmpeg_process.communicate(timeout=30)
        logger.info("FFmpeg has exited")
    except sp.TimeoutExpired:
        logger.info("FFmpeg didn't exit. Force killing...")
        ffmpeg_process.kill()
        ffmpeg_process.communicate()
        logger.info("FFmpeg has been killed")
    ffmpeg_process = None


def start_or_restart_ffmpeg(
    ffmpeg_cmd, logger, logpipe: LogPipe, frame_size=None, ffmpeg_process=None
) -> sp.Popen[Any]:
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
    ffmpeg_process: sp.Popen[Any],
    config: CameraConfig,
    shm_frame_count: int,
    frame_index: int,
    frame_shape: tuple[int, int],
    frame_manager: FrameManager,
    frame_queue,
    fps: Value,
    skipped_fps: Value,
    current_frame: Value,
    stop_event: MpEvent,
) -> None:
    frame_size = frame_shape[0] * frame_shape[1]
    frame_rate = EventsPerSecond()
    frame_rate.start()
    skipped_eps = EventsPerSecond()
    skipped_eps.start()

    config_subscriber = CameraConfigUpdateSubscriber(
        None, {config.name: config}, [CameraConfigUpdateEnum.enabled]
    )

    def get_enabled_state():
        """Fetch the latest enabled state from ZMQ."""
        config_subscriber.check_for_updates()
        return config.enabled

    try:
        while not stop_event.is_set():
            if not get_enabled_state():
                logger.debug(f"Stopping capture thread for disabled {config.name}")
                break

            fps.value = frame_rate.eps()
            skipped_fps.value = skipped_eps.eps()
            current_frame.value = datetime.now().timestamp()
            frame_name = f"{config.name}_frame{frame_index}"
            frame_buffer = frame_manager.write(frame_name)
            try:
                frame_buffer[:] = ffmpeg_process.stdout.read(frame_size)
            except Exception:
                # shutdown has been initiated
                if stop_event.is_set():
                    break

                logger.error(
                    f"{config.name}: Unable to read frames from ffmpeg process."
                )

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
                frame_queue.put((frame_name, current_frame.value), False)
                frame_manager.close(frame_name)
            except queue.Full:
                # if the queue is full, skip this frame
                skipped_eps.update()

            frame_index = 0 if frame_index == shm_frame_count - 1 else frame_index + 1
    finally:
        config_subscriber.stop()


class CameraWatchdog(threading.Thread):
    def __init__(
        self,
        config: CameraConfig,
        shm_frame_count: int,
        frame_queue: Queue,
        camera_fps,
        skipped_fps,
        ffmpeg_pid,
        stalls,
        reconnects,
        detection_frame,
        stop_event,
    ):
        threading.Thread.__init__(self)
        self.logger = logging.getLogger(f"watchdog.{config.name}")
        self.config = config
        self.shm_frame_count = shm_frame_count
        self.capture_thread = None
        self.ffmpeg_detect_process = None
        self.logpipe = LogPipe(f"ffmpeg.{self.config.name}.detect")
        self.ffmpeg_other_processes: list[dict[str, Any]] = []
        self.camera_fps = camera_fps
        self.skipped_fps = skipped_fps
        self.ffmpeg_pid = ffmpeg_pid
        self.frame_queue = frame_queue
        self.frame_shape = self.config.frame_shape_yuv
        self.frame_size = self.frame_shape[0] * self.frame_shape[1]
        self.fps_overflow_count = 0
        self.frame_index = 0
        self.stop_event = stop_event
        self.sleeptime = self.config.ffmpeg.retry_interval
        self.reconnect_timestamps = deque()
        self.stalls = stalls
        self.reconnects = reconnects
        self.detection_frame = detection_frame

        self.config_subscriber = CameraConfigUpdateSubscriber(
            None,
            {config.name: config},
            [CameraConfigUpdateEnum.enabled, CameraConfigUpdateEnum.record],
        )
        self.requestor = InterProcessRequestor()
        self.was_enabled = self.config.enabled

        self.segment_subscriber = RecordingsDataSubscriber(RecordingsDataTypeEnum.all)
        self.latest_valid_segment_time: float = 0
        self.latest_invalid_segment_time: float = 0
        self.latest_cache_segment_time: float = 0
        self.record_enable_time: datetime | None = None

        # Stall tracking (based on last processed frame)
        self._stall_timestamps: deque[float] = deque()
        self._stall_active: bool = False

        # Status caching to reduce message volume
        self._last_detect_status: str | None = None
        self._last_record_status: str | None = None
        self._last_status_update_time: float = 0.0

    def _send_detect_status(self, status: str, now: float) -> None:
        """Send detect status only if changed or retry_interval has elapsed."""
        if (
            status != self._last_detect_status
            or (now - self._last_status_update_time) >= self.sleeptime
        ):
            self.requestor.send_data(f"{self.config.name}/status/detect", status)
            self._last_detect_status = status
            self._last_status_update_time = now

    def _send_record_status(self, status: str, now: float) -> None:
        """Send record status only if changed or retry_interval has elapsed."""
        if (
            status != self._last_record_status
            or (now - self._last_status_update_time) >= self.sleeptime
        ):
            self.requestor.send_data(f"{self.config.name}/status/record", status)
            self._last_record_status = status
            self._last_status_update_time = now

    def _update_enabled_state(self) -> bool:
        """Fetch the latest config and update enabled state."""
        self.config_subscriber.check_for_updates()
        return self.config.enabled

    def reset_capture_thread(
        self, terminate: bool = True, drain_output: bool = True
    ) -> None:
        if terminate:
            self.ffmpeg_detect_process.terminate()
            try:
                self.logger.info("Waiting for ffmpeg to exit gracefully...")

                if drain_output:
                    self.ffmpeg_detect_process.communicate(timeout=30)
                else:
                    self.ffmpeg_detect_process.wait(timeout=30)
            except sp.TimeoutExpired:
                self.logger.info("FFmpeg did not exit. Force killing...")
                self.ffmpeg_detect_process.kill()

                if drain_output:
                    self.ffmpeg_detect_process.communicate()
                else:
                    self.ffmpeg_detect_process.wait()

        # Update reconnects
        now = datetime.now().timestamp()
        self.reconnect_timestamps.append(now)
        while self.reconnect_timestamps and self.reconnect_timestamps[0] < now - 3600:
            self.reconnect_timestamps.popleft()
        if self.reconnects:
            self.reconnects.value = len(self.reconnect_timestamps)

        # Wait for old capture thread to fully exit before starting a new one
        if self.capture_thread is not None and self.capture_thread.is_alive():
            self.logger.info("Waiting for capture thread to exit...")
            self.capture_thread.join(timeout=5)

            if self.capture_thread.is_alive():
                self.logger.warning(
                    f"Capture thread for {self.config.name} did not exit in time"
                )

        self.logger.error(
            "The following ffmpeg logs include the last 100 lines prior to exit."
        )
        self.logpipe.dump()
        self.logger.info("Restarting ffmpeg...")
        self.start_ffmpeg_detect()

    def run(self) -> None:
        if self._update_enabled_state():
            self.start_all_ffmpeg()
            # If recording is enabled at startup, set the grace period timer
            if self.config.record.enabled:
                self.record_enable_time = datetime.now().astimezone(timezone.utc)

        time.sleep(self.sleeptime)
        last_restart_time = datetime.now().timestamp()

        # 1 second watchdog loop
        while not self.stop_event.wait(1):
            enabled = self._update_enabled_state()
            if enabled != self.was_enabled:
                if enabled:
                    self.logger.debug(f"Enabling camera {self.config.name}")
                    self.start_all_ffmpeg()

                    # reset all timestamps and record the enable time for grace period
                    self.latest_valid_segment_time = 0
                    self.latest_invalid_segment_time = 0
                    self.latest_cache_segment_time = 0
                    self.record_enable_time = datetime.now().astimezone(timezone.utc)
                else:
                    self.logger.debug(f"Disabling camera {self.config.name}")
                    self.stop_all_ffmpeg()
                    self.record_enable_time = None

                    # update camera status
                    now = datetime.now().timestamp()
                    self._send_detect_status("disabled", now)
                    self._send_record_status("disabled", now)
                self.was_enabled = enabled
                continue

            if not enabled:
                continue

            while True:
                update = self.segment_subscriber.check_for_update(timeout=0)

                if update == (None, None):
                    break

                raw_topic, payload = update
                if raw_topic and payload:
                    topic = str(raw_topic)
                    camera, segment_time, _ = payload

                    if camera != self.config.name:
                        continue

                    if topic.endswith(RecordingsDataTypeEnum.valid.value):
                        self.logger.debug(
                            f"Latest valid recording segment time on {camera}: {segment_time}"
                        )
                        self.latest_valid_segment_time = segment_time
                    elif topic.endswith(RecordingsDataTypeEnum.invalid.value):
                        self.logger.warning(
                            f"Invalid recording segment detected for {camera} at {segment_time}"
                        )
                        self.latest_invalid_segment_time = segment_time
                    elif topic.endswith(RecordingsDataTypeEnum.latest.value):
                        if segment_time is not None:
                            self.latest_cache_segment_time = segment_time
                        else:
                            self.latest_cache_segment_time = 0

            now = datetime.now().timestamp()

            # Check if enough time has passed to allow ffmpeg restart (backoff pacing)
            time_since_last_restart = now - last_restart_time
            can_restart = time_since_last_restart >= self.sleeptime

            if not self.capture_thread.is_alive():
                self._send_detect_status("offline", now)
                self.camera_fps.value = 0
                self.logger.error(
                    f"Ffmpeg process crashed unexpectedly for {self.config.name}."
                )
                if can_restart:
                    self.reset_capture_thread(terminate=False)
                    last_restart_time = now
            elif self.camera_fps.value >= (self.config.detect.fps + 10):
                self.fps_overflow_count += 1

                if self.fps_overflow_count == 3:
                    self._send_detect_status("offline", now)
                    self.fps_overflow_count = 0
                    self.camera_fps.value = 0
                    self.logger.info(
                        f"{self.config.name} exceeded fps limit. Exiting ffmpeg..."
                    )
                    if can_restart:
                        self.reset_capture_thread(drain_output=False)
                        last_restart_time = now
            elif now - self.capture_thread.current_frame.value > 20:
                self._send_detect_status("offline", now)
                self.camera_fps.value = 0
                self.logger.info(
                    f"No frames received from {self.config.name} in 20 seconds. Exiting ffmpeg..."
                )
                if can_restart:
                    self.reset_capture_thread()
                    last_restart_time = now
            else:
                # process is running normally
                self._send_detect_status("online", now)
                self.fps_overflow_count = 0

            for p in self.ffmpeg_other_processes:
                poll = p["process"].poll()

                if self.config.record.enabled and "record" in p["roles"]:
                    now_utc = datetime.now().astimezone(timezone.utc)

                    # Check if we're within the grace period after enabling recording
                    # Grace period: 90 seconds allows time for ffmpeg to start and create first segment
                    in_grace_period = self.record_enable_time is not None and (
                        now_utc - self.record_enable_time
                    ) < timedelta(seconds=90)

                    latest_cache_dt = (
                        datetime.fromtimestamp(
                            self.latest_cache_segment_time, tz=timezone.utc
                        )
                        if self.latest_cache_segment_time > 0
                        else now_utc - timedelta(seconds=1)
                    )

                    latest_valid_dt = (
                        datetime.fromtimestamp(
                            self.latest_valid_segment_time, tz=timezone.utc
                        )
                        if self.latest_valid_segment_time > 0
                        else now_utc - timedelta(seconds=1)
                    )

                    latest_invalid_dt = (
                        datetime.fromtimestamp(
                            self.latest_invalid_segment_time, tz=timezone.utc
                        )
                        if self.latest_invalid_segment_time > 0
                        else now_utc - timedelta(seconds=1)
                    )

                    # ensure segments are still being created and that they have valid video data
                    # Skip checks during grace period to allow segments to start being created
                    cache_stale = not in_grace_period and now_utc > (
                        latest_cache_dt + timedelta(seconds=120)
                    )
                    valid_stale = not in_grace_period and now_utc > (
                        latest_valid_dt + timedelta(seconds=120)
                    )
                    invalid_stale_condition = (
                        self.latest_invalid_segment_time > 0
                        and not in_grace_period
                        and now_utc > (latest_invalid_dt + timedelta(seconds=120))
                        and self.latest_valid_segment_time
                        <= self.latest_invalid_segment_time
                    )
                    invalid_stale = invalid_stale_condition

                    if cache_stale or valid_stale or invalid_stale:
                        if cache_stale:
                            reason = "No new recording segments were created"
                        elif valid_stale:
                            reason = "No new valid recording segments were created"
                        else:  # invalid_stale
                            reason = (
                                "No valid segments created since last invalid segment"
                            )

                        self.logger.error(
                            f"{reason} for {self.config.name} in the last 120s. Restarting the ffmpeg record process..."
                        )
                        p["process"] = start_or_restart_ffmpeg(
                            p["cmd"],
                            self.logger,
                            p["logpipe"],
                            ffmpeg_process=p["process"],
                        )

                        for role in p["roles"]:
                            self.requestor.send_data(
                                f"{self.config.name}/status/{role}", "offline"
                            )

                        continue
                    else:
                        self._send_record_status("online", now)
                        p["latest_segment_time"] = self.latest_cache_segment_time

                if poll is None:
                    continue

                for role in p["roles"]:
                    self.requestor.send_data(
                        f"{self.config.name}/status/{role}", "offline"
                    )

                p["logpipe"].dump()
                p["process"] = start_or_restart_ffmpeg(
                    p["cmd"], self.logger, p["logpipe"], ffmpeg_process=p["process"]
                )

            # Update stall metrics based on last processed frame timestamp
            now = datetime.now().timestamp()
            processed_ts = (
                float(self.detection_frame.value) if self.detection_frame else 0.0
            )
            if processed_ts > 0:
                delta = now - processed_ts
                observed_fps = (
                    self.camera_fps.value
                    if self.camera_fps.value > 0
                    else self.config.detect.fps
                )
                interval = 1.0 / max(observed_fps, 0.1)
                stall_threshold = max(2.0 * interval, 2.0)

                if delta > stall_threshold:
                    if not self._stall_active:
                        self._stall_timestamps.append(now)
                        self._stall_active = True
                else:
                    self._stall_active = False

                while self._stall_timestamps and self._stall_timestamps[0] < now - 3600:
                    self._stall_timestamps.popleft()

                if self.stalls:
                    self.stalls.value = len(self._stall_timestamps)

        self.stop_all_ffmpeg()
        self.logpipe.close()
        self.config_subscriber.stop()
        self.segment_subscriber.stop()

    def start_ffmpeg_detect(self):
        ffmpeg_cmd = [
            c["cmd"] for c in self.config.ffmpeg_cmds if "detect" in c["roles"]
        ][0]
        self.ffmpeg_detect_process = start_or_restart_ffmpeg(
            ffmpeg_cmd, self.logger, self.logpipe, self.frame_size
        )
        self.ffmpeg_pid.value = self.ffmpeg_detect_process.pid
        self.capture_thread = CameraCaptureRunner(
            self.config,
            self.shm_frame_count,
            self.frame_index,
            self.ffmpeg_detect_process,
            self.frame_shape,
            self.frame_queue,
            self.camera_fps,
            self.skipped_fps,
            self.stop_event,
        )
        self.capture_thread.start()

    def start_all_ffmpeg(self):
        """Start all ffmpeg processes (detection and others)."""
        logger.debug(f"Starting all ffmpeg processes for {self.config.name}")
        self.start_ffmpeg_detect()
        for c in self.config.ffmpeg_cmds:
            if "detect" in c["roles"]:
                continue
            logpipe = LogPipe(
                f"ffmpeg.{self.config.name}.{'_'.join(sorted(c['roles']))}"
            )
            self.ffmpeg_other_processes.append(
                {
                    "cmd": c["cmd"],
                    "roles": c["roles"],
                    "logpipe": logpipe,
                    "process": start_or_restart_ffmpeg(c["cmd"], self.logger, logpipe),
                }
            )

    def stop_all_ffmpeg(self):
        """Stop all ffmpeg processes (detection and others)."""
        logger.debug(f"Stopping all ffmpeg processes for {self.config.name}")
        if self.capture_thread is not None and self.capture_thread.is_alive():
            self.capture_thread.join(timeout=5)
            if self.capture_thread.is_alive():
                self.logger.warning(
                    f"Capture thread for {self.config.name} did not stop gracefully."
                )
        if self.ffmpeg_detect_process is not None:
            stop_ffmpeg(self.ffmpeg_detect_process, self.logger)
            self.ffmpeg_detect_process = None
        for p in self.ffmpeg_other_processes[:]:
            if p["process"] is not None:
                stop_ffmpeg(p["process"], self.logger)
            p["logpipe"].close()
        self.ffmpeg_other_processes.clear()


class CameraCaptureRunner(threading.Thread):
    def __init__(
        self,
        config: CameraConfig,
        shm_frame_count: int,
        frame_index: int,
        ffmpeg_process,
        frame_shape: tuple[int, int],
        frame_queue: Queue,
        fps: Value,
        skipped_fps: Value,
        stop_event: MpEvent,
    ):
        threading.Thread.__init__(self)
        self.name = f"capture:{config.name}"
        self.config = config
        self.shm_frame_count = shm_frame_count
        self.frame_index = frame_index
        self.frame_shape = frame_shape
        self.frame_queue = frame_queue
        self.fps = fps
        self.stop_event = stop_event
        self.skipped_fps = skipped_fps
        self.frame_manager = SharedMemoryFrameManager()
        self.ffmpeg_process = ffmpeg_process
        self.current_frame = Value("d", 0.0)
        self.last_frame = 0

    def run(self):
        capture_frames(
            self.ffmpeg_process,
            self.config,
            self.shm_frame_count,
            self.frame_index,
            self.frame_shape,
            self.frame_manager,
            self.frame_queue,
            self.fps,
            self.skipped_fps,
            self.current_frame,
            self.stop_event,
        )


class CameraCapture(FrigateProcess):
    def __init__(
        self,
        config: CameraConfig,
        shm_frame_count: int,
        camera_metrics: CameraMetrics,
        stop_event: MpEvent,
        log_config: LoggerConfig | None = None,
    ) -> None:
        super().__init__(
            stop_event,
            PROCESS_PRIORITY_HIGH,
            name=f"frigate.capture:{config.name}",
            daemon=True,
        )
        self.config = config
        self.shm_frame_count = shm_frame_count
        self.camera_metrics = camera_metrics
        self.log_config = log_config

    def run(self) -> None:
        self.pre_run_setup(self.log_config)
        camera_watchdog = CameraWatchdog(
            self.config,
            self.shm_frame_count,
            self.camera_metrics.frame_queue,
            self.camera_metrics.camera_fps,
            self.camera_metrics.skipped_fps,
            self.camera_metrics.ffmpeg_pid,
            self.camera_metrics.stalls_last_hour,
            self.camera_metrics.reconnects_last_hour,
            self.camera_metrics.detection_frame,
            self.stop_event,
        )
        camera_watchdog.start()
        camera_watchdog.join()


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
