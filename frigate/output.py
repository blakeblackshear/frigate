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
import traceback
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

from frigate.comms.ws import WebSocket
from frigate.config import BirdseyeModeEnum, FrigateConfig
from frigate.const import BASE_DIR, BIRDSEYE_PIPE
from frigate.types import CameraMetricsTypes
from frigate.util.image import (
    SharedMemoryFrameManager,
    copy_yuv_to_position,
    get_yuv_crop,
)

logger = logging.getLogger(__name__)


def get_standard_aspect_ratio(width: int, height: int) -> tuple[int, int]:
    """Ensure that only standard aspect ratios are used."""
    # it is imoprtant that all ratios have the same scale
    known_aspects = [
        (16, 9),
        (9, 16),
        (20, 10),
        (16, 6),  # reolink duo 2
        (32, 9),  # panoramic cameras
        (12, 9),
        (9, 12),
        (22, 15),  # Amcrest, NTSC DVT
    ]  # aspects are scaled to have common relative size
    known_aspects_ratios = list(
        map(lambda aspect: aspect[0] / aspect[1], known_aspects)
    )
    closest = min(
        known_aspects_ratios,
        key=lambda x: abs(x - (width / height)),
    )
    return known_aspects[known_aspects_ratios.index(closest)]


def get_canvas_shape(width: int, height: int) -> tuple[int, int]:
    """Get birdseye canvas shape."""
    canvas_width = width
    canvas_height = height
    a_w, a_h = get_standard_aspect_ratio(width, height)

    if round(a_w / a_h, 2) != round(width / height, 2):
        canvas_width = int(width // 4 * 4)
        canvas_height = int((canvas_width / a_w * a_h) // 4 * 4)
        logger.warning(
            f"The birdseye resolution is a non-standard aspect ratio, forcing birdseye resolution to {canvas_width} x {canvas_height}"
        )

    return (canvas_width, canvas_height)


class Canvas:
    def __init__(self, canvas_width: int, canvas_height: int) -> None:
        gcd = math.gcd(canvas_width, canvas_height)
        self.aspect = get_standard_aspect_ratio(
            (canvas_width / gcd), (canvas_height / gcd)
        )
        self.width = canvas_width
        self.height = (self.width * self.aspect[1]) / self.aspect[0]
        self.coefficient_cache: dict[int, int] = {}
        self.aspect_cache: dict[str, tuple[int, int]] = {}

    def get_aspect(self, coefficient: int) -> tuple[int, int]:
        return (self.aspect[0] * coefficient, self.aspect[1] * coefficient)

    def get_coefficient(self, camera_count: int) -> int:
        return self.coefficient_cache.get(camera_count, 2)

    def set_coefficient(self, camera_count: int, coefficient: int) -> None:
        self.coefficient_cache[camera_count] = coefficient

    def get_camera_aspect(
        self, cam_name: str, camera_width: int, camera_height: int
    ) -> tuple[int, int]:
        cached = self.aspect_cache.get(cam_name)

        if cached:
            return cached

        gcd = math.gcd(camera_width, camera_height)
        camera_aspect = get_standard_aspect_ratio(
            camera_width / gcd, camera_height / gcd
        )
        self.aspect_cache[cam_name] = camera_aspect
        return camera_aspect


class FFMpegConverter(threading.Thread):
    def __init__(
        self,
        camera: str,
        input_queue: queue.Queue,
        stop_event: mp.Event,
        in_width: int,
        in_height: int,
        out_width: int,
        out_height: int,
        quality: int,
        birdseye_rtsp: bool = False,
    ):
        threading.Thread.__init__(self)
        self.name = f"{camera}_output_converter"
        self.camera = camera
        self.input_queue = input_queue
        self.stop_event = stop_event
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

    def __write(self, b) -> None:
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

    def run(self) -> None:
        while not self.stop_event.is_set():
            try:
                frame = self.input_queue.get(True, timeout=1)
                self.__write(frame)
            except queue.Empty:
                pass

        self.exit()


class BroadcastThread(threading.Thread):
    def __init__(
        self,
        camera: str,
        converter: FFMpegConverter,
        websocket_server,
        stop_event: mp.Event,
    ):
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
                        except ValueError:
                            pass
                        except (BrokenPipeError, ConnectionResetError) as e:
                            logger.debug(f"Websocket unexpectedly closed {e}")
            elif self.converter.process.poll() is not None:
                break


class BirdsEyeFrameManager:
    def __init__(
        self,
        config: FrigateConfig,
        frame_manager: SharedMemoryFrameManager,
        stop_event: mp.Event,
        camera_metrics: dict[str, CameraMetricsTypes],
    ):
        self.config = config
        self.mode = config.birdseye.mode
        self.frame_manager = frame_manager
        width, height = get_canvas_shape(config.birdseye.width, config.birdseye.height)
        self.frame_shape = (height, width)
        self.yuv_shape = (height * 3 // 2, width)
        self.frame = np.ndarray(self.yuv_shape, dtype=np.uint8)
        self.canvas = Canvas(width, height)
        self.stop_event = stop_event
        self.camera_metrics = camera_metrics

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

        if birdseye_logo is not None:
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
                "dimensions": [settings.detect.width, settings.detect.height],
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
        self.last_output_time = 0.0

    def clear_frame(self):
        logger.debug("Clearing the birdseye frame")
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
            [position[1], position[0]],
            [position[3], position[2]],
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
        """Update to a new frame for birdseye."""

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
                self.active_cameras = set()
                self.clear_frame()
                return True

        # check if we need to reset the layout because there is a different number of cameras
        reset_layout = len(self.active_cameras) - len(active_cameras) != 0

        # reset the layout if it needs to be different
        if reset_layout:
            logger.debug("Added new cameras, resetting layout...")
            self.clear_frame()
            self.active_cameras = active_cameras

            # this also converts added_cameras from a set to a list since we need
            # to pop elements in order
            active_cameras_to_add = sorted(
                active_cameras,
                # sort cameras by order and by name if the order is the same
                key=lambda active_camera: (
                    self.config.cameras[active_camera].birdseye.order,
                    active_camera,
                ),
            )

            if len(active_cameras) == 1:
                # show single camera as fullscreen
                camera = active_cameras_to_add[0]
                camera_dims = self.cameras[camera]["dimensions"].copy()
                scaled_width = int(self.canvas.height * camera_dims[0] / camera_dims[1])
                coefficient = (
                    1
                    if scaled_width <= self.canvas.width
                    else self.canvas.width / scaled_width
                )
                self.camera_layout = [
                    [
                        (
                            camera,
                            (
                                0,
                                0,
                                int(scaled_width * coefficient),
                                int(self.canvas.height * coefficient),
                            ),
                        )
                    ]
                ]
            else:
                # calculate optimal layout
                coefficient = self.canvas.get_coefficient(len(active_cameras))
                calculating = True

                # decrease scaling coefficient until height of all cameras can fit into the birdseye canvas
                while calculating:
                    if self.stop_event.is_set():
                        return

                    layout_candidate = self.calculate_layout(
                        active_cameras_to_add,
                        coefficient,
                    )

                    if not layout_candidate:
                        if coefficient < 10:
                            coefficient += 1
                            continue
                        else:
                            logger.error("Error finding appropriate birdseye layout")
                            return

                    calculating = False
                    self.canvas.set_coefficient(len(active_cameras), coefficient)

                self.camera_layout = layout_candidate

        for row in self.camera_layout:
            for position in row:
                self.copy_to_position(
                    position[1], position[0], self.cameras[position[0]]["current_frame"]
                )

        return True

    def calculate_layout(self, cameras_to_add: list[str], coefficient) -> tuple[any]:
        """Calculate the optimal layout for 2+ cameras."""

        def map_layout(camera_layout: list[list[any]], row_height: int):
            """Map the calculated layout."""
            candidate_layout = []
            starting_x = 0
            x = 0
            max_width = 0
            y = 0

            for row in camera_layout:
                final_row = []
                max_width = max(max_width, x)
                x = starting_x
                for cameras in row:
                    camera_dims = self.cameras[cameras[0]]["dimensions"].copy()
                    camera_aspect = cameras[1]

                    if camera_dims[1] > camera_dims[0]:
                        scaled_height = int(row_height * 2)
                        scaled_width = int(scaled_height * camera_aspect)
                        starting_x = scaled_width
                    else:
                        scaled_height = row_height
                        scaled_width = int(scaled_height * camera_aspect)

                    # layout is too large
                    if (
                        x + scaled_width > self.canvas.width
                        or y + scaled_height > self.canvas.height
                    ):
                        return x + scaled_width, y + scaled_height, None

                    final_row.append((cameras[0], (x, y, scaled_width, scaled_height)))
                    x += scaled_width

                y += row_height
                candidate_layout.append(final_row)

            if max_width == 0:
                max_width = x

            return max_width, y, candidate_layout

        canvas_aspect_x, canvas_aspect_y = self.canvas.get_aspect(coefficient)
        camera_layout: list[list[any]] = []
        camera_layout.append([])
        starting_x = 0
        x = starting_x
        y = 0
        y_i = 0
        max_y = 0
        for camera in cameras_to_add:
            camera_dims = self.cameras[camera]["dimensions"].copy()
            camera_aspect_x, camera_aspect_y = self.canvas.get_camera_aspect(
                camera, camera_dims[0], camera_dims[1]
            )

            if camera_dims[1] > camera_dims[0]:
                portrait = True
            else:
                portrait = False

            if (x + camera_aspect_x) <= canvas_aspect_x:
                # insert if camera can fit on current row
                camera_layout[y_i].append(
                    (
                        camera,
                        camera_aspect_x / camera_aspect_y,
                    )
                )

                if portrait:
                    starting_x = camera_aspect_x
                else:
                    max_y = max(
                        max_y,
                        camera_aspect_y,
                    )

                x += camera_aspect_x
            else:
                # move on to the next row and insert
                y += max_y
                y_i += 1
                camera_layout.append([])
                x = starting_x

                if x + camera_aspect_x > canvas_aspect_x:
                    return None

                camera_layout[y_i].append(
                    (
                        camera,
                        camera_aspect_x / camera_aspect_y,
                    )
                )
                x += camera_aspect_x

        if y + max_y > canvas_aspect_y:
            return None

        row_height = int(self.canvas.height / coefficient)
        total_width, total_height, standard_candidate_layout = map_layout(
            camera_layout, row_height
        )

        if not standard_candidate_layout:
            # if standard layout didn't work
            # try reducing row_height by the % overflow
            scale_down_percent = max(
                total_width / self.canvas.width,
                total_height / self.canvas.height,
            )
            row_height = int(row_height / scale_down_percent)
            total_width, total_height, standard_candidate_layout = map_layout(
                camera_layout, row_height
            )

            if not standard_candidate_layout:
                return None

        # layout can't be optimized more
        if total_width / self.canvas.width >= 0.99:
            return standard_candidate_layout

        scale_up_percent = min(
            1 / (total_width / self.canvas.width),
            1 / (total_height / self.canvas.height),
        )
        row_height = int(row_height * scale_up_percent)
        _, _, scaled_layout = map_layout(camera_layout, row_height)

        if scaled_layout:
            return scaled_layout
        else:
            return standard_candidate_layout

    def update(self, camera, object_count, motion_count, frame_time, frame) -> bool:
        # don't process if birdseye is disabled for this camera
        camera_config = self.config.cameras[camera].birdseye
        if not camera_config.enabled:
            return False

        # get our metrics (sync'd across processes)
        # which allows us to control it via mqtt (or any other dispatcher)
        camera_metrics = self.camera_metrics[camera]

        # disabling birdseye is a little tricky
        if not camera_metrics["birdseye_enabled"].value:
            # if we've rendered a frame (we have a value for last_active_frame)
            # then we need to set it to zero
            if self.cameras[camera]["last_active_frame"] > 0:
                self.cameras[camera]["last_active_frame"] = 0

            return False

        # get the birdseye mode state from camera metrics
        birdseye_mode = BirdseyeModeEnum.get(camera_metrics["birdseye_mode"].value)

        # update the last active frame for the camera
        self.cameras[camera]["current_frame"] = frame_time
        if self.camera_active(birdseye_mode, object_count, motion_count):
            self.cameras[camera]["last_active_frame"] = frame_time

        now = datetime.datetime.now().timestamp()

        # limit output to 10 fps
        if (now - self.last_output_time) < 1 / 10:
            return False

        try:
            updated_frame = self.update_frame()
        except Exception:
            updated_frame = False
            self.active_cameras = []
            self.camera_layout = []
            print(traceback.format_exc())

        # if the frame was updated or the fps is too low, send frame
        if updated_frame or (now - self.last_output_time) > 1:
            self.last_output_time = now
            return True
        return False


def output_frames(
    config: FrigateConfig,
    video_output_queue,
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

    inputs: dict[str, queue.Queue] = {}
    converters = {}
    broadcasters = {}

    for camera, cam_config in config.cameras.items():
        inputs[camera] = queue.Queue(maxsize=cam_config.detect.fps)
        width = int(
            cam_config.live.height
            * (cam_config.frame_shape[1] / cam_config.frame_shape[0])
        )
        converters[camera] = FFMpegConverter(
            camera,
            inputs[camera],
            stop_event,
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
        inputs["birdseye"] = queue.Queue(maxsize=10)
        converters["birdseye"] = FFMpegConverter(
            "birdseye",
            inputs["birdseye"],
            stop_event,
            config.birdseye.width,
            config.birdseye.height,
            config.birdseye.width,
            config.birdseye.height,
            config.birdseye.quality,
            config.birdseye.restream,
        )
        broadcasters["birdseye"] = BroadcastThread(
            "birdseye",
            converters["birdseye"],
            websocket_server,
            stop_event,
        )

    websocket_thread.start()

    for t in converters.values():
        t.start()

    for t in broadcasters.values():
        t.start()

    birdseye_manager = BirdsEyeFrameManager(
        config, frame_manager, stop_event, camera_metrics
    )

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
            try:
                inputs[camera].put_nowait(frame.tobytes())
            except queue.Full:
                # drop frames if queue is full
                pass

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

                try:
                    inputs["birdseye"].put_nowait(frame_bytes)
                except queue.Full:
                    # drop frames if queue is full
                    pass

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

    for b in broadcasters.values():
        b.join()

    websocket_server.manager.close_all()
    websocket_server.manager.stop()
    websocket_server.manager.join()
    websocket_server.shutdown()
    websocket_thread.join()
    logger.info("exiting output process...")
