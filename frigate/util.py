from abc import ABC, abstractmethod
import datetime
from io import UnsupportedOperation
import time
import signal
import traceback
import collections
import numpy as np
import cv2
import threading
import matplotlib.pyplot as plt
import hashlib
from multiprocessing import shared_memory
from typing import AnyStr, Optional, Tuple

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
    # dont go any smaller than 300
    if size < 300:
        size = 300
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

def yuv_region_2_rgb(frame, region):
    height = frame.shape[0]//3*2
    width = frame.shape[1]
    # make sure the size is a multiple of 4
    size = (region[3] - region[1])//4*4

    x1 = region[0] 
    y1 = region[1]

    uv_x1 = x1//2
    uv_y1 = y1//4

    uv_width = size//2
    uv_height = size//4

    u_y_start = height
    v_y_start = height + height//4
    two_x_offset = width//2

    yuv_cropped_frame = np.zeros((size+size//2, size), np.uint8)
    # y channel
    yuv_cropped_frame[0:size, 0:size] = frame[y1:y1+size, x1:x1+size]
    # u channel
    yuv_cropped_frame[size:size+uv_height, 0:uv_width] = frame[uv_y1+u_y_start:uv_y1+u_y_start+uv_height, uv_x1:uv_x1+uv_width]
    yuv_cropped_frame[size:size+uv_height, uv_width:size] = frame[uv_y1+u_y_start:uv_y1+u_y_start+uv_height, uv_x1+two_x_offset:uv_x1+two_x_offset+uv_width]
    # v channel
    yuv_cropped_frame[size+uv_height:size+uv_height*2, 0:uv_width] = frame[uv_y1+v_y_start:uv_y1+v_y_start+uv_height, uv_x1:uv_x1+uv_width]
    yuv_cropped_frame[size+uv_height:size+uv_height*2, uv_width:size] = frame[uv_y1+v_y_start:uv_y1+v_y_start+uv_height, uv_x1+two_x_offset:uv_x1+two_x_offset+uv_width]

    return cv2.cvtColor(yuv_cropped_frame, cv2.COLOR_YUV2RGB_I420)

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
        if self._start is None:
            self.start()
        self._timestamps.append(datetime.datetime.now().timestamp())
        # truncate the list when it goes 100 over the max_size
        if len(self._timestamps) > self._max_events+100:
            self._timestamps = self._timestamps[(1-self._max_events):]

    def eps(self, last_n_seconds=10):
        if self._start is None:
            self.start()
		# compute the (approximate) events in the last n seconds
        now = datetime.datetime.now().timestamp()
        seconds = min(now-self._start, last_n_seconds)
        return len([t for t in self._timestamps if t > (now-last_n_seconds)]) / seconds

def print_stack(sig, frame):
    traceback.print_stack(frame)

def listen():
    signal.signal(signal.SIGUSR1, print_stack)

class FrameManager(ABC):
    @abstractmethod
    def create(self, name, size) -> AnyStr:
        pass

    @abstractmethod
    def get(self, name, timeout_ms=0):
        pass

    @abstractmethod
    def close(self, name):
        pass

    @abstractmethod
    def delete(self, name):
        pass

class DictFrameManager(FrameManager):
    def __init__(self):
        self.frames = {}
    
    def create(self, name, size) -> AnyStr:
        mem = bytearray(size)
        self.frames[name] = mem
        return mem
    
    def get(self, name, shape):
        mem = self.frames[name]
        return np.ndarray(shape, dtype=np.uint8, buffer=mem)
    
    def close(self, name):
        pass
    
    def delete(self, name):
        del self.frames[name]

class SharedMemoryFrameManager(FrameManager):

    """Initialize a SharedMemoryFrameManager.
        Frames are stored as SharedMemory segments, named <name>_<slot>
        The first byte of each slot represents whether the segment is "freed".
        0 means the segment is free and available for use
        Any other value means the segment is in use.
    
    Args:
        name: The name of the instance to open.
            If not set, a name argument *must* be passed in to each operation.
        size: The size of frames created by this frame manager. 
            If not set, the frame manager will be read only.
    """ 
    def __init__(self, name: Optional[str] = None, size : Optional[int]= None):
        # list of opened shms
        self.shm_lists = {}
        # If name is set, create the dict for the default namespace
        self.shm_lists[name] = {}
        self.name = name
        self.size = size
    
    """Create a new frame.

    Returns:
        A tuple containing the allocated frame id and the frame itself.

    Raises:
        UnsupportedOperation: If the size of the frame manager is not set.
    """
    def create(self, name = None) -> Tuple[int, AnyStr]:

        if name is None:
            name = self.name

        if name is None:
            raise UnsupportedOperation("Cannot create without name")

        if self.size is None:
            raise UnsupportedOperation("Cannot create new frame without size set")
        
        if name not in self.shm_lists:
            self.shm_lists[name] = {}

        shm_list = self.shm_lists[name]
        # Check if we have any free SHMs in our list
        for idx in shm_list:
            shm = shm_list[idx]
            if shm.buf[0] == 0:
                shm.buf[0] = 1
                return idx, shm.buf[1:]

        # No free SHMs. Try to create a new SHM.
        # We'll start after the maximum index, but this may create a sparse list.
        # Having a sparse list shouldn't really matter though.
        idx = 0 if not shm_list else max(shm_list) + 1

        while True:
            try:
                shm = shared_memory.SharedMemory(name=f"{self.name}_{idx}", create=True, size=self.size+1)
                shm.buf[0] = 1
                shm_list[idx] = shm
                return idx, shm.buf[1:]
            except FileExistsError:
                # The SHM already exists. Return it if it is free.
                shm = shared_memory.SharedMemory(name=f"{self.name}_{idx}")
                if (shm.buf[0] == 0):
                    shm.buf[0] = 1
                    shm_list[idx] = shm
                    return idx, shm.buf[1:]
                # It's locked, so we move to the next idx.
                idx = idx + 1

    """ Get an existing frame.

    Args:
        shape: The shape of the resulting numpy array
        index: The index number of the frame to get.
               If the index is not set, fetches the shm with <name>.

    Returns:
        A numpy array with the frame.
    """
    def get(self, shape, index : Optional[int] = None, name : Optional[str] = None):
        if name is None:
            name = self.name

        if name is None:
            raise UnsupportedOperation("Cannot get without name")

        # If the shm isn't already open
        if name not in self.shm_lists:
            self.shm_lists[name] = {}
        shm_list = self.shm_lists[name]

        if index is None:
            index = -1  # special value for "root" index
        if index not in shm_list:
            # The shm isn't open yet, so open it and cache it in our list
            memory_name = name if index == -1 else f"{name}_{index}"
            shm = shared_memory.SharedMemory(name=memory_name)
            shm_list[index] = shm
        else:
            shm = shm_list[index]
        
        buffer = shm.buf if index is -1 else shm.buf[1:]
        return np.ndarray(shape, dtype=np.uint8, buffer=buffer)

    """ Close the frame, freeing it for reuse.
    
    Args:
        index: The index number of the frame to free.
    """
    def close(self, index : int, name : Optional[str] = None):
        if name is None:
            name = self.name

        if name is None:
            raise UnsupportedOperation("Cannot close without name")
        self.shm_lists[name][index].buf[0] = 0

    def delete(self, name):
        ### will be deprecated
        if name in self.shm_store:
            self.shm_store[name].close()
            self.shm_store[name].unlink()
            del self.shm_store[name]