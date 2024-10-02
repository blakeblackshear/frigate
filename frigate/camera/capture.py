import datetime
import logging
import multiprocessing as mp
import os
import queue
import subprocess as sp
import threading

from frigate import util
from frigate.camera.metrics import CameraMetrics
from frigate.config import CameraConfig
from frigate.const import (
    CACHE_DIR,
    CACHE_SEGMENT_FORMAT,
)
from frigate.log import LogPipe
from frigate.util.builtin import EventsPerSecond
from frigate.util.ffmpeg import start_or_restart_ffmpeg, stop_ffmpeg
from frigate.util.image import (
    SharedMemoryFrameManager,
)


class CameraWatchdog(util.Process):
    def __init__(
        self,
        camera_name: str,
        config: CameraConfig,
        shm_frame_count: int,
        camera_metrics: CameraMetrics,
    ):
        super().__init__(name=f"frigate.watchdog:{camera_name}")

        self.camera_name = camera_name
        self.config = config
        self.shm_frame_count = shm_frame_count
        self.camera_fps = camera_metrics.camera_fps
        self.skipped_fps = camera_metrics.skipped_fps
        self.ffmpeg_pid = camera_metrics.ffmpeg_pid
        self.frame_queue = camera_metrics.frame_queue

    def run(self):
        self.ffmpeg_detect_process = None
        self.logpipe = LogPipe(f"ffmpeg.{self.camera_name}.detect")
        self.ffmpeg_other_processes: list[dict[str, any]] = []
        self.frame_shape = self.config.frame_shape_yuv
        self.frame_size = self.frame_shape[0] * self.frame_shape[1]

        fps_overflow_count = 0
        sleeptime = self.config.ffmpeg.retry_interval

        capture_thread = self.start_ffmpeg_detect()

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

        while not self.stop_event.wait(sleeptime):
            now = datetime.datetime.now().timestamp()

            if not capture_thread.is_alive():
                self.camera_fps.value = 0
                self.logger.error(
                    f"Ffmpeg process crashed unexpectedly for {self.camera_name}."
                )
                self.logger.error(
                    "The following ffmpeg logs include the last 100 lines prior to exit."
                )
                self.logpipe.dump()
                capture_thread = self.start_ffmpeg_detect()
            elif now - capture_thread.current_frame.value > 20:
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
                fps_overflow_count += 1

                if fps_overflow_count == 3:
                    fps_overflow_count = 0
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
                fps_overflow_count = 0

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
        capture_thread = CameraCapture(
            self.config,
            self.shm_frame_count,
            self.ffmpeg_detect_process,
            self.frame_shape,
            self.frame_queue,
            self.camera_fps,
            self.skipped_fps,
            self.stop_event,
        )
        capture_thread.start()

        return capture_thread

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
        ffmpeg_process,
        frame_shape,
        frame_queue,
        fps,
        skipped_fps,
        stop_event,
    ):
        super().__init__(name=f"capture:{config.name}")

        self.logger = logging.getLogger(self.name)
        self.config = config
        self.shm_frame_count = shm_frame_count
        self.frame_shape = frame_shape
        self.frame_queue = frame_queue
        self.fps = fps
        self.stop_event = stop_event
        self.skipped_fps = skipped_fps
        self.frame_manager = SharedMemoryFrameManager()
        self.ffmpeg_process = ffmpeg_process
        self.current_frame = mp.Value("d", 0.0)

    def run(self):
        frame_size = self.frame_shape[0] * self.frame_shape[1]
        frame_rate = EventsPerSecond()
        frame_rate.start()
        skipped_eps = EventsPerSecond()
        skipped_eps.start()

        shm_frames: list[str] = []

        while True:
            self.fps.value = frame_rate.eps()
            self.skipped_fps.value = skipped_eps.eps()
            self.current_frame.value = datetime.datetime.now().timestamp()
            frame_name = f"{self.config.name}{self.current_frame.value}"
            frame_buffer = self.frame_manager.create(frame_name, frame_size)
            try:
                frame_buffer[:] = self.ffmpeg_process.stdout.read(frame_size)

                # update frame cache and cleanup existing frames
                shm_frames.append(frame_name)

                if len(shm_frames) > self.shm_frame_count:
                    expired_frame_name = shm_frames.pop(0)
                    self.frame_manager.delete(expired_frame_name)
            except Exception:
                # always delete the frame
                self.frame_manager.delete(frame_name)

                # shutdown has been initiated
                if self.stop_event.is_set():
                    break

                self.logger.error(
                    f"{self.config.name}: Unable to read frames from ffmpeg process."
                )

                if self.ffmpeg_process.poll() is not None:
                    self.logger.error(
                        f"{self.config.name}: ffmpeg process is not running. exiting capture thread..."
                    )
                    break

                continue

            frame_rate.update()

            # don't lock the queue to check, just try since it should rarely be full
            try:
                # add to the queue
                self.frame_queue.put(self.current_frame.value, False)
                self.frame_manager.close(frame_name)
            except queue.Full:
                # if the queue is full, skip this frame
                skipped_eps.update()

        # clear out frames
        for frame in shm_frames:
            self.frame_manager.delete(frame)
