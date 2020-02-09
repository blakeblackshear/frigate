import datetime
import time
import threading
import queue
import itertools
from collections import defaultdict
from statistics import mean
import cv2
import imutils
import numpy as np
import subprocess as sp
import multiprocessing as mp
import SharedArray as sa
from scipy.spatial import distance as dist
import tflite_runtime.interpreter as tflite
from tflite_runtime.interpreter import load_delegate
from frigate.edgetpu import ObjectDetector, EdgeTPUProcess, RemoteObjectDetector, load_labels
from frigate.motion import MotionDetector

def draw_box_with_label(frame, x_min, y_min, x_max, y_max, label, info, thickness=2, color=None, position='ul'):
    if color is None:
        color = (0,0,255)
    display_text = "{}: {}".format(label, info)
    cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), color, thickness)
    font_scale = 0.5
    font = cv2.FONT_HERSHEY_SIMPLEX
    # get the width and height of the text box
    size = cv2.getTextSize(display_text, font, fontScale=font_scale, thickness=2)
    text_width = size[0][0]
    text_height = size[0][1]
    line_height = text_height + size[1]
    # set the text start position
    if position == 'ul':
        text_offset_x = x_min
        text_offset_y = 0 if y_min < line_height else y_min - (line_height+8)
    elif position == 'ur':
        text_offset_x = x_max - (text_width+8)
        text_offset_y = 0 if y_min < line_height else y_min - (line_height+8)
    elif position == 'bl':
        text_offset_x = x_min
        text_offset_y = y_max
    elif position == 'br':
        text_offset_x = x_max - (text_width+8)
        text_offset_y = y_max
    # make the coords of the box with a small padding of two pixels
    textbox_coords = ((text_offset_x, text_offset_y), (text_offset_x + text_width + 2, text_offset_y + line_height))
    cv2.rectangle(frame, textbox_coords[0], textbox_coords[1], color, cv2.FILLED)
    cv2.putText(frame, display_text, (text_offset_x, text_offset_y + line_height - 3), font, fontScale=font_scale, color=(0, 0, 0), thickness=2)

def calculate_region(frame_shape, xmin, ymin, xmax, ymax, multiplier=2):    
    # size is larger than longest edge
    size = int(max(xmax-xmin, ymax-ymin)*multiplier)
    # if the size is too big to fit in the frame
    if size > min(frame_shape[0], frame_shape[1]):
        size = min(frame_shape[0], frame_shape[1])

    # x_offset is midpoint of bounding box minus half the size
    x_offset = int((xmax-xmin)/2.0+xmin-size/2.0)
    # if outside the image
    if x_offset < 0:
        x_offset = 0
    elif x_offset > (frame_shape[1]-size):
        x_offset = (frame_shape[1]-size)

    # y_offset is midpoint of bounding box minus half the size
    y_offset = int((ymax-ymin)/2.0+ymin-size/2.0)
    # if outside the image
    if y_offset < 0:
        y_offset = 0
    elif y_offset > (frame_shape[0]-size):
        y_offset = (frame_shape[0]-size)

    return (x_offset, y_offset, x_offset+size, y_offset+size)

def intersection(box_a, box_b):
    return (
        max(box_a[0], box_b[0]),
        max(box_a[1], box_b[1]),
        min(box_a[2], box_b[2]),
        min(box_a[3], box_b[3])
    )

def area(box):
    return (box[2]-box[0] + 1)*(box[3]-box[1] + 1)
    
def intersection_over_union(box_a, box_b):
    # determine the (x, y)-coordinates of the intersection rectangle
    intersect = intersection(box_a, box_b)

    # compute the area of intersection rectangle
    inter_area = max(0, intersect[2] - intersect[0] + 1) * max(0, intersect[3] - intersect[1] + 1)

    if inter_area == 0:
        return 0.0
    
    # compute the area of both the prediction and ground-truth
    # rectangles
    box_a_area = (box_a[2] - box_a[0] + 1) * (box_a[3] - box_a[1] + 1)
    box_b_area = (box_b[2] - box_b[0] + 1) * (box_b[3] - box_b[1] + 1)

    # compute the intersection over union by taking the intersection
    # area and dividing it by the sum of prediction + ground-truth
    # areas - the interesection area
    iou = inter_area / float(box_a_area + box_b_area - inter_area)

    # return the intersection over union value
    return iou

def clipped(obj, frame_shape):
    # if the object is within 5 pixels of the region border, and the region is not on the edge
    # consider the object to be clipped
    box = obj[2]
    region = obj[3]
    if ((region[0] > 5 and box[0]-region[0] <= 5) or 
        (region[1] > 5 and box[1]-region[1] <= 5) or
        (frame_shape[1]-region[2] > 5 and region[2]-box[2] <= 5) or
        (frame_shape[0]-region[3] > 5 and region[3]-box[3] <= 5)):
        return True
    else:
        return False

def filtered(obj):
    if obj[0] != 'person':
        return True
    return False

def create_tensor_input(frame, region):
    cropped_frame = frame[region[1]:region[3], region[0]:region[2]]

    # Resize to 300x300 if needed
    if cropped_frame.shape != (300, 300, 3):
        # TODO: use Pillow-SIMD?
        cropped_frame = cv2.resize(cropped_frame, dsize=(300, 300), interpolation=cv2.INTER_LINEAR)
    
    # Expand dimensions since the model expects images to have shape: [1, 300, 300, 3]
    return np.expand_dims(cropped_frame, axis=0)

class ObjectTracker():
    def __init__(self, max_disappeared):
        self.tracked_objects = {}
        self.disappeared = {}
        self.max_disappeared = max_disappeared

    def register(self, index, frame_time, obj):
        id = f"{frame_time}-{index}"
        obj['id'] = id
        obj['frame_time'] = frame_time
        obj['top_score'] = obj['score']
        self.add_history(obj)
        self.tracked_objects[id] = obj
        self.disappeared[id] = 0

    def deregister(self, id):
        del self.tracked_objects[id]
        del self.disappeared[id]
    
    def update(self, id, new_obj):
        self.disappeared[id] = 0
        self.tracked_objects[id].update(new_obj)
        self.add_history(self.tracked_objects[id])
        if self.tracked_objects[id]['score'] > self.tracked_objects[id]['top_score']:
            self.tracked_objects[id]['top_score'] = self.tracked_objects[id]['score']
    
    def add_history(self, obj):
        entry = {
            'score': obj['score'],
            'box': obj['box'],
            'region': obj['region'],
            'centroid': obj['centroid'],
            'frame_time': obj['frame_time']
        }
        if 'history' in obj:
            obj['history'].append(entry)
        else:
            obj['history'] = [entry]

    def match_and_update(self, frame_time, new_objects):
        if len(new_objects) == 0:
            for id in list(self.tracked_objects.keys()):
                if self.disappeared[id] >= self.max_disappeared:
                    self.deregister(id)
                else:
                    self.disappeared[id] += 1
            return
            
        # group by name
        new_object_groups = defaultdict(lambda: [])
        for obj in new_objects:
            new_object_groups[obj[0]].append({
                'label': obj[0],
                'score': obj[1],
                'box': obj[2],
                'region': obj[3]
            })
        
        # track objects for each label type
        for label, group in new_object_groups.items():
            current_objects = [o for o in self.tracked_objects.values() if o['label'] == label]
            current_ids = [o['id'] for o in current_objects]
            current_centroids = np.array([o['centroid'] for o in current_objects])

            # compute centroids of new objects
            for obj in group:
                centroid_x = int((obj['box'][0]+obj['box'][2]) / 2.0)
                centroid_y = int((obj['box'][1]+obj['box'][3]) / 2.0)
                obj['centroid'] = (centroid_x, centroid_y)

            if len(current_objects) == 0:
                for index, obj in enumerate(group):
                    self.register(index, frame_time, obj)
                return
            
            new_centroids = np.array([o['centroid'] for o in group])

            # compute the distance between each pair of tracked
            # centroids and new centroids, respectively -- our
            # goal will be to match each new centroid to an existing
            # object centroid
            D = dist.cdist(current_centroids, new_centroids)

            # in order to perform this matching we must (1) find the
            # smallest value in each row and then (2) sort the row
            # indexes based on their minimum values so that the row
            # with the smallest value is at the *front* of the index
            # list
            rows = D.min(axis=1).argsort()

            # next, we perform a similar process on the columns by
            # finding the smallest value in each column and then
            # sorting using the previously computed row index list
            cols = D.argmin(axis=1)[rows]

            # in order to determine if we need to update, register,
            # or deregister an object we need to keep track of which
            # of the rows and column indexes we have already examined
            usedRows = set()
            usedCols = set()

            # loop over the combination of the (row, column) index
            # tuples
            for (row, col) in zip(rows, cols):
                # if we have already examined either the row or
                # column value before, ignore it
                if row in usedRows or col in usedCols:
                    continue

                # otherwise, grab the object ID for the current row,
                # set its new centroid, and reset the disappeared
                # counter
                objectID = current_ids[row]
                self.update(objectID, group[col])

                # indicate that we have examined each of the row and
                # column indexes, respectively
                usedRows.add(row)
                usedCols.add(col)

            # compute the column index we have NOT yet examined
            unusedRows = set(range(0, D.shape[0])).difference(usedRows)
            unusedCols = set(range(0, D.shape[1])).difference(usedCols)

            # in the event that the number of object centroids is
			# equal or greater than the number of input centroids
			# we need to check and see if some of these objects have
			# potentially disappeared
            if D.shape[0] >= D.shape[1]:
                for row in unusedRows:
                    id = current_ids[row]

                    if self.disappeared[id] >= self.max_disappeared:
                        self.deregister(id)
                    else:
                        self.disappeared[id] += 1
            # if the number of input centroids is greater
            # than the number of existing object centroids we need to
            # register each new input centroid as a trackable object
            else:
                for col in unusedCols:
                    self.register(col, frame_time, group[col])

def main():
    frames = 0
    # frame_queue = queue.Queue(maxsize=5)
    # frame_cache = {}
    frame_shape = (1080,1920,3)
    # frame_shape = (720,1280,3)
    frame_size = frame_shape[0]*frame_shape[1]*frame_shape[2]
    frame = np.zeros(frame_shape, np.uint8)
    motion_detector = MotionDetector(frame_shape, resize_factor=6)
    # object_detector = ObjectDetector('/lab/mobilenet_ssd_v2_coco_quant_postprocess_edgetpu.tflite', '/lab/labelmap.txt')
    # object_detector = RemoteObjectDetector('/lab/mobilenet_ssd_v2_coco_quant_postprocess_edgetpu.tflite', '/lab/labelmap.txt')
    # object_detector = ObjectDetector('/lab/detect.tflite', '/lab/labelmap.txt')
    object_detector = RemoteObjectDetector('/lab/detect.tflite', '/lab/labelmap.txt')
    object_tracker = ObjectTracker(10)

    # f = open('/debug/input/back.rgb24', 'rb')
    # f = open('/debug/back.raw_video', 'rb')
    # f = open('/debug/ali-jake.raw_video', 'rb')

    # -hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format yuv420p -i output.mp4 -f rawvideo -pix_fmt rgb24 pipe:
    ffmpeg_cmd = (['ffmpeg'] +
            ['-hide_banner','-loglevel','panic'] +
            # ['-hwaccel','vaapi','-hwaccel_device','/dev/dri/renderD129','-hwaccel_output_format','yuv420p'] +
            # ['-i', '/debug/input/output.mp4'] +
            ['-i', '/lab/debug/back-night.mp4'] +
            ['-f','rawvideo','-pix_fmt','rgb24'] +
            ['pipe:'])

    print(" ".join(ffmpeg_cmd))
    
    ffmpeg_process = sp.Popen(ffmpeg_cmd, stdout = sp.PIPE, bufsize=frame_size)

    total_detections = 0
    start = datetime.datetime.now().timestamp()
    frame_times = []
    while True:

        start_frame = datetime.datetime.now().timestamp()
        frame_detections = 0
        frame_bytes = ffmpeg_process.stdout.read(frame_size)
        if not frame_bytes:
            break
        frame_time = datetime.datetime.now().timestamp()
        
        # Store frame in numpy array
        frame[:] = (np
                    .frombuffer(frame_bytes, np.uint8)
                    .reshape(frame_shape))
        frames += 1
        
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
            frame_detections += 1

            for d in region_detections:
                if filtered(d):
                    continue
                box = d[2]
                size = region[2]-region[0]
                x_min = int((box[1] * size) + region[0])
                y_min = int((box[0] * size) + region[1])
                x_max = int((box[3] * size) + region[0])
                y_max = int((box[2] * size) + region[1])
                detections.append((
                    d[0],
                    d[1],
                    (x_min, y_min, x_max, y_max),
                    region))

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
                    if clipped(obj, frame_shape): #obj['clipped']:
                        box = obj[2]
                        # calculate a new region that will hopefully get the entire object
                        region = calculate_region(frame_shape, 
                            box[0], box[1],
                            box[2], box[3])
                        
                        tensor_input = create_tensor_input(frame, region)
                        # run detection on new region
                        refined_detections = object_detector.detect(tensor_input)
                        frame_detections += 1
                        for d in refined_detections:
                            if filtered(d):
                                continue
                            box = d[2]
                            size = region[2]-region[0]
                            x_min = int((box[1] * size) + region[0])
                            y_min = int((box[0] * size) + region[1])
                            x_max = int((box[3] * size) + region[0])
                            y_max = int((box[2] * size) + region[1])
                            selected_objects.append((
                                d[0],
                                d[1],
                                (x_min, y_min, x_max, y_max),
                                region))

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

        total_detections += frame_detections
        frame_times.append(datetime.datetime.now().timestamp()-start_frame)

        # if (frames >= 700 and frames <= 1635) or (frames >= 2500):
        # if (frames >= 300 and frames <= 600):
        if (frames >= 0):
            # row1 = cv2.hconcat([gray, cv2.convertScaleAbs(avg_frame)])
            # row2 = cv2.hconcat([frameDelta, thresh])
            # cv2.imwrite(f"/lab/debug/output/{frames}.jpg", cv2.vconcat([row1, row2]))
            # # cv2.imwrite(f"/lab/debug/output/resized-frame-{frames}.jpg", resized_frame)
            # for region in motion_regions:
            #     cv2.rectangle(frame, (region[0], region[1]), (region[2], region[3]), (255,128,0), 2)
            # for region in object_regions:
            #     cv2.rectangle(frame, (region[0], region[1]), (region[2], region[3]), (0,128,255), 2)
            for region in merged_regions:
                cv2.rectangle(frame, (region[0], region[1]), (region[2], region[3]), (0,255,0), 2)
            for box in motion_boxes:
                cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), (255,0,0), 2)
            for detection in detections:
                box = detection[2]
                draw_box_with_label(frame, box[0], box[1], box[2], box[3], detection[0], f"{detection[1]*100}%")
            for obj in object_tracker.tracked_objects.values():
                box = obj['box']
                draw_box_with_label(frame, box[0], box[1], box[2], box[3], obj['label'], obj['id'], thickness=1, color=(0,0,255), position='bl')
            cv2.putText(frame, str(total_detections), (10, 10), cv2.FONT_HERSHEY_SIMPLEX, fontScale=0.5, color=(0, 0, 0), thickness=2)
            cv2.putText(frame, str(frame_detections), (10, 30), cv2.FONT_HERSHEY_SIMPLEX, fontScale=0.5, color=(0, 0, 0), thickness=2)
            cv2.imwrite(f"/lab/debug/output/frame-{frames}.jpg", frame)
            # break

    duration = datetime.datetime.now().timestamp()-start
    print(f"Processed {frames} frames for {duration:.2f} seconds and {(frames/duration):.2f} FPS.")
    print(f"Total detections: {total_detections}")
    print(f"Average frame processing time: {mean(frame_times)*1000:.2f}ms")

if __name__ == '__main__':
    main()