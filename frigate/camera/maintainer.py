"""Create and maintain camera processes / management."""

import logging
import threading
from multiprocessing.synchronize import Event as MpEvent

from frigate.config import FrigateConfig
from frigate.util import Process as FrigateProcess
from frigate.util.builtin import empty_and_close_queue
from frigate.video import capture_camera, track_camera

logger = logging.getLogger(__name__)



class CameraMaintainer(threading.Thread):
    def __init__(self, config: FrigateConfig, stop_event: MpEvent):
        super().__init__(name="camera_processor")
        self.config = config
        self.stop_event = stop_event

    def __start_camera_processors(self) -> None:
        for name, config in self.config.cameras.items():
            if not self.config.cameras[name].enabled_in_config:
                logger.info(f"Camera processor not started for disabled camera {name}")
                continue

            camera_process = FrigateProcess(
                target=track_camera,
                name=f"camera_processor:{name}",
                args=(
                    name,
                    config,
                    self.config.model,
                    self.config.model.merged_labelmap,
                    self.detection_queue,
                    self.detection_out_events[name],
                    self.detected_frames_queue,
                    self.camera_metrics[name],
                    self.ptz_metrics[name],
                    self.region_grids[name],
                ),
                daemon=True,
            )
            self.camera_metrics[name].process = camera_process
            camera_process.start()
            logger.info(f"Camera processor started for {name}: {camera_process.pid}")

    def __start_camera_capture(self) -> None:
        shm_frame_count = self.shm_frame_count()

        for name, config in self.config.cameras.items():
            if not self.config.cameras[name].enabled_in_config:
                logger.info(f"Capture process not started for disabled camera {name}")
                continue

            # pre-create shms
            for i in range(shm_frame_count):
                frame_size = config.frame_shape_yuv[0] * config.frame_shape_yuv[1]
                self.frame_manager.create(f"{config.name}_frame{i}", frame_size)

            capture_process = FrigateProcess(
                target=capture_camera,
                name=f"camera_capture:{name}",
                args=(config, shm_frame_count, self.camera_metrics[name]),
            )
            capture_process.daemon = True
            self.camera_metrics[name].capture_process = capture_process
            capture_process.start()
            logger.info(f"Capture process started for {name}: {capture_process.pid}")

    def run(self):
        # start camera processes
        self.__start_camera_processors()

        while not self.stop_event.is_set():
            pass

        # ensure the capture processes are done
        for camera, metrics in self.camera_metrics.items():
            capture_process = metrics.capture_process
            if capture_process is not None:
                logger.info(f"Waiting for capture process for {camera} to stop")
                capture_process.terminate()
                capture_process.join()

        # ensure the camera processors are done
        for camera, metrics in self.camera_metrics.items():
            camera_process = metrics.process
            if camera_process is not None:
                logger.info(f"Waiting for process for {camera} to stop")
                camera_process.terminate()
                camera_process.join()
                logger.info(f"Closing frame queue for {camera}")
                empty_and_close_queue(metrics.frame_queue)
