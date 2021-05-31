import multiprocessing as mp
import queue
import signal
import subprocess as sp
import threading
import numpy as np
from multiprocessing import shared_memory
from wsgiref.simple_server import make_server

from setproctitle import setproctitle
from ws4py.server.wsgirefserver import (
    WebSocketWSGIHandler,
    WebSocketWSGIRequestHandler,
    WSGIServer,
)
from ws4py.server.wsgiutils import WebSocketWSGIApplication
from ws4py.websocket import WebSocket

from frigate.util import SharedMemoryFrameManager


class FFMpegConverter:
    def __init__(self, in_width, in_height, out_width, out_height, bitrate):
        ffmpeg_cmd = f"ffmpeg -f rawvideo -pix_fmt yuv420p -video_size {in_width}x{in_height} -i pipe: -f mpegts -s {out_width}x{out_height} -codec:v mpeg1video -b:v {bitrate} -bf 0 pipe:".split(
            " "
        )
        self.process = sp.Popen(
            ffmpeg_cmd,
            stdout=sp.PIPE,
            # TODO: logging
            stderr=sp.DEVNULL,
            stdin=sp.PIPE,
            start_new_session=True,
        )

    def write(self, b):
        self.process.stdin.write(b)

    def read(self, length):
        return self.process.stdout.read1(length)

    def exit(self):
        self.process.terminate()
        try:
            self.process.communicate(timeout=30)
        except sp.TimeoutExpired:
            self.process.kill()
            self.process.communicate()


class BroadcastThread(threading.Thread):
    def __init__(self, camera, converter, websocket_server):
        super(BroadcastThread, self).__init__()
        self.camera = camera
        self.converter = converter
        self.websocket_server = websocket_server

    def run(self):
        while True:
            buf = self.converter.read(65536)
            if buf:
                for ws in self.websocket_server.manager:
                    if ws.environ["PATH_INFO"].endswith(self.camera):
                        ws.send(buf, binary=True)
            elif self.converter.process.poll() is not None:
                break


class BirdsEyeFrameManager:
    def __init__(self, height, width):
        frame_shape = (height, width)
        yuv_shape = (height * 3 // 2, width)
        self.frame = np.ndarray(yuv_shape, dtype=np.uint8)

        # initialize the frame as black and with the frigate logo
        self.blank_frame = np.zeros(yuv_shape, np.uint8)
        self.blank_frame[:] = 128
        self.blank_frame[0 : frame_shape[0], 0 : frame_shape[1]] = 16

        self.frame[:] = self.blank_frame

    def update(self, camera, object_count, motion_count, frame_time, frame):
        # determine how many cameras are tracking objects (or recently were)
        # decide on a layout for the birdseye view (try to avoid too much churn)
        # calculate position of each camera
        # calculate resolution of each position in the layout
        # if layout is changing, wipe the frame black again
        # For each camera currently tracking objects (alphabetical):
        #   - resize the current frame and copy into the birdseye view
        # signal to birdseye process that the frame is ready to send

        self.frame[:] = frame


def output_frames(config, video_output_queue):
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
        converters[camera] = FFMpegConverter(
            cam_config.frame_shape[1], cam_config.frame_shape[0], 640, 320, "1000k"
        )
        broadcasters[camera] = BroadcastThread(
            camera, converters[camera], websocket_server
        )

    converters["birdseye"] = FFMpegConverter(1920, 1080, 640, 320, "1000k")
    broadcasters["birdseye"] = BroadcastThread(
        "birdseye", converters["birdseye"], websocket_server
    )

    websocket_thread.start()

    for t in broadcasters.values():
        t.start()

    birdseye_manager = BirdsEyeFrameManager(1080, 1920)

    while not stop_event.is_set():
        try:
            (
                camera,
                frame_time,
                current_tracked_objects,
                motion_boxes,
                regions,
            ) = video_output_queue.get(True, 10)
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

        # update birdseye if websockets are connected
        if any(
            ws.environ["PATH_INFO"].endswith("birdseye")
            for ws in websocket_server.manager
        ):
            birdseye_manager.update(
                camera,
                len(current_tracked_objects),
                len(motion_boxes),
                frame_time,
                frame,
            )
            converters["birdseye"].write(birdseye_manager.frame.tobytes())

        if camera in previous_frames:
            frame_manager.delete(previous_frames[camera])

        previous_frames[camera] = frame_id

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
    print("exiting output process...")
