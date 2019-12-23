import datetime
import time
import cv2
import threading
import prctl
import numpy as np
from edgetpu.detection.engine import DetectionEngine
from . util import tonumpyarray, LABELS, PATH_TO_CKPT

class PreppedQueueProcessor(threading.Thread):
    def __init__(self, cameras, prepped_frame_queue, fps, queue_full):

        threading.Thread.__init__(self)
        self.cameras = cameras
        self.prepped_frame_queue = prepped_frame_queue
        
        # Load the edgetpu engine and labels
        self.engine = DetectionEngine(PATH_TO_CKPT)
        self.labels = LABELS
        self.fps = fps
        self.queue_full = queue_full
        self.avg_inference_speed = 10

    def run(self):
        prctl.set_name("PreppedQueueProcessor")
        # process queue...
        while True:
            if self.prepped_frame_queue.full():
                self.queue_full.update()

            frame = self.prepped_frame_queue.get()

            # Actual detection.
            frame['detected_objects'] = self.engine.DetectWithInputTensor(frame['frame'], threshold=0.5, top_k=5)
            self.fps.update()
            self.avg_inference_speed = (self.avg_inference_speed*9 + self.engine.get_inference_time())/10

            self.cameras[frame['camera_name']].add_objects(frame)

class RegionRequester(threading.Thread):
    def __init__(self, camera):
        threading.Thread.__init__(self)
        self.camera = camera

    def run(self):
        prctl.set_name("RegionRequester")
        frame_time = 0.0
        while True:
            now = datetime.datetime.now().timestamp()

            with self.camera.frame_ready:
                # if there isnt a frame ready for processing or it is old, wait for a new frame
                if self.camera.frame_time.value == frame_time or (now - self.camera.frame_time.value) > 0.5:
                    self.camera.frame_ready.wait()
            
            # make a copy of the frame_time
            frame_time = self.camera.frame_time.value

            for index, region in enumerate(self.camera.config['regions']):
                # queue with priority 1
                self.camera.resize_queue.put({
                    'camera_name': self.camera.name,
                    'frame_time': frame_time,
                    'region_id': index,
                    'size': region['size'],
                    'x_offset': region['x_offset'],
                    'y_offset': region['y_offset']
                })

class RegionPrepper(threading.Thread):
    def __init__(self, frame_cache, resize_request_queue, prepped_frame_queue):
        threading.Thread.__init__(self)
        self.frame_cache = frame_cache
        self.resize_request_queue = resize_request_queue
        self.prepped_frame_queue = prepped_frame_queue

    def run(self):
        prctl.set_name("RegionPrepper")
        while True:

            resize_request = self.resize_request_queue.get()

            frame = self.frame_cache.get(resize_request['frame_time'], None)
            
            if frame is None:
                print("RegionPrepper: frame_time not in frame_cache")
                continue

            # make a copy of the region
            cropped_frame = frame[resize_request['y_offset']:resize_request['y_offset']+resize_request['size'], resize_request['x_offset']:resize_request['x_offset']+resize_request['size']].copy()
            
            # Resize to 300x300 if needed
            if cropped_frame.shape != (300, 300, 3):
                cropped_frame = cv2.resize(cropped_frame, dsize=(300, 300), interpolation=cv2.INTER_LINEAR)
            # Expand dimensions since the model expects images to have shape: [1, 300, 300, 3]
            frame_expanded = np.expand_dims(cropped_frame, axis=0)

            # add the frame to the queue
            if not self.prepped_frame_queue.full():
                resize_request['frame'] = frame_expanded.flatten().copy()
                self.prepped_frame_queue.put(resize_request)