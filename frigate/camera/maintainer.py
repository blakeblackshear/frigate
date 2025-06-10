"""Create and maintain camera processes / management."""

import logging
import os
import shutil
import threading
from multiprocessing import Queue
from multiprocessing.synchronize import Event as MpEvent

from frigate.camera import CameraMetrics, PTZMetrics
from frigate.config import FrigateConfig
from frigate.config.updater import GlobalConfigUpdateEnum, GlobalConfigUpdateSubscriber
from frigate.const import SHM_FRAMES_VAR
from frigate.models import Regions
from frigate.util import Process as FrigateProcess
from frigate.util.builtin import empty_and_close_queue
from frigate.util.image import SharedMemoryFrameManager
from frigate.util.object import get_camera_regions_grid
from frigate.video import capture_camera, track_camera

logger = logging.getLogger(__name__)


class CameraMaintainer(threading.Thread):
    def __init__(
        self,
        config: FrigateConfig,
        detection_queue: Queue,
        detection_out_events: dict[str, MpEvent],
        detected_frames_queue: Queue,
        camera_metrics: dict[str, CameraMetrics],
        ptz_metrics: dict[str, PTZMetrics],
        stop_event: MpEvent,
    ):
        super().__init__(name="camera_processor")
        self.config = config
        self.detection_queue = detection_queue
        self.detection_out_events = detection_out_events
        self.detected_frames_queue = detected_frames_queue
        self.stop_event = stop_event
        self.camera_metrics = camera_metrics
        self.ptz_metrics = ptz_metrics
        self.frame_manager = SharedMemoryFrameManager()
        self.region_grids: dict[str, list[list[dict[str, int]]]] = {}
        self.update_subscriber = GlobalConfigUpdateSubscriber(
            [
                GlobalConfigUpdateEnum.add_camera,
                GlobalConfigUpdateEnum.debug_camera,
                GlobalConfigUpdateEnum.remove_camera,
            ]
        )

    def __init_historical_regions(self) -> None:
        # delete region grids for removed or renamed cameras
        cameras = list(self.config.cameras.keys())
        Regions.delete().where(~(Regions.camera << cameras)).execute()

        # create or update region grids for each camera
        for camera in self.config.cameras.values():
            assert camera.name is not None
            self.region_grids[camera.name] = get_camera_regions_grid(
                camera.name,
                camera.detect,
                max(self.config.model.width, self.config.model.height),
            )

    def __calculate_shm_frame_count(self) -> int:
        total_shm = round(shutil.disk_usage("/dev/shm").total / pow(2, 20), 1)

        # required for log files + nginx cache
        min_req_shm = 40 + 10

        if self.config.birdseye.restream:
            min_req_shm += 8

        available_shm = total_shm - min_req_shm
        cam_total_frame_size = 0.0

        for camera in self.config.cameras.values():
            if camera.enabled and camera.detect.width and camera.detect.height:
                cam_total_frame_size += round(
                    (camera.detect.width * camera.detect.height * 1.5 + 270480)
                    / 1048576,
                    1,
                )

        if cam_total_frame_size == 0.0:
            return 0

        shm_frame_count = min(
            int(os.environ.get(SHM_FRAMES_VAR, "50")),
            int(available_shm / (cam_total_frame_size)),
        )

        logger.debug(
            f"Calculated total camera size {available_shm} / {cam_total_frame_size} :: {shm_frame_count} frames for each camera in SHM"
        )

        if shm_frame_count < 20:
            logger.warning(
                f"The current SHM size of {total_shm}MB is too small, recommend increasing it to at least {round(min_req_shm + cam_total_frame_size * 20)}MB."
            )

        return shm_frame_count

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
        shm_frame_count = self.__calculate_shm_frame_count()

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

    def __stop_camera_capture_process(self, camera: str) -> None:
        capture_process = self.camera_metrics[camera].capture_process
        if capture_process is not None:
            logger.info(f"Waiting for capture process for {camera} to stop")
            capture_process.terminate()
            capture_process.join()

    def __stop_camera_process(self, camera: str) -> None:
        metrics = self.camera_metrics[camera]
        camera_process = metrics.process
        if camera_process is not None:
            logger.info(f"Waiting for process for {camera} to stop")
            camera_process.terminate()
            camera_process.join()
            logger.info(f"Closing frame queue for {camera}")
            empty_and_close_queue(metrics.frame_queue)

    def run(self):
        self.__init_historical_regions()

        # start camera processes
        self.__start_camera_processors()
        self.__start_camera_capture()

        while not self.stop_event.wait(1):
            updates = self.update_subscriber.check_for_updates()

            for update_type, update_payload in updates:
                if update_type == GlobalConfigUpdateEnum.add_camera:
                    pass
                elif update_type == GlobalConfigUpdateEnum.debug_camera:
                    pass
                elif update_type == GlobalConfigUpdateEnum.remove_camera:
                    camera = update_payload.get("camera")

                    if camera:
                        self.__stop_camera_capture_process(camera)
                        self.__stop_camera_process(camera)

        # ensure the capture processes are done
        for camera in self.camera_metrics.keys():
            self.__stop_camera_capture_process(camera)

        # ensure the camera processors are done
        for camera in self.camera_metrics.keys():
            self.__stop_camera_process(camera)

        self.frame_manager.cleanup()
