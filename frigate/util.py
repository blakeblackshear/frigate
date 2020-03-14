import datetime
import time
import signal
import traceback
import collections
import numpy as np
import cv2
import threading
import matplotlib.pyplot as plt
import hashlib
import pyarrow.plasma as plasma

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
    region = obj[4]
    if ((region[0] > 5 and box[0]-region[0] <= 5) or 
        (region[1] > 5 and box[1]-region[1] <= 5) or
        (frame_shape[1]-region[2] > 5 and region[2]-box[2] <= 5) or
        (frame_shape[0]-region[3] > 5 and region[3]-box[3] <= 5)):
        return True
    else:
        return False

class EventsPerSecond:
    def __init__(self, max_events=1000):
        self._start = None
        self._max_events = max_events
        self._timestamps = []
    
    def start(self):
        self._start = datetime.datetime.now().timestamp()

    def update(self):
        self._timestamps.append(datetime.datetime.now().timestamp())
        # truncate the list when it goes 100 over the max_size
        if len(self._timestamps) > self._max_events+100:
            self._timestamps = self._timestamps[(1-self._max_events):]

    def eps(self, last_n_seconds=10):
		# compute the (approximate) events in the last n seconds
        now = datetime.datetime.now().timestamp()
        seconds = min(now-self._start, last_n_seconds)
        return len([t for t in self._timestamps if t > (now-last_n_seconds)]) / seconds

def print_stack(sig, frame):
    traceback.print_stack(frame)

def listen():
    signal.signal(signal.SIGUSR1, print_stack)

class PlasmaManager:
    def __init__(self):
        self.connect()
    
    def connect(self):
        while True:
            try:
                self.plasma_client = plasma.connect("/tmp/plasma")
                return
            except:
                print(f"TrackedObjectProcessor: unable to connect plasma client")
                time.sleep(10)

    def get(self, name, timeout_ms=0):
        object_id = plasma.ObjectID(hashlib.sha1(str.encode(name)).digest())
        while True:
            try:
                return self.plasma_client.get(object_id, timeout_ms=timeout_ms)
            except:
                self.connect()
                time.sleep(1)

    def put(self, name, obj):
        object_id = plasma.ObjectID(hashlib.sha1(str.encode(name)).digest())
        while True:
            try:
                self.plasma_client.put(obj, object_id)
                return
            except Exception as e:
                print(f"Failed to put in plasma: {e}")
                self.connect()
                time.sleep(1)

    def delete(self, name):
        object_id = plasma.ObjectID(hashlib.sha1(str.encode(name)).digest())
        while True:
            try:
                self.plasma_client.delete([object_id])
                return
            except:
                self.connect()
                time.sleep(1)