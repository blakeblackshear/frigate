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

def detect_objects(prepped_frame_array, prepped_frame_time,
                   prepped_frame_ready, prepped_frame_grabbed,
                   prepped_frame_box, object_queue, debug):
    prepped_frame_np = tonumpyarray(prepped_frame_array)

    # Load the edgetpu engine and labels
    engine = DetectionEngine(PATH_TO_CKPT)
    labels = ReadLabelFile(PATH_TO_LABELS)

    frame_time = 0.0
    region_box = [0,0,0]
    while True:
        # wait until a frame is ready
        prepped_frame_ready.wait()

        prepped_frame_copy = prepped_frame_np.copy()
        frame_time = prepped_frame_time.value
        region_box[:] = prepped_frame_box

        prepped_frame_grabbed.set()
        # print("Grabbed " + str(region_box[1]) + "," + str(region_box[2]))

        # Actual detection.
        objects = engine.DetectWithInputTensor(prepped_frame_copy, threshold=0.5, top_k=3)
        # time.sleep(0.1)
        # objects = []
        # print(engine.get_inference_time())
        # put detected objects in the queue
        if objects:
            for obj in objects:
                box = obj.bounding_box.flatten().tolist()
                object_queue.put({
                            'frame_time': frame_time,
                            'name': str(labels[obj.label_id]),
                            'score': float(obj.score),
                            'xmin': int((box[0] * region_box[0]) + region_box[1]),
                            'ymin': int((box[1] * region_box[0]) + region_box[2]),
                            'xmax': int((box[2] * region_box[0]) + region_box[1]),
                            'ymax': int((box[3] * region_box[0]) + region_box[2])
                        })
        # else:
        #     object_queue.put({
        #                     'frame_time': frame_time,
        #                     'name': 'dummy',
        #                     'score': 0.99,
        #                     'xmin': int(0 + region_box[1]),
        #                     'ymin': int(0 + region_box[2]),
        #                     'xmax': int(10 + region_box[1]),
        #                     'ymax': int(10 + region_box[2])
        #                 })

class PreppedQueueProcessor(threading.Thread):
    def __init__(self, prepped_frame_array,
        prepped_frame_time,
        prepped_frame_ready,
        prepped_frame_grabbed,
        prepped_frame_box,
        prepped_frame_queue):

        threading.Thread.__init__(self)
        self.prepped_frame_array = prepped_frame_array
        self.prepped_frame_time = prepped_frame_time
        self.prepped_frame_ready = prepped_frame_ready
        self.prepped_frame_grabbed = prepped_frame_grabbed
        self.prepped_frame_box = prepped_frame_box
        self.prepped_frame_queue = prepped_frame_queue

    def run(self):
        prepped_frame_np = tonumpyarray(self.prepped_frame_array)
        # process queue...
        while True:
            frame = self.prepped_frame_queue.get()
            # print(self.prepped_frame_queue.qsize())
            prepped_frame_np[:] = frame['frame']
            self.prepped_frame_time.value = frame['frame_time']
            self.prepped_frame_box[0] = frame['region_size']
            self.prepped_frame_box[1] = frame['region_x_offset']
            self.prepped_frame_box[2] = frame['region_y_offset']
            # print("Passed " + str(frame['region_x_offset']) + "," + str(frame['region_x_offset']))
            self.prepped_frame_ready.set()
            self.prepped_frame_grabbed.wait()
            self.prepped_frame_grabbed.clear()
            self.prepped_frame_ready.clear()


# should this be a region class?
class FramePrepper(threading.Thread):
    def __init__(self, shared_frame, frame_time, frame_ready, 
        frame_lock,
        region_size, region_x_offset, region_y_offset,
        prepped_frame_queue):

        threading.Thread.__init__(self)
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
                    'frame_time': frame_time,
                    'frame': frame_expanded.flatten().copy(),
                    'region_size': self.region_size,
                    'region_x_offset': self.region_x_offset,
                    'region_y_offset': self.region_y_offset
                })
            # else:
            #     print("queue full. moving on")
