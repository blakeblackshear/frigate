import datetime
import time
import cv2
import threading
import numpy as np
from edgetpu.detection.engine import DetectionEngine
from . util import tonumpyarray

# Path to frozen detection graph. This is the actual model that is used for the object detection.
PATH_TO_CKPT = '/frozen_inference_graph.pb'
# List of the strings that is used to add correct label for each box.
PATH_TO_LABELS = '/label_map.pbtext'

# Function to read labels from text files.
def ReadLabelFile(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()
    ret = {}
    for line in lines:
        pair = line.strip().split(maxsplit=1)
        ret[int(pair[0])] = pair[1].strip()
    return ret

class PreppedQueueProcessor(threading.Thread):
    def __init__(self, cameras, prepped_frame_queue):

        threading.Thread.__init__(self)
        self.cameras = cameras
        self.prepped_frame_queue = prepped_frame_queue
        
        # Load the edgetpu engine and labels
        self.engine = DetectionEngine(PATH_TO_CKPT)
        self.labels = ReadLabelFile(PATH_TO_LABELS)

    def run(self):
        # process queue...
        while True:
            frame = self.prepped_frame_queue.get()
            # print(self.prepped_frame_queue.qsize())
            # Actual detection.
            objects = self.engine.DetectWithInputTensor(frame['frame'], threshold=0.5, top_k=3)
            # time.sleep(0.1)
            # objects = []
            print(self.engine.get_inference_time())
            # put detected objects in the queue
            parsed_objects = []
            for obj in objects:
                box = obj.bounding_box.flatten().tolist()
                parsed_objects.append({
                            'frame_time': frame['frame_time'],
                            'name': str(self.labels[obj.label_id]),
                            'score': float(obj.score),
                            'xmin': int((box[0] * frame['region_size']) + frame['region_x_offset']),
                            'ymin': int((box[1] * frame['region_size']) + frame['region_y_offset']),
                            'xmax': int((box[2] * frame['region_size']) + frame['region_x_offset']),
                            'ymax': int((box[3] * frame['region_size']) + frame['region_y_offset'])
                        })
            self.cameras[frame['camera_name']].add_objects(parsed_objects)


# should this be a region class?
class FramePrepper(threading.Thread):
    def __init__(self, camera_name, shared_frame, frame_time, frame_ready, 
        frame_lock,
        region_size, region_x_offset, region_y_offset,
        prepped_frame_queue):

        threading.Thread.__init__(self)
        self.camera_name = camera_name
        self.shared_frame = shared_frame
        self.frame_time = frame_time
        self.frame_ready = frame_ready
        self.frame_lock = frame_lock
        self.region_size = region_size
        self.region_x_offset = region_x_offset
        self.region_y_offset = region_y_offset
        self.prepped_frame_queue = prepped_frame_queue

    def run(self):
        frame_time = 0.0
        while True:
            now = datetime.datetime.now().timestamp()

            with self.frame_ready:
                # if there isnt a frame ready for processing or it is old, wait for a new frame
                if self.frame_time.value == frame_time or (now - self.frame_time.value) > 0.5:
                    self.frame_ready.wait()
            
            # make a copy of the cropped frame
            with self.frame_lock:
                cropped_frame = self.shared_frame[self.region_y_offset:self.region_y_offset+self.region_size, self.region_x_offset:self.region_x_offset+self.region_size].copy()
                frame_time = self.frame_time.value
            
            # convert to RGB
            cropped_frame_rgb = cv2.cvtColor(cropped_frame, cv2.COLOR_BGR2RGB)
            # Resize to 300x300 if needed
            if cropped_frame_rgb.shape != (300, 300, 3):
                cropped_frame_rgb = cv2.resize(cropped_frame_rgb, dsize=(300, 300), interpolation=cv2.INTER_LINEAR)
            # Expand dimensions since the model expects images to have shape: [1, 300, 300, 3]
            frame_expanded = np.expand_dims(cropped_frame_rgb, axis=0)

            # print("Prepped frame at " + str(self.region_x_offset) + "," + str(self.region_y_offset))
            # add the frame to the queue
            if not self.prepped_frame_queue.full():
                self.prepped_frame_queue.put({
                    'camera_name': self.camera_name,
                    'frame_time': frame_time,
                    'frame': frame_expanded.flatten().copy(),
                    'region_size': self.region_size,
                    'region_x_offset': self.region_x_offset,
                    'region_y_offset': self.region_y_offset
                })
            else:
                print("queue full. moving on")
