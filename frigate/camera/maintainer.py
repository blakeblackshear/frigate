"""Create and maintain camera processes / management."""

import logging
import multiprocessing as mp
import threading
from multiprocessing import Queue
from multiprocessing.managers import DictProxy, SyncManager
from multiprocessing.synchronize import Event as MpEvent

from frigate.camera import CameraMetrics, PTZMetrics
from frigate.config import FrigateConfig
from frigate.config.camera import CameraConfig
from frigate.config.camera.updater import (
    CameraConfigUpdateEnum,
    CameraConfigUpdateSubscriber,
)
from frigate.models import Regions
from frigate.util.builtin import empty_and_close_queue
from frigate.util.image import SharedMemoryFrameManager, UntrackedSharedMemory
from frigate.util.object import get_camera_regions_grid
from frigate.util.services import calculate_shm_requirements
from frigate.video import CameraCapture, CameraTracker

logger = logging.getLogger(__name__)


class CameraMaintainer(threading.Thread):
    def __init__(
        self,
        config: FrigateConfig,
        detection_queue: Queue,
        detected_frames_queue: Queue,
        camera_metrics: DictProxy,
        ptz_metrics: dict[str, PTZMetrics],
        stop_event: MpEvent,
        metrics_manager: SyncManager,
    ):
        super().__init__(name="camera_processor")
        self.config = config
        self.detection_queue = detection_queue
        self.detected_frames_queue = detected_frames_queue
        self.stop_event = stop_event
        self.camera_metrics = camera_metrics
        self.ptz_metrics = ptz_metrics
        self.frame_manager = SharedMemoryFrameManager()
        self.region_grids: dict[str, list[list[dict[str, int]]]] = {}
        self.update_subscriber = CameraConfigUpdateSubscriber(
            self.config,
            {},
            [
                CameraConfigUpdateEnum.add,
                CameraConfigUpdateEnum.remove,
            ],
        )
        self.shm_count = self.__calculate_shm_frame_count()
        self.camera_processes: dict[str, mp.Process] = {}
        self.capture_processes: dict[str, mp.Process] = {}
        self.metrics_manager = metrics_manager

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
        shm_stats = calculate_shm_requirements(self.config)

        if not shm_stats:
            # /dev/shm not available
            return 0

        logger.debug(
            f"Calculated total camera size {shm_stats['available']} / "
            f"{shm_stats['camera_frame_size']} :: {shm_stats['shm_frame_count']} "
            f"frames for each camera in SHM"
        )

        if shm_stats["shm_frame_count"] < 20:
            logger.warning(
                f"The current SHM size of {shm_stats['total']}MB is too small, "
                f"recommend increasing it to at least {shm_stats['min_shm']}MB."
            )

        return shm_stats["shm_frame_count"]

    def __start_camera_processor(
        self, name: str, config: CameraConfig, runtime: bool = False
    ) -> None:
        if not config.enabled_in_config:
            logger.info(f"Camera processor not started for disabled camera {name}")
            return

        if runtime:
            self.camera_metrics[name] = CameraMetrics(self.metrics_manager)
            self.ptz_metrics[name] = PTZMetrics(autotracker_enabled=False)
            self.region_grids[name] = get_camera_regions_grid(
                name,
                config.detect,
                max(self.config.model.width, self.config.model.height),
            )

            try:
                largest_frame = max(
                    [
                        det.model.height * det.model.width * 3
                        if det.model is not None
                        else 320
                        for det in self.config.detectors.values()
                    ]
                )
                UntrackedSharedMemory(name=f"out-{name}", create=True, size=20 * 6 * 4)
                UntrackedSharedMemory(
                    name=name,
                    create=True,
                    size=largest_frame,
                )
            except FileExistsError:
                pass

        camera_process = CameraTracker(
            config,
            self.config.model,
            self.config.model.merged_labelmap,
            self.detection_queue,
            self.detected_frames_queue,
            self.camera_metrics[name],
            self.ptz_metrics[name],
            self.region_grids[name],
            self.stop_event,
            self.config.logger,
        )
        self.camera_processes[config.name] = camera_process
        camera_process.start()
        self.camera_metrics[config.name].process_pid.value = camera_process.pid
        logger.info(f"Camera processor started for {config.name}: {camera_process.pid}")

    def __start_camera_capture(
        self, name: str, config: CameraConfig, runtime: bool = False
    ) -> None:
        if not config.enabled_in_config:
            logger.info(f"Capture process not started for disabled camera {name}")
            return

        # pre-create shms
        count = 10 if runtime else self.shm_count
        for i in range(count):
            frame_size = config.frame_shape_yuv[0] * config.frame_shape_yuv[1]
            self.frame_manager.create(f"{config.name}_frame{i}", frame_size)

        capture_process = CameraCapture(
            config,
            count,
            self.camera_metrics[name],
            self.stop_event,
            self.config.logger,
        )
        capture_process.daemon = True
        self.capture_processes[name] = capture_process
        capture_process.start()
        self.camera_metrics[name].capture_process_pid.value = capture_process.pid
        logger.info(f"Capture process started for {name}: {capture_process.pid}")

    def __stop_camera_capture_process(self, camera: str) -> None:
        capture_process = self.capture_processes[camera]
        if capture_process is not None:
            logger.info(f"Waiting for capture process for {camera} to stop")
            capture_process.terminate()
            capture_process.join()

    def __stop_camera_process(self, camera: str) -> None:
        camera_process = self.camera_processes[camera]
        if camera_process is not None:
            logger.info(f"Waiting for process for {camera} to stop")
            camera_process.terminate()
            camera_process.join()
            logger.info(f"Closing frame queue for {camera}")
            empty_and_close_queue(self.camera_metrics[camera].frame_queue)

    def run(self):
        self.__init_historical_regions()

        # start camera processes
        for camera, config in self.config.cameras.items():
            self.__start_camera_processor(camera, config)
            self.__start_camera_capture(camera, config)

        while not self.stop_event.wait(1):
            updates = self.update_subscriber.check_for_updates()

            for update_type, updated_cameras in updates.items():
                if update_type == CameraConfigUpdateEnum.add.name:
                    for camera in updated_cameras:
                        self.__start_camera_processor(
                            camera,
                            self.update_subscriber.camera_configs[camera],
                            runtime=True,
                        )
                        self.__start_camera_capture(
                            camera,
                            self.update_subscriber.camera_configs[camera],
                            runtime=True,
                        )
                elif update_type == CameraConfigUpdateEnum.remove.name:
                    self.__stop_camera_capture_process(camera)
                    self.__stop_camera_process(camera)

        # ensure the capture processes are done
        for camera in self.camera_processes.keys():
            self.__stop_camera_capture_process(camera)

        # ensure the camera processors are done
        for camera in self.capture_processes.keys():
            self.__stop_camera_process(camera)

        self.update_subscriber.stop()
        self.frame_manager.cleanup()
