"""Handle outputting individual cameras via jsmpeg."""

import logging
import multiprocessing as mp
import queue
import subprocess as sp
import threading

from frigate.config import CameraConfig

logger = logging.getLogger(__name__)


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
    ):
        threading.Thread.__init__(self)
        self.name = f"{camera}_output_converter"
        self.camera = camera
        self.input_queue = input_queue
        self.stop_event = stop_event

        ffmpeg_cmd = [
            "ffmpeg",
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

    def __write(self, b) -> None:
        self.process.stdin.write(b)

    def read(self, length):
        try:
            return self.process.stdout.read1(length)
        except ValueError:
            return False

    def exit(self):
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


class JsmpegCamera:
    def __init__(
        self, config: CameraConfig, stop_event: mp.Event, websocket_server
    ) -> None:
        self.config = config
        self.input = queue.Queue(maxsize=config.detect.fps)
        width = int(
            config.live.height * (config.frame_shape[1] / config.frame_shape[0])
        )
        self.converter = FFMpegConverter(
            config.name,
            self.input,
            stop_event,
            config.frame_shape[1],
            config.frame_shape[0],
            width,
            config.live.height,
            config.live.quality,
        )
        self.broadcaster = BroadcastThread(
            config.name, self.converter, websocket_server, stop_event
        )

        self.converter.start()
        self.broadcaster.start()

    def write_frame(self, frame_bytes) -> None:
        try:
            self.input.put_nowait(frame_bytes)
        except queue.Full:
            # drop frames if queue is full
            pass

    def stop(self) -> None:
        self.converter.join()
        self.broadcaster.join()
