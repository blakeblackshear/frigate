"""Utilities for builtin types manipulation."""

import ast
import copy
import datetime
import logging
import multiprocessing as mp
import queue
import re
import shlex
import struct
import urllib.parse
from collections.abc import Mapping
from pathlib import Path
from typing import Any, Optional, Tuple, Union

import numpy as np
import pytz
from ruamel.yaml import YAML
from tzlocal import get_localzone
from zoneinfo import ZoneInfoNotFoundError

from frigate.const import REGEX_HTTP_CAMERA_USER_PASS, REGEX_RTSP_CAMERA_USER_PASS

logger = logging.getLogger(__name__)


class EventsPerSecond:
    def __init__(self, max_events=1000, last_n_seconds=10):
        self._start = None
        self._max_events = max_events
        self._last_n_seconds = last_n_seconds
        self._timestamps = []

    def start(self):
        self._start = datetime.datetime.now().timestamp()

    def update(self):
        now = datetime.datetime.now().timestamp()
        if self._start is None:
            self._start = now
        self._timestamps.append(now)
        # truncate the list when it goes 100 over the max_size
        if len(self._timestamps) > self._max_events + 100:
            self._timestamps = self._timestamps[(1 - self._max_events) :]
        self.expire_timestamps(now)

    def eps(self):
        now = datetime.datetime.now().timestamp()
        if self._start is None:
            self._start = now
        # compute the (approximate) events in the last n seconds
        self.expire_timestamps(now)
        seconds = min(now - self._start, self._last_n_seconds)
        # avoid divide by zero
        if seconds == 0:
            seconds = 1
        return len(self._timestamps) / seconds

    # remove aged out timestamps
    def expire_timestamps(self, now):
        threshold = now - self._last_n_seconds
        while self._timestamps and self._timestamps[0] < threshold:
            del self._timestamps[0]


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
            if isinstance(v1, dict) and isinstance(v2, Mapping):
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


def clean_camera_user_pass(line: str) -> str:
    """Removes user and password from line."""
    rtsp_cleaned = re.sub(REGEX_RTSP_CAMERA_USER_PASS, "://*:*@", line)
    return re.sub(REGEX_HTTP_CAMERA_USER_PASS, "user=*&password=*", rtsp_cleaned)


def escape_special_characters(path: str) -> str:
    """Cleans reserved characters to encodings for ffmpeg."""
    if len(path) > 1000:
        return ValueError("Input too long to check")

    try:
        found = re.search(REGEX_RTSP_CAMERA_USER_PASS, path).group(0)[3:-1]
        pw = found[(found.index(":") + 1) :]
        return path.replace(pw, urllib.parse.quote_plus(pw))
    except AttributeError:
        # path does not have user:pass
        return path


def get_ffmpeg_arg_list(arg: Any) -> list:
    """Use arg if list or convert to list format."""
    return arg if isinstance(arg, list) else shlex.split(arg)


def load_labels(path: Optional[str], encoding="utf-8", prefill=91):
    """Loads labels from file (with or without index numbers).
    Args:
      path: path to label file.
      encoding: label file encoding.
    Returns:
      Dictionary mapping indices to labels.
    """
    if path is None:
        return {}

    with open(path, "r", encoding=encoding) as f:
        labels = {index: "unknown" for index in range(prefill)}
        lines = f.readlines()
        if not lines:
            return {}

        if lines[0].split(" ", maxsplit=1)[0].isdigit():
            pairs = [line.split(" ", maxsplit=1) for line in lines]
            labels.update({int(index): label.strip() for index, label in pairs})
        else:
            labels.update({index: line.strip() for index, line in enumerate(lines)})
        return labels


def get_tz_modifiers(tz_name: str) -> Tuple[str, str, int]:
    seconds_offset = (
        datetime.datetime.now(pytz.timezone(tz_name)).utcoffset().total_seconds()
    )
    hours_offset = int(seconds_offset / 60 / 60)
    minutes_offset = int(seconds_offset / 60 - hours_offset * 60)
    hour_modifier = f"{hours_offset} hour"
    minute_modifier = f"{minutes_offset} minute"
    return hour_modifier, minute_modifier, seconds_offset


def to_relative_box(
    width: int, height: int, box: Tuple[int, int, int, int]
) -> Tuple[int, int, int, int]:
    return (
        box[0] / width,  # x
        box[1] / height,  # y
        (box[2] - box[0]) / width,  # w
        (box[3] - box[1]) / height,  # h
    )


def create_mask(frame_shape, mask):
    mask_img = np.zeros(frame_shape, np.uint8)
    mask_img[:] = 255


def update_yaml_from_url(file_path, url):
    parsed_url = urllib.parse.urlparse(url)
    query_string = urllib.parse.parse_qs(parsed_url.query, keep_blank_values=True)

    for key_path_str, new_value_list in query_string.items():
        key_path = key_path_str.split(".")
        for i in range(len(key_path)):
            try:
                index = int(key_path[i])
                key_path[i] = (key_path[i - 1], index)
                key_path.pop(i - 1)
            except ValueError:
                pass

        if len(new_value_list) > 1:
            update_yaml_file(file_path, key_path, new_value_list)
        else:
            value = new_value_list[0]
            if "," in value:
                # Skip conversion if we're a mask or zone string
                update_yaml_file(file_path, key_path, value)
            else:
                try:
                    value = ast.literal_eval(value)
                except (ValueError, SyntaxError):
                    pass
                update_yaml_file(file_path, key_path, value)

            update_yaml_file(file_path, key_path, value)


def update_yaml_file(file_path, key_path, new_value):
    yaml = YAML()
    yaml.indent(mapping=2, sequence=4, offset=2)

    try:
        with open(file_path, "r") as f:
            data = yaml.load(f)
    except FileNotFoundError:
        logger.error(
            f"Unable to read from Frigate config file {file_path}. Make sure it exists and is readable."
        )
        return

    data = update_yaml(data, key_path, new_value)

    try:
        with open(file_path, "w") as f:
            yaml.dump(data, f)
    except Exception as e:
        logger.error(f"Unable to write to Frigate config file {file_path}: {e}")


def update_yaml(data, key_path, new_value):
    temp = data
    for key in key_path[:-1]:
        if isinstance(key, tuple):
            if key[0] not in temp:
                temp[key[0]] = [{}] * max(1, key[1] + 1)
            elif len(temp[key[0]]) <= key[1]:
                temp[key[0]] += [{}] * (key[1] - len(temp[key[0]]) + 1)
            temp = temp[key[0]][key[1]]
        else:
            if key not in temp or temp[key] is None:
                temp[key] = {}
            temp = temp[key]

    last_key = key_path[-1]
    if new_value == "":
        if isinstance(last_key, tuple):
            del temp[last_key[0]][last_key[1]]
        else:
            del temp[last_key]
    else:
        if isinstance(last_key, tuple):
            if last_key[0] not in temp:
                temp[last_key[0]] = [{}] * max(1, last_key[1] + 1)
            elif len(temp[last_key[0]]) <= last_key[1]:
                temp[last_key[0]] += [{}] * (last_key[1] - len(temp[last_key[0]]) + 1)
            temp[last_key[0]][last_key[1]] = new_value
        else:
            if (
                last_key in temp
                and isinstance(temp[last_key], dict)
                and isinstance(new_value, dict)
            ):
                temp[last_key].update(new_value)
            else:
                temp[last_key] = new_value

    return data


def find_by_key(dictionary, target_key):
    if target_key in dictionary:
        return dictionary[target_key]
    else:
        for value in dictionary.values():
            if isinstance(value, dict):
                result = find_by_key(value, target_key)
                if result is not None:
                    return result
    return None


def get_tomorrow_at_time(hour: int) -> datetime.datetime:
    """Returns the datetime of the following day at 2am."""
    try:
        tomorrow = datetime.datetime.now(get_localzone()) + datetime.timedelta(days=1)
    except ZoneInfoNotFoundError:
        tomorrow = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            days=1
        )
        logger.warning(
            "Using utc for maintenance due to missing or incorrect timezone set"
        )

    return tomorrow.replace(hour=hour, minute=0, second=0).astimezone(
        datetime.timezone.utc
    )


def clear_and_unlink(file: Path, missing_ok: bool = True) -> None:
    """clear file then unlink to avoid space retained by file descriptors."""
    if not missing_ok and not file.exists():
        raise FileNotFoundError()

    # empty contents of file before unlinking https://github.com/blakeblackshear/frigate/issues/4769
    with open(file, "w"):
        pass

    file.unlink(missing_ok=missing_ok)


def empty_and_close_queue(q: mp.Queue):
    while True:
        try:
            q.get(block=True, timeout=0.5)
        except queue.Empty:
            q.close()
            q.join_thread()
            return


def generate_color_palette(n):
    # mimic matplotlib's color scheme
    base_colors = [
        (31, 119, 180),  # blue
        (255, 127, 14),  # orange
        (44, 160, 44),  # green
        (214, 39, 40),  # red
        (148, 103, 189),  # purple
        (140, 86, 75),  # brown
        (227, 119, 194),  # pink
        (127, 127, 127),  # gray
        (188, 189, 34),  # olive
        (23, 190, 207),  # cyan
    ]

    def interpolate(color1, color2, factor):
        return tuple(int(c1 + (c2 - c1) * factor) for c1, c2 in zip(color1, color2))

    if n <= len(base_colors):
        return base_colors[:n]

    colors = base_colors.copy()
    step = 1 / (n - len(base_colors) + 1)
    extra_colors_needed = n - len(base_colors)

    # interpolate between the base colors to generate more if needed
    for i in range(extra_colors_needed):
        index = i % (len(base_colors) - 1)
        factor = (i + 1) * step
        color1 = base_colors[index]
        color2 = base_colors[index + 1]
        colors.append(interpolate(color1, color2, factor))

    return colors


def serialize(
    vector: Union[list[float], np.ndarray, float], pack: bool = True
) -> bytes:
    """Serializes a list of floats, numpy array, or single float into a compact "raw bytes" format"""
    if isinstance(vector, np.ndarray):
        # Convert numpy array to list of floats
        vector = vector.flatten().tolist()
    elif isinstance(vector, (float, np.float32, np.float64)):
        # Handle single float values
        vector = [vector]
    elif not isinstance(vector, list):
        raise TypeError(
            f"Input must be a list of floats, a numpy array, or a single float. Got {type(vector)}"
        )

    try:
        if pack:
            return struct.pack("%sf" % len(vector), *vector)
        else:
            return vector
    except struct.error as e:
        raise ValueError(f"Failed to pack vector: {e}. Vector: {vector}")


def deserialize(bytes_data: bytes) -> list[float]:
    """Deserializes a compact "raw bytes" format into a list of floats"""
    return list(struct.unpack("%sf" % (len(bytes_data) // 4), bytes_data))
