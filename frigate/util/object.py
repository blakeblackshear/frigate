"""Utils for reading and writing object detection data."""

import datetime
import logging
import math

import cv2
import numpy as np
from peewee import DoesNotExist

from frigate.config import DetectConfig, ModelConfig
from frigate.const import LABEL_CONSOLIDATION_DEFAULT, LABEL_CONSOLIDATION_MAP
from frigate.detectors.detector_config import PixelFormatEnum
from frigate.models import Event, Regions, Timeline
from frigate.util.image import (
    area,
    calculate_region,
    intersection,
    intersection_over_union,
    yuv_region_2_bgr,
    yuv_region_2_rgb,
    yuv_region_2_yuv,
)

logger = logging.getLogger(__name__)

GRID_SIZE = 8


def get_camera_regions_grid(
    name: str, detect: DetectConfig
) -> list[list[dict[str, any]]]:
    """Build a grid of expected region sizes for a camera."""
    # get grid from db if available
    try:
        regions: Regions = Regions.select().where(Regions.camera == name).get()
        grid = regions.grid
        last_update = regions.last_update
    except DoesNotExist:
        grid = []
        for x in range(GRID_SIZE):
            row = []
            for y in range(GRID_SIZE):
                row.append({"sizes": []})
            grid.append(row)
        last_update = 0

    # get events for timeline entries
    events = (
        Event.select(Event.id)
        .where(Event.camera == name)
        .where((Event.false_positive == None) | (Event.false_positive == False))
        .where(Event.start_time > last_update)
    )
    valid_event_ids = [e["id"] for e in events.dicts()]
    logger.debug(f"Found {len(valid_event_ids)} new events for {name}")

    # no new events, return as is
    if not valid_event_ids:
        return grid

    new_update = datetime.datetime.now().timestamp()
    timeline = (
        Timeline.select(
            *[
                Timeline.camera,
                Timeline.source,
                Timeline.data,
            ]
        )
        .where(Timeline.source_id << valid_event_ids)
        .limit(10000)
        .dicts()
    )

    logger.debug(f"Found {len(timeline)} new entries for {name}")

    width = detect.width
    height = detect.height

    for t in timeline:
        if t.get("source") != "tracked_object":
            continue

        box = t["data"]["box"]

        # calculate centroid position
        x = box[0] + (box[2] / 2)
        y = box[1] + (box[3] / 2)

        x_pos = int(x * GRID_SIZE)
        y_pos = int(y * GRID_SIZE)

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

    for x in range(GRID_SIZE):
        for y in range(GRID_SIZE):
            cell = grid[x][y]

            if len(cell["sizes"]) == 0:
                continue

            std_dev = np.std(cell["sizes"])
            mean = np.mean(cell["sizes"])
            logger.debug(f"std dev: {std_dev} mean: {mean}")
            cell["x"] = x
            cell["y"] = y
            cell["std_dev"] = std_dev
            cell["mean"] = mean

    # update db with new grid
    region = {
        Regions.camera: name,
        Regions.grid: grid,
        Regions.last_update: new_update,
    }
    (
        Regions.insert(region)
        .on_conflict(
            conflict_target=[Regions.camera],
            update=region,
        )
        .execute()
    )

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
    cluster: list[int],
    min_region: int,
    region_grid: list[list[dict[str, any]]],
) -> list[int]:
    """Get a region for a box based on the region grid."""
    box = calculate_region(
        frame_shape, cluster[0], cluster[1], cluster[2], cluster[3], min_region
    )
    centroid = (
        box[0] + (min(frame_shape[1], box[2]) - box[0]) / 2,
        box[1] + (min(frame_shape[0], box[3]) - box[1]) / 2,
    )
    grid_x = int(centroid[0] / frame_shape[1] * GRID_SIZE)
    grid_y = int(centroid[1] / frame_shape[0] * GRID_SIZE)

    cell = region_grid[grid_x][grid_y]

    # if there is no known data, get standard region for motion box
    if not cell or not cell["sizes"]:
        return calculate_region(frame_shape, box[0], box[1], box[2], box[3], min_region)

    # convert the calculated region size to relative
    calc_size = (box[2] - box[0]) / frame_shape[1]

    # if region is within expected size, don't resize
    if (
        (cell["mean"] - cell["std_dev"])
        <= calc_size
        <= (cell["mean"] + cell["std_dev"])
    ):
        return box
    # TODO not sure how to handle case where cluster is larger than expected region
    elif calc_size > (cell["mean"] + cell["std_dev"]):
        return box

    size = cell["mean"] * frame_shape[1]

    # get region based on grid size
    return calculate_region(
        frame_shape,
        max(0, centroid[0] - size / 2),
        max(0, centroid[1] - size / 2),
        min(frame_shape[1], centroid[0] + size / 2),
        min(frame_shape[0], centroid[1] + size / 2),
        min_region,
    )


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


def box_overlaps(b1, b2):
    if b1[2] < b2[0] or b1[0] > b2[2] or b1[1] > b2[3] or b1[3] < b2[1]:
        return False
    return True


def box_inside(b1, b2):
    # check if b2 is inside b1
    if b2[0] >= b1[0] and b2[1] >= b1[1] and b2[2] <= b1[2] and b2[3] <= b1[3]:
        return True
    return False


def reduce_boxes(boxes, iou_threshold=0.0):
    clusters = []

    for box in boxes:
        matched = 0
        for cluster in clusters:
            if intersection_over_union(box, cluster) > iou_threshold:
                matched = 1
                cluster[0] = min(cluster[0], box[0])
                cluster[1] = min(cluster[1], box[1])
                cluster[2] = max(cluster[2], box[2])
                cluster[3] = max(cluster[3], box[3])

        if not matched:
            clusters.append(list(box))

    return [tuple(c) for c in clusters]


def intersects_any(box_a, boxes):
    for box in boxes:
        if box_overlaps(box_a, box):
            return True
    return False


def inside_any(box_a, boxes):
    for box in boxes:
        # check if box_a is inside of box
        if box_inside(box, box_a):
            return True
    return False


def get_cluster_boundary(box, min_region):
    # compute the max region size for the current box (box is 10% of region)
    box_width = box[2] - box[0]
    box_height = box[3] - box[1]
    max_region_area = abs(box_width * box_height) / 0.1
    max_region_size = max(min_region, int(math.sqrt(max_region_area)))

    centroid = (box_width / 2 + box[0], box_height / 2 + box[1])

    max_x_dist = int(max_region_size - box_width / 2 * 1.1)
    max_y_dist = int(max_region_size - box_height / 2 * 1.1)

    return [
        int(centroid[0] - max_x_dist),
        int(centroid[1] - max_y_dist),
        int(centroid[0] + max_x_dist),
        int(centroid[1] + max_y_dist),
    ]


def get_cluster_candidates(frame_shape, min_region, boxes):
    # and create a cluster of other boxes using it's max region size
    # only include boxes where the region is an appropriate(except the region could possibly be smaller?)
    # size in the cluster. in order to be in the cluster, the furthest corner needs to be within x,y offset
    # determined by the max_region size minus half the box + 20%
    # TODO: see if we can do this with numpy
    cluster_candidates = []
    used_boxes = []
    # loop over each box
    for current_index, b in enumerate(boxes):
        if current_index in used_boxes:
            continue
        cluster = [current_index]
        used_boxes.append(current_index)
        cluster_boundary = get_cluster_boundary(b, min_region)
        # find all other boxes that fit inside the boundary
        for compare_index, compare_box in enumerate(boxes):
            if compare_index in used_boxes:
                continue

            # if the box is not inside the potential cluster area, cluster them
            if not box_inside(cluster_boundary, compare_box):
                continue

            # get the region if you were to add this box to the cluster
            potential_cluster = cluster + [compare_index]
            cluster_region = get_cluster_region(
                frame_shape, min_region, potential_cluster, boxes
            )
            # if region could be smaller and either box would be too small
            # for the resulting region, dont cluster
            should_cluster = True
            if (cluster_region[2] - cluster_region[0]) > min_region:
                for b in potential_cluster:
                    box = boxes[b]
                    # boxes should be more than 5% of the area of the region
                    if area(box) / area(cluster_region) < 0.05:
                        should_cluster = False
                        break

            if should_cluster:
                cluster.append(compare_index)
                used_boxes.append(compare_index)
        cluster_candidates.append(cluster)

    # return the unique clusters only
    unique = {tuple(sorted(c)) for c in cluster_candidates}
    return [list(tup) for tup in unique]


def get_cluster_region(frame_shape, min_region, cluster, boxes):
    min_x = frame_shape[1]
    min_y = frame_shape[0]
    max_x = 0
    max_y = 0
    for b in cluster:
        min_x = min(boxes[b][0], min_x)
        min_y = min(boxes[b][1], min_y)
        max_x = max(boxes[b][2], max_x)
        max_y = max(boxes[b][3], max_y)
    return calculate_region(
        frame_shape, min_x, min_y, max_x, max_y, min_region, multiplier=1.2
    )


def get_consolidated_object_detections(detected_object_groups):
    """Drop detections that overlap too much"""
    consolidated_detections = []
    for group in detected_object_groups.values():
        # if the group only has 1 item, skip
        if len(group) == 1:
            consolidated_detections.append(group[0])
            continue

        # sort smallest to largest by area
        sorted_by_area = sorted(group, key=lambda g: g[3])

        for current_detection_idx in range(0, len(sorted_by_area)):
            current_detection = sorted_by_area[current_detection_idx]
            current_label = current_detection[0]
            current_box = current_detection[2]
            overlap = 0
            for to_check_idx in range(
                min(current_detection_idx + 1, len(sorted_by_area)),
                len(sorted_by_area),
            ):
                to_check = sorted_by_area[to_check_idx][2]
                intersect_box = intersection(current_box, to_check)
                # if 90% of smaller detection is inside of another detection, consolidate
                if intersect_box is not None and area(intersect_box) / area(
                    current_box
                ) > LABEL_CONSOLIDATION_MAP.get(
                    current_label, LABEL_CONSOLIDATION_DEFAULT
                ):
                    overlap = 1
                    break
            if overlap == 0:
                consolidated_detections.append(sorted_by_area[current_detection_idx])

    return consolidated_detections


def get_startup_regions(
    frame_shape: tuple[int],
    region_min_size: int,
    region_grid: list[list[dict[str, any]]],
) -> list[list[int]]:
    """Get a list of regions to run on startup."""
    # return 8 most popular regions for the camera
    all_cells = np.concatenate(region_grid).flat
    startup_cells = sorted(all_cells, key=lambda c: len(c["sizes"]), reverse=True)[0:8]
    regions = []

    for cell in startup_cells:
        # rest of the cells are empty
        if not cell["sizes"]:
            break

        x = frame_shape[1] / GRID_SIZE * (0.5 + cell["x"])
        y = frame_shape[0] / GRID_SIZE * (0.5 + cell["y"])
        size = cell["mean"] * frame_shape[1]
        regions.append(
            calculate_region(
                frame_shape,
                x - size / 2,
                y - size / 2,
                x + size / 2,
                y + size / 2,
                region_min_size,
                multiplier=1,
            )
        )

    return regions
