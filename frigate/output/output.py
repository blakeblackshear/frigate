"""Handle outputting raw frigate frames"""

import logging
import multiprocessing as mp
import queue
import signal
import threading
from typing import Optional
from wsgiref.simple_server import make_server

from setproctitle import setproctitle
from ws4py.server.wsgirefserver import (
    WebSocketWSGIHandler,
    WebSocketWSGIRequestHandler,
    WSGIServer,
)
from ws4py.server.wsgiutils import WebSocketWSGIApplication

from frigate.comms.ws import WebSocket
from frigate.config import FrigateConfig
from frigate.output.birdseye import Birdseye
from frigate.output.camera import JsmpegCamera
from frigate.output.preview import PreviewRecorder
from frigate.types import CameraMetricsTypes
from frigate.util.image import SharedMemoryFrameManager

logger = logging.getLogger(__name__)


def output_frames(
    config: FrigateConfig,
    video_output_queue: mp.Queue,
    inter_process_queue: mp.Queue,
    camera_metrics: dict[str, CameraMetricsTypes],
):
    threading.current_thread().name = "output"
    setproctitle("frigate.output")

    stop_event = mp.Event()

    def receiveSignal(signalNumber, frame):
        stop_event.set()

    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    frame_manager = SharedMemoryFrameManager()
    previous_frames = {}

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

    jsmpeg_cameras: dict[str, JsmpegCamera] = {}
    birdseye: Optional[Birdseye] = None
    preview_recorders: dict[str, PreviewRecorder] = {}

    for camera, cam_config in config.cameras.items():
        if not cam_config.enabled:
            continue

        jsmpeg_cameras[camera] = JsmpegCamera(cam_config, stop_event, websocket_server)
        preview_recorders[camera] = PreviewRecorder(cam_config, inter_process_queue)

    if config.birdseye.enabled:
        birdseye = Birdseye(config, camera_metrics, stop_event, websocket_server)

    websocket_thread.start()

    while not stop_event.is_set():
        try:
            (
                camera,
                frame_time,
                current_tracked_objects,
                motion_boxes,
                regions,
            ) = video_output_queue.get(True, 1)
        except queue.Empty:
            continue

        frame_id = f"{camera}{frame_time}"

        frame = frame_manager.get(frame_id, config.cameras[camera].frame_shape_yuv)

        # send camera frame to ffmpeg process if websockets are connected
        if any(
            ws.environ["PATH_INFO"].endswith(camera) for ws in websocket_server.manager
        ):
            # write to the converter for the camera if clients are listening to the specific camera
            jsmpeg_cameras[camera].write_frame(frame.tobytes())

        # send output data to birdseye if websocket is connected or restreaming
        if config.birdseye.enabled and (
            config.birdseye.restream
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
        preview_recorders[camera].write_data(
            current_tracked_objects, motion_boxes, frame_time, frame
        )

        # delete frames after they have been used for output
        if camera in previous_frames:
            frame_manager.delete(f"{camera}{previous_frames[camera]}")

        previous_frames[camera] = frame_time

    while not video_output_queue.empty():
        (
            camera,
            frame_time,
            current_tracked_objects,
            motion_boxes,
            regions,
        ) = video_output_queue.get(True, 10)

        frame_id = f"{camera}{frame_time}"
        frame = frame_manager.get(frame_id, config.cameras[camera].frame_shape_yuv)
        frame_manager.delete(frame_id)

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
    logger.info("exiting output process...")
