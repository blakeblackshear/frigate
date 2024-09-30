import logging
import multiprocessing as mp
from multiprocessing.synchronize import Event
from typing import Optional

from frigate import util
from frigate.config import FrigateConfig
from frigate.util.object import get_camera_regions_grid
from frigate.video import CameraWatchdog, track_camera

from .metrics import CameraMetrics, PTZMetrics

logger = logging.getLogger(__name__)


class Camera:
    name: str
    config: FrigateConfig

    detection_out_event: Event
    region_grid: list[list[dict[str, int]]]

    camera_metrics: CameraMetrics
    ptz_metrics: PTZMetrics

    process: Optional[util.Process]
    capture_process: Optional[util.Process]

    def __init__(self, name: str, config: FrigateConfig):
        self.name = name
        self.config = config

        self.detection_out_event = mp.Event()

        self.camera_metrics = CameraMetrics()
        self.ptz_metrics = PTZMetrics(
            autotracker_enabled=self.config.cameras[
                self.name
            ].onvif.autotracking.enabled
        )

    def start_process(self, detection_queue: mp.Queue, detected_frames_queue: mp.Queue):
        if not self.config.cameras[self.name].enabled:
            logger.info(f"Camera processor not started for disabled camera {self.name}")
            return

        camera_process = util.Process(
            target=track_camera,
            name=f"camera_processor:{self.name}",
            args=(
                self.name,
                self.config.cameras[self.name],
                self.config.model,
                self.config.model.merged_labelmap,
                detection_queue,
                self.detection_out_event,
                detected_frames_queue,
                self.camera_metrics,
                self.ptz_metrics,
                self.region_grid,
            ),
            daemon=True,
        )
        self.process = camera_process
        self.camera_metrics.process_pid.value = camera_process.pid or 0
        camera_process.start()
        logger.info(f"Camera processor started for {self.name}: {camera_process.pid}")

    def start_capture_process(self, shm_frame_count: int):
        if not self.config.cameras[self.name].enabled:
            logger.info(f"Capture process not started for disabled camera {self.name}")
            return

        capture_process = CameraWatchdog(
            self.name,
            self.config.cameras[self.name],
            shm_frame_count,
            self.camera_metrics,
        )
        capture_process.daemon = True
        self.capture_process = capture_process
        self.camera_metrics.capture_pid.value = capture_process.pid or 0
        capture_process.start()
        logger.info(f"Capture process started for {self.name}: {capture_process.pid}")

    def init_historical_regions(self) -> None:
        # create or update region grids for each camera
        self.region_grid = get_camera_regions_grid(
            self.name,
            self.config.cameras[self.name].detect,
            max(self.config.model.width, self.config.model.height),
        )
