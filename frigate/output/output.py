"""Handle outputting raw frigate frames"""

import os
import shutil
import threading
from typing import Optional
from wsgiref.simple_server import make_server

from ws4py.server.wsgirefserver import (
    WebSocketWSGIHandler,
    WebSocketWSGIRequestHandler,
    WSGIServer,
)
from ws4py.server.wsgiutils import WebSocketWSGIApplication

from frigate import util
from frigate.comms.detections_updater import DetectionSubscriber, DetectionTypeEnum
from frigate.comms.ws import WebSocket
from frigate.config import FrigateConfig
from frigate.const import CACHE_DIR, CLIPS_DIR
from frigate.output.birdseye import Birdseye
from frigate.output.camera import JsmpegCamera
from frigate.output.preview import PreviewRecorder
from frigate.util.image import SharedMemoryFrameManager


class OutputProcessor(util.Process):
    def __init__(self, config: FrigateConfig):
        super().__init__(name="frigate.output", daemon=True)
        self.config = config

    def run(self):
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

        detection_subscriber = DetectionSubscriber(DetectionTypeEnum.video)

        jsmpeg_cameras: dict[str, JsmpegCamera] = {}
        birdseye: Optional[Birdseye] = None
        preview_recorders: dict[str, PreviewRecorder] = {}
        preview_write_times: dict[str, float] = {}

        self.move_preview_frames("cache")

        for camera, cam_config in self.config.cameras.items():
            if not cam_config.enabled:
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
            (topic, data) = detection_subscriber.check_for_update(timeout=1)

            if not topic:
                continue

            (
                camera,
                frame_time,
                current_tracked_objects,
                motion_boxes,
                regions,
            ) = data

            frame_id = f"{camera}{frame_time}"

            frame = frame_manager.get(
                frame_id, self.config.cameras[camera].frame_shape_yuv
            )

            if frame is None:
                self.logger.debug(f"Failed to get frame {frame_id} from SHM")
                continue

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

            # send frames for low fps recording
            generated_preview = preview_recorders[camera].write_data(
                current_tracked_objects, motion_boxes, frame_time, frame
            )
            preview_write_times[camera] = frame_time

            # if another camera generated a preview,
            # check for any cameras that are currently offline
            # and need to generate a preview
            if generated_preview:
                for camera, time in preview_write_times.copy().items():
                    if time != 0 and frame_time - time > 10:
                        preview_recorders[camera].flag_offline(frame_time)
                        preview_write_times[camera] = frame_time

            frame_manager.close(frame_id)

        self.move_preview_frames("clips")

        while True:
            (topic, data) = detection_subscriber.check_for_update(timeout=0)

            if not topic:
                break

            (
                camera,
                frame_time,
                current_tracked_objects,
                motion_boxes,
                regions,
            ) = data

            frame_id = f"{camera}{frame_time}"
            frame = frame_manager.get(
                frame_id, self.config.cameras[camera].frame_shape_yuv
            )
            frame_manager.close(frame_id)

        detection_subscriber.stop()

        for jsmpeg in jsmpeg_cameras.values():
            jsmpeg.stop()

        for preview in preview_recorders.values():
            preview.stop()

        if birdseye is not None:
            birdseye.stop()

        websocket_server.manager.close_all()
        websocket_server.manager.stop()
        websocket_server.manager.join()
        websocket_server.shutdown()
        websocket_thread.join()
        self.logger.info("Exiting output process...")

    def move_preview_frames(self, loc: str):
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
            self.logger.error("Failed to restore preview cache.")
