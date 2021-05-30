import multiprocessing as mp
import queue
import signal
import subprocess as sp
import threading
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


class FFMpegConverter(object):
    def __init__(self):
        ffmpeg_cmd = "ffmpeg -f rawvideo -pix_fmt yuv420p -video_size 1920x1080 -i pipe: -f mpegts -s 1280x720 -codec:v mpeg1video -b:v 1000k -bf 0 pipe:".split(
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
    def __init__(self, converter, websocket_server):
        super(BroadcastThread, self).__init__()
        self.converter = converter
        self.websocket_server = websocket_server

    def run(self):
        while True:
            buf = self.converter.read(4096)
            if buf:
                self.websocket_server.manager.broadcast(buf, binary=True)
            elif self.converter.process.poll() is not None:
                break


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
        "",
        8082,
        server_class=WSGIServer,
        handler_class=WebSocketWSGIRequestHandler,
        app=WebSocketWSGIApplication(handler_cls=WebSocket),
    )
    websocket_server.initialize_websockets_manager()
    websocket_thread = threading.Thread(target=websocket_server.serve_forever)

    converter = FFMpegConverter()
    broadcast_thread = BroadcastThread(converter, websocket_server)

    websocket_thread.start()
    broadcast_thread.start()

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

        # send frame to ffmpeg process
        converter.write(frame.tobytes())

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

    converter.exit()
    broadcast_thread.join()
    websocket_server.manager.close_all()
    websocket_server.manager.stop()
    websocket_server.manager.join()
    websocket_server.shutdown()
    websocket_thread.join()
    print("exiting output process...")
