"""Handle processing images for face detection and recognition."""

import datetime
import logging
import math
import re
from typing import List, Optional, Tuple

import cv2
import numpy as np
from Levenshtein import distance
from pyclipper import ET_CLOSEDPOLYGON, JT_ROUND, PyclipperOffset
from shapely.geometry import Polygon

from frigate.comms.event_metadata_updater import EventMetadataTypeEnum
from frigate.util.image import area

logger = logging.getLogger(__name__)

WRITE_DEBUG_IMAGES = False


class LicensePlateProcessingMixin:
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.requires_license_plate_detection = (
            "license_plate" not in self.config.objects.all_objects
        )

        self.ctc_decoder = CTCDecoder()

        self.batch_size = 6

        # Detection specific parameters
        self.min_size = 8
        self.max_size = 960
        self.box_thresh = 0.6
        self.mask_thresh = 0.6

    def _detect(self, image: np.ndarray) -> List[np.ndarray]:
        """
        Detect possible license plates in the input image by first resizing and normalizing it,
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

        outputs = self.model_runner.detection_model([normalized_image])[0]
        outputs = outputs[0, :, :]

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

        outputs = self.model_runner.classification_model(norm_images)

        return self._process_classification_output(images, outputs)

    def _recognize(
        self, images: List[np.ndarray]
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

        # sort images by aspect ratio for processing
        indices = np.argsort(np.array([x.shape[1] / x.shape[0] for x in images]))

        for index in range(0, num_images, self.batch_size):
            input_h, input_w = input_shape[1], input_shape[2]
            max_wh_ratio = input_w / input_h
            norm_images = []

            # calculate the maximum aspect ratio in the current batch
            for i in range(index, min(num_images, index + self.batch_size)):
                h, w = images[indices[i]].shape[0:2]
                max_wh_ratio = max(max_wh_ratio, w * 1.0 / h)

            # preprocess the images based on the max aspect ratio
            for i in range(index, min(num_images, index + self.batch_size)):
                norm_image = self._preprocess_recognition_image(
                    images[indices[i]], max_wh_ratio
                )
                norm_image = norm_image[np.newaxis, :]
                norm_images.append(norm_image)

        outputs = self.model_runner.recognition_model(norm_images)
        return self.ctc_decoder(outputs)

    def _process_license_plate(
        self, image: np.ndarray
    ) -> Tuple[List[str], List[float], List[int]]:
        """
        Complete pipeline for detecting, classifying, and recognizing license plates in the input image.

        Args:
            image (np.ndarray): The input image in which to detect, classify, and recognize license plates.

        Returns:
            Tuple[List[str], List[float], List[int]]: Detected license plate texts, confidence scores, and areas of the plates.
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
            logger.debug("No boxes found by OCR detector model")
            return [], [], []

        boxes = self._sort_boxes(list(boxes))
        plate_images = [self._crop_license_plate(image, x) for x in boxes]

        if WRITE_DEBUG_IMAGES:
            current_time = int(datetime.datetime.now().timestamp())
            for i, img in enumerate(plate_images):
                cv2.imwrite(
                    f"debug/frames/license_plate_cropped_{current_time}_{i + 1}.jpg",
                    img,
                )

        # keep track of the index of each image for correct area calc later
        sorted_indices = np.argsort([x.shape[1] / x.shape[0] for x in plate_images])
        reverse_mapping = {
            idx: original_idx for original_idx, idx in enumerate(sorted_indices)
        }

        results, confidences = self._recognize(plate_images)

        if results:
            license_plates = [""] * len(plate_images)
            average_confidences = [[0.0]] * len(plate_images)
            areas = [0] * len(plate_images)

            # map results back to original image order
            for i, (plate, conf) in enumerate(zip(results, confidences)):
                original_idx = reverse_mapping[i]

                height, width = plate_images[original_idx].shape[:2]
                area = height * width

                average_confidence = conf

                # set to True to write each cropped image for debugging
                if False:
                    save_image = cv2.cvtColor(
                        plate_images[original_idx], cv2.COLOR_RGB2BGR
                    )
                    filename = f"debug/frames/plate_{original_idx}_{plate}_{area}.jpg"
                    cv2.imwrite(filename, save_image)

                license_plates[original_idx] = plate
                average_confidences[original_idx] = average_confidence
                areas[original_idx] = area

            # Filter out plates that have a length of less than min_plate_length characters
            # or that don't match the expected format (if defined)
            # Sort by area, then by plate length, then by confidence all desc
            filtered_data = []
            for plate, conf, area in zip(license_plates, average_confidences, areas):
                if len(plate) < self.lpr_config.min_plate_length:
                    logger.debug(
                        f"Filtered out '{plate}' due to length ({len(plate)} < {self.lpr_config.min_plate_length})"
                    )
                    continue

                if self.lpr_config.format and not re.fullmatch(
                    self.lpr_config.format, plate
                ):
                    logger.debug(f"Filtered out '{plate}' due to format mismatch")
                    continue

                filtered_data.append((plate, conf, area))

            sorted_data = sorted(
                filtered_data,
                key=lambda x: (x[2], len(x[0]), x[1]),
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
            points, min_side = self._get_min_boxes(contour)
            logger.debug(f"min side {index}, {min_side}")

            if min_side < self.min_size:
                continue

            points = np.array(points)

            score = self._box_score(output, contour)
            logger.debug(f"box score {index}, {score}")
            if self.box_thresh > score:
                continue

            polygon = Polygon(points)
            distance = polygon.area / polygon.length

            # Use pyclipper to shrink the polygon slightly based on the computed distance.
            offset = PyclipperOffset()
            offset.AddPath(points, JT_ROUND, ET_CLOSEDPOLYGON)
            points = np.array(offset.Execute(distance * 1.75)).reshape((-1, 1, 2))

            # get the minimum bounding box around the shrunken polygon.
            box, min_side = self._get_min_boxes(points)

            if min_side < self.min_size + 2:
                continue

            box = np.array(box)

            # normalize and clip box coordinates to fit within the destination image size.
            box[:, 0] = np.clip(np.round(box[:, 0] / width * dest_width), 0, dest_width)
            box[:, 1] = np.clip(
                np.round(box[:, 1] / height * dest_height), 0, dest_height
            )

            boxes.append(box.astype("int32"))
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
        self, image: np.ndarray, max_wh_ratio: float
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

        # dynamically adjust input width based on max_wh_ratio
        input_w = int(input_h * max_wh_ratio)

        # check for model-specific input width
        model_input_w = self.model_runner.recognition_model.runner.ort.get_inputs()[
            0
        ].shape[3]
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

    def _detect_license_plate(self, input: np.ndarray) -> tuple[int, int, int, int]:
        """
        Use a lightweight YOLOv9 model to detect license plates for users without Frigate+

        Return the dimensions of the detected plate as [x1, y1, x2, y2].
        """
        predictions = self.model_runner.yolov9_detection_model(input)

        confidence_threshold = self.lpr_config.detection_threshold

        top_score = -1
        top_box = None

        # Loop over predictions
        for prediction in predictions:
            score = prediction[6]
            if score >= confidence_threshold:
                bbox = prediction[1:5]
                # Scale boxes back to original image size
                scale_x = input.shape[1] / 256
                scale_y = input.shape[0] / 256
                bbox[0] *= scale_x
                bbox[1] *= scale_y
                bbox[2] *= scale_x
                bbox[3] *= scale_y

                if score > top_score:
                    top_score = score
                    top_box = bbox

        # Return the top scoring bounding box if found
        if top_box is not None:
            # expand box by 30% to help with OCR
            expansion = (top_box[2:] - top_box[:2]) * 0.30

            # Expand box
            expanded_box = np.array(
                [
                    top_box[0] - expansion[0],  # x1
                    top_box[1] - expansion[1],  # y1
                    top_box[2] + expansion[0],  # x2
                    top_box[3] + expansion[1],  # y2
                ]
            ).clip(0, [input.shape[1], input.shape[0]] * 2)

            logger.debug(f"Found license plate: {expanded_box.astype(int)}")
            return tuple(expanded_box.astype(int))
        else:
            return None  # No detection above the threshold

    def _should_keep_previous_plate(
        self, id, top_plate, top_char_confidences, top_area, avg_confidence
    ):
        if id not in self.detected_license_plates:
            return False

        prev_data = self.detected_license_plates[id]
        prev_plate = prev_data["plate"]
        prev_char_confidences = prev_data["char_confidences"]
        prev_area = prev_data["area"]
        prev_avg_confidence = (
            sum(prev_char_confidences) / len(prev_char_confidences)
            if prev_char_confidences
            else 0
        )

        # 1. Normalize metrics
        # Length score - use relative comparison
        # If lengths are equal, score is 0.5 for both
        # If one is longer, it gets a higher score up to 1.0
        max_length_diff = 4  # Maximum expected difference in plate lengths
        length_diff = len(top_plate) - len(prev_plate)
        curr_length_score = 0.5 + (
            length_diff / (2 * max_length_diff)
        )  # Normalize to 0-1
        curr_length_score = max(0, min(1, curr_length_score))  # Clamp to 0-1
        prev_length_score = 1 - curr_length_score  # Inverse relationship

        # Area score (normalize based on max of current and previous)
        max_area = max(top_area, prev_area)
        curr_area_score = top_area / max_area
        prev_area_score = prev_area / max_area

        # Average confidence score (already normalized 0-1)
        curr_conf_score = avg_confidence
        prev_conf_score = prev_avg_confidence

        # Character confidence comparison score
        min_length = min(len(top_plate), len(prev_plate))
        if min_length > 0:
            curr_char_conf = sum(top_char_confidences[:min_length]) / min_length
            prev_char_conf = sum(prev_char_confidences[:min_length]) / min_length
        else:
            curr_char_conf = 0
            prev_char_conf = 0

        # 2. Define weights
        weights = {
            "length": 0.4,
            "area": 0.3,
            "avg_confidence": 0.2,
            "char_confidence": 0.1,
        }

        # 3. Calculate weighted scores
        curr_score = (
            curr_length_score * weights["length"]
            + curr_area_score * weights["area"]
            + curr_conf_score * weights["avg_confidence"]
            + curr_char_conf * weights["char_confidence"]
        )

        prev_score = (
            prev_length_score * weights["length"]
            + prev_area_score * weights["area"]
            + prev_conf_score * weights["avg_confidence"]
            + prev_char_conf * weights["char_confidence"]
        )

        # 4. Log the comparison for debugging
        logger.debug(
            f"Plate comparison - Current plate: {top_plate} (score: {curr_score:.3f}) vs "
            f"Previous plate: {prev_plate} (score: {prev_score:.3f})\n"
            f"Metrics - Length: {len(top_plate)} vs {len(prev_plate)} (scores: {curr_length_score:.2f} vs {prev_length_score:.2f}), "
            f"Area: {top_area} vs {prev_area}, "
            f"Avg Conf: {avg_confidence:.2f} vs {prev_avg_confidence:.2f}"
        )

        # 5. Return True if we should keep the previous plate (i.e., if it scores higher)
        return prev_score > curr_score

    def __update_yolov9_metrics(self, duration: float) -> None:
        """
        Update inference metrics.
        """
        self.metrics.yolov9_lpr_fps.value = (
            self.metrics.yolov9_lpr_fps.value * 9 + duration
        ) / 10

    def __update_lpr_metrics(self, duration: float) -> None:
        """
        Update inference metrics.
        """
        self.metrics.alpr_pps.value = (self.metrics.alpr_pps.value * 9 + duration) / 10

    def lpr_process(self, obj_data: dict[str, any], frame: np.ndarray):
        """Look for license plates in image."""

        id = obj_data["id"]

        # don't run for non car objects
        if obj_data.get("label") != "car":
            logger.debug("Not a processing license plate for non car object.")
            return

        # don't run for stationary car objects
        if obj_data.get("stationary") == True:
            logger.debug("Not a processing license plate for a stationary car object.")
            return

        # don't overwrite sub label for objects that have a sub label
        # that is not a license plate
        if obj_data.get("sub_label") and id not in self.detected_license_plates:
            logger.debug(
                f"Not processing license plate due to existing sub label: {obj_data.get('sub_label')}."
            )
            return

        license_plate: Optional[dict[str, any]] = None

        if self.requires_license_plate_detection:
            logger.debug("Running manual license_plate detection.")

            car_box = obj_data.get("box")

            if not car_box:
                return

            rgb = cv2.cvtColor(frame, cv2.COLOR_YUV2BGR_I420)
            left, top, right, bottom = car_box
            car = rgb[top:bottom, left:right]

            # double the size of the car for better box detection
            car = cv2.resize(car, (int(2 * car.shape[1]), int(2 * car.shape[0])))

            if WRITE_DEBUG_IMAGES:
                current_time = int(datetime.datetime.now().timestamp())
                cv2.imwrite(
                    f"debug/frames/car_frame_{current_time}.jpg",
                    car,
                )

            yolov9_start = datetime.datetime.now().timestamp()
            license_plate = self._detect_license_plate(car)
            logger.debug(
                f"YOLOv9 LPD inference time: {(datetime.datetime.now().timestamp() - yolov9_start) * 1000:.2f} ms"
            )
            self.__update_yolov9_metrics(
                datetime.datetime.now().timestamp() - yolov9_start
            )

            if not license_plate:
                logger.debug("Detected no license plates for car object.")
                return

            license_plate_area = max(
                0,
                (license_plate[2] - license_plate[0])
                * (license_plate[3] - license_plate[1]),
            )

            # check that license plate is valid
            # double the value because we've doubled the size of the car
            if license_plate_area < self.lpr_config.min_area * 2:
                logger.debug("License plate is less than min_area")
                return

            license_plate_frame = car[
                license_plate[1] : license_plate[3], license_plate[0] : license_plate[2]
            ]
        else:
            # don't run for object without attributes
            if not obj_data.get("current_attributes"):
                logger.debug("No attributes to parse.")
                return

            attributes: list[dict[str, any]] = obj_data.get("current_attributes", [])
            for attr in attributes:
                if attr.get("label") != "license_plate":
                    continue

                if license_plate is None or attr.get("score", 0.0) > license_plate.get(
                    "score", 0.0
                ):
                    license_plate = attr

            # no license plates detected in this frame
            if not license_plate:
                return

            if license_plate.get("score") < self.lpr_config.detection_threshold:
                logger.debug(
                    f"Plate detection score is less than the threshold ({license_plate['score']:0.2f} < {self.lpr_config.detection_threshold})"
                )
                return

            license_plate_box = license_plate.get("box")

            # check that license plate is valid
            if (
                not license_plate_box
                or area(license_plate_box) < self.lpr_config.min_area
            ):
                logger.debug(f"Invalid license plate box {license_plate}")
                return

            license_plate_frame = cv2.cvtColor(frame, cv2.COLOR_YUV2BGR_I420)

            # Expand the license_plate_box by 30%
            box_array = np.array(license_plate_box)
            expansion = (box_array[2:] - box_array[:2]) * 0.30
            expanded_box = np.array(
                [
                    license_plate_box[0] - expansion[0],
                    license_plate_box[1] - expansion[1],
                    license_plate_box[2] + expansion[0],
                    license_plate_box[3] + expansion[1],
                ]
            ).clip(0, [license_plate_frame.shape[1], license_plate_frame.shape[0]] * 2)

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
            current_time = int(datetime.datetime.now().timestamp())
            cv2.imwrite(
                f"debug/frames/license_plate_frame_{current_time}.jpg",
                license_plate_frame,
            )

        start = datetime.datetime.now().timestamp()

        # run detection, returns results sorted by confidence, best first
        license_plates, confidences, areas = self._process_license_plate(
            license_plate_frame
        )

        self.__update_lpr_metrics(datetime.datetime.now().timestamp() - start)

        logger.debug(f"Text boxes: {license_plates}")
        logger.debug(f"Confidences: {confidences}")
        logger.debug(f"Areas: {areas}")

        if license_plates:
            for plate, confidence, text_area in zip(license_plates, confidences, areas):
                avg_confidence = (
                    (sum(confidence) / len(confidence)) if confidence else 0
                )

                logger.debug(
                    f"Detected text: {plate} (average confidence: {avg_confidence:.2f}, area: {text_area} pixels)"
                )
        else:
            # no plates found
            logger.debug("No text detected")
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

        # Check if we have a previously detected plate for this ID
        if id in self.detected_license_plates:
            if self._should_keep_previous_plate(
                id, top_plate, top_char_confidences, top_area, avg_confidence
            ):
                logger.debug("Keeping previous plate")
                return

        # Check against minimum confidence threshold
        if avg_confidence < self.lpr_config.recognition_threshold:
            logger.debug(
                f"Average confidence {avg_confidence} is less than threshold ({self.lpr_config.recognition_threshold})"
            )
            return

        # Determine subLabel based on known plates, use regex matching
        # Default to the detected plate, use label name if there's a match
        sub_label = next(
            (
                label
                for label, plates in self.lpr_config.known_plates.items()
                if any(
                    re.match(f"^{plate}$", top_plate)
                    or distance(plate, top_plate) <= self.lpr_config.match_distance
                    for plate in plates
                )
            ),
            None,
        )

        # If it's a known plate, publish to sub_label
        if sub_label is not None:
            self.sub_label_publisher.publish(
                EventMetadataTypeEnum.sub_label, (id, sub_label, avg_confidence)
            )

        self.sub_label_publisher.publish(
            EventMetadataTypeEnum.recognized_license_plate,
            (id, top_plate, avg_confidence),
        )

        self.detected_license_plates[id] = {
            "plate": top_plate,
            "char_confidences": top_char_confidences,
            "area": top_area,
            "obj_data": obj_data,
        }

    def handle_request(self, topic, request_data) -> dict[str, any] | None:
        return

    def expire_object(self, object_id: str):
        if object_id in self.detected_license_plates:
            self.detected_license_plates.pop(object_id)


class CTCDecoder:
    """
    A decoder for interpreting the output of a CTC (Connectionist Temporal Classification) model.

    This decoder converts the model's output probabilities into readable sequences of characters
    while removing duplicates and handling blank tokens. It also calculates the confidence scores
    for each decoded character sequence.
    """

    def __init__(self):
        """
        Initialize the CTCDecoder with a list of characters and a character map.

        The character set includes digits, letters, special characters, and a "blank" token
        (used by the CTC model for decoding purposes). A character map is created to map
        indices to characters.
        """
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

            result = "".join(self.char_map[idx] for idx in merged_path)
            results.append(result)

            confidence = np.exp(merged_probs).tolist()
            confidences.append(confidence)

        return results, confidences
