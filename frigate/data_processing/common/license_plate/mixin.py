"""Handle processing images for face detection and recognition."""

import base64
import datetime
import json
import logging
import math
import os
import random
import re
import string
from pathlib import Path
from typing import Any, List, Optional, Tuple

import cv2
import numpy as np
from pyclipper import ET_CLOSEDPOLYGON, JT_ROUND, PyclipperOffset
from rapidfuzz.distance import JaroWinkler, Levenshtein
from shapely.geometry import Polygon

from frigate.comms.event_metadata_updater import (
    EventMetadataPublisher,
    EventMetadataTypeEnum,
)
from frigate.const import CLIPS_DIR, MODEL_CACHE_DIR
from frigate.embeddings.onnx.lpr_embedding import LPR_EMBEDDING_SIZE
from frigate.types import TrackedObjectUpdateTypesEnum
from frigate.util.builtin import EventsPerSecond, InferenceSpeed
from frigate.util.image import area

logger = logging.getLogger(__name__)

WRITE_DEBUG_IMAGES = False


class LicensePlateProcessingMixin:
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.plate_rec_speed = InferenceSpeed(self.metrics.alpr_speed)
        self.plates_rec_second = EventsPerSecond()
        self.plates_rec_second.start()
        self.plate_det_speed = InferenceSpeed(self.metrics.yolov9_lpr_speed)
        self.plates_det_second = EventsPerSecond()
        self.plates_det_second.start()
        self.event_metadata_publisher = EventMetadataPublisher()
        self.ctc_decoder = CTCDecoder(
            character_dict_path=os.path.join(
                MODEL_CACHE_DIR, "paddleocr-onnx", "ppocr_keys_v1.txt"
            )
        )
        # process plates that are stationary and have no position changes for 5 seconds
        self.stationary_scan_duration = 5

        self.batch_size = 6

        # Object config
        self.lp_objects: list[str] = []

        for obj, attributes in self.config.model.attributes_map.items():
            if "license_plate" in attributes:
                self.lp_objects.append(obj)

        # Detection specific parameters
        self.min_size = 8
        self.max_size = 960
        self.box_thresh = 0.6
        self.mask_thresh = 0.6

        # matching
        self.similarity_threshold = 0.8
        self.cluster_threshold = 0.85

    def _detect(self, image: np.ndarray) -> List[np.ndarray]:
        """
        Detect possible areas of text in the input image by first resizing and normalizing it,
        running a detection model, and filtering out low-probability regions.

        Args:
            image (np.ndarray): The input image in which license plates will be detected.

        Returns:
            List[np.ndarray]: A list of bounding box coordinates representing detected license plates.
        """
        h, w = image.shape[:2]

        if sum([h, w]) < 64:
            image = self._zero_pad(image)

        resized_image = self._resize_image(image)
        normalized_image = self._normalize_image(resized_image)

        if WRITE_DEBUG_IMAGES:
            current_time = int(datetime.datetime.now().timestamp())
            cv2.imwrite(
                f"debug/frames/license_plate_resized_{current_time}.jpg",
                resized_image,
            )

        try:
            outputs = self.model_runner.detection_model([normalized_image])[0]
        except Exception as e:
            logger.warning(f"Error running LPR box detection model: {e}")
            return []

        outputs = outputs[0, :, :]

        if False:
            current_time = int(datetime.datetime.now().timestamp())
            cv2.imwrite(
                f"debug/frames/probability_map_{current_time}.jpg",
                (outputs * 255).astype(np.uint8),
            )

        boxes, _ = self._boxes_from_bitmap(outputs, outputs > self.mask_thresh, w, h)
        return self._filter_polygon(boxes, (h, w))

    def _classify(
        self, images: List[np.ndarray]
    ) -> Tuple[List[np.ndarray], List[Tuple[str, float]]]:
        """
        Classify the orientation or category of each detected license plate.

        Args:
            images (List[np.ndarray]): A list of images of detected license plates.

        Returns:
            Tuple[List[np.ndarray], List[Tuple[str, float]]]: A tuple of rotated/normalized plate images
                                                            and classification results with confidence scores.
        """
        num_images = len(images)
        indices = np.argsort([x.shape[1] / x.shape[0] for x in images])

        for i in range(0, num_images, self.batch_size):
            norm_images = []
            for j in range(i, min(num_images, i + self.batch_size)):
                norm_img = self._preprocess_classification_image(images[indices[j]])
                norm_img = norm_img[np.newaxis, :]
                norm_images.append(norm_img)

        try:
            outputs = self.model_runner.classification_model(norm_images)
        except Exception as e:
            logger.warning(f"Error running LPR classification model: {e}")
            return

        return self._process_classification_output(images, outputs)

    def _recognize(
        self, camera: string, images: List[np.ndarray]
    ) -> Tuple[List[str], List[List[float]]]:
        """
        Recognize the characters on the detected license plates using the recognition model.

        Args:
            images (List[np.ndarray]): A list of images of license plates to recognize.

        Returns:
            Tuple[List[str], List[List[float]]]: A tuple of recognized license plate texts and confidence scores.
        """
        input_shape = [3, 48, 320]
        num_images = len(images)

        for index in range(0, num_images, self.batch_size):
            input_h, input_w = input_shape[1], input_shape[2]
            max_wh_ratio = input_w / input_h
            norm_images = []

            # calculate the maximum aspect ratio in the current batch
            for i in range(index, min(num_images, index + self.batch_size)):
                h, w = images[i].shape[0:2]
                max_wh_ratio = max(max_wh_ratio, w * 1.0 / h)

            # preprocess the images based on the max aspect ratio
            for i in range(index, min(num_images, index + self.batch_size)):
                norm_image = self._preprocess_recognition_image(
                    camera, images[i], max_wh_ratio
                )
                norm_image = norm_image[np.newaxis, :]
                norm_images.append(norm_image)

        try:
            outputs = self.model_runner.recognition_model(norm_images)
        except Exception as e:
            logger.warning(f"Error running LPR recognition model: {e}")
            return [], []

        return self.ctc_decoder(outputs)

    def _process_license_plate(
        self, camera: str, id: str, image: np.ndarray
    ) -> Tuple[List[str], List[List[float]], List[int]]:
        """
        Complete pipeline for detecting, classifying, and recognizing license plates in the input image.
        Combines multi-line plates into a single plate string, grouping boxes by vertical alignment and ordering top to bottom,
        but only combines boxes if their average confidence scores meet the threshold and their heights are similar.

        Args:
            camera (str): Camera identifier.
            id (str): Event identifier.
            image (np.ndarray): The input image in which to detect, classify, and recognize license plates.

        Returns:
            Tuple[List[str], List[List[float]], List[int]]: Detected license plate texts, character-level confidence scores for each plate (flattened into a single list per plate), and areas of the plates.
        """
        if (
            self.model_runner.detection_model.runner is None
            or self.model_runner.classification_model.runner is None
            or self.model_runner.recognition_model.runner is None
        ):
            # we might still be downloading the models
            logger.debug("Model runners not loaded")
            return [], [], []

        boxes = self._detect(image)
        if len(boxes) == 0:
            logger.debug(f"{camera}: No boxes found by OCR detector model")
            return [], [], []

        if len(boxes) > 0:
            plate_left = np.min([np.min(box[:, 0]) for box in boxes])
            plate_right = np.max([np.max(box[:, 0]) for box in boxes])
            plate_width = plate_right - plate_left
        else:
            plate_width = 0

        boxes = self._merge_nearby_boxes(
            boxes, plate_width=plate_width, gap_fraction=0.1
        )

        current_time = int(datetime.datetime.now().timestamp())
        if WRITE_DEBUG_IMAGES:
            debug_image = image.copy()
            for box in boxes:
                box = box.astype(int)
                x_min, y_min = np.min(box[:, 0]), np.min(box[:, 1])
                x_max, y_max = np.max(box[:, 0]), np.max(box[:, 1])
                cv2.rectangle(
                    debug_image,
                    (x_min, y_min),
                    (x_max, y_max),
                    color=(0, 255, 0),
                    thickness=2,
                )

            cv2.imwrite(
                f"debug/frames/license_plate_boxes_{current_time}.jpg", debug_image
            )

        boxes = self._sort_boxes(list(boxes))

        # Step 1: Compute box heights and group boxes by vertical alignment and height similarity
        box_info = []
        for i, box in enumerate(boxes):
            y_coords = box[:, 1]
            y_min, y_max = np.min(y_coords), np.max(y_coords)
            height = y_max - y_min
            box_info.append((y_min, y_max, height, i))

        # Initial grouping based on y-coordinate overlap and height similarity
        initial_groups = []
        current_group = [box_info[0]]
        height_tolerance = 0.25  # Allow 25% difference in height for grouping

        for i in range(1, len(box_info)):
            prev_y_min, prev_y_max, prev_height, _ = current_group[-1]
            curr_y_min, _, curr_height, _ = box_info[i]

            # Check y-coordinate overlap
            overlap_threshold = 0.1 * (prev_y_max - prev_y_min)
            overlaps = curr_y_min <= prev_y_max + overlap_threshold

            # Check height similarity
            height_ratio = min(prev_height, curr_height) / max(prev_height, curr_height)
            height_similar = height_ratio >= (1 - height_tolerance)

            if overlaps and height_similar:
                current_group.append(box_info[i])
            else:
                initial_groups.append(current_group)
                current_group = [box_info[i]]
        initial_groups.append(current_group)

        # Step 2: Process each initial group, filter by confidence
        all_license_plates = []
        all_confidences = []
        all_areas = []
        processed_indices = set()

        recognition_threshold = self.lpr_config.recognition_threshold

        for group in initial_groups:
            # Sort group by y-coordinate (top to bottom)
            group.sort(key=lambda x: x[0])
            group_indices = [item[3] for item in group]

            # Skip if all indices in this group have already been processed
            if all(idx in processed_indices for idx in group_indices):
                continue

            # Crop images for the group
            group_boxes = [boxes[i] for i in group_indices]
            group_plate_images = [
                self._crop_license_plate(image, box) for box in group_boxes
            ]

            if WRITE_DEBUG_IMAGES:
                for i, img in enumerate(group_plate_images):
                    cv2.imwrite(
                        f"debug/frames/license_plate_cropped_{current_time}_{group_indices[i] + 1}.jpg",
                        img,
                    )

            if self.config.lpr.debug_save_plates:
                logger.debug(f"{camera}: Saving plates for event {id}")
                Path(os.path.join(CLIPS_DIR, f"lpr/{camera}/{id}")).mkdir(
                    parents=True, exist_ok=True
                )
                for i, img in enumerate(group_plate_images):
                    cv2.imwrite(
                        os.path.join(
                            CLIPS_DIR,
                            f"lpr/{camera}/{id}/{current_time}_{group_indices[i] + 1}.jpg",
                        ),
                        img,
                    )

            # Recognize text in each cropped image
            results, confidences = self._recognize(camera, group_plate_images)

            if not results:
                continue

            if not confidences:
                confidences = [[0.0] for _ in results]

            # Compute average confidence for each box's recognized text
            avg_confidences = []
            for conf_list in confidences:
                avg_conf = sum(conf_list) / len(conf_list) if conf_list else 0.0
                avg_confidences.append(avg_conf)

            # Filter boxes based on the recognition threshold
            qualifying_indices = []
            qualifying_results = []
            qualifying_confidences = []
            for i, (avg_conf, result, conf_list) in enumerate(
                zip(avg_confidences, results, confidences)
            ):
                if avg_conf >= recognition_threshold:
                    qualifying_indices.append(group_indices[i])
                    qualifying_results.append(result)
                    qualifying_confidences.append(conf_list)

            if not qualifying_results:
                continue

            processed_indices.update(qualifying_indices)

            # Combine the qualifying results into a single plate string
            combined_plate = " ".join(qualifying_results)

            flat_confidences = [
                conf for conf_list in qualifying_confidences for conf in conf_list
            ]

            # Apply replace rules to combined_plate if configured
            original_combined = combined_plate
            if self.lpr_config.replace_rules:
                for rule in self.lpr_config.replace_rules:
                    try:
                        pattern = getattr(rule, "pattern", "")
                        replacement = getattr(rule, "replacement", "")
                        if pattern:
                            combined_plate = re.sub(
                                pattern, replacement, combined_plate
                            )
                            logger.debug(
                                f"{camera}: Processing replace rule: '{pattern}' -> '{replacement}', result: '{combined_plate}'"
                            )
                    except re.error as e:
                        logger.warning(
                            f"{camera}: Invalid regex in replace_rules '{pattern}': {e}"
                        )

            if combined_plate != original_combined:
                logger.debug(
                    f"{camera}: All rules applied: '{original_combined}' -> '{combined_plate}'"
                )

            # Compute the combined area for qualifying boxes
            qualifying_boxes = [boxes[i] for i in qualifying_indices]
            qualifying_plate_images = [
                self._crop_license_plate(image, box) for box in qualifying_boxes
            ]
            group_areas = [
                img.shape[0] * img.shape[1] for img in qualifying_plate_images
            ]
            combined_area = sum(group_areas)

            all_license_plates.append(combined_plate)
            all_confidences.append(flat_confidences)
            all_areas.append(combined_area)

        # Step 3: Filter and sort the combined plates
        if all_license_plates:
            filtered_data = []
            for plate, conf_list, area in zip(
                all_license_plates, all_confidences, all_areas
            ):
                if len(plate) < self.lpr_config.min_plate_length:
                    logger.debug(
                        f"{camera}: Filtered out '{plate}' due to length ({len(plate)} < {self.lpr_config.min_plate_length})"
                    )
                    continue

                if self.lpr_config.format:
                    try:
                        if not re.fullmatch(self.lpr_config.format, plate):
                            logger.debug(
                                f"{camera}: Filtered out '{plate}' due to format mismatch"
                            )
                            continue
                    except re.error:
                        # Skip format filtering if regex is invalid
                        logger.error(
                            f"{camera}: Invalid regex in LPR format configuration: {self.lpr_config.format}"
                        )

                filtered_data.append((plate, conf_list, area))

            sorted_data = sorted(
                filtered_data,
                key=lambda x: (x[2], len(x[0]), sum(x[1]) / len(x[1]) if x[1] else 0),
                reverse=True,
            )

            if sorted_data:
                return map(list, zip(*sorted_data))

        return [], [], []

    def _resize_image(self, image: np.ndarray) -> np.ndarray:
        """
        Resize the input image while maintaining the aspect ratio, ensuring dimensions are multiples of 32.

        Args:
            image (np.ndarray): The input image to resize.

        Returns:
            np.ndarray: The resized image.
        """
        h, w = image.shape[:2]
        ratio = min(self.max_size / max(h, w), 1.0)
        resize_h = max(int(round(int(h * ratio) / 32) * 32), 32)
        resize_w = max(int(round(int(w * ratio) / 32) * 32), 32)
        return cv2.resize(image, (resize_w, resize_h))

    def _normalize_image(self, image: np.ndarray) -> np.ndarray:
        """
        Normalize the input image by subtracting the mean and multiplying by the standard deviation.

        Args:
            image (np.ndarray): The input image to normalize.

        Returns:
            np.ndarray: The normalized image, transposed to match the model's expected input format.
        """
        mean = np.array([123.675, 116.28, 103.53]).reshape(1, -1).astype("float64")
        std = 1 / np.array([58.395, 57.12, 57.375]).reshape(1, -1).astype("float64")

        image = image.astype("float32")
        cv2.subtract(image, mean, image)
        cv2.multiply(image, std, image)
        return image.transpose((2, 0, 1))[np.newaxis, ...]

    def _merge_nearby_boxes(
        self,
        boxes: List[np.ndarray],
        plate_width: float,
        gap_fraction: float = 0.1,
        min_overlap_fraction: float = -0.2,
    ) -> List[np.ndarray]:
        """
        Merge bounding boxes that are likely part of the same license plate based on proximity,
        with a dynamic max_gap based on the provided width of the entire license plate.

        Args:
            boxes (List[np.ndarray]): List of bounding boxes with shape (n, 4, 2), where n is the number of boxes,
                                    each box has 4 corners, and each corner has (x, y) coordinates.
            plate_width (float): The width of the entire license plate in pixels, used to calculate max_gap.
            gap_fraction (float): Fraction of the plate width to use as the maximum gap.
                                Default is 0.1 (10% of the plate width).

        Returns:
            List[np.ndarray]: List of merged bounding boxes.
        """
        if len(boxes) == 0:
            return []

        max_gap = plate_width * gap_fraction
        min_overlap = plate_width * min_overlap_fraction

        # Sort boxes by top left x
        sorted_boxes = sorted(boxes, key=lambda x: x[0][0])

        merged_boxes = []
        current_box = sorted_boxes[0]

        for i in range(1, len(sorted_boxes)):
            next_box = sorted_boxes[i]

            # Calculate the horizontal gap between the current box and the next box
            current_right = np.max(
                current_box[:, 0]
            )  # Rightmost x-coordinate of current box
            next_left = np.min(next_box[:, 0])  # Leftmost x-coordinate of next box
            horizontal_gap = next_left - current_right

            # Check if the boxes are vertically aligned (similar y-coordinates)
            current_top = np.min(current_box[:, 1])
            current_bottom = np.max(current_box[:, 1])
            next_top = np.min(next_box[:, 1])
            next_bottom = np.max(next_box[:, 1])

            # Consider boxes part of the same plate if they are close horizontally or overlap
            # within the allowed limit and their vertical positions overlap significantly
            if min_overlap <= horizontal_gap <= max_gap and max(
                current_top, next_top
            ) <= min(current_bottom, next_bottom):
                merged_points = np.vstack((current_box, next_box))
                new_box = np.array(
                    [
                        [
                            np.min(merged_points[:, 0]),
                            np.min(merged_points[:, 1]),
                        ],
                        [
                            np.max(merged_points[:, 0]),
                            np.min(merged_points[:, 1]),
                        ],
                        [
                            np.max(merged_points[:, 0]),
                            np.max(merged_points[:, 1]),
                        ],
                        [
                            np.min(merged_points[:, 0]),
                            np.max(merged_points[:, 1]),
                        ],
                    ]
                )
                current_box = new_box
            else:
                # If the boxes are not close enough or overlap too much, add the current box to the result
                merged_boxes.append(current_box)
                current_box = next_box

        # Add the last box
        merged_boxes.append(current_box)

        return np.array(merged_boxes, dtype=np.int32)

    def _boxes_from_bitmap(
        self, output: np.ndarray, mask: np.ndarray, dest_width: int, dest_height: int
    ) -> Tuple[np.ndarray, List[float]]:
        """
        Process the binary mask to extract bounding boxes and associated confidence scores.

        Args:
            output (np.ndarray): Output confidence map from the model.
            mask (np.ndarray): Binary mask of detected regions.
            dest_width (int): Target width for scaling the box coordinates.
            dest_height (int): Target height for scaling the box coordinates.

        Returns:
            Tuple[np.ndarray, List[float]]: Array of bounding boxes and list of corresponding scores.
        """

        mask = (mask * 255).astype(np.uint8)
        height, width = mask.shape
        outs = cv2.findContours(mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

        # handle different return values of findContours between OpenCV versions
        contours = outs[0] if len(outs) == 2 else outs[1]

        boxes = []
        scores = []

        for index in range(len(contours)):
            contour = contours[index]

            # get minimum bounding box (rotated rectangle) around the contour and the smallest side length.
            points, sside = self._get_min_boxes(contour)
            if sside < self.min_size:
                continue

            points = np.array(points, dtype=np.float32)

            score = self._box_score(output, contour)
            if self.box_thresh > score:
                continue

            points = self._expand_box(points)

            # Get the minimum area rectangle again after expansion
            points, sside = self._get_min_boxes(points.reshape(-1, 1, 2))
            if sside < self.min_size + 2:
                continue

            points = np.array(points, dtype=np.float32)

            # normalize and clip box coordinates to fit within the destination image size.
            points[:, 0] = np.clip(
                np.round(points[:, 0] / width * dest_width), 0, dest_width
            )
            points[:, 1] = np.clip(
                np.round(points[:, 1] / height * dest_height), 0, dest_height
            )

            boxes.append(points.astype("int32"))
            scores.append(score)

        return np.array(boxes, dtype="int32"), scores

    @staticmethod
    def _get_min_boxes(contour: np.ndarray) -> Tuple[List[Tuple[float, float]], float]:
        """
        Calculate the minimum bounding box (rotated rectangle) for a given contour.

        Args:
            contour (np.ndarray): The contour points of the detected shape.

        Returns:
            Tuple[List[Tuple[float, float]], float]: A list of four points representing the
            corners of the bounding box, and the length of the shortest side.
        """
        bounding_box = cv2.minAreaRect(contour)
        points = sorted(cv2.boxPoints(bounding_box), key=lambda x: x[0])
        index_1, index_4 = (0, 1) if points[1][1] > points[0][1] else (1, 0)
        index_2, index_3 = (2, 3) if points[3][1] > points[2][1] else (3, 2)
        box = [points[index_1], points[index_2], points[index_3], points[index_4]]
        return box, min(bounding_box[1])

    @staticmethod
    def _box_score(bitmap: np.ndarray, contour: np.ndarray) -> float:
        """
        Calculate the average score within the bounding box of a contour.

        Args:
            bitmap (np.ndarray): The output confidence map from the model.
            contour (np.ndarray): The contour of the detected shape.

        Returns:
            float: The average score of the pixels inside the contour region.
        """
        h, w = bitmap.shape[:2]
        contour = contour.reshape(-1, 2)
        x1, y1 = np.clip(contour.min(axis=0), 0, [w - 1, h - 1])
        x2, y2 = np.clip(contour.max(axis=0), 0, [w - 1, h - 1])
        mask = np.zeros((y2 - y1 + 1, x2 - x1 + 1), dtype=np.uint8)
        cv2.fillPoly(mask, [contour - [x1, y1]], 1)
        return cv2.mean(bitmap[y1 : y2 + 1, x1 : x2 + 1], mask)[0]

    @staticmethod
    def _expand_box(points: List[Tuple[float, float]]) -> np.ndarray:
        """
        Expand a polygonal shape slightly by a factor determined by the area-to-perimeter ratio.

        Args:
            points (List[Tuple[float, float]]): Points of the polygon to expand.

        Returns:
            np.ndarray: Expanded polygon points.
        """
        polygon = Polygon(points)
        distance = polygon.area / polygon.length
        offset = PyclipperOffset()
        offset.AddPath(points, JT_ROUND, ET_CLOSEDPOLYGON)
        expanded = np.array(offset.Execute(distance * 1.5)).reshape((-1, 2))
        return expanded

    def _filter_polygon(
        self, points: List[np.ndarray], shape: Tuple[int, int]
    ) -> np.ndarray:
        """
        Filter a set of polygons to include only valid ones that fit within an image shape
        and meet size constraints.

        Args:
            points (List[np.ndarray]): List of polygons to filter.
            shape (Tuple[int, int]): Shape of the image (height, width).

        Returns:
            np.ndarray: List of filtered polygons.
        """
        height, width = shape
        return np.array(
            [
                self._clockwise_order(point)
                for point in points
                if self._is_valid_polygon(point, width, height)
            ]
        )

    @staticmethod
    def _is_valid_polygon(point: np.ndarray, width: int, height: int) -> bool:
        """
        Check if a polygon is valid, meaning it fits within the image bounds
        and has sides of a minimum length.

        Args:
            point (np.ndarray): The polygon to validate.
            width (int): Image width.
            height (int): Image height.

        Returns:
            bool: Whether the polygon is valid or not.
        """
        return (
            point[:, 0].min() >= 0
            and point[:, 0].max() < width
            and point[:, 1].min() >= 0
            and point[:, 1].max() < height
            and np.linalg.norm(point[0] - point[1]) > 3
            and np.linalg.norm(point[0] - point[3]) > 3
        )

    @staticmethod
    def _clockwise_order(pts: np.ndarray) -> np.ndarray:
        """
        Arrange the points of a polygon in order: top-left, top-right, bottom-right, bottom-left.
        taken from https://github.com/PyImageSearch/imutils/blob/master/imutils/perspective.py

        Args:
            pts (np.ndarray): Array of points of the polygon.

        Returns:
            np.ndarray: Points ordered clockwise starting from top-left.
        """
        # Sort the points based on their x-coordinates
        x_sorted = pts[np.argsort(pts[:, 0]), :]

        # Separate the left-most and right-most points
        left_most = x_sorted[:2, :]
        right_most = x_sorted[2:, :]

        # Sort the left-most coordinates by y-coordinates
        left_most = left_most[np.argsort(left_most[:, 1]), :]
        (tl, bl) = left_most  # Top-left and bottom-left

        # Use the top-left as an anchor to calculate distances to right points
        # The further point will be the bottom-right
        distances = np.sqrt(
            ((tl[0] - right_most[:, 0]) ** 2) + ((tl[1] - right_most[:, 1]) ** 2)
        )

        # Sort right points by distance (descending)
        right_idx = np.argsort(distances)[::-1]
        (br, tr) = right_most[right_idx, :]  # Bottom-right and top-right

        return np.array([tl, tr, br, bl])

    @staticmethod
    def _sort_boxes(boxes):
        """
        Sort polygons based on their position in the image. If boxes are close in vertical
        position (within 5 pixels), sort them by horizontal position.

        Args:
            points: detected text boxes with shape [4, 2]

        Returns:
            List: sorted boxes(array) with shape [4, 2]
        """
        boxes.sort(key=lambda x: (x[0][1], x[0][0]))
        for i in range(len(boxes) - 1):
            for j in range(i, -1, -1):
                if abs(boxes[j + 1][0][1] - boxes[j][0][1]) < 5 and (
                    boxes[j + 1][0][0] < boxes[j][0][0]
                ):
                    temp = boxes[j]
                    boxes[j] = boxes[j + 1]
                    boxes[j + 1] = temp
                else:
                    break
        return boxes

    @staticmethod
    def _zero_pad(image: np.ndarray) -> np.ndarray:
        """
        Apply zero-padding to an image, ensuring its dimensions are at least 32x32.
        The padding is added only if needed.

        Args:
            image (np.ndarray): Input image.

        Returns:
            np.ndarray: Zero-padded image.
        """
        h, w, c = image.shape
        pad = np.zeros((max(32, h), max(32, w), c), np.uint8)
        pad[:h, :w, :] = image
        return pad

    @staticmethod
    def _preprocess_classification_image(image: np.ndarray) -> np.ndarray:
        """
        Preprocess a single image for classification by resizing, normalizing, and padding.

        This method resizes the input image to a fixed height of 48 pixels while adjusting
        the width dynamically up to a maximum of 192 pixels. The image is then normalized and
        padded to fit the required input dimensions for classification.

        Args:
            image (np.ndarray): Input image to preprocess.

        Returns:
            np.ndarray: Preprocessed and padded image.
        """
        # fixed height of 48, dynamic width up to 192
        input_shape = (3, 48, 192)
        input_c, input_h, input_w = input_shape

        h, w = image.shape[:2]
        ratio = w / h
        resized_w = min(input_w, math.ceil(input_h * ratio))

        resized_image = cv2.resize(image, (resized_w, input_h))

        # handle single-channel images (grayscale) if needed
        if input_c == 1 and resized_image.ndim == 2:
            resized_image = resized_image[np.newaxis, :, :]
        else:
            resized_image = resized_image.transpose((2, 0, 1))

        # normalize
        resized_image = (resized_image.astype("float32") / 255.0 - 0.5) / 0.5

        padded_image = np.zeros((input_c, input_h, input_w), dtype=np.float32)
        padded_image[:, :, :resized_w] = resized_image

        return padded_image

    def _process_classification_output(
        self, images: List[np.ndarray], outputs: List[np.ndarray]
    ) -> Tuple[List[np.ndarray], List[Tuple[str, float]]]:
        """
        Process the classification model output by matching labels with confidence scores.

        This method processes the outputs from the classification model and rotates images
        with high confidence of being labeled "180". It ensures that results are mapped to
        the original image order.

        Args:
            images (List[np.ndarray]): List of input images.
            outputs (List[np.ndarray]): Corresponding model outputs.

        Returns:
            Tuple[List[np.ndarray], List[Tuple[str, float]]]: A tuple of processed images and
            classification results (label and confidence score).
        """
        labels = ["0", "180"]
        results = [["", 0.0]] * len(images)
        indices = np.argsort(np.array([x.shape[1] / x.shape[0] for x in images]))

        outputs = np.stack(outputs)

        outputs = [
            (labels[idx], outputs[i, idx])
            for i, idx in enumerate(outputs.argmax(axis=1))
        ]

        for i in range(0, len(images), self.batch_size):
            for j in range(len(outputs)):
                label, score = outputs[j]
                results[indices[i + j]] = [label, score]
                # make sure we have high confidence if we need to flip a box
                if "180" in label and score >= 0.7:
                    images[indices[i + j]] = cv2.rotate(
                        images[indices[i + j]], cv2.ROTATE_180
                    )

        return images, results

    def _preprocess_recognition_image(
        self, camera: string, image: np.ndarray, max_wh_ratio: float
    ) -> np.ndarray:
        """
        Preprocess an image for recognition by dynamically adjusting its width.

        This method adjusts the width of the image based on the maximum width-to-height ratio
        while keeping the height fixed at 48 pixels. The image is then normalized and padded
        to fit the required input dimensions for recognition.

        Args:
            image (np.ndarray): Input image to preprocess.
            max_wh_ratio (float): Maximum width-to-height ratio for resizing.

        Returns:
            np.ndarray: Preprocessed and padded image.
        """
        # fixed height of 48, dynamic width based on ratio
        input_shape = [3, 48, 320]
        input_h, input_w = input_shape[1], input_shape[2]

        assert image.shape[2] == input_shape[0], "Unexpected number of image channels."

        # convert to grayscale
        if image.shape[2] == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image

        if self.config.cameras[camera].lpr.enhancement > 3:
            # denoise using a configurable pixel neighborhood value
            logger.debug(
                f"{camera}: Denoising recognition image (level: {self.config.cameras[camera].lpr.enhancement})"
            )
            smoothed = cv2.bilateralFilter(
                gray,
                d=5 + self.config.cameras[camera].lpr.enhancement,
                sigmaColor=10 * self.config.cameras[camera].lpr.enhancement,
                sigmaSpace=10 * self.config.cameras[camera].lpr.enhancement,
            )
            sharpening_kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
            processed = cv2.filter2D(smoothed, -1, sharpening_kernel)
        else:
            processed = gray

        if self.config.cameras[camera].lpr.enhancement > 0:
            # always apply the same CLAHE for contrast enhancement when enhancement level is above 3
            logger.debug(
                f"{camera}: Enhancing contrast for recognition image (level: {self.config.cameras[camera].lpr.enhancement})"
            )
            grid_size = (
                max(4, input_w // 40),
                max(4, input_h // 40),
            )
            clahe = cv2.createCLAHE(
                clipLimit=2 if self.config.cameras[camera].lpr.enhancement > 5 else 1.5,
                tileGridSize=grid_size,
            )
            enhanced = clahe.apply(processed)
        else:
            enhanced = processed

        # Convert back to 3-channel for model compatibility
        image = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2RGB)

        # dynamically adjust input width based on max_wh_ratio
        input_w = int(input_h * max_wh_ratio)

        # check for model-specific input width
        model_input_w = self.model_runner.recognition_model.runner.get_input_width()
        if isinstance(model_input_w, int) and model_input_w > 0:
            input_w = model_input_w

        h, w = image.shape[:2]
        aspect_ratio = w / h
        resized_w = min(input_w, math.ceil(input_h * aspect_ratio))

        resized_image = cv2.resize(image, (resized_w, input_h))
        resized_image = resized_image.transpose((2, 0, 1))
        resized_image = (resized_image.astype("float32") / 255.0 - 0.5) / 0.5

        # Compute mean pixel value of the resized image (per channel)
        mean_pixel = np.mean(resized_image, axis=(1, 2), keepdims=True)
        padded_image = np.full(
            (input_shape[0], input_h, input_w), mean_pixel, dtype=np.float32
        )
        padded_image[:, :, :resized_w] = resized_image

        if False:
            current_time = int(datetime.datetime.now().timestamp() * 1000)
            cv2.imwrite(
                f"debug/frames/preprocessed_recognition_{current_time}.jpg",
                image,
            )

        return padded_image

    @staticmethod
    def _crop_license_plate(image: np.ndarray, points: np.ndarray) -> np.ndarray:
        """
        Crop the license plate from the image using four corner points.

        This method crops the region containing the license plate by using the perspective
        transformation based on four corner points. If the resulting image is significantly
        taller than wide, the image is rotated to the correct orientation.

        Args:
            image (np.ndarray): Input image containing the license plate.
            points (np.ndarray): Four corner points defining the plate's position.

        Returns:
            np.ndarray: Cropped and potentially rotated license plate image.
        """
        assert len(points) == 4, "shape of points must be 4*2"
        points = points.astype(np.float32)
        crop_width = int(
            max(
                np.linalg.norm(points[0] - points[1]),
                np.linalg.norm(points[2] - points[3]),
            )
        )
        crop_height = int(
            max(
                np.linalg.norm(points[0] - points[3]),
                np.linalg.norm(points[1] - points[2]),
            )
        )
        pts_std = np.float32(
            [[0, 0], [crop_width, 0], [crop_width, crop_height], [0, crop_height]]
        )
        matrix = cv2.getPerspectiveTransform(points, pts_std)
        image = cv2.warpPerspective(
            image,
            matrix,
            (crop_width, crop_height),
            borderMode=cv2.BORDER_REPLICATE,
            flags=cv2.INTER_CUBIC,
        )
        height, width = image.shape[0:2]
        if height * 1.0 / width >= 1.5:
            image = cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
        return image

    def _detect_license_plate(
        self, camera: string, input: np.ndarray
    ) -> tuple[int, int, int, int]:
        """
        Use a lightweight YOLOv9 model to detect license plates for users without Frigate+

        Return the dimensions of the detected plate as [x1, y1, x2, y2].
        """
        try:
            predictions = self.model_runner.yolov9_detection_model(input)
        except Exception as e:
            logger.warning(f"Error running YOLOv9 license plate detection model: {e}")
            return None

        confidence_threshold = self.lpr_config.detection_threshold

        top_score = -1
        top_box = None

        img_h, img_w = input.shape[0], input.shape[1]

        # Calculate resized dimensions and padding based on _preprocess_inputs
        if img_w > img_h:
            resized_h = int(((img_h / img_w) * LPR_EMBEDDING_SIZE) // 4 * 4)
            resized_w = LPR_EMBEDDING_SIZE
            x_offset = (LPR_EMBEDDING_SIZE - resized_w) // 2
            y_offset = (LPR_EMBEDDING_SIZE - resized_h) // 2
            scale_x = img_w / resized_w
            scale_y = img_h / resized_h
        else:
            resized_w = int(((img_w / img_h) * LPR_EMBEDDING_SIZE) // 4 * 4)
            resized_h = LPR_EMBEDDING_SIZE
            x_offset = (LPR_EMBEDDING_SIZE - resized_w) // 2
            y_offset = (LPR_EMBEDDING_SIZE - resized_h) // 2
            scale_x = img_w / resized_w
            scale_y = img_h / resized_h

        # Loop over predictions
        for prediction in predictions:
            score = prediction[6]
            if score >= confidence_threshold:
                bbox = prediction[1:5]
                # Adjust for padding and scale to original image
                bbox[0] = (bbox[0] - x_offset) * scale_x
                bbox[1] = (bbox[1] - y_offset) * scale_y
                bbox[2] = (bbox[2] - x_offset) * scale_x
                bbox[3] = (bbox[3] - y_offset) * scale_y

                if score > top_score:
                    top_score = score
                    top_box = bbox

                if score > top_score:
                    top_score = score
                    top_box = bbox

        # Return the top scoring bounding box if found
        if top_box is not None:
            # expand box by 5% to help with OCR
            expansion = (top_box[2:] - top_box[:2]) * 0.05

            # Expand box
            expanded_box = np.array(
                [
                    top_box[0] - expansion[0],  # x1
                    top_box[1] - expansion[1],  # y1
                    top_box[2] + expansion[0],  # x2
                    top_box[3] + expansion[1],  # y2
                ]
            ).clip(0, [input.shape[1], input.shape[0]] * 2)

            logger.debug(
                f"{camera}: Found license plate. Bounding box: {expanded_box.astype(int)}"
            )
            return tuple(expanded_box.astype(int))
        else:
            return None  # No detection above the threshold

    def _get_cluster_rep(
        self, plates: List[dict]
    ) -> Tuple[str, float, List[float], int]:
        """
        Cluster plate variants and select the representative from the best cluster.
        """
        if len(plates) == 0:
            return "", 0.0, [], 0

        if len(plates) == 1:
            p = plates[0]
            return p["plate"], p["conf"], p["char_confidences"], p["area"]

        # Log initial variants
        logger.debug(f"Clustering {len(plates)} plate variants:")
        for i, p in enumerate(plates):
            logger.debug(
                f"  Variant {i + 1}: '{p['plate']}' (conf: {p['conf']:.3f}, area: {p['area']})"
            )

        clusters = []
        for i, plate in enumerate(plates):
            merged = False
            for j, cluster in enumerate(clusters):
                sims = [
                    JaroWinkler.similarity(plate["plate"], v["plate"]) for v in cluster
                ]
                if len(sims) > 0:
                    avg_sim = sum(sims) / len(sims)
                    if avg_sim >= self.cluster_threshold:
                        cluster.append(plate)
                        logger.debug(
                            f"  Merged variant {i + 1} '{plate['plate']}' (conf: {plate['conf']:.3f}) into cluster {j + 1} (avg_sim: {avg_sim:.3f})"
                        )
                        merged = True
                        break
            if not merged:
                clusters.append([plate])
                logger.debug(
                    f"  Started new cluster {len(clusters)} with variant {i + 1} '{plate['plate']}' (conf: {plate['conf']:.3f})"
                )

        if not clusters:
            return "", 0.0, [], 0

        # Log cluster summaries
        for j, cluster in enumerate(clusters):
            cluster_size = len(cluster)
            max_conf = max(v["conf"] for v in cluster)
            sample_variants = [v["plate"] for v in cluster[:3]]  # First 3 for brevity
            logger.debug(
                f"  Cluster {j + 1}: size {cluster_size}, max conf {max_conf:.3f}, variants: {sample_variants}{'...' if cluster_size > 3 else ''}"
            )

        # Best cluster: largest size, tiebroken by max conf
        def cluster_score(c):
            return (len(c), max(v["conf"] for v in c))

        best_cluster_idx = max(
            range(len(clusters)), key=lambda j: cluster_score(clusters[j])
        )
        best_cluster = clusters[best_cluster_idx]
        best_size, best_max_conf = cluster_score(best_cluster)
        logger.debug(
            f"  Selected best cluster {best_cluster_idx + 1}: size {best_size}, max conf {best_max_conf:.3f}"
        )

        # Rep: highest conf in best cluster
        rep = max(best_cluster, key=lambda v: v["conf"])
        logger.debug(
            f"  Selected rep from best cluster: '{rep['plate']}' (conf: {rep['conf']:.3f})"
        )
        logger.debug(
            f"  Final clustered plate: '{rep['plate']}' (conf: {rep['conf']:.3f})"
        )

        return rep["plate"], rep["conf"], rep["char_confidences"], rep["area"]

    def _generate_plate_event(self, camera: str, plate: str, plate_score: float) -> str:
        """Generate a unique ID for a plate event based on camera and text."""
        now = datetime.datetime.now().timestamp()
        rand_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        event_id = f"{now}-{rand_id}"

        self.event_metadata_publisher.publish(
            (
                now,
                camera,
                "license_plate",
                event_id,
                True,
                plate_score,
                None,
                plate,
            ),
            EventMetadataTypeEnum.lpr_event_create.value,
        )
        return event_id

    def lpr_process(
        self, obj_data: dict[str, Any], frame: np.ndarray, dedicated_lpr: bool = False
    ):
        """Look for license plates in image."""
        self.metrics.alpr_pps.value = self.plates_rec_second.eps()
        self.metrics.yolov9_lpr_pps.value = self.plates_det_second.eps()
        camera = obj_data if dedicated_lpr else obj_data["camera"]
        current_time = int(datetime.datetime.now().timestamp())

        if not self.config.cameras[camera].lpr.enabled:
            return

        # dedicated LPR cam without frigate+
        if dedicated_lpr:
            id = "dedicated-lpr"

            rgb = cv2.cvtColor(frame, cv2.COLOR_YUV2BGR_I420)

            # apply motion mask
            rgb[self.config.cameras[obj_data].motion.mask == 0] = [0, 0, 0]

            if WRITE_DEBUG_IMAGES:
                cv2.imwrite(
                    f"debug/frames/dedicated_lpr_masked_{current_time}.jpg",
                    rgb,
                )

            yolov9_start = datetime.datetime.now().timestamp()
            license_plate = self._detect_license_plate(camera, rgb)

            logger.debug(
                f"{camera}: YOLOv9 LPD inference time: {(datetime.datetime.now().timestamp() - yolov9_start) * 1000:.2f} ms"
            )
            self.plates_det_second.update()
            self.plate_det_speed.update(
                datetime.datetime.now().timestamp() - yolov9_start
            )

            if not license_plate:
                logger.debug(f"{camera}: Detected no license plates in full frame.")
                return

            license_plate_area = (license_plate[2] - license_plate[0]) * (
                license_plate[3] - license_plate[1]
            )
            if license_plate_area < self.config.cameras[camera].lpr.min_area:
                logger.debug(f"{camera}: License plate area below minimum threshold.")
                return

            license_plate_frame = rgb[
                license_plate[1] : license_plate[3],
                license_plate[0] : license_plate[2],
            ]

            # Double the size for better OCR
            license_plate_frame = cv2.resize(
                license_plate_frame,
                (
                    int(2 * license_plate_frame.shape[1]),
                    int(2 * license_plate_frame.shape[0]),
                ),
            )

        else:
            id = obj_data["id"]

            # don't run for non car/motorcycle or non license plate (dedicated lpr with frigate+) objects
            if (
                obj_data.get("label") not in self.lp_objects
                and obj_data.get("label") != "license_plate"
            ):
                logger.debug(
                    f"{camera}: Not a processing license plate for non car/motorcycle object."
                )
                return

            # don't run for non-stationary objects with no position changes to avoid processing uncertain moving objects
            # zero position_changes is the initial state after registering a new tracked object
            # LPR will run 2 frames after detect.min_initialized is reached
            if obj_data.get("position_changes", 0) == 0 and not obj_data.get(
                "stationary", False
            ):
                logger.debug(
                    f"{camera}: Skipping LPR for non-stationary {obj_data['label']} object {id} with no position changes.  (Detected in {self.config.cameras[camera].detect.min_initialized + 1} concurrent frames, threshold to run is {self.config.cameras[camera].detect.min_initialized + 2} frames)"
                )
                return

            # run for stationary objects for a limited time after they become stationary
            if obj_data.get("stationary") == True:
                threshold = self.config.cameras[camera].detect.stationary.threshold
                if obj_data.get("motionless_count", 0) >= threshold:
                    frames_since_stationary = (
                        obj_data.get("motionless_count", 0) - threshold
                    )
                    fps = self.config.cameras[camera].detect.fps
                    time_since_stationary = frames_since_stationary / fps

                    # only print this log for a short time to avoid log spam
                    if (
                        self.stationary_scan_duration
                        < time_since_stationary
                        <= self.stationary_scan_duration + 1
                    ):
                        logger.debug(
                            f"{camera}: {obj_data.get('label', 'An')} object {id} has been stationary for > {self.stationary_scan_duration} seconds, skipping LPR."
                        )

                    if time_since_stationary > self.stationary_scan_duration:
                        return

            license_plate: Optional[dict[str, Any]] = None

            if "license_plate" not in self.config.cameras[camera].objects.track:
                logger.debug(f"{camera}: Running manual license_plate detection.")

                car_box = obj_data.get("box")

                if not car_box:
                    return

                rgb = cv2.cvtColor(frame, cv2.COLOR_YUV2BGR_I420)

                # apply motion mask
                rgb[self.config.cameras[camera].motion.mask == 0] = [0, 0, 0]

                left, top, right, bottom = car_box
                car = rgb[top:bottom, left:right]

                # double the size of the car for better box detection
                car = cv2.resize(car, (int(2 * car.shape[1]), int(2 * car.shape[0])))

                if WRITE_DEBUG_IMAGES:
                    cv2.imwrite(
                        f"debug/frames/car_frame_{current_time}.jpg",
                        car,
                    )

                yolov9_start = datetime.datetime.now().timestamp()
                license_plate = self._detect_license_plate(camera, car)
                logger.debug(
                    f"{camera}: YOLOv9 LPD inference time: {(datetime.datetime.now().timestamp() - yolov9_start) * 1000:.2f} ms"
                )
                self.plates_det_second.update()
                self.plate_det_speed.update(
                    datetime.datetime.now().timestamp() - yolov9_start
                )

                if not license_plate:
                    logger.debug(
                        f"{camera}: Detected no license plates for car/motorcycle object."
                    )
                    return

                license_plate_area = max(
                    0,
                    (license_plate[2] - license_plate[0])
                    * (license_plate[3] - license_plate[1]),
                )

                # check that license plate is valid
                # double the value because we've doubled the size of the car
                if license_plate_area < self.config.cameras[camera].lpr.min_area * 2:
                    logger.debug(f"{camera}: License plate is less than min_area")
                    return

                license_plate_frame = car[
                    license_plate[1] : license_plate[3],
                    license_plate[0] : license_plate[2],
                ]
            else:
                # don't run for object without attributes if this isn't dedicated lpr with frigate+
                if (
                    not obj_data.get("current_attributes")
                    and obj_data.get("label") != "license_plate"
                ):
                    logger.debug(f"{camera}: No attributes to parse.")
                    return

                if obj_data.get("label") in self.lp_objects:
                    attributes: list[dict[str, Any]] = obj_data.get(
                        "current_attributes", []
                    )
                    for attr in attributes:
                        if attr.get("label") != "license_plate":
                            continue

                        if license_plate is None or attr.get(
                            "score", 0.0
                        ) > license_plate.get("score", 0.0):
                            license_plate = attr

                    # no license plates detected in this frame
                    if not license_plate:
                        return

                # we are using dedicated lpr with frigate+
                if obj_data.get("label") == "license_plate":
                    license_plate = obj_data

                license_plate_box = license_plate.get("box")

                # check that license plate is valid
                if (
                    not license_plate_box
                    or area(license_plate_box)
                    < self.config.cameras[camera].lpr.min_area
                ):
                    logger.debug(
                        f"{camera}: Area for license plate box {area(license_plate_box)} is less than min_area {self.config.cameras[camera].lpr.min_area}"
                    )
                    return

                license_plate_frame = cv2.cvtColor(frame, cv2.COLOR_YUV2BGR_I420)

                # Expand the license_plate_box by 10%
                box_array = np.array(license_plate_box)
                expansion = (box_array[2:] - box_array[:2]) * 0.10
                expanded_box = np.array(
                    [
                        license_plate_box[0] - expansion[0],
                        license_plate_box[1] - expansion[1],
                        license_plate_box[2] + expansion[0],
                        license_plate_box[3] + expansion[1],
                    ]
                ).clip(
                    0, [license_plate_frame.shape[1], license_plate_frame.shape[0]] * 2
                )

                # Crop using the expanded box
                license_plate_frame = license_plate_frame[
                    int(expanded_box[1]) : int(expanded_box[3]),
                    int(expanded_box[0]) : int(expanded_box[2]),
                ]

            # double the size of the license plate frame for better OCR
            license_plate_frame = cv2.resize(
                license_plate_frame,
                (
                    int(2 * license_plate_frame.shape[1]),
                    int(2 * license_plate_frame.shape[0]),
                ),
            )

            if WRITE_DEBUG_IMAGES:
                cv2.imwrite(
                    f"debug/frames/license_plate_frame_{current_time}.jpg",
                    license_plate_frame,
                )

        logger.debug(f"{camera}: Running plate recognition for id: {id}.")

        # run detection, returns results sorted by confidence, best first
        start = datetime.datetime.now().timestamp()
        license_plates, confidences, areas = self._process_license_plate(
            camera, id, license_plate_frame
        )
        self.plates_rec_second.update()
        self.plate_rec_speed.update(datetime.datetime.now().timestamp() - start)

        if license_plates:
            for plate, confidence, text_area in zip(license_plates, confidences, areas):
                avg_confidence = (
                    (sum(confidence) / len(confidence)) if confidence else 0
                )

                logger.debug(
                    f"{camera}: Detected text: {plate} (average confidence: {avg_confidence:.2f}, area: {text_area} pixels)"
                )
        else:
            logger.debug(f"{camera}: No text detected")
            return

        top_plate, top_char_confidences, top_area = (
            license_plates[0],
            confidences[0],
            areas[0],
        )
        avg_confidence = (
            (sum(top_char_confidences) / len(top_char_confidences))
            if top_char_confidences
            else 0
        )

        # Check against minimum confidence threshold
        if avg_confidence < self.lpr_config.recognition_threshold:
            logger.debug(
                f"{camera}: Average character confidence {avg_confidence} is less than recognition_threshold ({self.lpr_config.recognition_threshold})"
            )
            return

        # For dedicated LPR cameras, match or assign plate ID using Jaro-Winkler distance
        if (
            dedicated_lpr
            and "license_plate" not in self.config.cameras[camera].objects.track
        ):
            plate_id = None

            for existing_id, data in self.detected_license_plates.items():
                if (
                    data["camera"] == camera
                    and data["last_seen"] is not None
                    and current_time - data["last_seen"]
                    <= self.config.cameras[camera].lpr.expire_time
                ):
                    similarity = JaroWinkler.similarity(data["plate"], top_plate)
                    if similarity >= self.similarity_threshold:
                        plate_id = existing_id
                        logger.debug(
                            f"{camera}: Matched plate {top_plate} to {data['plate']} (similarity: {similarity:.3f})"
                        )
                        break
            if plate_id is None:
                plate_id = self._generate_plate_event(camera, top_plate, avg_confidence)
                logger.debug(
                    f"{camera}: New plate event for dedicated LPR camera {plate_id}: {top_plate}"
                )
            else:
                logger.debug(
                    f"{camera}: Matched existing plate event for dedicated LPR camera {plate_id}: {top_plate}"
                )
                self.detected_license_plates[plate_id]["last_seen"] = current_time

            id = plate_id

        is_new = id not in self.detected_license_plates

        # Collect variant
        variant = {
            "plate": top_plate,
            "conf": avg_confidence,
            "char_confidences": top_char_confidences,
            "area": top_area,
            "timestamp": current_time,
        }

        # Initialize or append to plates
        self.detected_license_plates.setdefault(id, {"plates": [], "camera": camera})
        self.detected_license_plates[id]["plates"].append(variant)

        # Prune old variants - this is probably higher than it needs to be
        # since we don't detect a plate every frame
        num_variants = self.config.cameras[camera].detect.fps * 5
        if len(self.detected_license_plates[id]["plates"]) > num_variants:
            self.detected_license_plates[id]["plates"] = self.detected_license_plates[
                id
            ]["plates"][-num_variants:]

        # Cluster and select rep
        plates = self.detected_license_plates[id]["plates"]
        rep_plate, rep_conf, rep_char_confs, rep_area = self._get_cluster_rep(plates)

        if rep_plate != top_plate:
            logger.debug(
                f"{camera}: Clustering changed top plate '{top_plate}' (conf: {avg_confidence:.3f}) to rep '{rep_plate}' (conf: {rep_conf:.3f})"
            )

        # Update stored rep
        self.detected_license_plates[id].update(
            {
                "plate": rep_plate,
                "char_confidences": rep_char_confs,
                "area": rep_area,
                "last_seen": current_time if dedicated_lpr else None,
            }
        )

        if not dedicated_lpr:
            self.detected_license_plates[id]["obj_data"] = obj_data

        if is_new:
            if camera not in self.camera_current_cars:
                self.camera_current_cars[camera] = []
            self.camera_current_cars[camera].append(id)

        # Determine subLabel based on known plates, use regex matching
        # Default to the detected plate, use label name if there's a match
        sub_label = None
        try:
            sub_label = next(
                (
                    label
                    for label, plates_list in self.lpr_config.known_plates.items()
                    if any(
                        re.match(f"^{plate}$", rep_plate)
                        or Levenshtein.distance(plate, rep_plate)
                        <= self.lpr_config.match_distance
                        for plate in plates_list
                    )
                ),
                None,
            )
        except re.error:
            logger.error(
                f"{camera}: Invalid regex in known plates configuration: {self.lpr_config.known_plates}"
            )

        # If it's a known plate, publish to sub_label
        if sub_label is not None:
            self.sub_label_publisher.publish(
                (id, sub_label, rep_conf), EventMetadataTypeEnum.sub_label.value
            )

        # always publish to recognized_license_plate field
        self.requestor.send_data(
            "tracked_object_update",
            json.dumps(
                {
                    "type": TrackedObjectUpdateTypesEnum.lpr,
                    "name": sub_label,
                    "plate": rep_plate,
                    "score": rep_conf,
                    "id": id,
                    "camera": camera,
                    "timestamp": start,
                }
            ),
        )
        self.sub_label_publisher.publish(
            (id, "recognized_license_plate", rep_plate, rep_conf),
            EventMetadataTypeEnum.attribute.value,
        )

        # save the best snapshot for dedicated lpr cams not using frigate+
        if (
            dedicated_lpr
            and "license_plate" not in self.config.cameras[camera].objects.track
        ):
            logger.debug(
                f"{camera}: Writing snapshot for {id}, {rep_plate}, {current_time}"
            )
            frame_bgr = cv2.cvtColor(frame, cv2.COLOR_YUV2BGR_I420)
            _, encoded_img = cv2.imencode(".jpg", frame_bgr)
            self.sub_label_publisher.publish(
                (base64.b64encode(encoded_img).decode("ASCII"), id, camera),
                EventMetadataTypeEnum.save_lpr_snapshot.value,
            )

    def handle_request(self, topic, request_data) -> dict[str, Any] | None:
        return

    def lpr_expire(self, object_id: str, camera: str):
        if object_id in self.detected_license_plates:
            self.detected_license_plates.pop(object_id)

            if object_id in self.camera_current_cars.get(camera, []):
                self.camera_current_cars[camera].remove(object_id)


class CTCDecoder:
    """
    A decoder for interpreting the output of a CTC (Connectionist Temporal Classification) model.

    This decoder converts the model's output probabilities into readable sequences of characters
    while removing duplicates and handling blank tokens. It also calculates the confidence scores
    for each decoded character sequence.
    """

    def __init__(self, character_dict_path=None):
        """
        Initializes the CTCDecoder.
        :param character_dict_path: Path to the character dictionary file.
                                    If None, a default (English-focused) list is used.
                                    For Chinese models, this should point to the correct
                                    character dictionary file provided with the model.
        """
        self.characters = []
        if character_dict_path and os.path.exists(character_dict_path):
            with open(character_dict_path, "r", encoding="utf-8") as f:
                self.characters = (
                    ["blank"] + [line.strip() for line in f if line.strip()] + [" "]
                )
        else:
            self.characters = [
                "blank",
                "0",
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "9",
                ":",
                ";",
                "<",
                "=",
                ">",
                "?",
                "@",
                "A",
                "B",
                "C",
                "D",
                "E",
                "F",
                "G",
                "H",
                "I",
                "J",
                "K",
                "L",
                "M",
                "N",
                "O",
                "P",
                "Q",
                "R",
                "S",
                "T",
                "U",
                "V",
                "W",
                "X",
                "Y",
                "Z",
                "[",
                "\\",
                "]",
                "^",
                "_",
                "`",
                "a",
                "b",
                "c",
                "d",
                "e",
                "f",
                "g",
                "h",
                "i",
                "j",
                "k",
                "l",
                "m",
                "n",
                "o",
                "p",
                "q",
                "r",
                "s",
                "t",
                "u",
                "v",
                "w",
                "x",
                "y",
                "z",
                "{",
                "|",
                "}",
                "~",
                "!",
                '"',
                "#",
                "$",
                "%",
                "&",
                "'",
                "(",
                ")",
                "*",
                "+",
                ",",
                "-",
                ".",
                "/",
                " ",
                " ",
            ]

        self.char_map = {i: char for i, char in enumerate(self.characters)}

    def __call__(
        self, outputs: List[np.ndarray]
    ) -> Tuple[List[str], List[List[float]]]:
        """
        Decode a batch of model outputs into character sequences and their confidence scores.

        The method takes the output probability distributions for each time step and uses
        the best path decoding strategy. It then merges repeating characters and ignores
        blank tokens. Confidence scores for each decoded character are also calculated.

        Args:
            outputs (List[np.ndarray]): A list of model outputs, where each element is
                                        a probability distribution for each time step.

        Returns:
            Tuple[List[str], List[List[float]]]: A tuple of decoded character sequences
                                                and confidence scores for each sequence.
        """
        results = []
        confidences = []
        for output in outputs:
            seq_log_probs = np.log(output + 1e-8)
            best_path = np.argmax(seq_log_probs, axis=1)

            merged_path = []
            merged_probs = []
            for t, char_index in enumerate(best_path):
                if char_index != 0 and (t == 0 or char_index != best_path[t - 1]):
                    merged_path.append(char_index)
                    merged_probs.append(seq_log_probs[t, char_index])

            result = "".join(self.char_map.get(idx, "") for idx in merged_path)
            results.append(result)

            confidence = np.exp(merged_probs).tolist()
            confidences.append(confidence)

        return results, confidences
