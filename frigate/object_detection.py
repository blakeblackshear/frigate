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

def detect_objects(prepped_frame_arrays, prepped_frame_times, prepped_frame_locks, 
                   prepped_frame_boxes, motion_changed, motion_regions, object_queue, debug):
    prepped_frame_nps = [tonumpyarray(prepped_frame_array) for prepped_frame_array in prepped_frame_arrays]
    # Load the edgetpu engine and labels
    engine = DetectionEngine(PATH_TO_CKPT)
    labels = ReadLabelFile(PATH_TO_LABELS)

    frame_time = 0.0
    region_box = [0,0,0]
    while True:
        # while there is motion
        while len([r for r in motion_regions if r.is_set()]) > 0:
        
            # loop over all the motion regions and look for objects
            for i, motion_region in enumerate(motion_regions):
                # skip the region if no motion
                if not motion_region.is_set():
                    continue

                # make a copy of the cropped frame
                with prepped_frame_locks[i]:
                    prepped_frame_copy = prepped_frame_nps[i].copy()
                    frame_time = prepped_frame_times[i].value
                    region_box[:] = prepped_frame_boxes[i]

                # Actual detection.
                objects = engine.DetectWithInputTensor(prepped_frame_copy, threshold=0.5, top_k=3)
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
                else:
                    object_queue.put({
                                    'frame_time': frame_time,
                                    'name': 'dummy',
                                    'score': 0.99,
                                    'xmin': int(0 + region_box[1]),
                                    'ymin': int(0 + region_box[2]),
                                    'xmax': int(10 + region_box[1]),
                                    'ymax': int(10 + region_box[2])
                                })
        # wait for the global motion flag to change
        with motion_changed:
            motion_changed.wait()

def prep_for_detection(shared_whole_frame_array, shared_frame_time, frame_lock, frame_ready, 
                   motion_detected, frame_shape, region_size, region_x_offset, region_y_offset,
                   prepped_frame_array, prepped_frame_time, prepped_frame_lock):
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
            prepped_frame_time.value = frame_time
