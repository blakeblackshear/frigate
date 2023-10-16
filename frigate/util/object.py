"""Utils for reading and writing object detection data."""

import logging

import cv2
import numpy as np

from frigate.config import CameraConfig, ModelConfig
from frigate.detectors.detector_config import PixelFormatEnum
from frigate.models import Timeline
from frigate.util.image import (
    calculate_region,
    yuv_region_2_bgr,
    yuv_region_2_rgb,
    yuv_region_2_yuv,
)

logger = logging.getLogger(__name__)


def get_camera_regions_grid(
    camera: CameraConfig, grid_size: int = 8
) -> list[list[dict[str, any]]]:
    """Build a grid of expected region sizes for a camera."""
    # create a grid
    grid = []
    for x in range(grid_size):
        row = []
        for y in range(grid_size):
            row.append({"sizes": []})
        grid.append(row)

    timeline = (
        Timeline.select(
            *[
                Timeline.camera,
                Timeline.source,
                Timeline.data,
            ]
        )
        .where(Timeline.camera == camera.name)
        .limit(10000)
        .dicts()
    )

    if not timeline:
        return grid

    logger.debug(f"There are {len(timeline)} entries for {camera.name}")
    width = camera.detect.width
    height = camera.detect.height

    logger.debug(f"The size of grid is {len(grid)} x {len(grid[grid_size - 1])}")
    grid_coef = 1.0 / grid_size

    for t in timeline:
        if t.get("source") != "tracked_object":
            continue

        box = t["data"]["box"]

        # calculate centroid position
        x = box[0] + (box[2] / 2)
        y = box[1] + (box[3] / 2)

        x_pos = int(x * grid_size)
        y_pos = int(y * grid_size)

        calculated_region = calculate_region(
            (height, width),
            box[0] * width,
            box[1] * height,
            (box[0] + box[2]) * width,
            (box[1] + box[3]) * height,
            320,
            1.35,
        )
        # save width of region to grid as relative
        grid[x_pos][y_pos]["sizes"].append(
            (calculated_region[2] - calculated_region[0]) / width
        )

    for x in range(grid_size):
        for y in range(grid_size):
            cell = grid[x][y]
            logger.debug(
                f"stats for cell {x * grid_coef * width},{y * grid_coef * height} -> {(x + 1) * grid_coef * width},{(y + 1) * grid_coef * height} :: {len(cell['sizes'])} objects"
            )

            if len(cell["sizes"]) == 0:
                continue

            std_dev = np.std(cell["sizes"])
            mean = np.mean(cell["sizes"])
            logger.debug(f"std dev: {std_dev} mean: {mean}")
            cell["std_dev"] = std_dev
            cell["mean"] = mean

    return grid


def get_cluster_region_from_grid(frame_shape, min_region, cluster, boxes, region_grid):
    min_x = frame_shape[1]
    min_y = frame_shape[0]
    max_x = 0
    max_y = 0
    for b in cluster:
        min_x = min(boxes[b][0], min_x)
        min_y = min(boxes[b][1], min_y)
        max_x = max(boxes[b][2], max_x)
        max_y = max(boxes[b][3], max_y)
    return get_region_from_grid(
        frame_shape, [min_x, min_y, max_x, max_y], min_region, region_grid
    )


def get_region_from_grid(
    frame_shape: tuple[int],
    box: list[int],
    min_region: int,
    region_grid: list[list[dict[str, any]]],
) -> list[int]:
    """Get a region for a box based on the region grid."""
    centroid = (box[0] - (box[2] - box[0]), box[1] - (box[3] - box[1]))
    grid_x = int(centroid[0] / frame_shape[1] * len(region_grid))
    grid_y = int(centroid[1] / frame_shape[0] * len(region_grid))

    cell = region_grid[grid_x][grid_y]

    # if there is no known data, get standard region for motion box
    if not cell or not cell["sizes"]:
        return calculate_region(frame_shape, box[0], box[1], box[2], box[3], min_region)

    calc_size = (box[2] - box[0]) / frame_shape[1]

    # if region is within expected size, don't resize
    if (cell["mean"] - cell["std_dev"]) < calc_size < (cell["mean"] + cell["std_dev"]):
        return calculate_region(frame_shape, box[0], box[1], box[2], box[3], min_region)
    # TODO not sure how to handle case where cluster is larger than expected region
    elif calc_size > (cell["mean"] + cell["std_dev"]):
        return calculate_region(frame_shape, box[0], box[1], box[2], box[3], min_region)

    size = cell["mean"] * frame_shape[1]

    # get region based on grid size
    new = calculate_region(
        frame_shape,
        max(0, centroid[0] - size / 2),
        max(0, centroid[1] - size / 2),
        min(frame_shape[1], centroid[0] + size / 2),
        min(frame_shape[0], centroid[1] + size / 2),
        min_region,
    )
    return new


def is_object_filtered(obj, objects_to_track, object_filters):
    object_name = obj[0]
    object_score = obj[1]
    object_box = obj[2]
    object_area = obj[3]
    object_ratio = obj[4]

    if object_name not in objects_to_track:
        return True

    if object_name in object_filters:
        obj_settings = object_filters[object_name]

        # if the min area is larger than the
        # detected object, don't add it to detected objects
        if obj_settings.min_area > object_area:
            return True

        # if the detected object is larger than the
        # max area, don't add it to detected objects
        if obj_settings.max_area < object_area:
            return True

        # if the score is lower than the min_score, skip
        if obj_settings.min_score > object_score:
            return True

        # if the object is not proportionally wide enough
        if obj_settings.min_ratio > object_ratio:
            return True

        # if the object is proportionally too wide
        if obj_settings.max_ratio < object_ratio:
            return True

        if obj_settings.mask is not None:
            # compute the coordinates of the object and make sure
            # the location isn't outside the bounds of the image (can happen from rounding)
            object_xmin = object_box[0]
            object_xmax = object_box[2]
            object_ymax = object_box[3]
            y_location = min(int(object_ymax), len(obj_settings.mask) - 1)
            x_location = min(
                int((object_xmax + object_xmin) / 2.0),
                len(obj_settings.mask[0]) - 1,
            )

            # if the object is in a masked location, don't add it to detected objects
            if obj_settings.mask[y_location][x_location] == 0:
                return True

    return False


def get_min_region_size(model_config: ModelConfig) -> int:
    """Get the min region size."""
    return max(model_config.height, model_config.width)


def create_tensor_input(frame, model_config: ModelConfig, region):
    if model_config.input_pixel_format == PixelFormatEnum.rgb:
        cropped_frame = yuv_region_2_rgb(frame, region)
    elif model_config.input_pixel_format == PixelFormatEnum.bgr:
        cropped_frame = yuv_region_2_bgr(frame, region)
    else:
        cropped_frame = yuv_region_2_yuv(frame, region)

    # Resize if needed
    if cropped_frame.shape != (model_config.height, model_config.width, 3):
        cropped_frame = cv2.resize(
            cropped_frame,
            dsize=(model_config.width, model_config.height),
            interpolation=cv2.INTER_LINEAR,
        )

    # Expand dimensions since the model expects images to have shape: [1, height, width, 3]
    return np.expand_dims(cropped_frame, axis=0)
