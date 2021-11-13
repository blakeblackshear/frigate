import collections
import copy
import datetime
import hashlib
import json
import logging
import math
import signal
import subprocess as sp
import threading
import time
import traceback
from abc import ABC, abstractmethod
from multiprocessing import shared_memory
from typing import AnyStr

import cv2
import matplotlib.pyplot as plt
import numpy as np
import os
import psutil

logger = logging.getLogger(__name__)


def deep_merge(dct1: dict, dct2: dict, override=False, merge_lists=False) -> dict:
    """
    :param dct1: First dict to merge
    :param dct2: Second dict to merge
    :param override: if same key exists in both dictionaries, should override? otherwise ignore. (default=True)
    :return: The merge dictionary
    """
    merged = copy.deepcopy(dct1)
    for k, v2 in dct2.items():
        if k in merged:
            v1 = merged[k]
            if isinstance(v1, dict) and isinstance(v2, collections.Mapping):
                merged[k] = deep_merge(v1, v2, override)
            elif isinstance(v1, list) and isinstance(v2, list):
                if merge_lists:
                    merged[k] = v1 + v2
            else:
                if override:
                    merged[k] = copy.deepcopy(v2)
        else:
            merged[k] = copy.deepcopy(v2)
    return merged


def draw_timestamp(
    frame,
    timestamp,
    timestamp_format,
    font_effect=None,
    font_thickness=2,
    font_color=(255, 255, 255),
    position="tl",
):
    time_to_show = datetime.datetime.fromtimestamp(timestamp).strftime(timestamp_format)

    # calculate a dynamic font size
    size = cv2.getTextSize(
        time_to_show,
        cv2.FONT_HERSHEY_SIMPLEX,
        fontScale=1.0,
        thickness=font_thickness,
    )

    text_width = size[0][0]
    desired_size = max(150, 0.33 * frame.shape[1])
    font_scale = desired_size / text_width

    # calculate the actual size with the dynamic scale
    size = cv2.getTextSize(
        time_to_show,
        cv2.FONT_HERSHEY_SIMPLEX,
        fontScale=font_scale,
        thickness=font_thickness,
    )

    image_width = frame.shape[1]
    image_height = frame.shape[0]
    text_width = size[0][0]
    text_height = size[0][1]
    line_height = text_height + size[1]

    if position == "tl":
        text_offset_x = 0
        text_offset_y = 0 if 0 < line_height else 0 - (line_height + 8)
    elif position == "tr":
        text_offset_x = image_width - text_width
        text_offset_y = 0 if 0 < line_height else 0 - (line_height + 8)
    elif position == "bl":
        text_offset_x = 0
        text_offset_y = image_height - (line_height + 8)
    elif position == "br":
        text_offset_x = image_width - text_width
        text_offset_y = image_height - (line_height + 8)

    if font_effect == "solid":
        # make the coords of the box with a small padding of two pixels
        timestamp_box_coords = np.array(
            [
                [text_offset_x, text_offset_y],
                [text_offset_x + text_width, text_offset_y],
                [text_offset_x + text_width, text_offset_y + line_height + 8],
                [text_offset_x, text_offset_y + line_height + 8],
            ]
        )

        cv2.fillPoly(
            frame,
            [timestamp_box_coords],
            # inverse color of text for background for max. contrast
            (255 - font_color[0], 255 - font_color[1], 255 - font_color[2]),
        )
    elif font_effect == "shadow":
        cv2.putText(
            frame,
            time_to_show,
            (text_offset_x + 3, text_offset_y + line_height),
            cv2.FONT_HERSHEY_SIMPLEX,
            fontScale=font_scale,
            color=(255 - font_color[0], 255 - font_color[1], 255 - font_color[2]),
            thickness=font_thickness,
        )

    cv2.putText(
        frame,
        time_to_show,
        (text_offset_x, text_offset_y + line_height - 3),
        cv2.FONT_HERSHEY_SIMPLEX,
        fontScale=font_scale,
        color=font_color,
        thickness=font_thickness,
    )


def draw_box_with_label(
    frame,
    x_min,
    y_min,
    x_max,
    y_max,
    label,
    info,
    thickness=2,
    color=None,
    position="ul",
):
    if color is None:
        color = (0, 0, 255)
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
    if position == "ul":
        text_offset_x = x_min
        text_offset_y = 0 if y_min < line_height else y_min - (line_height + 8)
    elif position == "ur":
        text_offset_x = x_max - (text_width + 8)
        text_offset_y = 0 if y_min < line_height else y_min - (line_height + 8)
    elif position == "bl":
        text_offset_x = x_min
        text_offset_y = y_max
    elif position == "br":
        text_offset_x = x_max - (text_width + 8)
        text_offset_y = y_max
    # make the coords of the box with a small padding of two pixels
    textbox_coords = (
        (text_offset_x, text_offset_y),
        (text_offset_x + text_width + 2, text_offset_y + line_height),
    )
    cv2.rectangle(frame, textbox_coords[0], textbox_coords[1], color, cv2.FILLED)
    cv2.putText(
        frame,
        display_text,
        (text_offset_x, text_offset_y + line_height - 3),
        font,
        fontScale=font_scale,
        color=(0, 0, 0),
        thickness=2,
    )


def calculate_region(frame_shape, xmin, ymin, xmax, ymax, multiplier=2):
    # size is the longest edge and divisible by 4
    size = int((max(xmax - xmin, ymax - ymin) * multiplier) // 4 * 4)
    # dont go any smaller than 300
    if size < 300:
        size = 300

    # x_offset is midpoint of bounding box minus half the size
    x_offset = int((xmax - xmin) / 2.0 + xmin - size / 2.0)
    # if outside the image
    if x_offset < 0:
        x_offset = 0
    elif x_offset > (frame_shape[1] - size):
        x_offset = max(0, (frame_shape[1] - size))

    # y_offset is midpoint of bounding box minus half the size
    y_offset = int((ymax - ymin) / 2.0 + ymin - size / 2.0)
    # # if outside the image
    if y_offset < 0:
        y_offset = 0
    elif y_offset > (frame_shape[0] - size):
        y_offset = max(0, (frame_shape[0] - size))

    return (x_offset, y_offset, x_offset + size, y_offset + size)


def get_yuv_crop(frame_shape, crop):
    # crop should be (x1,y1,x2,y2)
    frame_height = frame_shape[0] // 3 * 2
    frame_width = frame_shape[1]

    # compute the width/height of the uv channels
    uv_width = frame_width // 2  # width of the uv channels
    uv_height = frame_height // 4  # height of the uv channels

    # compute the offset for upper left corner of the uv channels
    uv_x_offset = crop[0] // 2  # x offset of the uv channels
    uv_y_offset = crop[1] // 4  # y offset of the uv channels

    # compute the width/height of the uv crops
    uv_crop_width = (crop[2] - crop[0]) // 2  # width of the cropped uv channels
    uv_crop_height = (crop[3] - crop[1]) // 4  # height of the cropped uv channels

    # ensure crop dimensions are multiples of 2 and 4
    y = (crop[0], crop[1], crop[0] + uv_crop_width * 2, crop[1] + uv_crop_height * 4)

    u1 = (
        0 + uv_x_offset,
        frame_height + uv_y_offset,
        0 + uv_x_offset + uv_crop_width,
        frame_height + uv_y_offset + uv_crop_height,
    )

    u2 = (
        uv_width + uv_x_offset,
        frame_height + uv_y_offset,
        uv_width + uv_x_offset + uv_crop_width,
        frame_height + uv_y_offset + uv_crop_height,
    )

    v1 = (
        0 + uv_x_offset,
        frame_height + uv_height + uv_y_offset,
        0 + uv_x_offset + uv_crop_width,
        frame_height + uv_height + uv_y_offset + uv_crop_height,
    )

    v2 = (
        uv_width + uv_x_offset,
        frame_height + uv_height + uv_y_offset,
        uv_width + uv_x_offset + uv_crop_width,
        frame_height + uv_height + uv_y_offset + uv_crop_height,
    )

    return y, u1, u2, v1, v2


def yuv_crop_and_resize(frame, region, height=None):
    # Crops and resizes a YUV frame while maintaining aspect ratio
    # https://stackoverflow.com/a/57022634
    height = frame.shape[0] // 3 * 2
    width = frame.shape[1]

    # get the crop box if the region extends beyond the frame
    crop_x1 = max(0, region[0])
    crop_y1 = max(0, region[1])
    # ensure these are a multiple of 4
    crop_x2 = min(width, region[2])
    crop_y2 = min(height, region[3])
    crop_box = (crop_x1, crop_y1, crop_x2, crop_y2)

    y, u1, u2, v1, v2 = get_yuv_crop(frame.shape, crop_box)

    # if the region starts outside the frame, indent the start point in the cropped frame
    y_channel_x_offset = abs(min(0, region[0]))
    y_channel_y_offset = abs(min(0, region[1]))

    uv_channel_x_offset = y_channel_x_offset // 2
    uv_channel_y_offset = y_channel_y_offset // 4

    # create the yuv region frame
    # make sure the size is a multiple of 4
    # TODO: this should be based on the size after resize now
    size = (region[3] - region[1]) // 4 * 4
    yuv_cropped_frame = np.zeros((size + size // 2, size), np.uint8)
    # fill in black
    yuv_cropped_frame[:] = 128
    yuv_cropped_frame[0:size, 0:size] = 16

    # copy the y channel
    yuv_cropped_frame[
        y_channel_y_offset : y_channel_y_offset + y[3] - y[1],
        y_channel_x_offset : y_channel_x_offset + y[2] - y[0],
    ] = frame[y[1] : y[3], y[0] : y[2]]

    uv_crop_width = u1[2] - u1[0]
    uv_crop_height = u1[3] - u1[1]

    # copy u1
    yuv_cropped_frame[
        size + uv_channel_y_offset : size + uv_channel_y_offset + uv_crop_height,
        0 + uv_channel_x_offset : 0 + uv_channel_x_offset + uv_crop_width,
    ] = frame[u1[1] : u1[3], u1[0] : u1[2]]

    # copy u2
    yuv_cropped_frame[
        size + uv_channel_y_offset : size + uv_channel_y_offset + uv_crop_height,
        size // 2
        + uv_channel_x_offset : size // 2
        + uv_channel_x_offset
        + uv_crop_width,
    ] = frame[u2[1] : u2[3], u2[0] : u2[2]]

    # copy v1
    yuv_cropped_frame[
        size
        + size // 4
        + uv_channel_y_offset : size
        + size // 4
        + uv_channel_y_offset
        + uv_crop_height,
        0 + uv_channel_x_offset : 0 + uv_channel_x_offset + uv_crop_width,
    ] = frame[v1[1] : v1[3], v1[0] : v1[2]]

    # copy v2
    yuv_cropped_frame[
        size
        + size // 4
        + uv_channel_y_offset : size
        + size // 4
        + uv_channel_y_offset
        + uv_crop_height,
        size // 2
        + uv_channel_x_offset : size // 2
        + uv_channel_x_offset
        + uv_crop_width,
    ] = frame[v2[1] : v2[3], v2[0] : v2[2]]

    return yuv_cropped_frame


def copy_yuv_to_position(
    destination_frame,
    destination_offset,
    destination_shape,
    source_frame=None,
    source_channel_dim=None,
):
    # get the coordinates of the channels for this position in the layout
    y, u1, u2, v1, v2 = get_yuv_crop(
        destination_frame.shape,
        (
            destination_offset[1],
            destination_offset[0],
            destination_offset[1] + destination_shape[1],
            destination_offset[0] + destination_shape[0],
        ),
    )

    # clear y
    destination_frame[
        y[1] : y[3],
        y[0] : y[2],
    ] = 16

    # clear u1
    destination_frame[u1[1] : u1[3], u1[0] : u1[2]] = 128
    # clear u2
    destination_frame[u2[1] : u2[3], u2[0] : u2[2]] = 128
    # clear v1
    destination_frame[v1[1] : v1[3], v1[0] : v1[2]] = 128
    # clear v2
    destination_frame[v2[1] : v2[3], v2[0] : v2[2]] = 128

    if not source_frame is None:
        # calculate the resized frame, maintaining the aspect ratio
        source_aspect_ratio = source_frame.shape[1] / (source_frame.shape[0] // 3 * 2)
        dest_aspect_ratio = destination_shape[1] / destination_shape[0]

        if source_aspect_ratio <= dest_aspect_ratio:
            y_resize_height = int(destination_shape[0] // 4 * 4)
            y_resize_width = int((y_resize_height * source_aspect_ratio) // 4 * 4)
        else:
            y_resize_width = int(destination_shape[1] // 4 * 4)
            y_resize_height = int((y_resize_width / source_aspect_ratio) // 4 * 4)

        uv_resize_width = int(y_resize_width // 2)
        uv_resize_height = int(y_resize_height // 4)

        y_y_offset = int((destination_shape[0] - y_resize_height) / 4 // 4 * 4)
        y_x_offset = int((destination_shape[1] - y_resize_width) / 2 // 4 * 4)

        uv_y_offset = y_y_offset // 4
        uv_x_offset = y_x_offset // 2

        interpolation = cv2.INTER_LINEAR
        # resize/copy y channel
        destination_frame[
            y[1] + y_y_offset : y[1] + y_y_offset + y_resize_height,
            y[0] + y_x_offset : y[0] + y_x_offset + y_resize_width,
        ] = cv2.resize(
            source_frame[
                source_channel_dim["y"][1] : source_channel_dim["y"][3],
                source_channel_dim["y"][0] : source_channel_dim["y"][2],
            ],
            dsize=(y_resize_width, y_resize_height),
            interpolation=interpolation,
        )

        # resize/copy u1
        destination_frame[
            u1[1] + uv_y_offset : u1[1] + uv_y_offset + uv_resize_height,
            u1[0] + uv_x_offset : u1[0] + uv_x_offset + uv_resize_width,
        ] = cv2.resize(
            source_frame[
                source_channel_dim["u1"][1] : source_channel_dim["u1"][3],
                source_channel_dim["u1"][0] : source_channel_dim["u1"][2],
            ],
            dsize=(uv_resize_width, uv_resize_height),
            interpolation=interpolation,
        )
        # resize/copy u2
        destination_frame[
            u2[1] + uv_y_offset : u2[1] + uv_y_offset + uv_resize_height,
            u2[0] + uv_x_offset : u2[0] + uv_x_offset + uv_resize_width,
        ] = cv2.resize(
            source_frame[
                source_channel_dim["u2"][1] : source_channel_dim["u2"][3],
                source_channel_dim["u2"][0] : source_channel_dim["u2"][2],
            ],
            dsize=(uv_resize_width, uv_resize_height),
            interpolation=interpolation,
        )
        # resize/copy v1
        destination_frame[
            v1[1] + uv_y_offset : v1[1] + uv_y_offset + uv_resize_height,
            v1[0] + uv_x_offset : v1[0] + uv_x_offset + uv_resize_width,
        ] = cv2.resize(
            source_frame[
                source_channel_dim["v1"][1] : source_channel_dim["v1"][3],
                source_channel_dim["v1"][0] : source_channel_dim["v1"][2],
            ],
            dsize=(uv_resize_width, uv_resize_height),
            interpolation=interpolation,
        )
        # resize/copy v2
        destination_frame[
            v2[1] + uv_y_offset : v2[1] + uv_y_offset + uv_resize_height,
            v2[0] + uv_x_offset : v2[0] + uv_x_offset + uv_resize_width,
        ] = cv2.resize(
            source_frame[
                source_channel_dim["v2"][1] : source_channel_dim["v2"][3],
                source_channel_dim["v2"][0] : source_channel_dim["v2"][2],
            ],
            dsize=(uv_resize_width, uv_resize_height),
            interpolation=interpolation,
        )


def yuv_region_2_rgb(frame, region):
    try:
        # TODO: does this copy the numpy array?
        yuv_cropped_frame = yuv_crop_and_resize(frame, region)
        return cv2.cvtColor(yuv_cropped_frame, cv2.COLOR_YUV2RGB_I420)
    except:
        print(f"frame.shape: {frame.shape}")
        print(f"region: {region}")
        raise


def intersection(box_a, box_b):
    return (
        max(box_a[0], box_b[0]),
        max(box_a[1], box_b[1]),
        min(box_a[2], box_b[2]),
        min(box_a[3], box_b[3]),
    )


def area(box):
    return (box[2] - box[0] + 1) * (box[3] - box[1] + 1)


def intersection_over_union(box_a, box_b):
    # determine the (x, y)-coordinates of the intersection rectangle
    intersect = intersection(box_a, box_b)

    # compute the area of intersection rectangle
    inter_area = max(0, intersect[2] - intersect[0] + 1) * max(
        0, intersect[3] - intersect[1] + 1
    )

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
    if (
        (region[0] > 5 and box[0] - region[0] <= 5)
        or (region[1] > 5 and box[1] - region[1] <= 5)
        or (frame_shape[1] - region[2] > 5 and region[2] - box[2] <= 5)
        or (frame_shape[0] - region[3] > 5 and region[3] - box[3] <= 5)
    ):
        return True
    else:
        return False


def restart_frigate():
    proc = psutil.Process(1)
    # if this is running via s6, sigterm pid 1
    if proc.name() == "s6-svscan":
        proc.terminate()
    # otherwise, just try and exit frigate
    else:
        os.kill(os.getpid(), signal.SIGTERM)


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
        if len(self._timestamps) > self._max_events + 100:
            self._timestamps = self._timestamps[(1 - self._max_events) :]

    def eps(self, last_n_seconds=10):
        if self._start is None:
            self.start()
        # compute the (approximate) events in the last n seconds
        now = datetime.datetime.now().timestamp()
        seconds = min(now - self._start, last_n_seconds)
        return (
            len([t for t in self._timestamps if t > (now - last_n_seconds)]) / seconds
        )


def print_stack(sig, frame):
    traceback.print_stack(frame)


def listen():
    signal.signal(signal.SIGUSR1, print_stack)


def create_mask(frame_shape, mask):
    mask_img = np.zeros(frame_shape, np.uint8)
    mask_img[:] = 255

    if isinstance(mask, list):
        for m in mask:
            add_mask(m, mask_img)

    elif isinstance(mask, str):
        add_mask(mask, mask_img)

    return mask_img


def add_mask(mask, mask_img):
    points = mask.split(",")
    contour = np.array(
        [[int(points[i]), int(points[i + 1])] for i in range(0, len(points), 2)]
    )
    cv2.fillPoly(mask_img, pts=[contour], color=(0))


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
    def __init__(self):
        self.shm_store = {}

    def create(self, name, size) -> AnyStr:
        shm = shared_memory.SharedMemory(name=name, create=True, size=size)
        self.shm_store[name] = shm
        return shm.buf

    def get(self, name, shape):
        if name in self.shm_store:
            shm = self.shm_store[name]
        else:
            shm = shared_memory.SharedMemory(name=name)
            self.shm_store[name] = shm
        return np.ndarray(shape, dtype=np.uint8, buffer=shm.buf)

    def close(self, name):
        if name in self.shm_store:
            self.shm_store[name].close()
            del self.shm_store[name]

    def delete(self, name):
        if name in self.shm_store:
            self.shm_store[name].close()
            self.shm_store[name].unlink()
            del self.shm_store[name]
