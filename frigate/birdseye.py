import multiprocessing as mp
import numpy as np
import subprocess as sp
import logging
import threading
from frigate.util import SharedMemoryFrameManager

logger = logging.getLogger(__name__)

# methods for maintaining the birdseyeframe in the object processing thread
# avoids work when no clients are listening
class BirdsEyeFrameManager:
    def __init__(self):
        # self.config = config
        self.frame_manager = SharedMemoryFrameManager()
        self._frame_shape = (1080, 1920)
        self.frame_shape_yuv = (self._frame_shape[0] * 3 // 2, self._frame_shape[1])
        self.frame_shm = mp.shared_memory.SharedMemory(
            name=f"birdseye-frame",
            create=True,
            size=self.frame_shape_yuv[0] * self.frame_shape_yuv[1],
        )
        self.frame = np.ndarray(
            self.frame_shape_yuv, dtype=np.uint8, buffer=self.frame_shm.buf
        )

        # initialize the frame as black and with the frigate logo
        self.blank_frame = np.zeros((1080 * 3 // 2, 1920), np.uint8)
        self.blank_frame[:] = 128
        self.blank_frame[0:1080, 0:1920] = 16

        self.frame[:] = self.blank_frame

    def update_frame(self, camera, object_count, motion_count, frame_time, frame):
        # determine how many cameras are tracking objects (or recently were)
        # decide on a layout for the birdseye view (try to avoid too much churn)
        # calculate position of each camera
        # calculate resolution of each position in the layout
        # if layout is changing, wipe the frame black again
        # For each camera currently tracking objects (alphabetical):
        #   - resize the current frame and copy into the birdseye view
        # signal to birdseye process that the frame is ready to send

        self.frame[:] = frame


# separate process for managing the external ffmpeg process and sending frame
# bytes to ffmpeg
class BirdsEyeFrameOutputter(threading.Thread):
    def __init__(self, stop_event):
        threading.Thread.__init__(self)
        self.stop_event = stop_event
        self.frame_shm = mp.shared_memory.SharedMemory(
            name=f"birdseye-frame",
            create=False,
        )

    def start_ffmpeg(self):
        ffmpeg_cmd = "ffmpeg -f rawvideo -pix_fmt yuv420p -video_size 1920x1080 -i pipe: -f mpegts -codec:v mpeg1video -b:v 1000k -bf 0 http://localhost:8081/birdseye".split(
            " "
        )
        self.process = sp.Popen(
            ffmpeg_cmd,
            stdout=sp.DEVNULL,
            # TODO: logging
            stderr=sp.DEVNULL,
            stdin=sp.PIPE,
            start_new_session=True,
        )

    def run(self):
        self.start_ffmpeg()

        while not self.stop_event.wait(1):
            if self.process.poll() != None:
                logger.info(f"ffmpeg process is not running. restarting ...")
                self.start_ffmpeg()

            self.process.stdin.write(self.frame_shm.buf.tobytes())


# separate process for passing jsmpeg packets over websockets
# signals to the frame manager when a client is listening
# class JSMpegSocketServer:
