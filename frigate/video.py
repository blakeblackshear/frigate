import os
import time
import datetime
import cv2
import queue
import threading
import ctypes
import pyarrow.plasma as plasma
import multiprocessing as mp
import subprocess as sp
import numpy as np
import copy
import itertools
import json
from collections import defaultdict
from frigate.util import draw_box_with_label, area, calculate_region, clipped, intersection_over_union, intersection, EventsPerSecond, listen, PlasmaManager
from frigate.objects import ObjectTracker
from frigate.edgetpu import RemoteObjectDetector
from frigate.motion import MotionDetector

def get_frame_shape(source):
    ffprobe_cmd = " ".join([
        'ffprobe',
        '-v',
        'panic',
        '-show_error',
        '-show_streams',
        '-of',
        'json',
        '"'+source+'"'
    ])
    print(ffprobe_cmd)
    p = sp.Popen(ffprobe_cmd, stdout=sp.PIPE, shell=True)
    (output, err) = p.communicate()
    p_status = p.wait()
    info = json.loads(output)
    print(info)

    video_info = [s for s in info['streams'] if s['codec_type'] == 'video'][0]

    if video_info['height'] != 0 and video_info['width'] != 0:
        return (video_info['height'], video_info['width'], 3)
    
    # fallback to using opencv if ffprobe didnt succeed
    video = cv2.VideoCapture(source)
    ret, frame = video.read()
    frame_shape = frame.shape
    video.release()
    return frame_shape

def get_ffmpeg_input(ffmpeg_input):
    frigate_vars = {k: v for k, v in os.environ.items() if k.startswith('FRIGATE_')}
    return ffmpeg_input.format(**frigate_vars)

def filtered(obj, objects_to_track, object_filters, mask):
    object_name = obj[0]

    if not object_name in objects_to_track:
        return True
    
    if object_name in object_filters:
        obj_settings = object_filters[object_name]

        # if the min area is larger than the
        # detected object, don't add it to detected objects
        if obj_settings.get('min_area',-1) > obj[3]:
            return True
        
        # if the detected object is larger than the
        # max area, don't add it to detected objects
        if obj_settings.get('max_area', 24000000) < obj[3]:
            return True

        # if the score is lower than the threshold, skip
        if obj_settings.get('threshold', 0) > obj[1]:
            return True
    
        # compute the coordinates of the object and make sure
        # the location isnt outside the bounds of the image (can happen from rounding)
        y_location = min(int(obj[2][3]), len(mask)-1)
        x_location = min(int((obj[2][2]-obj[2][0])/2.0)+obj[2][0], len(mask[0])-1)

        # if the object is in a masked location, don't add it to detected objects
        if mask[y_location][x_location] == [0]:
            return True
        
        return False

def create_tensor_input(frame, region):
    cropped_frame = frame[region[1]:region[3], region[0]:region[2]]

    # Resize to 300x300 if needed
    if cropped_frame.shape != (300, 300, 3):
        cropped_frame = cv2.resize(cropped_frame, dsize=(300, 300), interpolation=cv2.INTER_LINEAR)
    
    # Expand dimensions since the model expects images to have shape: [1, 300, 300, 3]
    return np.expand_dims(cropped_frame, axis=0)

def start_or_restart_ffmpeg(ffmpeg_cmd, frame_size, ffmpeg_process=None):
    if not ffmpeg_process is None:
        print("Terminating the existing ffmpeg process...")
        ffmpeg_process.terminate()
        try:
            print("Waiting for ffmpeg to exit gracefully...")
            ffmpeg_process.communicate(timeout=30)
        except sp.TimeoutExpired:
            print("FFmpeg didnt exit. Force killing...")
            ffmpeg_process.kill()
            ffmpeg_process.communicate()
        ffmpeg_process = None

    print("Creating ffmpeg process...")
    print(" ".join(ffmpeg_cmd))
    process = sp.Popen(ffmpeg_cmd, stdout = sp.PIPE, stdin = sp.DEVNULL, bufsize=frame_size*10, start_new_session=True)
    return process

class CameraCapture(threading.Thread):
    def __init__(self, name, ffmpeg_process, frame_shape, frame_queue, take_frame, fps, detection_frame):
        threading.Thread.__init__(self)
        self.name = name
        self.frame_shape = frame_shape
        self.frame_size = frame_shape[0] * frame_shape[1] * frame_shape[2]
        self.frame_queue = frame_queue
        self.take_frame = take_frame
        self.fps = fps
        self.skipped_fps = EventsPerSecond()
        self.plasma_client = PlasmaManager()
        self.ffmpeg_process = ffmpeg_process
        self.current_frame = 0
        self.last_frame = 0
        self.detection_frame = detection_frame

    def run(self):
        frame_num = 0
        self.skipped_fps.start()
        while True:
            if self.ffmpeg_process.poll() != None:
                print(f"{self.name}: ffmpeg process is not running. exiting capture thread...")
                break

            frame_bytes = self.ffmpeg_process.stdout.read(self.frame_size)
            self.current_frame = datetime.datetime.now().timestamp()

            if len(frame_bytes) == 0:
                print(f"{self.name}: ffmpeg didnt return a frame. something is wrong.")
                continue

            self.fps.update()

            frame_num += 1
            if (frame_num % self.take_frame) != 0:
                self.skipped_fps.update()
                continue

            # if the detection process is more than 1 second behind, skip this frame
            if self.detection_frame.value > 0.0 and (self.last_frame - self.detection_frame.value) > 1:
                self.skipped_fps.update()
                continue

            # put the frame in the plasma store
            self.plasma_client.put(f"{self.name}{self.current_frame}",
                    np
                        .frombuffer(frame_bytes, np.uint8)
                        .reshape(self.frame_shape)
                )
            # add to the queue
            self.frame_queue.put(self.current_frame)
            self.last_frame = self.current_frame

def track_camera(name, config, global_objects_config, frame_queue, frame_shape, detection_queue, detected_objects_queue, fps, detection_fps, read_start, detection_frame):
    print(f"Starting process for {name}: {os.getpid()}")
    listen()

    detection_frame.value = 0.0

    # Merge the tracked object config with the global config
    camera_objects_config = config.get('objects', {})    
    # combine tracked objects lists
    objects_to_track = set().union(global_objects_config.get('track', ['person', 'car', 'truck']), camera_objects_config.get('track', []))
    # merge object filters
    global_object_filters = global_objects_config.get('filters', {})
    camera_object_filters = camera_objects_config.get('filters', {})
    objects_with_config = set().union(global_object_filters.keys(), camera_object_filters.keys())
    object_filters = {}
    for obj in objects_with_config:
        object_filters[obj] = {**global_object_filters.get(obj, {}), **camera_object_filters.get(obj, {})}

    frame = np.zeros(frame_shape, np.uint8)

    # load in the mask for object detection
    if 'mask' in config:
        mask = cv2.imread("/config/{}".format(config['mask']), cv2.IMREAD_GRAYSCALE)
    else:
        mask = None

    if mask is None:
        mask = np.zeros((frame_shape[0], frame_shape[1], 1), np.uint8)
        mask[:] = 255

    motion_detector = MotionDetector(frame_shape, mask, resize_factor=6)
    object_detector = RemoteObjectDetector(name, '/labelmap.txt', detection_queue)

    object_tracker = ObjectTracker(10)

    plasma_client = PlasmaManager()
    avg_wait = 0.0
    fps_tracker = EventsPerSecond()
    fps_tracker.start()
    object_detector.fps.start()
    while True:
        read_start.value = datetime.datetime.now().timestamp()
        frame_time = frame_queue.get()
        duration = datetime.datetime.now().timestamp()-read_start.value
        read_start.value = 0.0
        avg_wait = (avg_wait*99+duration)/100
        detection_frame.value = frame_time
        
        # Get frame from plasma store
        frame = plasma_client.get(f"{name}{frame_time}")

        if frame is plasma.ObjectNotAvailable:
            continue

        fps_tracker.update()
        fps.value = fps_tracker.eps()
        detection_fps.value = object_detector.fps.eps()
        
        # look for motion
        motion_boxes = motion_detector.detect(frame)

        tracked_objects = object_tracker.tracked_objects.values()

        # merge areas of motion that intersect with a known tracked object into a single area to look at
        areas_of_interest = []
        used_motion_boxes = []
        for obj in tracked_objects:
            x_min, y_min, x_max, y_max = obj['box']
            for m_index, motion_box in enumerate(motion_boxes):
                if area(intersection(obj['box'], motion_box))/area(motion_box) > .5:
                    used_motion_boxes.append(m_index)
                    x_min = min(obj['box'][0], motion_box[0])
                    y_min = min(obj['box'][1], motion_box[1])
                    x_max = max(obj['box'][2], motion_box[2])
                    y_max = max(obj['box'][3], motion_box[3])
            areas_of_interest.append((x_min, y_min, x_max, y_max))
        unused_motion_boxes = set(range(0, len(motion_boxes))).difference(used_motion_boxes)
        
        # compute motion regions
        motion_regions = [calculate_region(frame_shape, motion_boxes[i][0], motion_boxes[i][1], motion_boxes[i][2], motion_boxes[i][3], 1.2)
            for i in unused_motion_boxes]
        
        # compute tracked object regions
        object_regions = [calculate_region(frame_shape, a[0], a[1], a[2], a[3], 1.2)
            for a in areas_of_interest]
        
        # merge regions with high IOU
        merged_regions = motion_regions+object_regions
        while True:
            max_iou = 0.0
            max_indices = None
            region_indices = range(len(merged_regions))
            for a, b in itertools.combinations(region_indices, 2):
                iou = intersection_over_union(merged_regions[a], merged_regions[b])
                if iou > max_iou:
                    max_iou = iou
                    max_indices = (a, b)
            if max_iou > 0.1:
                a = merged_regions[max_indices[0]]
                b = merged_regions[max_indices[1]]
                merged_regions.append(calculate_region(frame_shape,
                    min(a[0], b[0]),
                    min(a[1], b[1]),
                    max(a[2], b[2]),
                    max(a[3], b[3]),
                    1
                ))
                del merged_regions[max(max_indices[0], max_indices[1])]
                del merged_regions[min(max_indices[0], max_indices[1])]
            else:
                break

        # resize regions and detect
        detections = []
        for region in merged_regions:

            tensor_input = create_tensor_input(frame, region)

            region_detections = object_detector.detect(tensor_input)

            for d in region_detections:
                box = d[2]
                size = region[2]-region[0]
                x_min = int((box[1] * size) + region[0])
                y_min = int((box[0] * size) + region[1])
                x_max = int((box[3] * size) + region[0])
                y_max = int((box[2] * size) + region[1])
                det = (d[0],
                    d[1],
                    (x_min, y_min, x_max, y_max),
                    (x_max-x_min)*(y_max-y_min),
                    region)
                if filtered(det, objects_to_track, object_filters, mask):
                    continue
                detections.append(det)

        #########
        # merge objects, check for clipped objects and look again up to N times
        #########
        refining = True
        refine_count = 0
        while refining and refine_count < 4:
            refining = False

            # group by name
            detected_object_groups = defaultdict(lambda: [])
            for detection in detections:
                detected_object_groups[detection[0]].append(detection)

            selected_objects = []
            for group in detected_object_groups.values():

                # apply non-maxima suppression to suppress weak, overlapping bounding boxes
                boxes = [(o[2][0], o[2][1], o[2][2]-o[2][0], o[2][3]-o[2][1])
                    for o in group]
                confidences = [o[1] for o in group]
                idxs = cv2.dnn.NMSBoxes(boxes, confidences, 0.5, 0.4)

                for index in idxs:
                    obj = group[index[0]]
                    if clipped(obj, frame_shape):
                        box = obj[2]
                        # calculate a new region that will hopefully get the entire object
                        region = calculate_region(frame_shape, 
                            box[0], box[1],
                            box[2], box[3])
                        
                        tensor_input = create_tensor_input(frame, region)
                        # run detection on new region
                        refined_detections = object_detector.detect(tensor_input)
                        for d in refined_detections:
                            box = d[2]
                            size = region[2]-region[0]
                            x_min = int((box[1] * size) + region[0])
                            y_min = int((box[0] * size) + region[1])
                            x_max = int((box[3] * size) + region[0])
                            y_max = int((box[2] * size) + region[1])
                            det = (d[0],
                                d[1],
                                (x_min, y_min, x_max, y_max),
                                (x_max-x_min)*(y_max-y_min),
                                region)
                            if filtered(det, objects_to_track, object_filters, mask):
                                continue
                            selected_objects.append(det)

                        refining = True
                    else:
                        selected_objects.append(obj)
                
            # set the detections list to only include top, complete objects
            # and new detections
            detections = selected_objects

            if refining:
                refine_count += 1
        
        # now that we have refined our detections, we need to track objects
        object_tracker.match_and_update(frame_time, detections)

        # add to the queue
        detected_objects_queue.put((name, frame_time, object_tracker.tracked_objects))

    print(f"{name}: exiting subprocess")