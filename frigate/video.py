import time
import datetime
import cv2
from . util import tonumpyarray

# fetch the frames as fast a possible, only decoding the frames when the
# detection_process has consumed the current frame
def fetch_frames(shared_arr, shared_frame_time, frame_lock, frame_ready, frame_shape, rtsp_url):
    # convert shared memory array into numpy and shape into image array
    arr = tonumpyarray(shared_arr).reshape(frame_shape)

    # start the video capture
    video = cv2.VideoCapture()
    video.open(rtsp_url)
    # keep the buffer small so we minimize old data
    video.set(cv2.CAP_PROP_BUFFERSIZE,1)

    while True:
        # check if the video stream is still open, and reopen if needed
        if not video.isOpened():
            success = video.open(rtsp_url)
            if not success:
                time.sleep(1)
                continue
        # grab the frame, but dont decode it yet
        ret = video.grab()
        # snapshot the time the frame was grabbed
        frame_time = datetime.datetime.now()
        if ret:
            # go ahead and decode the current frame
            ret, frame = video.retrieve()
            if ret:
                # Lock access and update frame
                with frame_lock:
                    arr[:] = frame
                    shared_frame_time.value = frame_time.timestamp()
                # Notify with the condition that a new frame is ready
                with frame_ready:
                    frame_ready.notify_all()
    
    video.release()