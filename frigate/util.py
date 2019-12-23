import datetime
import collections
import numpy as np
import cv2
import threading
import matplotlib.pyplot as plt

# Function to read labels from text files.
def ReadLabelFile(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()
    ret = {}
    for line in lines:
        pair = line.strip().split(maxsplit=1)
        ret[int(pair[0])] = pair[1].strip()
    return ret

def calculate_region(frame_shape, xmin, ymin, xmax, ymax):    
    # size is 50% larger than longest edge
    size = max(xmax-xmin, ymax-ymin)
    # if the size is too big to fit in the frame
    if size > min(frame_shape[0], frame_shape[1]):
        size = min(frame_shape[0], frame_shape[1])

    # x_offset is midpoint of bounding box minus half the size
    x_offset = int(((xmax-xmin)/2+xmin)-size/2)
    # if outside the image
    if x_offset < 0:
        x_offset = 0
    elif x_offset > (frame_shape[1]-size):
        x_offset = (frame_shape[1]-size)

    # x_offset is midpoint of bounding box minus half the size
    y_offset = int(((ymax-ymin)/2+ymin)-size/2)
    # if outside the image
    if y_offset < 0:
        y_offset = 0
    elif y_offset > (frame_shape[0]-size):
        y_offset = (frame_shape[0]-size)

    return (size, x_offset, y_offset)

# convert shared memory array into numpy array
def tonumpyarray(mp_arr):
    return np.frombuffer(mp_arr.get_obj(), dtype=np.uint8)

def draw_box_with_label(frame, x_min, y_min, x_max, y_max, label, score, area):
    color = COLOR_MAP[label]
    display_text = "{}: {}% {}".format(label,int(score*100),int(area))
    cv2.rectangle(frame, (x_min, y_min), 
        (x_max, y_max), 
        color, 2)
    font_scale = 0.5
    font = cv2.FONT_HERSHEY_SIMPLEX
    # get the width and height of the text box
    size = cv2.getTextSize(display_text, font, fontScale=font_scale, thickness=2)
    text_width = size[0][0]
    text_height = size[0][1]
    line_height = text_height + size[1]
    # set the text start position
    text_offset_x = x_min
    text_offset_y = 0 if y_min < line_height else y_min - (line_height+8)
    # make the coords of the box with a small padding of two pixels
    textbox_coords = ((text_offset_x, text_offset_y), (text_offset_x + text_width + 2, text_offset_y + line_height))
    cv2.rectangle(frame, textbox_coords[0], textbox_coords[1], color, cv2.FILLED)
    cv2.putText(frame, display_text, (text_offset_x, text_offset_y + line_height - 3), font, fontScale=font_scale, color=(0, 0, 0), thickness=2)

# Path to frozen detection graph. This is the actual model that is used for the object detection.
PATH_TO_CKPT = '/frozen_inference_graph.pb'
# List of the strings that is used to add correct label for each box.
PATH_TO_LABELS = '/label_map.pbtext'

LABELS = ReadLabelFile(PATH_TO_LABELS)
cmap = plt.cm.get_cmap('tab10', len(LABELS.keys()))

COLOR_MAP = {}
for key, val in LABELS.items():
    COLOR_MAP[val] = tuple(int(round(255 * c)) for c in cmap(key)[:3])

class QueueMerger():
    def __init__(self, from_queues, to_queue):
        self.from_queues = from_queues
        self.to_queue = to_queue
        self.merge_threads = []

    def start(self):
        for from_q in self.from_queues:
            self.merge_threads.append(QueueTransfer(from_q,self.to_queue))

class QueueTransfer(threading.Thread):
    def __init__(self, from_queue, to_queue):
        threading.Thread.__init__(self)
        self.from_queue = from_queue
        self.to_queue = to_queue

    def run(self):
        while True:
            self.to_queue.put(self.from_queue.get())

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
