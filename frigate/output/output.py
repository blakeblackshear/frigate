"""Handle outputting raw frigate frames"""

import datetime
import logging
import os
import shutil
import threading
from multiprocessing.synchronize import Event as MpEvent
from wsgiref.simple_server import make_server

from ws4py.server.wsgirefserver import (
    WebSocketWSGIHandler,
    WebSocketWSGIRequestHandler,
    WSGIServer,
)
from ws4py.server.wsgiutils import WebSocketWSGIApplication

from frigate.comms.detections_updater import DetectionSubscriber, DetectionTypeEnum
from frigate.comms.ws import WebSocket
from frigate.config import FrigateConfig
from frigate.config.camera.updater import (
    CameraConfigUpdateEnum,
    CameraConfigUpdateSubscriber,
)
from frigate.const import CACHE_DIR, CLIPS_DIR, PROCESS_PRIORITY_MED
from frigate.output.birdseye import Birdseye
from frigate.output.camera import JsmpegCamera
from frigate.output.preview import PreviewRecorder
from frigate.util.image import SharedMemoryFrameManager, get_blank_yuv_frame
from frigate.util.process import FrigateProcess

logger = logging.getLogger(__name__)


def check_disabled_camera_update(
    config: FrigateConfig,
    birdseye: Birdseye | None,
    previews: dict[str, PreviewRecorder],
    write_times: dict[str, float],
) -> None:
    """Check if camera is disabled / offline and needs an update."""
    now = datetime.datetime.now().timestamp()
    has_enabled_camera = False

    for camera, last_update in write_times.items():
        offline_time = now - last_update

        if config.cameras[camera].enabled:
            has_enabled_camera = True
        else:
            # flag camera as offline when it is disabled
            previews[camera].flag_offline(now)

        if offline_time > 1:
            # last camera update was more than 1 second ago
            # need to send empty data to birdseye because current
            # frame is now out of date
            if birdseye and offline_time < 10:
                # we only need to send blank frames to birdseye at the beginning of a camera being offline
                birdseye.write_data(
                    camera,
                    [],
                    [],
                    now,
                    get_blank_yuv_frame(
                        config.cameras[camera].detect.width,
                        config.cameras[camera].detect.height,
                    ),
                )

    if not has_enabled_camera and birdseye:
        birdseye.all_cameras_disabled()


class OutputProcess(FrigateProcess):
    def __init__(self, config: FrigateConfig, stop_event: MpEvent) -> None:
        super().__init__(
            stop_event, PROCESS_PRIORITY_MED, name="frigate.output", daemon=True
        )
        self.config = config

    def run(self) -> None:
        self.pre_run_setup(self.config.logger)

        frame_manager = SharedMemoryFrameManager()

        # start a websocket server on 8082
        WebSocketWSGIHandler.http_version = "1.1"
        websocket_server = make_server(
            "127.0.0.1",
            8082,
            server_class=WSGIServer,
            handler_class=WebSocketWSGIRequestHandler,
            app=WebSocketWSGIApplication(handler_cls=WebSocket),
        )
        websocket_server.initialize_websockets_manager()
        websocket_thread = threading.Thread(target=websocket_server.serve_forever)

        detection_subscriber = DetectionSubscriber(DetectionTypeEnum.video.value)
        config_subscriber = CameraConfigUpdateSubscriber(
            self.config,
            self.config.cameras,
            [
                CameraConfigUpdateEnum.add,
                CameraConfigUpdateEnum.birdseye,
                CameraConfigUpdateEnum.enabled,
                CameraConfigUpdateEnum.record,
            ],
        )

        jsmpeg_cameras: dict[str, JsmpegCamera] = {}
        birdseye: Birdseye | None = None
        preview_recorders: dict[str, PreviewRecorder] = {}
        preview_write_times: dict[str, float] = {}
        failed_frame_requests: dict[str, int] = {}
        last_disabled_cam_check = datetime.datetime.now().timestamp()

        move_preview_frames("cache")

        for camera, cam_config in self.config.cameras.items():
            if not cam_config.enabled_in_config:
                continue

            jsmpeg_cameras[camera] = JsmpegCamera(
                cam_config, self.stop_event, websocket_server
            )
            preview_recorders[camera] = PreviewRecorder(cam_config)
            preview_write_times[camera] = 0

        if self.config.birdseye.enabled:
            birdseye = Birdseye(self.config, self.stop_event, websocket_server)

        websocket_thread.start()

        while not self.stop_event.is_set():
            # check if there is an updated config
            updates = config_subscriber.check_for_updates()

            if CameraConfigUpdateEnum.add in updates:
                for camera in updates["add"]:
                    jsmpeg_cameras[camera] = JsmpegCamera(
                        self.config.cameras[camera], self.stop_event, websocket_server
                    )
                    preview_recorders[camera] = PreviewRecorder(
                        self.config.cameras[camera]
                    )
                    preview_write_times[camera] = 0

                    if (
                        self.config.birdseye.enabled
                        and self.config.cameras[camera].birdseye.enabled
                    ):
                        birdseye.add_camera(camera)

            (topic, data) = detection_subscriber.check_for_update(timeout=1)
            now = datetime.datetime.now().timestamp()

            if now - last_disabled_cam_check > 5:
                # check disabled cameras every 5 seconds
                last_disabled_cam_check = now
                check_disabled_camera_update(
                    self.config, birdseye, preview_recorders, preview_write_times
                )

            if not topic:
                continue

            (
                camera,
                frame_name,
                frame_time,
                current_tracked_objects,
                motion_boxes,
                _,
            ) = data

            if not self.config.cameras[camera].enabled:
                continue

            frame = frame_manager.get(
                frame_name, self.config.cameras[camera].frame_shape_yuv
            )

            if frame is None:
                logger.debug(f"Failed to get frame {frame_name} from SHM")
                failed_frame_requests[camera] = failed_frame_requests.get(camera, 0) + 1

                if (
                    failed_frame_requests[camera]
                    > self.config.cameras[camera].detect.fps
                ):
                    logger.warning(
                        f"Failed to retrieve many frames for {camera} from SHM, consider increasing SHM size if this continues."
                    )

                continue
            else:
                failed_frame_requests[camera] = 0

            # send frames for low fps recording
            preview_recorders[camera].write_data(
                current_tracked_objects, motion_boxes, frame_time, frame
            )
            preview_write_times[camera] = frame_time

            # send camera frame to ffmpeg process if websockets are connected
            if any(
                ws.environ["PATH_INFO"].endswith(camera)
                for ws in websocket_server.manager
            ):
                # write to the converter for the camera if clients are listening to the specific camera
                jsmpeg_cameras[camera].write_frame(frame.tobytes())

            # send output data to birdseye if websocket is connected or restreaming
            if self.config.birdseye.enabled and (
                self.config.birdseye.restream
                or any(
                    ws.environ["PATH_INFO"].endswith("birdseye")
                    for ws in websocket_server.manager
                )
            ):
                birdseye.write_data(
                    camera,
                    current_tracked_objects,
                    motion_boxes,
                    frame_time,
                    frame,
                )

            frame_manager.close(frame_name)

        move_preview_frames("clips")

        while True:
            (topic, data) = detection_subscriber.check_for_update(timeout=0)

            if not topic:
                break

            (
                camera,
                frame_name,
                frame_time,
                current_tracked_objects,
                motion_boxes,
                regions,
            ) = data

            frame = frame_manager.get(
                frame_name, self.config.cameras[camera].frame_shape_yuv
            )
            frame_manager.close(frame_name)

        detection_subscriber.stop()

        for jsmpeg in jsmpeg_cameras.values():
            jsmpeg.stop()

        for preview in preview_recorders.values():
            preview.stop()

        if birdseye is not None:
            birdseye.stop()

        config_subscriber.stop()
        websocket_server.manager.close_all()
        websocket_server.manager.stop()
        websocket_server.manager.join()
        websocket_server.shutdown()
        websocket_thread.join()
        logger.info("exiting output process...")


def move_preview_frames(loc: str):
    preview_holdover = os.path.join(CLIPS_DIR, "preview_restart_cache")
    preview_cache = os.path.join(CACHE_DIR, "preview_frames")

    try:
        if loc == "clips":
            shutil.move(preview_cache, preview_holdover)
        elif loc == "cache":
            if not os.path.exists(preview_holdover):
                return

            shutil.move(preview_holdover, preview_cache)
    except shutil.Error:
        logger.error("Failed to restore preview cache.")
