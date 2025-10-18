"""Handle outputting birdseye frames via jsmpeg and go2rtc."""

import datetime
import glob
import logging
import math
import multiprocessing as mp
import os
import queue
import subprocess as sp
import threading
import time
import traceback
from typing import Any, Optional

import cv2
import numpy as np

from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import BirdseyeModeEnum, FfmpegConfig, FrigateConfig
from frigate.const import BASE_DIR, BIRDSEYE_PIPE, INSTALL_DIR, UPDATE_BIRDSEYE_LAYOUT
from frigate.util.image import (
    SharedMemoryFrameManager,
    copy_yuv_to_position,
    get_yuv_crop,
)

logger = logging.getLogger(__name__)


def get_standard_aspect_ratio(width: int, height: int) -> tuple[int, int]:
    """Ensure that only standard aspect ratios are used."""
    # it is important that all ratios have the same scale
    known_aspects = [
        (16, 9),
        (9, 16),
        (20, 10),
        (16, 3),  # max wide camera
        (16, 6),  # reolink duo 2
        (32, 9),  # panoramic cameras
        (12, 9),
        (9, 12),
        (22, 15),  # Amcrest, NTSC DVT
        (1, 1),  # fisheye
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
    def __init__(
        self,
        canvas_width: int,
        canvas_height: int,
        scaling_factor: int,
    ) -> None:
        self.scaling_factor = scaling_factor
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
        return self.coefficient_cache.get(camera_count, self.scaling_factor)

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
        ffmpeg: FfmpegConfig,
        input_queue: queue.Queue,
        stop_event: mp.Event,
        in_width: int,
        in_height: int,
        out_width: int,
        out_height: int,
        quality: int,
        birdseye_rtsp: bool = False,
    ):
        super().__init__(name="birdseye_output_converter")
        self.camera = "birdseye"
        self.input_queue = input_queue
        self.stop_event = stop_event
        self.bd_pipe = None

        if birdseye_rtsp:
            self.recreate_birdseye_pipe()

        ffmpeg_cmd = [
            ffmpeg.ffmpeg_path,
            "-threads",
            "1",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "yuv420p",
            "-video_size",
            f"{in_width}x{in_height}",
            "-i",
            "pipe:",
            "-threads",
            "1",
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
        super().__init__()
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
                        except (BrokenPipeError, ConnectionResetError, OSError) as e:
                            logger.debug(f"Websocket unexpectedly closed {e}")
            elif self.converter.process.poll() is not None:
                break


class BirdsEyeFrameManager:
    def __init__(
        self,
        config: FrigateConfig,
        stop_event: mp.Event,
    ):
        self.config = config
        self.mode = config.birdseye.mode
        width, height = get_canvas_shape(config.birdseye.width, config.birdseye.height)
        self.frame_shape = (height, width)
        self.yuv_shape = (height * 3 // 2, width)
        self.frame = np.ndarray(self.yuv_shape, dtype=np.uint8)
        self.canvas = Canvas(width, height, config.birdseye.layout.scaling_factor)
        self.stop_event = stop_event
        self.inactivity_threshold = config.birdseye.inactivity_threshold

        if config.birdseye.layout.max_cameras:
            self.last_refresh_time = 0

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
            logo_files = glob.glob(
                os.path.join(INSTALL_DIR, "frigate/images/birdseye.png")
            )

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
        for camera in self.config.cameras.keys():
            self.add_camera(camera)

        self.camera_layout = []
        self.active_cameras = set()
        self.last_output_time = 0.0

    def add_camera(self, cam: str):
        """Add a camera to self.cameras with the correct structure."""
        settings = self.config.cameras[cam]
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
        self.cameras[cam] = {
            "dimensions": [
                settings.detect.width,
                settings.detect.height,
            ],
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

    def remove_camera(self, cam: str):
        """Remove a camera from self.cameras."""
        if cam in self.cameras:
            del self.cameras[cam]

    def clear_frame(self):
        logger.debug("Clearing the birdseye frame")
        self.frame[:] = self.blank_frame

    def copy_to_position(self, position, camera=None, frame: np.ndarray = None):
        if camera is None:
            frame = None
            channel_dims = None
        else:
            if frame is None:
                logger.debug(f"Unable to copy frame {camera} to birdseye.")
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

    def get_camera_coordinates(self) -> dict[str, dict[str, int]]:
        """Return the coordinates of each camera in the current layout."""
        coordinates = {}
        for row in self.camera_layout:
            for position in row:
                camera_name, (x, y, width, height) = position
                coordinates[camera_name] = {
                    "x": x,
                    "y": y,
                    "width": width,
                    "height": height,
                }
        return coordinates

    def update_frame(self, frame: Optional[np.ndarray] = None) -> tuple[bool, bool]:
        """
        Update birdseye, optionally with a new frame.
        Returns (frame_changed, layout_changed) to indicate if the frame or layout changed.
        """

        # determine how many cameras are tracking objects within the last inactivity_threshold seconds
        active_cameras: set[str] = set(
            [
                cam
                for cam, cam_data in self.cameras.items()
                if self.config.cameras[cam].birdseye.enabled
                and self.config.cameras[cam].enabled_in_config
                and self.config.cameras[cam].enabled
                and cam_data["last_active_frame"] > 0
                and cam_data["current_frame_time"] - cam_data["last_active_frame"]
                < self.inactivity_threshold
            ]
        )
        logger.debug(f"Active cameras: {active_cameras}")

        max_cameras = self.config.birdseye.layout.max_cameras
        max_camera_refresh = False
        if max_cameras:
            now = datetime.datetime.now().timestamp()

            if len(active_cameras) == max_cameras and now - self.last_refresh_time < 10:
                # don't refresh cameras too often
                active_cameras = self.active_cameras
            else:
                limited_active_cameras = sorted(
                    active_cameras,
                    key=lambda active_camera: (
                        self.cameras[active_camera]["current_frame_time"]
                        - self.cameras[active_camera]["last_active_frame"]
                    ),
                )
                active_cameras = limited_active_cameras[:max_cameras]
                max_camera_refresh = True
                self.last_refresh_time = now

        # Track if the frame or layout changes
        frame_changed = False
        layout_changed = False

        # If no active cameras and layout is already empty, no update needed
        if len(active_cameras) == 0:
            # if the layout is already cleared
            if len(self.camera_layout) == 0:
                return False, False
            # if the layout needs to be cleared
            self.camera_layout = []
            self.active_cameras = set()
            self.clear_frame()
            frame_changed = True
            layout_changed = True
        else:
            # Determine if layout needs resetting
            if len(self.active_cameras) - len(active_cameras) == 0:
                if (
                    len(self.active_cameras) == 1
                    and self.active_cameras != active_cameras
                ):
                    reset_layout = True
                elif max_camera_refresh:
                    reset_layout = True
                else:
                    reset_layout = False
            else:
                reset_layout = True

            if reset_layout:
                logger.debug("Resetting Birdseye layout...")
                self.clear_frame()
                self.active_cameras = active_cameras
                layout_changed = True  # Layout is changing due to reset
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
                    scaled_width = int(
                        self.canvas.height * camera_dims[0] / camera_dims[1]
                    )

                    # center camera view in canvas and ensure that it fits
                    if scaled_width < self.canvas.width:
                        coefficient = 1
                        x_offset = int((self.canvas.width - scaled_width) / 2)
                    else:
                        coefficient = self.canvas.width / scaled_width
                        x_offset = int(
                            (self.canvas.width - (scaled_width * coefficient)) / 2
                        )

                    self.camera_layout = [
                        [
                            (
                                camera,
                                (
                                    x_offset,
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
                            return frame_changed, layout_changed

                        layout_candidate = self.calculate_layout(
                            active_cameras_to_add, coefficient
                        )

                        if not layout_candidate:
                            if coefficient < 10:
                                coefficient += 1
                                continue
                            else:
                                logger.error(
                                    "Error finding appropriate birdseye layout"
                                )
                                return frame_changed, layout_changed
                        calculating = False
                        self.canvas.set_coefficient(len(active_cameras), coefficient)

                    self.camera_layout = layout_candidate
                frame_changed = True

            # Draw the layout
            for row in self.camera_layout:
                for position in row:
                    src_frame = self.cameras[position[0]]["current_frame"]
                    if src_frame is None or src_frame.size == 0:
                        logger.debug(f"Skipping invalid frame for {position[0]}")
                        continue
                    self.copy_to_position(position[1], position[0], src_frame)
            if frame is not None:  # Frame presence indicates a potential change
                frame_changed = True

        return frame_changed, layout_changed

    def calculate_layout(
        self,
        cameras_to_add: list[str],
        coefficient: float,
    ) -> tuple[Any]:
        """Calculate the optimal layout for 2+ cameras."""

        def map_layout(camera_layout: list[list[Any]], row_height: int):
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
        camera_layout: list[list[Any]] = []
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

    def update(
        self,
        camera: str,
        object_count: int,
        motion_count: int,
        frame_time: float,
        frame: np.ndarray,
    ) -> tuple[bool, bool]:
        """
        Update birdseye for a specific camera with new frame data.
        Returns (frame_changed, layout_changed) to indicate if the frame or layout changed.
        """
        # don't process if birdseye is disabled for this camera
        camera_config = self.config.cameras[camera]
        force_update = False

        # disabling birdseye is a little tricky
        if not camera_config.birdseye.enabled or not camera_config.enabled:
            # if we've rendered a frame (we have a value for last_active_frame)
            # then we need to set it to zero
            if self.cameras[camera]["last_active_frame"] > 0:
                self.cameras[camera]["last_active_frame"] = 0
                force_update = True
            else:
                return False, False

        # update the last active frame for the camera
        self.cameras[camera]["current_frame"] = frame.copy()
        self.cameras[camera]["current_frame_time"] = frame_time
        if self.camera_active(camera_config.birdseye.mode, object_count, motion_count):
            self.cameras[camera]["last_active_frame"] = frame_time

        now = datetime.datetime.now().timestamp()

        # limit output to 10 fps
        if not force_update and (now - self.last_output_time) < 1 / 10:
            return False, False

        try:
            frame_changed, layout_changed = self.update_frame(frame)
        except Exception:
            frame_changed, layout_changed = False, False
            self.active_cameras = []
            self.camera_layout = []
            print(traceback.format_exc())

        # if the frame was updated or the fps is too low, send frame
        if force_update or frame_changed or (now - self.last_output_time) > 1:
            self.last_output_time = now
            return True, layout_changed

        return False, layout_changed


class Birdseye:
    def __init__(
        self,
        config: FrigateConfig,
        stop_event: mp.Event,
        websocket_server,
    ) -> None:
        self.config = config
        self.input = queue.Queue(maxsize=10)
        self.converter = FFMpegConverter(
            config.ffmpeg,
            self.input,
            stop_event,
            config.birdseye.width,
            config.birdseye.height,
            config.birdseye.width,
            config.birdseye.height,
            config.birdseye.quality,
            config.birdseye.restream,
        )
        self.broadcaster = BroadcastThread(
            "birdseye", self.converter, websocket_server, stop_event
        )
        self.birdseye_manager = BirdsEyeFrameManager(self.config, stop_event)
        self.frame_manager = SharedMemoryFrameManager()
        self.stop_event = stop_event
        self.requestor = InterProcessRequestor()
        self.idle_fps: float = self.config.birdseye.idle_heartbeat_fps
        self._idle_interval: Optional[float] = (
            (1.0 / self.idle_fps) if self.idle_fps > 0 else None
        )

        if config.birdseye.restream:
            self.birdseye_buffer = self.frame_manager.create(
                "birdseye",
                self.birdseye_manager.yuv_shape[0] * self.birdseye_manager.yuv_shape[1],
            )

        self.converter.start()
        self.broadcaster.start()

    def __send_new_frame(self) -> None:
        frame_bytes = self.birdseye_manager.frame.tobytes()

        if self.config.birdseye.restream:
            self.birdseye_buffer[:] = frame_bytes

        try:
            self.input.put_nowait(frame_bytes)
        except queue.Full:
            # drop frames if queue is full
            pass

    def all_cameras_disabled(self) -> None:
        self.birdseye_manager.clear_frame()
        self.__send_new_frame()

    def add_camera(self, camera: str) -> None:
        """Add a camera to the birdseye manager."""
        self.birdseye_manager.add_camera(camera)
        logger.debug(f"Added camera {camera} to birdseye")

    def remove_camera(self, camera: str) -> None:
        """Remove a camera from the birdseye manager."""
        self.birdseye_manager.remove_camera(camera)
        logger.debug(f"Removed camera {camera} from birdseye")

    def write_data(
        self,
        camera: str,
        current_tracked_objects: list[dict[str, Any]],
        motion_boxes: list[list[int]],
        frame_time: float,
        frame: np.ndarray,
    ) -> None:
        frame_changed, frame_layout_changed = self.birdseye_manager.update(
            camera,
            len([o for o in current_tracked_objects if not o["stationary"]]),
            len(motion_boxes),
            frame_time,
            frame,
        )
        if frame_changed:
            self.__send_new_frame()

            if frame_layout_changed:
                coordinates = self.birdseye_manager.get_camera_coordinates()
                self.requestor.send_data(UPDATE_BIRDSEYE_LAYOUT, coordinates)
        if self._idle_interval:
            now = time.monotonic()
            is_idle = len(self.birdseye_manager.camera_layout) == 0
            if (
                is_idle
                and (now - self.birdseye_manager.last_output_time)
                >= self._idle_interval
            ):
                self.__send_new_frame()

    def stop(self) -> None:
        self.converter.join()
        self.broadcaster.join()
