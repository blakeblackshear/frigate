import datetime
import cv2
import numpy as np
from edgetpu.detection.engine import DetectionEngine
from PIL import Image
from . util import tonumpyarray

# TODO: make dynamic?
NUM_CLASSES = 90
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

# do the actual object detection
def tf_detect_objects(cropped_frame, engine, labels, region_size, region_x_offset, region_y_offset, debug):
    # Resize to 300x300 if needed
    if cropped_frame.shape != (300, 300, 3):
        cropped_frame = cv2.resize(cropped_frame, dsize=(300, 300), interpolation=cv2.INTER_LINEAR)
    # Expand dimensions since the model expects images to have shape: [1, None, None, 3]
    image_np_expanded = np.expand_dims(cropped_frame, axis=0)

    # Actual detection.
    ans = engine.DetectWithInputTensor(image_np_expanded.flatten(), threshold=0.5, top_k=3)

    # build an array of detected objects
    objects = []
    if ans:
        for obj in ans:
            box = obj.bounding_box.flatten().tolist()
            objects.append({
                        'name': str(labels[obj.label_id]),
                        'score': float(obj.score),
                        'xmin': int((box[0] * region_size) + region_x_offset),
                        'ymin': int((box[1] * region_size) + region_y_offset),
                        'xmax': int((box[2] * region_size) + region_x_offset),
                        'ymax': int((box[3] * region_size) + region_y_offset)
                    })

    return objects

def detect_objects(shared_arr, object_queue, shared_frame_time, frame_lock, frame_ready, 
                   motion_detected, frame_shape, region_size, region_x_offset, region_y_offset,
                   min_person_area, debug):
    # shape shared input array into frame for processing
    arr = tonumpyarray(shared_arr).reshape(frame_shape)

    # Load the edgetpu engine and labels
    engine = DetectionEngine(PATH_TO_CKPT)
    labels = ReadLabelFile(PATH_TO_LABELS)

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
            cropped_frame = arr[region_y_offset:region_y_offset+region_size, region_x_offset:region_x_offset+region_size].copy()
            frame_time = shared_frame_time.value

        # convert to RGB
        cropped_frame_rgb = cv2.cvtColor(cropped_frame, cv2.COLOR_BGR2RGB)
        # do the object detection
        objects = tf_detect_objects(cropped_frame_rgb, engine, labels, region_size, region_x_offset, region_y_offset, debug)
        for obj in objects:
            # ignore persons below the size threshold
            if obj['name'] == 'person' and (obj['xmax']-obj['xmin'])*(obj['ymax']-obj['ymin']) < min_person_area:
                continue
            obj['frame_time'] = frame_time
            object_queue.put(obj)