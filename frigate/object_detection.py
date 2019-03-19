import datetime
import cv2
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

def detect_objects(prepped_frame_array, prepped_frame_time, prepped_frame_lock, 
                   prepped_frame_ready, prepped_frame_box, object_queue, debug):
    prepped_frame_np = tonumpyarray(prepped_frame_array)
    # Load the edgetpu engine and labels
    engine = DetectionEngine(PATH_TO_CKPT)
    labels = ReadLabelFile(PATH_TO_LABELS)

    frame_time = 0.0
    region_box = [0,0,0,0]
    while True:
        with prepped_frame_ready:
            prepped_frame_ready.wait()
        
        # make a copy of the cropped frame
        with prepped_frame_lock:
            prepped_frame_copy = prepped_frame_np.copy()
            frame_time = prepped_frame_time.value
            region_box[:] = prepped_frame_box

        # Actual detection.
        objects = engine.DetectWithInputTensor(prepped_frame_copy, threshold=0.5, top_k=3)
        # print(engine.get_inference_time())
        # put detected objects in the queue
        if objects:
            # assumes square
            region_size = region_box[2]-region_box[0]
            for obj in objects:
                box = obj.bounding_box.flatten().tolist()
                object_queue.put({
                            'frame_time': frame_time,
                            'name': str(labels[obj.label_id]),
                            'score': float(obj.score),
                            'xmin': int((box[0] * region_size) + region_box[0]),
                            'ymin': int((box[1] * region_size) + region_box[1]),
                            'xmax': int((box[2] * region_size) + region_box[0]),
                            'ymax': int((box[3] * region_size) + region_box[1])
                        })

def prep_for_detection(shared_whole_frame_array, shared_frame_time, frame_lock, frame_ready, 
                   motion_detected, frame_shape, region_size, region_x_offset, region_y_offset,
                   prepped_frame_array, prepped_frame_time, prepped_frame_ready, prepped_frame_lock,
                   prepped_frame_box):
    # shape shared input array into frame for processing
    shared_whole_frame = tonumpyarray(shared_whole_frame_array).reshape(frame_shape)

    shared_prepped_frame = tonumpyarray(prepped_frame_array).reshape((1,300,300,3))

    frame_time = 0.0
    while True:
        now = datetime.datetime.now().timestamp()

        # wait until motion is detected
        motion_detected.wait()

        with frame_ready:
            # if there isnt a frame ready for processing or it is old, wait for a new frame
            if shared_frame_time.value == frame_time or (now - shared_frame_time.value) > 0.5:
                frame_ready.wait()
        
        # make a copy of the cropped frame
        with frame_lock:
            cropped_frame = shared_whole_frame[region_y_offset:region_y_offset+region_size, region_x_offset:region_x_offset+region_size].copy()
            frame_time = shared_frame_time.value
        
        # convert to RGB
        cropped_frame_rgb = cv2.cvtColor(cropped_frame, cv2.COLOR_BGR2RGB)
        # Resize to 300x300 if needed
        if cropped_frame_rgb.shape != (300, 300, 3):
            cropped_frame_rgb = cv2.resize(cropped_frame_rgb, dsize=(300, 300), interpolation=cv2.INTER_LINEAR)
        # Expand dimensions since the model expects images to have shape: [1, 300, 300, 3]
        frame_expanded = np.expand_dims(cropped_frame_rgb, axis=0)

        # copy the prepped frame to the shared output array
        with prepped_frame_lock:
            shared_prepped_frame[:] = frame_expanded
            prepped_frame_time = frame_time
            prepped_frame_box[:] = [region_x_offset, region_y_offset, region_x_offset+region_size, region_y_offset+region_size]

        # signal that a prepped frame is ready
        with prepped_frame_ready:
            prepped_frame_ready.notify_all()