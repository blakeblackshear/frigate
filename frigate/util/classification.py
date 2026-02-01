"""Util for classification models."""

import datetime
import json
import logging
import os
import random
from collections import defaultdict

import cv2
import numpy as np

from frigate.comms.embeddings_updater import EmbeddingsRequestEnum, EmbeddingsRequestor
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FfmpegConfig
from frigate.const import (
    CLIPS_DIR,
    MODEL_CACHE_DIR,
    PROCESS_PRIORITY_LOW,
    UPDATE_MODEL_STATE,
)
from frigate.log import redirect_output_to_logger, suppress_stderr_during
from frigate.models import Event, Recordings, ReviewSegment
from frigate.types import ModelStatusTypesEnum
from frigate.util.downloader import ModelDownloader
from frigate.util.file import get_event_thumbnail_bytes
from frigate.util.image import get_image_from_recording
from frigate.util.process import FrigateProcess

BATCH_SIZE = 16
EPOCHS = 50
LEARNING_RATE = 0.001
TRAINING_METADATA_FILE = ".training_metadata.json"

logger = logging.getLogger(__name__)


def write_training_metadata(model_name: str, image_count: int) -> None:
    """
    Write training metadata to a hidden file in the model's clips directory.

    Args:
        model_name: Name of the classification model
        image_count: Number of images used in training
    """
    model_name = model_name.strip()
    clips_model_dir = os.path.join(CLIPS_DIR, model_name)
    os.makedirs(clips_model_dir, exist_ok=True)

    metadata_path = os.path.join(clips_model_dir, TRAINING_METADATA_FILE)
    metadata = {
        "last_training_date": datetime.datetime.now().isoformat(),
        "last_training_image_count": image_count,
    }

    try:
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
        logger.info(f"Wrote training metadata for {model_name}: {image_count} images")
    except Exception as e:
        logger.error(f"Failed to write training metadata for {model_name}: {e}")


def read_training_metadata(model_name: str) -> dict[str, any] | None:
    """
    Read training metadata from the hidden file in the model's clips directory.

    Args:
        model_name: Name of the classification model

    Returns:
        Dictionary with last_training_date and last_training_image_count, or None if not found
    """
    model_name = model_name.strip()
    clips_model_dir = os.path.join(CLIPS_DIR, model_name)
    metadata_path = os.path.join(clips_model_dir, TRAINING_METADATA_FILE)

    if not os.path.exists(metadata_path):
        return None

    try:
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        return metadata
    except Exception as e:
        logger.error(f"Failed to read training metadata for {model_name}: {e}")
        return None


def get_dataset_image_count(model_name: str) -> int:
    """
    Count the total number of images in the model's dataset directory.

    Args:
        model_name: Name of the classification model

    Returns:
        Total count of images across all categories
    """
    model_name = model_name.strip()
    dataset_dir = os.path.join(CLIPS_DIR, model_name, "dataset")

    if not os.path.exists(dataset_dir):
        return 0

    total_count = 0
    try:
        for category in os.listdir(dataset_dir):
            category_dir = os.path.join(dataset_dir, category)
            if not os.path.isdir(category_dir):
                continue

            image_files = [
                f
                for f in os.listdir(category_dir)
                if f.lower().endswith((".webp", ".png", ".jpg", ".jpeg"))
            ]
            total_count += len(image_files)
    except Exception as e:
        logger.error(f"Failed to count dataset images for {model_name}: {e}")
        return 0

    return total_count


class ClassificationTrainingProcess(FrigateProcess):
    def __init__(self, model_name: str) -> None:
        self.BASE_WEIGHT_URL = os.environ.get(
            "TF_KERAS_MOBILENET_V2_WEIGHTS_URL",
            "",
        )
        model_name = model_name.strip()
        super().__init__(
            stop_event=None,
            priority=PROCESS_PRIORITY_LOW,
            name=f"model_training:{model_name}",
        )
        self.model_name = model_name

    def run(self) -> None:
        self.pre_run_setup()
        success = self.__train_classification_model()
        exit(0 if success else 1)

    def __generate_representative_dataset_factory(self, dataset_dir: str):
        def generate_representative_dataset():
            image_paths = []
            for root, dirs, files in os.walk(dataset_dir):
                for file in files:
                    if file.lower().endswith((".jpg", ".jpeg", ".png")):
                        image_paths.append(os.path.join(root, file))

            for path in image_paths[:300]:
                img = cv2.imread(path)
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                img = cv2.resize(img, (224, 224))
                img_array = np.array(img, dtype=np.float32) / 255.0
                img_array = img_array[None, ...]
                yield [img_array]

        return generate_representative_dataset

    @redirect_output_to_logger(logger, logging.DEBUG)
    def __train_classification_model(self) -> bool:
        """Train a classification model."""
        try:
            # import in the function so that tensorflow is not initialized multiple times
            import tensorflow as tf
            from tensorflow.keras import layers, models, optimizers
            from tensorflow.keras.applications import MobileNetV2
            from tensorflow.keras.preprocessing.image import ImageDataGenerator

            dataset_dir = os.path.join(CLIPS_DIR, self.model_name, "dataset")
            model_dir = os.path.join(MODEL_CACHE_DIR, self.model_name)
            os.makedirs(model_dir, exist_ok=True)

            num_classes = len(
                [
                    d
                    for d in os.listdir(dataset_dir)
                    if os.path.isdir(os.path.join(dataset_dir, d))
                ]
            )

            if num_classes < 2:
                logger.error(
                    f"Training failed for {self.model_name}: Need at least 2 classes, found {num_classes}"
                )
                return False

            weights_path = "imagenet"
            # Download MobileNetV2 weights if not present
            if self.BASE_WEIGHT_URL:
                weights_path = os.path.join(
                    MODEL_CACHE_DIR, "MobileNet", "mobilenet_v2_weights.h5"
                )
                if not os.path.exists(weights_path):
                    logger.info("Downloading MobileNet V2 weights file")
                    ModelDownloader.download_from_url(
                        self.BASE_WEIGHT_URL, weights_path
                    )

            # Start with imagenet base model with 35% of channels in each layer
            base_model = MobileNetV2(
                input_shape=(224, 224, 3),
                include_top=False,
                weights=weights_path,
                alpha=0.35,
            )
            base_model.trainable = False  # Freeze pre-trained layers

            model = models.Sequential(
                [
                    base_model,
                    layers.GlobalAveragePooling2D(),
                    layers.Dense(128, activation="relu"),
                    layers.Dropout(0.3),
                    layers.Dense(num_classes, activation="softmax"),
                ]
            )

            model.compile(
                optimizer=optimizers.Adam(learning_rate=LEARNING_RATE),
                loss="categorical_crossentropy",
                metrics=["accuracy"],
            )

            # create training set
            datagen = ImageDataGenerator(rescale=1.0 / 255, validation_split=0.2)
            train_gen = datagen.flow_from_directory(
                dataset_dir,
                target_size=(224, 224),
                batch_size=BATCH_SIZE,
                class_mode="categorical",
                subset="training",
            )

            total_images = train_gen.samples
            logger.debug(
                f"Training {self.model_name}: {total_images} images across {num_classes} classes"
            )

            # write labelmap
            class_indices = train_gen.class_indices
            index_to_class = {v: k for k, v in class_indices.items()}
            sorted_classes = [index_to_class[i] for i in range(len(index_to_class))]
            with open(os.path.join(model_dir, "labelmap.txt"), "w") as f:
                for class_name in sorted_classes:
                    f.write(f"{class_name}\n")

            # train the model
            logger.debug(f"Training {self.model_name} for {EPOCHS} epochs...")
            model.fit(train_gen, epochs=EPOCHS, verbose=0)
            logger.debug(f"Converting {self.model_name} to TFLite...")

            # convert model to tflite
            # Suppress stderr during conversion to avoid LLVM debug output
            # (fully_quantize, inference_type, MLIR optimization messages, etc)
            with suppress_stderr_during("tflite_conversion"):
                converter = tf.lite.TFLiteConverter.from_keras_model(model)
                converter.optimizations = [tf.lite.Optimize.DEFAULT]
                converter.representative_dataset = (
                    self.__generate_representative_dataset_factory(dataset_dir)
                )
                converter.target_spec.supported_ops = [
                    tf.lite.OpsSet.TFLITE_BUILTINS_INT8
                ]
                converter.inference_input_type = tf.uint8
                converter.inference_output_type = tf.uint8
                tflite_model = converter.convert()

            # write model
            model_path = os.path.join(model_dir, "model.tflite")
            with open(model_path, "wb") as f:
                f.write(tflite_model)

            # verify model file was written successfully
            if not os.path.exists(model_path) or os.path.getsize(model_path) == 0:
                logger.error(
                    f"Training failed for {self.model_name}: Model file was not created or is empty"
                )
                return False

            # write training metadata with image count
            dataset_image_count = get_dataset_image_count(self.model_name)
            write_training_metadata(self.model_name, dataset_image_count)

            logger.info(f"Finished training {self.model_name}")
            return True

        except Exception as e:
            logger.error(f"Training failed for {self.model_name}: {e}", exc_info=True)
            return False


def kickoff_model_training(
    embeddingRequestor: EmbeddingsRequestor, model_name: str
) -> None:
    model_name = model_name.strip()
    requestor = InterProcessRequestor()
    requestor.send_data(
        UPDATE_MODEL_STATE,
        {
            "model": model_name,
            "state": ModelStatusTypesEnum.training,
        },
    )

    # run training in sub process so that
    # tensorflow will free CPU / GPU memory
    # upon training completion
    training_process = ClassificationTrainingProcess(model_name)
    training_process.start()
    training_process.join()

    # check if training succeeded by examining the exit code
    training_success = training_process.exitcode == 0

    if training_success:
        # reload model and mark training as complete
        embeddingRequestor.send_data(
            EmbeddingsRequestEnum.reload_classification_model.value,
            {"model_name": model_name},
        )
        requestor.send_data(
            UPDATE_MODEL_STATE,
            {
                "model": model_name,
                "state": ModelStatusTypesEnum.complete,
            },
        )
    else:
        logger.error(
            f"Training subprocess failed for {model_name} (exit code: {training_process.exitcode})"
        )
        # mark training as failed so UI shows error state
        # don't reload the model since it failed
        requestor.send_data(
            UPDATE_MODEL_STATE,
            {
                "model": model_name,
                "state": ModelStatusTypesEnum.failed,
            },
        )

    requestor.stop()


@staticmethod
def collect_state_classification_examples(
    model_name: str, cameras: dict[str, tuple[float, float, float, float]]
) -> None:
    """
    Collect representative state classification examples from review items.

    This function:
    1. Queries review items from specified cameras
    2. Selects 100 balanced timestamps across the data
    3. Extracts keyframes from recordings (cropped to specified regions)
    4. Selects 24 most visually distinct images
    5. Saves them to the dataset directory

    Args:
        model_name: Name of the classification model
        cameras: Dict mapping camera names to normalized crop coordinates [x1, y1, x2, y2] (0-1)
    """
    model_name = model_name.strip()
    dataset_dir = os.path.join(CLIPS_DIR, model_name, "dataset")

    # Step 1: Get review items for the cameras
    camera_names = list(cameras.keys())
    review_items = list(
        ReviewSegment.select()
        .where(ReviewSegment.camera.in_(camera_names))
        .where(ReviewSegment.end_time.is_null(False))
        .order_by(ReviewSegment.start_time.asc())
    )

    if not review_items:
        logger.warning(f"No review items found for cameras: {camera_names}")
        return

    # The temp directory is only created when there are review_items.
    temp_dir = os.path.join(dataset_dir, "temp")
    os.makedirs(temp_dir, exist_ok=True)

    # Step 2: Create balanced timestamp selection (100 samples)
    timestamps = _select_balanced_timestamps(review_items, target_count=100)

    # Step 3: Extract keyframes from recordings with crops applied
    keyframes = _extract_keyframes(
        "/usr/lib/ffmpeg/7.0/bin/ffmpeg", timestamps, temp_dir, cameras
    )

    # Step 4: Select 24 most visually distinct images (they're already cropped)
    distinct_images = _select_distinct_images(keyframes, target_count=24)

    # Step 5: Save to train directory for later classification
    train_dir = os.path.join(CLIPS_DIR, model_name, "train")
    os.makedirs(train_dir, exist_ok=True)

    saved_count = 0
    for idx, image_path in enumerate(distinct_images):
        dest_path = os.path.join(train_dir, f"example_{idx:03d}.jpg")
        try:
            img = cv2.imread(image_path)

            if img is not None:
                cv2.imwrite(dest_path, img)
                saved_count += 1
        except Exception as e:
            logger.error(f"Failed to save image {image_path}: {e}")

    import shutil

    try:
        shutil.rmtree(temp_dir)
    except Exception as e:
        logger.warning(f"Failed to clean up temp directory: {e}")


def _select_balanced_timestamps(
    review_items: list[ReviewSegment], target_count: int = 100
) -> list[dict]:
    """
    Select balanced timestamps from review items.

    Strategy:
    - Group review items by camera and time of day
    - Sample evenly across groups to ensure diversity
    - For each selected review item, pick a random timestamp within its duration

    Returns:
        List of dicts with keys: camera, timestamp, review_item
    """
    # Group by camera and hour of day for temporal diversity
    grouped = defaultdict(list)

    for item in review_items:
        camera = item.camera
        # Group by 6-hour blocks for temporal diversity
        hour_block = int(item.start_time // (6 * 3600))
        key = f"{camera}_{hour_block}"
        grouped[key].append(item)

    # Calculate how many samples per group
    num_groups = len(grouped)
    if num_groups == 0:
        return []

    samples_per_group = max(1, target_count // num_groups)
    timestamps = []

    # Sample from each group
    for group_items in grouped.values():
        # Take samples_per_group items from this group
        sample_size = min(samples_per_group, len(group_items))
        sampled_items = random.sample(group_items, sample_size)

        for item in sampled_items:
            # Pick a random timestamp within the review item's duration
            duration = item.end_time - item.start_time
            if duration <= 0:
                continue

            # Sample from middle 80% to avoid edge artifacts
            offset = random.uniform(duration * 0.1, duration * 0.9)
            timestamp = item.start_time + offset

            timestamps.append(
                {
                    "camera": item.camera,
                    "timestamp": timestamp,
                    "review_item": item,
                }
            )

    # If we don't have enough, sample more from larger groups
    while len(timestamps) < target_count and len(timestamps) < len(review_items):
        for group_items in grouped.values():
            if len(timestamps) >= target_count:
                break

            # Pick a random item not already sampled
            item = random.choice(group_items)
            duration = item.end_time - item.start_time
            if duration <= 0:
                continue

            offset = random.uniform(duration * 0.1, duration * 0.9)
            timestamp = item.start_time + offset

            # Check if we already have a timestamp near this one
            if not any(abs(t["timestamp"] - timestamp) < 1.0 for t in timestamps):
                timestamps.append(
                    {
                        "camera": item.camera,
                        "timestamp": timestamp,
                        "review_item": item,
                    }
                )

    return timestamps[:target_count]


def _extract_keyframes(
    ffmpeg_path: str,
    timestamps: list[dict],
    output_dir: str,
    camera_crops: dict[str, tuple[float, float, float, float]],
) -> list[str]:
    """
    Extract keyframes from recordings at specified timestamps and crop to specified regions.

    This implementation batches work by running multiple ffmpeg snapshot commands
    concurrently, which significantly reduces total runtime compared to
    processing each timestamp serially.

    Args:
        ffmpeg_path: Path to ffmpeg binary
        timestamps: List of timestamp dicts from _select_balanced_timestamps
        output_dir: Directory to save extracted frames
        camera_crops: Dict mapping camera names to normalized crop coordinates [x1, y1, x2, y2] (0-1)

    Returns:
        List of paths to successfully extracted and cropped keyframe images
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    if not timestamps:
        return []

    # Limit the number of concurrent ffmpeg processes so we don't overload the host.
    max_workers = min(5, len(timestamps))

    def _process_timestamp(idx: int, ts_info: dict) -> tuple[int, str | None]:
        camera = ts_info["camera"]
        timestamp = ts_info["timestamp"]

        if camera not in camera_crops:
            logger.warning(f"No crop coordinates for camera {camera}")
            return idx, None

        norm_x1, norm_y1, norm_x2, norm_y2 = camera_crops[camera]

        try:
            recording = (
                Recordings.select()
                .where(
                    (timestamp >= Recordings.start_time)
                    & (timestamp <= Recordings.end_time)
                    & (Recordings.camera == camera)
                )
                .order_by(Recordings.start_time.desc())
                .limit(1)
                .get()
            )
        except Exception:
            return idx, None

        relative_time = timestamp - recording.start_time

        try:
            config = FfmpegConfig(path="/usr/lib/ffmpeg/7.0")
            image_data = get_image_from_recording(
                config,
                recording.path,
                relative_time,
                codec="mjpeg",
                height=None,
            )

            if not image_data:
                return idx, None

            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                return idx, None

            height, width = img.shape[:2]

            x1 = int(norm_x1 * width)
            y1 = int(norm_y1 * height)
            x2 = int(norm_x2 * width)
            y2 = int(norm_y2 * height)

            x1_clipped = max(0, min(x1, width))
            y1_clipped = max(0, min(y1, height))
            x2_clipped = max(0, min(x2, width))
            y2_clipped = max(0, min(y2, height))

            if x2_clipped <= x1_clipped or y2_clipped <= y1_clipped:
                return idx, None

            cropped = img[y1_clipped:y2_clipped, x1_clipped:x2_clipped]
            resized = cv2.resize(cropped, (224, 224))

            output_path = os.path.join(output_dir, f"frame_{idx:04d}.jpg")
            cv2.imwrite(output_path, resized)
            return idx, output_path
        except Exception as e:
            logger.debug(
                f"Failed to extract frame from {recording.path} at {relative_time}s: {e}"
            )
            return idx, None

    keyframes_with_index: list[tuple[int, str]] = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_idx = {
            executor.submit(_process_timestamp, idx, ts_info): idx
            for idx, ts_info in enumerate(timestamps)
        }

        for future in as_completed(future_to_idx):
            _, path = future.result()
            if path:
                keyframes_with_index.append((future_to_idx[future], path))

    keyframes_with_index.sort(key=lambda item: item[0])
    return [path for _, path in keyframes_with_index]


def _select_distinct_images(
    image_paths: list[str], target_count: int = 20
) -> list[str]:
    """
    Select the most visually distinct images from a set of keyframes.

    Uses a greedy algorithm based on image histograms:
    1. Start with a random image
    2. Iteratively add the image that is most different from already selected images
    3. Difference is measured using histogram comparison

    Args:
        image_paths: List of paths to candidate images
        target_count: Number of distinct images to select

    Returns:
        List of paths to selected images
    """
    if len(image_paths) <= target_count:
        return image_paths

    histograms = {}
    valid_paths = []

    for path in image_paths:
        try:
            img = cv2.imread(path)

            if img is None:
                continue

            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            hist = cv2.calcHist(
                [hsv], [0, 1, 2], None, [8, 8, 8], [0, 180, 0, 256, 0, 256]
            )
            hist = cv2.normalize(hist, hist).flatten()
            histograms[path] = hist
            valid_paths.append(path)
        except Exception as e:
            logger.debug(f"Failed to process image {path}: {e}")
            continue

    if len(valid_paths) <= target_count:
        return valid_paths

    selected = []
    first_image = random.choice(valid_paths)
    selected.append(first_image)
    remaining = [p for p in valid_paths if p != first_image]

    while len(selected) < target_count and remaining:
        max_min_distance = -1
        best_candidate = None

        for candidate in remaining:
            min_distance = float("inf")

            for selected_img in selected:
                distance = cv2.compareHist(
                    histograms[candidate],
                    histograms[selected_img],
                    cv2.HISTCMP_BHATTACHARYYA,
                )
                min_distance = min(min_distance, distance)

            if min_distance > max_min_distance:
                max_min_distance = min_distance
                best_candidate = candidate

        if best_candidate:
            selected.append(best_candidate)
            remaining.remove(best_candidate)
        else:
            break

    return selected


@staticmethod
def collect_object_classification_examples(
    model_name: str,
    label: str,
) -> None:
    """
    Collect representative object classification examples from event thumbnails.

    This function:
    1. Queries events for the specified label
    2. Selects 100 balanced events across different cameras and times
    3. Retrieves thumbnails for selected events (with 33% center crop applied)
    4. Selects 24 most visually distinct thumbnails
    5. Saves to dataset directory

    Args:
        model_name: Name of the classification model
        label: Object label to collect (e.g., "person", "car")
    """
    model_name = model_name.strip()
    dataset_dir = os.path.join(CLIPS_DIR, model_name, "dataset")
    temp_dir = os.path.join(dataset_dir, "temp")
    os.makedirs(temp_dir, exist_ok=True)

    # Step 1: Query events for the specified label and cameras
    events = list(
        Event.select().where((Event.label == label)).order_by(Event.start_time.asc())
    )

    if not events:
        logger.warning(f"No events found for label '{label}'")
        return

    logger.debug(f"Found {len(events)} events")

    # Step 2: Select balanced events (100 samples)
    selected_events = _select_balanced_events(events, target_count=100)
    logger.debug(f"Selected {len(selected_events)} events")

    # Step 3: Extract thumbnails from events
    thumbnails = _extract_event_thumbnails(selected_events, temp_dir)
    logger.debug(f"Successfully extracted {len(thumbnails)} thumbnails")

    # Step 4: Select 24 most visually distinct thumbnails
    distinct_images = _select_distinct_images(thumbnails, target_count=24)
    logger.debug(f"Selected {len(distinct_images)} distinct images")

    # Step 5: Save to train directory for later classification
    train_dir = os.path.join(CLIPS_DIR, model_name, "train")
    os.makedirs(train_dir, exist_ok=True)

    saved_count = 0
    for idx, image_path in enumerate(distinct_images):
        dest_path = os.path.join(train_dir, f"example_{idx:03d}.jpg")
        try:
            img = cv2.imread(image_path)

            if img is not None:
                cv2.imwrite(dest_path, img)
                saved_count += 1
        except Exception as e:
            logger.error(f"Failed to save image {image_path}: {e}")

    import shutil

    try:
        shutil.rmtree(temp_dir)
    except Exception as e:
        logger.warning(f"Failed to clean up temp directory: {e}")

    logger.debug(
        f"Successfully collected {saved_count} classification examples in {train_dir}"
    )


def _select_balanced_events(
    events: list[Event], target_count: int = 100
) -> list[Event]:
    """
    Select balanced events from the event list.

    Strategy:
    - Group events by camera and time of day
    - Sample evenly across groups to ensure diversity
    - Prioritize events with higher scores

    Returns:
        List of selected events
    """
    grouped = defaultdict(list)

    for event in events:
        camera = event.camera
        hour_block = int(event.start_time // (6 * 3600))
        key = f"{camera}_{hour_block}"
        grouped[key].append(event)

    num_groups = len(grouped)
    if num_groups == 0:
        return []

    samples_per_group = max(1, target_count // num_groups)
    selected = []

    for group_events in grouped.values():
        sorted_events = sorted(
            group_events,
            key=lambda e: e.data.get("score", 0) if e.data else 0,
            reverse=True,
        )

        sample_size = min(samples_per_group, len(sorted_events))
        selected.extend(sorted_events[:sample_size])

    if len(selected) < target_count:
        remaining = [e for e in events if e not in selected]
        remaining_sorted = sorted(
            remaining,
            key=lambda e: e.data.get("score", 0) if e.data else 0,
            reverse=True,
        )
        needed = target_count - len(selected)
        selected.extend(remaining_sorted[:needed])

    return selected[:target_count]


def _extract_event_thumbnails(events: list[Event], output_dir: str) -> list[str]:
    """
    Extract thumbnails from events and save to disk.

    Args:
        events: List of Event objects
        output_dir: Directory to save thumbnails

    Returns:
        List of paths to successfully extracted thumbnail images
    """
    thumbnail_paths = []

    for idx, event in enumerate(events):
        try:
            thumbnail_bytes = get_event_thumbnail_bytes(event)

            if thumbnail_bytes:
                nparr = np.frombuffer(thumbnail_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                if img is not None:
                    height, width = img.shape[:2]

                    crop_size = 1.0
                    if event.data and "box" in event.data and "region" in event.data:
                        box = event.data["box"]
                        region = event.data["region"]

                        if len(box) == 4 and len(region) == 4:
                            box_w, box_h = box[2], box[3]
                            region_w, region_h = region[2], region[3]

                            box_area = (box_w * box_h) / (region_w * region_h)

                            if box_area < 0.05:
                                crop_size = 0.4
                            elif box_area < 0.10:
                                crop_size = 0.5
                            elif box_area < 0.20:
                                crop_size = 0.65
                            elif box_area < 0.35:
                                crop_size = 0.80
                            else:
                                crop_size = 0.95

                    crop_width = int(width * crop_size)
                    crop_height = int(height * crop_size)

                    x1 = (width - crop_width) // 2
                    y1 = (height - crop_height) // 2
                    x2 = x1 + crop_width
                    y2 = y1 + crop_height

                    cropped = img[y1:y2, x1:x2]
                    resized = cv2.resize(cropped, (224, 224))
                    output_path = os.path.join(output_dir, f"thumbnail_{idx:04d}.jpg")
                    cv2.imwrite(output_path, resized)
                    thumbnail_paths.append(output_path)

        except Exception as e:
            logger.debug(f"Failed to extract thumbnail for event {event.id}: {e}")
            continue

    return thumbnail_paths
