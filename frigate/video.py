import time
import datetime
import cv2
import threading
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

    bad_frame_counter = 0
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
                bad_frame_counter = 0
            else:
                print("Unable to decode frame")
                bad_frame_counter += 1
        else:
            print("Unable to grab a frame")
            bad_frame_counter += 1
        
        if bad_frame_counter > 100:
            video.release()
    
    video.release()

# Stores 2 seconds worth of frames when motion is detected so they can be used for other threads
class FrameTracker(threading.Thread):
    def __init__(self, shared_frame, frame_time, frame_ready, frame_lock, recent_frames, motion_changed, motion_regions):
        threading.Thread.__init__(self)
        self.shared_frame = shared_frame
        self.frame_time = frame_time
        self.frame_ready = frame_ready
        self.frame_lock = frame_lock
        self.recent_frames = recent_frames
        self.motion_changed = motion_changed
        self.motion_regions = motion_regions

    def run(self):
        frame_time = 0.0
        while True:
            # while there is motion
            while len([r for r in self.motion_regions if r.is_set()]) > 0:
                now = datetime.datetime.now().timestamp()
                # wait for a frame
                with self.frame_ready:
                    # if there isnt a frame ready for processing or it is old, wait for a signal
                    if self.frame_time.value == frame_time or (now - self.frame_time.value) > 0.5:
                        self.frame_ready.wait()
                
                # lock and make a copy of the frame
                with self.frame_lock: 
                    frame = self.shared_frame.copy()
                    frame_time = self.frame_time.value
                
                # add the frame to recent frames
                self.recent_frames[frame_time] = frame

                # delete any old frames
                stored_frame_times = list(self.recent_frames.keys())
                for k in stored_frame_times:
                    if (now - k) > 2:
                        del self.recent_frames[k]
                
            # wait for the global motion flag to change
            with self.motion_changed:
                self.motion_changed.wait()