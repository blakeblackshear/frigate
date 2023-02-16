import datetime
import glob
import logging
import math
import multiprocessing as mp
import os
import queue
import signal
import subprocess as sp
import threading
from wsgiref.simple_server import make_server

import cv2
import numpy as np
from setproctitle import setproctitle
from ws4py.server.wsgirefserver import (
    WebSocketWSGIHandler,
    WebSocketWSGIRequestHandler,
    WSGIServer,
)
from ws4py.server.wsgiutils import WebSocketWSGIApplication
from ws4py.websocket import WebSocket

from frigate.config import BirdseyeModeEnum, FrigateConfig
from frigate.const import BASE_DIR, BIRDSEYE_PIPE
from frigate.util import SharedMemoryFrameManager, copy_yuv_to_position, get_yuv_crop

logger = logging.getLogger(__name__)


class FFMpegConverter:
    def __init__(
        self,
        in_width: int,
        in_height: int,
        out_width: int,
        out_height: int,
        quality: int,
        birdseye_rtsp: bool = False,
    ):
        self.bd_pipe = None

        if birdseye_rtsp:
            self.recreate_birdseye_pipe()

        ffmpeg_cmd = [
            "ffmpeg",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "yuv420p",
            "-video_size",
            f"{in_width}x{in_height}",
            "-i",
            "pipe:",
            "-f",
            "mpegts",
            "-s",
            f"{out_width}x{out_height}",
            "-codec:v",
            "mpeg1video",
            "-q",
            f"{quality}",
            "-bf",
            "0",
            "pipe:",
        ]

        self.process = sp.Popen(
            ffmpeg_cmd,
            stdout=sp.PIPE,
            stderr=sp.DEVNULL,
            stdin=sp.PIPE,
            start_new_session=True,
        )

    def recreate_birdseye_pipe(self) -> None:
        if self.bd_pipe:
            os.close(self.bd_pipe)

        if os.path.exists(BIRDSEYE_PIPE):
            os.remove(BIRDSEYE_PIPE)

        os.mkfifo(BIRDSEYE_PIPE, mode=0o777)
        stdin = os.open(BIRDSEYE_PIPE, os.O_RDONLY | os.O_NONBLOCK)
        self.bd_pipe = os.open(BIRDSEYE_PIPE, os.O_WRONLY)
        os.close(stdin)
        self.reading_birdseye = False

    def write(self, b) -> None:
        self.process.stdin.write(b)

        if self.bd_pipe:
            try:
                os.write(self.bd_pipe, b)
                self.reading_birdseye = True
            except BrokenPipeError:
                if self.reading_birdseye:
                    # we know the pipe was being read from and now it is not
                    # so we should recreate the pipe to ensure no partially-read
                    # frames exist
                    logger.debug(
                        "Recreating the birdseye pipe because it was read from and now is not"
                    )
                    self.recreate_birdseye_pipe()

                return

    def read(self, length):
        try:
            return self.process.stdout.read1(length)
        except ValueError:
            return False

    def exit(self):
        if self.bd_pipe:
            os.close(self.bd_pipe)

        self.process.terminate()
        try:
            self.process.communicate(timeout=30)
        except sp.TimeoutExpired:
            self.process.kill()
            self.process.communicate()


class BroadcastThread(threading.Thread):
    def __init__(self, camera, converter, websocket_server, stop_event):
        super(BroadcastThread, self).__init__()
        self.camera = camera
        self.converter = converter
        self.websocket_server = websocket_server
        self.stop_event = stop_event

    def run(self):
        while not self.stop_event.is_set():
            buf = self.converter.read(65536)
            if buf:
                manager = self.websocket_server.manager
                with manager.lock:
                    websockets = manager.websockets.copy()
                    ws_iter = iter(websockets.values())

                for ws in ws_iter:
                    if (
                        not ws.terminated
                        and ws.environ["PATH_INFO"] == f"/{self.camera}"
                    ):
                        try:
                            ws.send(buf, binary=True)
                        except:
                            pass
            elif self.converter.process.poll() is not None:
                break


class BirdsEyeFrameManager:
    def __init__(self, config: FrigateConfig, frame_manager: SharedMemoryFrameManager):
        self.config = config
        self.mode = config.birdseye.mode
        self.frame_manager = frame_manager
        width = config.birdseye.width
        height = config.birdseye.height
        self.frame_shape = (height, width)
        self.yuv_shape = (height * 3 // 2, width)
        self.frame = np.ndarray(self.yuv_shape, dtype=np.uint8)

        # initialize the frame as black and with the Frigate logo
        self.blank_frame = np.zeros(self.yuv_shape, np.uint8)
        self.blank_frame[:] = 128
        self.blank_frame[0 : self.frame_shape[0], 0 : self.frame_shape[1]] = 16

        # find and copy the logo on the blank frame
        birdseye_logo = None

        custom_logo_files = glob.glob(f"{BASE_DIR}/custom.png")

        if len(custom_logo_files) > 0:
            birdseye_logo = cv2.imread(custom_logo_files[0], cv2.IMREAD_UNCHANGED)

        if birdseye_logo is None:
            logo_files = glob.glob("/opt/frigate/frigate/images/birdseye.png")

            if len(logo_files) > 0:
                birdseye_logo = cv2.imread(logo_files[0], cv2.IMREAD_UNCHANGED)

        if not birdseye_logo is None:
            transparent_layer = birdseye_logo[:, :, 3]
            y_offset = height // 2 - transparent_layer.shape[0] // 2
            x_offset = width // 2 - transparent_layer.shape[1] // 2
            self.blank_frame[
                y_offset : y_offset + transparent_layer.shape[1],
                x_offset : x_offset + transparent_layer.shape[0],
            ] = transparent_layer
        else:
            logger.warning("Unable to read Frigate logo")

        self.frame[:] = self.blank_frame

        self.cameras = {}
        for camera, settings in self.config.cameras.items():
            # precalculate the coordinates for all the channels
            y, u1, u2, v1, v2 = get_yuv_crop(
                settings.frame_shape_yuv,
                (
                    0,
                    0,
                    settings.frame_shape[1],
                    settings.frame_shape[0],
                ),
            )
            self.cameras[camera] = {
                "last_active_frame": 0.0,
                "current_frame": 0.0,
                "layout_frame": 0.0,
                "channel_dims": {
                    "y": y,
                    "u1": u1,
                    "u2": u2,
                    "v1": v1,
                    "v2": v2,
                },
            }

        self.camera_layout = []
        self.active_cameras = set()
        self.layout_dim = 0
        self.last_output_time = 0.0

    def clear_frame(self):
        logger.debug(f"Clearing the birdseye frame")
        self.frame[:] = self.blank_frame

    def copy_to_position(self, position, camera=None, frame_time=None):
        if camera is None:
            frame = None
            channel_dims = None
        else:
            try:
                frame = self.frame_manager.get(
                    f"{camera}{frame_time}", self.config.cameras[camera].frame_shape_yuv
                )
            except FileNotFoundError:
                # TODO: better frame management would prevent this edge case
                logger.warning(
                    f"Unable to copy frame {camera}{frame_time} to birdseye."
                )
                return
            channel_dims = self.cameras[camera]["channel_dims"]

        copy_yuv_to_position(
            self.frame,
            self.layout_offsets[position],
            self.layout_frame_shape,
            frame,
            channel_dims,
        )

    def camera_active(self, mode, object_box_count, motion_box_count):
        if mode == BirdseyeModeEnum.continuous:
            return True

        if mode == BirdseyeModeEnum.motion and motion_box_count > 0:
            return True

        if mode == BirdseyeModeEnum.objects and object_box_count > 0:
            return True

    def update_frame(self):
        # determine how many cameras are tracking objects within the last 30 seconds
        active_cameras = set(
            [
                cam
                for cam, cam_data in self.cameras.items()
                if cam_data["last_active_frame"] > 0
                and cam_data["current_frame"] - cam_data["last_active_frame"] < 30
            ]
        )

        # if there are no active cameras
        if len(active_cameras) == 0:
            # if the layout is already cleared
            if len(self.camera_layout) == 0:
                return False
            # if the layout needs to be cleared
            else:
                self.camera_layout = []
                self.layout_dim = 0
                self.clear_frame()
                return True

        # calculate layout dimensions
        layout_dim = math.ceil(math.sqrt(len(active_cameras)))

        # reset the layout if it needs to be different
        if layout_dim != self.layout_dim:
            logger.debug(f"Changing layout size from {self.layout_dim} to {layout_dim}")
            self.layout_dim = layout_dim

            self.camera_layout = [None] * layout_dim * layout_dim

            # calculate resolution of each position in the layout
            self.layout_frame_shape = (
                self.frame_shape[0] // layout_dim,  # height
                self.frame_shape[1] // layout_dim,  # width
            )

            self.clear_frame()

            for cam_data in self.cameras.values():
                cam_data["layout_frame"] = 0.0

            self.active_cameras = set()

            self.layout_offsets = []

            # calculate the x and y offset for each position in the layout
            for position in range(0, len(self.camera_layout)):
                y_offset = self.layout_frame_shape[0] * math.floor(
                    position / self.layout_dim
                )
                x_offset = self.layout_frame_shape[1] * (position % self.layout_dim)
                self.layout_offsets.append((y_offset, x_offset))

        removed_cameras = self.active_cameras.difference(active_cameras)
        added_cameras = active_cameras.difference(self.active_cameras)

        self.active_cameras = active_cameras

        # update each position in the layout
        for position, camera in enumerate(self.camera_layout, start=0):

            # if this camera was removed, replace it or clear it
            if camera in removed_cameras:
                # if replacing this camera with a newly added one
                if len(added_cameras) > 0:
                    added_camera = added_cameras.pop()
                    self.camera_layout[position] = added_camera
                    self.copy_to_position(
                        position,
                        added_camera,
                        self.cameras[added_camera]["current_frame"],
                    )
                    self.cameras[added_camera]["layout_frame"] = self.cameras[
                        added_camera
                    ]["current_frame"]
                # if removing this camera with no replacement
                else:
                    self.camera_layout[position] = None
                    self.copy_to_position(position)
                removed_cameras.remove(camera)
            # if an empty spot and there are cameras to add
            elif camera is None and len(added_cameras) > 0:
                added_camera = added_cameras.pop()
                self.camera_layout[position] = added_camera
                self.copy_to_position(
                    position,
                    added_camera,
                    self.cameras[added_camera]["current_frame"],
                )
                self.cameras[added_camera]["layout_frame"] = self.cameras[added_camera][
                    "current_frame"
                ]
            # if not an empty spot and the camera has a newer frame, copy it
            elif (
                not camera is None
                and self.cameras[camera]["current_frame"]
                != self.cameras[camera]["layout_frame"]
            ):
                self.copy_to_position(
                    position, camera, self.cameras[camera]["current_frame"]
                )
                self.cameras[camera]["layout_frame"] = self.cameras[camera][
                    "current_frame"
                ]

        return True

    def update(self, camera, object_count, motion_count, frame_time, frame) -> bool:
        # don't process if birdseye is disabled for this camera
        camera_config = self.config.cameras[camera].birdseye
        if not camera_config.enabled:
            return False

        # update the last active frame for the camera
        self.cameras[camera]["current_frame"] = frame_time
        if self.camera_active(camera_config.mode, object_count, motion_count):
            self.cameras[camera]["last_active_frame"] = frame_time

        now = datetime.datetime.now().timestamp()

        # limit output to 10 fps
        if (now - self.last_output_time) < 1 / 10:
            return False

        # if the frame was updated or the fps is too low, send frame
        if self.update_frame() or (now - self.last_output_time) > 1:
            self.last_output_time = now
            return True
        return False


def output_frames(config: FrigateConfig, video_output_queue):
    threading.current_thread().name = f"output"
    setproctitle(f"frigate.output")

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

    converters = {}
    broadcasters = {}

    for camera, cam_config in config.cameras.items():
        width = int(
            cam_config.live.height
            * (cam_config.frame_shape[1] / cam_config.frame_shape[0])
        )
        converters[camera] = FFMpegConverter(
            cam_config.frame_shape[1],
            cam_config.frame_shape[0],
            width,
            cam_config.live.height,
            cam_config.live.quality,
        )
        broadcasters[camera] = BroadcastThread(
            camera, converters[camera], websocket_server, stop_event
        )

    if config.birdseye.enabled:
        converters["birdseye"] = FFMpegConverter(
            config.birdseye.width,
            config.birdseye.height,
            config.birdseye.width,
            config.birdseye.height,
            config.birdseye.quality,
            config.birdseye.restream,
        )
        broadcasters["birdseye"] = BroadcastThread(
            "birdseye", converters["birdseye"], websocket_server, stop_event
        )

    websocket_thread.start()

    for t in broadcasters.values():
        t.start()

    birdseye_manager = BirdsEyeFrameManager(config, frame_manager)

    if config.birdseye.restream:
        birdseye_buffer = frame_manager.create(
            "birdseye",
            birdseye_manager.yuv_shape[0] * birdseye_manager.yuv_shape[1],
        )

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
            converters[camera].write(frame.tobytes())

        if config.birdseye.enabled and (
            config.birdseye.restream
            or any(
                ws.environ["PATH_INFO"].endswith("birdseye")
                for ws in websocket_server.manager
            )
        ):
            if birdseye_manager.update(
                camera,
                len([o for o in current_tracked_objects if not o["stationary"]]),
                len(motion_boxes),
                frame_time,
                frame,
            ):
                frame_bytes = birdseye_manager.frame.tobytes()

                if config.birdseye.restream:
                    birdseye_buffer[:] = frame_bytes

                converters["birdseye"].write(frame_bytes)

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

    for c in converters.values():
        c.exit()
    for b in broadcasters.values():
        b.join()
    websocket_server.manager.close_all()
    websocket_server.manager.stop()
    websocket_server.manager.join()
    websocket_server.shutdown()
    websocket_thread.join()
    logger.info("exiting output process...")
