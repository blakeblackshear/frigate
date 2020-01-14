import datetime
import time
import cv2
import threading
import copy
import prctl
import numpy as np
from edgetpu.detection.engine import DetectionEngine

from frigate.util import tonumpyarray, LABELS, PATH_TO_CKPT, calculate_region

class PreppedQueueProcessor(threading.Thread):
    def __init__(self, cameras, prepped_frame_queue, fps):

        threading.Thread.__init__(self)
        self.cameras = cameras
        self.prepped_frame_queue = prepped_frame_queue
        
        # Load the edgetpu engine and labels
        self.engine = DetectionEngine(PATH_TO_CKPT)
        self.labels = LABELS
        self.fps = fps
        self.avg_inference_speed = 10

    def run(self):
        prctl.set_name(self.__class__.__name__)
        # process queue...
        while True:
            frame = self.prepped_frame_queue.get()

            # Actual detection.
            frame['detected_objects'] = self.engine.detect_with_input_tensor(frame['frame'], threshold=0.2, top_k=5)
            self.fps.update()
            self.avg_inference_speed = (self.avg_inference_speed*9 + self.engine.get_inference_time())/10

            self.cameras[frame['camera_name']].detected_objects_queue.put(frame)

class RegionRequester(threading.Thread):
    def __init__(self, camera):
        threading.Thread.__init__(self)
        self.camera = camera

    def run(self):
        prctl.set_name(self.__class__.__name__)
        frame_time = 0.0
        while True:
            now = datetime.datetime.now().timestamp()

            with self.camera.frame_ready:
                # if there isnt a frame ready for processing or it is old, wait for a new frame
                if self.camera.frame_time.value == frame_time or (now - self.camera.frame_time.value) > 0.5:
                    self.camera.frame_ready.wait()
            
            # make a copy of the frame_time
            frame_time = self.camera.frame_time.value

            # grab the current tracked objects
            with self.camera.object_tracker.tracked_objects_lock:
                tracked_objects = copy.deepcopy(self.camera.object_tracker.tracked_objects).values()

            with self.camera.regions_in_process_lock:
                self.camera.regions_in_process[frame_time] = len(self.camera.config['regions'])
                self.camera.regions_in_process[frame_time] += len(tracked_objects)

            for index, region in enumerate(self.camera.config['regions']):
                self.camera.resize_queue.put({
                    'camera_name': self.camera.name,
                    'frame_time': frame_time,
                    'region_id': index,
                    'size': region['size'],
                    'x_offset': region['x_offset'],
                    'y_offset': region['y_offset']
                })
            
            # request a region for tracked objects
            for tracked_object in tracked_objects:
                box = tracked_object['box']
                # calculate a new region that will hopefully get the entire object
                (size, x_offset, y_offset) = calculate_region(self.camera.frame_shape, 
                    box['xmin'], box['ymin'],
                    box['xmax'], box['ymax'])

                self.camera.resize_queue.put({
                    'camera_name': self.camera.name,
                    'frame_time': frame_time,
                    'region_id': -1,
                    'size': size,
                    'x_offset': x_offset,
                    'y_offset': y_offset
                })


class RegionPrepper(threading.Thread):
    def __init__(self, camera, frame_cache, resize_request_queue, prepped_frame_queue):
        threading.Thread.__init__(self)
        self.camera = camera
        self.frame_cache = frame_cache
        self.resize_request_queue = resize_request_queue
        self.prepped_frame_queue = prepped_frame_queue

    def run(self):
        prctl.set_name(self.__class__.__name__)
        while True:

            resize_request = self.resize_request_queue.get()

            # if the queue is over 100 items long, only prep dynamic regions
            if resize_request['region_id'] != -1 and self.prepped_frame_queue.qsize() > 100:
                with self.camera.regions_in_process_lock:
                    self.camera.regions_in_process[resize_request['frame_time']] -= 1
                    if self.camera.regions_in_process[resize_request['frame_time']] == 0:
                        del self.camera.regions_in_process[resize_request['frame_time']]
                self.camera.skipped_region_tracker.update()
                continue

            frame = self.frame_cache.get(resize_request['frame_time'], None)
            
            if frame is None:
                print("RegionPrepper: frame_time not in frame_cache")
                continue

            # make a copy of the region
            cropped_frame = frame[resize_request['y_offset']:resize_request['y_offset']+resize_request['size'], resize_request['x_offset']:resize_request['x_offset']+resize_request['size']].copy()

            # Resize to 300x300 if needed
            if cropped_frame.shape != (300, 300, 3):
                # TODO: use Pillow-SIMD?
                cropped_frame = cv2.resize(cropped_frame, dsize=(300, 300), interpolation=cv2.INTER_LINEAR)
            # Expand dimensions since the model expects images to have shape: [1, 300, 300, 3]
            frame_expanded = np.expand_dims(cropped_frame, axis=0)

            # add the frame to the queue
            resize_request['frame'] = frame_expanded.flatten().copy()
            self.prepped_frame_queue.put(resize_request)