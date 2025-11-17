"""Utilities for creating and manipulating image frames."""

import datetime
import logging
import subprocess as sp
import threading
from abc import ABC, abstractmethod
from multiprocessing import resource_tracker as _mprt
from multiprocessing import shared_memory as _mpshm
from string import printable
from typing import Any, AnyStr, Optional

import cv2
import numpy as np
from unidecode import unidecode

logger = logging.getLogger(__name__)


def transliterate_to_latin(text: str) -> str:
    """
    Transliterate a given text to Latin.

    This function uses the unidecode library to transliterate the input text to Latin.
    It is useful for converting texts with diacritics or non-Latin characters to a
    Latin equivalent.

    Args:
        text (str): The text to be transliterated.

    Returns:
        str: The transliterated text.

    Example:
        >>> transliterate_to_latin('frégate')
        'fregate'
    """
    return unidecode(text)


def on_edge(box, frame_shape):
    if (
        box[0] == 0
        or box[1] == 0
        or box[2] == frame_shape[1] - 1
        or box[3] == frame_shape[0] - 1
    ):
        return True


def has_better_attr(current_thumb, new_obj, attr_label) -> bool:
    max_new_attr = max(
        [0]
        + [area(a["box"]) for a in new_obj["attributes"] if a["label"] == attr_label]
    )
    max_current_attr = max(
        [0]
        + [
            area(a["box"])
            for a in current_thumb["attributes"]
            if a["label"] == attr_label
        ]
    )

    # if the thumb has a higher scoring attr
    return max_new_attr > max_current_attr


def is_better_thumbnail(
    label: str,
    current_thumb: dict[str, Any],
    new_obj: dict[str, Any],
    frame_shape: tuple[int, int],
) -> bool:
    # larger is better
    # cutoff images are less ideal, but they should also be smaller?
    # better scores are obviously better too

    # check face on person
    if label == "person":
        if has_better_attr(current_thumb, new_obj, "face"):
            return True
        # if the current thumb has a face attr, dont update unless it gets better
        if any([a["label"] == "face" for a in current_thumb["attributes"]]):
            return False

    # check license_plate on car
    if label in ["car", "motorcycle"]:
        if has_better_attr(current_thumb, new_obj, "license_plate"):
            return True
        # if the current thumb has a license_plate attr, dont update unless it gets better
        if any([a["label"] == "license_plate" for a in current_thumb["attributes"]]):
            return False

    # if the new_thumb is on an edge, and the current thumb is not
    if on_edge(new_obj["box"], frame_shape) and not on_edge(
        current_thumb["box"], frame_shape
    ):
        return False

    # if the score is better by more than 5%
    if new_obj["score"] > current_thumb["score"] + 0.05:
        return True

    # if the area is 10% larger
    if new_obj["area"] > current_thumb["area"] * 1.1:
        return True

    return False


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
    try:
        display_text = transliterate_to_latin("{}: {}".format(label, info))
    except Exception:
        display_text = "{}: {}".format(label, info)
    cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), color, thickness)
    font_scale = 0.5
    font = cv2.FONT_HERSHEY_SIMPLEX
    # get the width and height of the text box
    size = cv2.getTextSize(display_text, font, fontScale=font_scale, thickness=2)
    text_width = size[0][0]
    text_height = size[0][1]
    line_height = text_height + size[1]
    # get frame height
    frame_height = frame.shape[0]
    # set the text start position
    if position == "ul":
        text_offset_x = x_min
        text_offset_y = max(0, y_min - (line_height + 8))
    elif position == "ur":
        text_offset_x = max(0, x_max - (text_width + 8))
        text_offset_y = max(0, y_min - (line_height + 8))
    elif position == "bl":
        text_offset_x = x_min
        text_offset_y = min(frame_height - line_height, y_max)
    elif position == "br":
        text_offset_x = max(0, x_max - (text_width + 8))
        text_offset_y = min(frame_height - line_height, y_max)
    # Adjust position if it overlaps with the box or goes out of frame
    if position in {"ul", "ur"}:
        if text_offset_y < y_min + thickness:  # Label overlaps with the box
            if y_min - (line_height + 8) < 0 and y_max + line_height <= frame_height:
                # Not enough space above, and there is space below
                text_offset_y = y_max
            elif y_min - (line_height + 8) >= 0:
                # Enough space above, keep the label at the top
                text_offset_y = max(0, y_min - (line_height + 8))
    elif position in {"bl", "br"}:
        if text_offset_y + line_height > frame_height:
            # If there's not enough space below, try above the box
            text_offset_y = max(0, y_min - (line_height + 8))

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


def grab_cv2_contours(cnts):
    # if the length the contours tuple returned by cv2.findContours
    # is '2' then we are using either OpenCV v2.4, v4-beta, or
    # v4-official
    if len(cnts) == 2:
        return cnts[0]

    # if the length of the contours tuple is '3' then we are using
    # either OpenCV v3, v4-pre, or v4-alpha
    elif len(cnts) == 3:
        return cnts[1]


def is_label_printable(label) -> bool:
    """Check if label is printable."""
    return not bool(set(label) - set(printable))


def calculate_region(frame_shape, xmin, ymin, xmax, ymax, model_size, multiplier=2):
    # size is the longest edge and divisible by 4
    size = int((max(xmax - xmin, ymax - ymin) * multiplier) // 4 * 4)
    # dont go any smaller than the model_size
    if size < model_size:
        size = model_size

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


def calculate_16_9_crop(frame_shape, xmin, ymin, xmax, ymax, multiplier=1.25):
    min_size = 200

    # size is the longest edge and divisible by 4
    x_size = int((xmax - xmin) * multiplier)

    if x_size < min_size:
        x_size = min_size

    y_size = int((ymax - ymin) * multiplier)

    if y_size < min_size:
        y_size = min_size

    if frame_shape[1] / frame_shape[0] > 16 / 9 and x_size / y_size > 4:
        return None

    # calculate 16x9 using height
    aspect_y_size = int(9 / 16 * x_size)

    # if 16:9 by height is too small
    if aspect_y_size < y_size or aspect_y_size > frame_shape[0]:
        x_size = int((16 / 9) * y_size) // 4 * 4

        if x_size / y_size > 1.8:
            return None
    else:
        y_size = aspect_y_size // 4 * 4

    # x_offset is midpoint of bounding box minus half the size
    x_offset = int((xmax - xmin) / 2.0 + xmin - x_size / 2.0)
    # if outside the image
    if x_offset < 0:
        x_offset = 0
    elif x_offset > (frame_shape[1] - x_size):
        x_offset = max(0, (frame_shape[1] - x_size))

    # y_offset is midpoint of bounding box minus half the size
    y_offset = int((ymax - ymin) / 2.0 + ymin - y_size / 2.0)
    # # if outside the image
    if y_offset < 0:
        y_offset = 0
    elif y_offset > (frame_shape[0] - y_size):
        y_offset = max(0, (frame_shape[0] - y_size))

    return (x_offset, y_offset, x_offset + x_size, y_offset + y_size)


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
        size // 2 + uv_channel_x_offset : size // 2
        + uv_channel_x_offset
        + uv_crop_width,
    ] = frame[u2[1] : u2[3], u2[0] : u2[2]]

    # copy v1
    yuv_cropped_frame[
        size + size // 4 + uv_channel_y_offset : size
        + size // 4
        + uv_channel_y_offset
        + uv_crop_height,
        0 + uv_channel_x_offset : 0 + uv_channel_x_offset + uv_crop_width,
    ] = frame[v1[1] : v1[3], v1[0] : v1[2]]

    # copy v2
    yuv_cropped_frame[
        size + size // 4 + uv_channel_y_offset : size
        + size // 4
        + uv_channel_y_offset
        + uv_crop_height,
        size // 2 + uv_channel_x_offset : size // 2
        + uv_channel_x_offset
        + uv_crop_width,
    ] = frame[v2[1] : v2[3], v2[0] : v2[2]]

    return yuv_cropped_frame


def yuv_to_3_channel_yuv(yuv_frame):
    height = yuv_frame.shape[0] // 3 * 2
    width = yuv_frame.shape[1]

    # flatten the image into array
    yuv_data = yuv_frame.ravel()

    # create a numpy array to hold all the 3 channel yuv data
    all_yuv_data = np.empty((height, width, 3), dtype=np.uint8)

    y_count = height * width
    uv_count = y_count // 4

    # copy the y_channel
    all_yuv_data[:, :, 0] = yuv_data[0:y_count].reshape((height, width))
    # copy the u channel doubling each dimension
    all_yuv_data[:, :, 1] = np.repeat(
        np.reshape(
            np.repeat(yuv_data[y_count : y_count + uv_count], repeats=2, axis=0),
            (height // 2, width),
        ),
        repeats=2,
        axis=0,
    )
    # copy the v channel doubling each dimension
    all_yuv_data[:, :, 2] = np.repeat(
        np.reshape(
            np.repeat(
                yuv_data[y_count + uv_count : y_count + uv_count + uv_count],
                repeats=2,
                axis=0,
            ),
            (height // 2, width),
        ),
        repeats=2,
        axis=0,
    )

    return all_yuv_data


def copy_yuv_to_position(
    destination_frame,
    destination_offset,
    destination_shape,
    source_frame=None,
    source_channel_dim=None,
    interpolation=cv2.INTER_LINEAR,
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

    if source_frame is not None:
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


def get_blank_yuv_frame(width: int, height: int) -> np.ndarray:
    """Creates a black YUV 4:2:0 frame."""
    yuv_height = height * 3 // 2
    yuv_frame = np.zeros((yuv_height, width), dtype=np.uint8)

    uv_height = height // 2

    # The U and V planes are stored after the Y plane.
    u_start = height  # U plane starts right after Y plane
    v_start = u_start + uv_height // 2  # V plane starts after U plane
    yuv_frame[u_start : u_start + uv_height, :width] = 128
    yuv_frame[v_start : v_start + uv_height, :width] = 128

    return yuv_frame


def yuv_region_2_yuv(frame, region):
    try:
        # TODO: does this copy the numpy array?
        yuv_cropped_frame = yuv_crop_and_resize(frame, region)
        return yuv_to_3_channel_yuv(yuv_cropped_frame)
    except:
        print(f"frame.shape: {frame.shape}")
        print(f"region: {region}")
        raise


def yuv_region_2_rgb(frame, region):
    try:
        # TODO: does this copy the numpy array?
        yuv_cropped_frame = yuv_crop_and_resize(frame, region)
        return cv2.cvtColor(yuv_cropped_frame, cv2.COLOR_YUV2RGB_I420)
    except:
        print(f"frame.shape: {frame.shape}")
        print(f"region: {region}")
        raise


def yuv_region_2_bgr(frame, region):
    try:
        yuv_cropped_frame = yuv_crop_and_resize(frame, region)
        return cv2.cvtColor(yuv_cropped_frame, cv2.COLOR_YUV2BGR_I420)
    except:
        print(f"frame.shape: {frame.shape}")
        print(f"region: {region}")
        raise


def intersection(box_a, box_b) -> Optional[list[int]]:
    """Return intersection box or None if boxes do not intersect."""
    if (
        box_a[2] < box_b[0]
        or box_a[0] > box_b[2]
        or box_a[1] > box_b[3]
        or box_a[3] < box_b[1]
    ):
        return None

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

    if intersect is None:
        return 0.0

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
    # areas - the intersection area
    iou = inter_area / float(box_a_area + box_b_area - inter_area)

    # return the intersection over union value
    return iou


def clipped(obj, frame_shape):
    # if the object is within 5 pixels of the region border, and the region is not on the edge
    # consider the object to be clipped
    box = obj[2]
    region = obj[5]
    if (
        (region[0] > 5 and box[0] - region[0] <= 5)
        or (region[1] > 5 and box[1] - region[1] <= 5)
        or (frame_shape[1] - region[2] > 5 and region[2] - box[2] <= 5)
        or (frame_shape[0] - region[3] > 5 and region[3] - box[3] <= 5)
    ):
        return True
    else:
        return False


class FrameManager(ABC):
    @abstractmethod
    def create(self, name: str, size: int) -> AnyStr:
        pass

    @abstractmethod
    def write(self, name: str) -> Optional[memoryview]:
        pass

    @abstractmethod
    def get(self, name: str, timeout_ms: int = 0):
        pass

    @abstractmethod
    def close(self, name: str):
        pass

    @abstractmethod
    def delete(self, name: str):
        pass

    @abstractmethod
    def cleanup(self):
        pass


class UntrackedSharedMemory(_mpshm.SharedMemory):
    # https://github.com/python/cpython/issues/82300#issuecomment-2169035092

    __lock = threading.Lock()

    def __init__(
        self,
        name: Optional[str] = None,
        create: bool = False,
        size: int = 0,
        *,
        track: bool = False,
    ) -> None:
        self._track = track

        # if tracking, normal init will suffice
        if track:
            return super().__init__(name=name, create=create, size=size)

        # lock so that other threads don't attempt to use the
        # register function during this time
        with self.__lock:
            # temporarily disable registration during initialization
            orig_register = _mprt.register
            _mprt.register = self.__tmp_register

            # initialize; ensure original register function is
            # re-instated
            try:
                super().__init__(name=name, create=create, size=size)
            finally:
                _mprt.register = orig_register

    @staticmethod
    def __tmp_register(*args, **kwargs) -> None:
        return

    def unlink(self) -> None:
        if _mpshm._USE_POSIX and self._name:
            _mpshm._posixshmem.shm_unlink(self._name)
            if self._track:
                _mprt.unregister(self._name, "shared_memory")


class SharedMemoryFrameManager(FrameManager):
    def __init__(self):
        self.shm_store: dict[str, UntrackedSharedMemory] = {}

    def create(self, name: str, size) -> AnyStr:
        try:
            shm = UntrackedSharedMemory(
                name=name,
                create=True,
                size=size,
            )
        except FileExistsError:
            shm = UntrackedSharedMemory(name=name)

        self.shm_store[name] = shm
        return shm.buf

    def write(self, name: str) -> Optional[memoryview]:
        try:
            if name in self.shm_store:
                shm = self.shm_store[name]
            else:
                shm = UntrackedSharedMemory(name=name)
                self.shm_store[name] = shm
            return shm.buf
        except FileNotFoundError:
            logger.info(f"the file {name} not found")
            return None

    def get(self, name: str, shape) -> Optional[np.ndarray]:
        try:
            if name in self.shm_store:
                shm = self.shm_store[name]
            else:
                shm = UntrackedSharedMemory(name=name)
                self.shm_store[name] = shm
            return np.ndarray(shape, dtype=np.uint8, buffer=shm.buf)
        except FileNotFoundError:
            return None

    def close(self, name: str):
        if name in self.shm_store:
            self.shm_store[name].close()
            del self.shm_store[name]

    def delete(self, name: str):
        if name in self.shm_store:
            self.shm_store[name].close()

            try:
                self.shm_store[name].unlink()
            except FileNotFoundError:
                pass

            del self.shm_store[name]
        else:
            try:
                shm = UntrackedSharedMemory(name=name)
                shm.close()
                shm.unlink()
            except FileNotFoundError:
                pass

    def cleanup(self) -> None:
        for shm in self.shm_store.values():
            shm.close()

            try:
                shm.unlink()
            except FileNotFoundError:
                pass


def create_mask(frame_shape, mask):
    mask_img = np.zeros(frame_shape, np.uint8)
    mask_img[:] = 255

    if isinstance(mask, list):
        for m in mask:
            add_mask(m, mask_img)

    elif isinstance(mask, str):
        add_mask(mask, mask_img)

    return mask_img


def add_mask(mask: str, mask_img: np.ndarray):
    points = mask.split(",")

    # masks and zones are saved as relative coordinates
    # we know if any points are > 1 then it is using the
    # old native resolution coordinates
    if any(x > "1.0" for x in points):
        raise Exception("add mask expects relative coordinates only")

    contour = np.array(
        [
            [
                int(float(points[i]) * mask_img.shape[1]),
                int(float(points[i + 1]) * mask_img.shape[0]),
            ]
            for i in range(0, len(points), 2)
        ]
    )
    cv2.fillPoly(mask_img, pts=[contour], color=(0))


def run_ffmpeg_snapshot(
    ffmpeg,
    input_path: str,
    codec: str,
    seek_time: Optional[float] = None,
    height: Optional[int] = None,
    timeout: Optional[int] = None,
) -> tuple[Optional[bytes], str]:
    """Run ffmpeg to extract a snapshot/image from a video source."""
    ffmpeg_cmd = [
        ffmpeg.ffmpeg_path,
        "-hide_banner",
        "-loglevel",
        "warning",
    ]

    if seek_time is not None:
        ffmpeg_cmd.extend(["-ss", f"00:00:{seek_time}"])

    ffmpeg_cmd.extend(
        [
            "-i",
            input_path,
            "-frames:v",
            "1",
            "-c:v",
            codec,
            "-f",
            "image2pipe",
            "-",
        ]
    )

    if height is not None:
        ffmpeg_cmd.insert(-3, "-vf")
        ffmpeg_cmd.insert(-3, f"scale=-1:{height}")

    try:
        process = sp.run(
            ffmpeg_cmd,
            capture_output=True,
            timeout=timeout,
        )

        if process.returncode == 0 and process.stdout:
            return process.stdout, ""
        else:
            return None, process.stderr.decode() if process.stderr else "ffmpeg failed"
    except sp.TimeoutExpired:
        return None, "timeout"


def get_image_from_recording(
    ffmpeg,  # Ffmpeg Config
    file_path: str,
    relative_frame_time: float,
    codec: str,
    height: Optional[int] = None,
) -> Optional[Any]:
    """retrieve a frame from given time in recording file."""

    image_data, _ = run_ffmpeg_snapshot(
        ffmpeg, file_path, codec, seek_time=relative_frame_time, height=height
    )

    return image_data


def get_histogram(image, x_min, y_min, x_max, y_max):
    image_bgr = cv2.cvtColor(image, cv2.COLOR_YUV2BGR_I420)
    image_bgr = image_bgr[y_min:y_max, x_min:x_max]

    hist = cv2.calcHist(
        [image_bgr], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256]
    )
    return cv2.normalize(hist, hist).flatten()


def create_thumbnail(
    yuv_frame: np.ndarray, box: tuple[int, int, int, int], height=500
) -> Optional[bytes]:
    """Return jpg thumbnail of a region of the frame."""
    frame = cv2.cvtColor(yuv_frame, cv2.COLOR_YUV2BGR_I420)
    region = calculate_region(
        frame.shape, box[0], box[1], box[2], box[3], height, multiplier=1.4
    )
    frame = frame[region[1] : region[3], region[0] : region[2]]
    width = int(height * frame.shape[1] / frame.shape[0])
    frame = cv2.resize(frame, dsize=(width, height), interpolation=cv2.INTER_AREA)
    ret, jpg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 100])

    if ret:
        return jpg.tobytes()

    return None


def ensure_jpeg_bytes(image_data: bytes) -> bytes:
    """Ensure image data is jpeg bytes for genai"""
    try:
        img_array = np.frombuffer(image_data, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

        if img is None:
            return image_data

        success, encoded_img = cv2.imencode(".jpg", img)

        if success:
            return encoded_img.tobytes()
    except Exception as e:
        logger.warning(f"Error when converting thumbnail to jpeg for genai: {e}")

    return image_data
