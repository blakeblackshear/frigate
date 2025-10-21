"""Util for classification models."""

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
from frigate.log import redirect_output_to_logger
from frigate.models import Recordings, ReviewSegment
from frigate.types import ModelStatusTypesEnum
from frigate.util.image import get_image_from_recording
from frigate.util.process import FrigateProcess

BATCH_SIZE = 16
EPOCHS = 50
LEARNING_RATE = 0.001

logger = logging.getLogger(__name__)


class ClassificationTrainingProcess(FrigateProcess):
    def __init__(self, model_name: str) -> None:
        super().__init__(
            stop_event=None,
            priority=PROCESS_PRIORITY_LOW,
            name=f"model_training:{model_name}",
        )
        self.model_name = model_name

    def run(self) -> None:
        self.pre_run_setup()
        self.__train_classification_model()

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

        # import in the function so that tensorflow is not initialized multiple times
        import tensorflow as tf
        from tensorflow.keras import layers, models, optimizers
        from tensorflow.keras.applications import MobileNetV2
        from tensorflow.keras.preprocessing.image import ImageDataGenerator

        logger.info(f"Kicking off classification training for {self.model_name}.")
        dataset_dir = os.path.join(CLIPS_DIR, self.model_name, "dataset")
        model_dir = os.path.join(MODEL_CACHE_DIR, self.model_name)
        num_classes = len(
            [
                d
                for d in os.listdir(dataset_dir)
                if os.path.isdir(os.path.join(dataset_dir, d))
            ]
        )

        # Start with imagenet base model with 35% of channels in each layer
        base_model = MobileNetV2(
            input_shape=(224, 224, 3),
            include_top=False,
            weights="imagenet",
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

        # write labelmap
        class_indices = train_gen.class_indices
        index_to_class = {v: k for k, v in class_indices.items()}
        sorted_classes = [index_to_class[i] for i in range(len(index_to_class))]
        with open(os.path.join(model_dir, "labelmap.txt"), "w") as f:
            for class_name in sorted_classes:
                f.write(f"{class_name}\n")

        # train the model
        model.fit(train_gen, epochs=EPOCHS, verbose=0)

        # convert model to tflite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.representative_dataset = (
            self.__generate_representative_dataset_factory(dataset_dir)
        )
        converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
        converter.inference_input_type = tf.uint8
        converter.inference_output_type = tf.uint8
        tflite_model = converter.convert()

        # write model
        with open(os.path.join(model_dir, "model.tflite"), "wb") as f:
            f.write(tflite_model)


@staticmethod
def kickoff_model_training(
    embeddingRequestor: EmbeddingsRequestor, model_name: str
) -> None:
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
    requestor.stop()


@staticmethod
def collect_state_classification_examples(
    model_name: str, cameras: dict[str, tuple[int, int, int, int]]
) -> None:
    """
    Collect representative state classification examples from review items.

    This function:
    1. Queries review items from specified cameras
    2. Selects 100 balanced timestamps across the data
    3. Extracts keyframes from recordings (cropped to specified regions)
    4. Selects 20 most visually distinct images
    5. Saves them to the dataset directory

    Args:
        model_name: Name of the classification model
        cameras: Dict mapping camera names to crop coordinates (x1, y1, x2, y2)
    """
    dataset_dir = os.path.join(CLIPS_DIR, model_name, "dataset")
    temp_dir = os.path.join(dataset_dir, "temp")
    os.makedirs(temp_dir, exist_ok=True)

    # Step 1: Get review items for the cameras
    camera_names = list(cameras.keys())
    review_items = list(
        ReviewSegment.select()
        .where(ReviewSegment.camera.in_(camera_names))
        .order_by(ReviewSegment.start_time.asc())
    )

    if not review_items:
        logger.warning(f"No review items found for cameras: {camera_names}")
        return

    # Step 2: Create balanced timestamp selection (100 samples)
    timestamps = _select_balanced_timestamps(review_items, target_count=100)

    # Step 3: Extract keyframes from recordings with crops applied
    keyframes = _extract_keyframes(
        "/usr/lib/ffmpeg/7.0/bin/ffmpeg", timestamps, temp_dir, cameras
    )

    if len(keyframes) < 20:
        logger.warning(f"Only extracted {len(keyframes)} keyframes, need at least 20")
        return

    # Step 4: Select 20 most visually distinct images (they're already cropped)
    distinct_images = _select_distinct_images(keyframes, target_count=20)

    # Step 5: Save to dataset directory (in "unknown" subfolder for unlabeled data)
    unknown_dir = os.path.join(dataset_dir, "unknown")
    os.makedirs(unknown_dir, exist_ok=True)

    saved_count = 0
    for idx, image_path in enumerate(distinct_images):
        dest_path = os.path.join(unknown_dir, f"example_{idx:03d}.jpg")
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
    camera_crops: dict[str, tuple[int, int, int, int]],
) -> list[str]:
    """
    Extract keyframes from recordings at specified timestamps and crop to specified regions.

    Args:
        ffmpeg_path: Path to ffmpeg binary
        timestamps: List of timestamp dicts from _select_balanced_timestamps
        output_dir: Directory to save extracted frames
        camera_crops: Dict mapping camera names to crop coordinates (x1, y1, x2, y2)

    Returns:
        List of paths to successfully extracted and cropped keyframe images
    """
    keyframe_paths = []

    for idx, ts_info in enumerate(timestamps):
        camera = ts_info["camera"]
        timestamp = ts_info["timestamp"]

        if camera not in camera_crops:
            logger.warning(f"No crop coordinates for camera {camera}")
            continue

        x1, y1, x2, y2 = camera_crops[camera]

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
            continue

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

            if image_data:
                nparr = np.frombuffer(image_data, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                if img is not None:
                    height, width = img.shape[:2]
                    x1_clipped = max(0, min(x1, width))
                    y1_clipped = max(0, min(y1, height))
                    x2_clipped = max(0, min(x2, width))
                    y2_clipped = max(0, min(y2, height))

                    if x2_clipped > x1_clipped and y2_clipped > y1_clipped:
                        cropped = img[y1_clipped:y2_clipped, x1_clipped:x2_clipped]
                        resized = cv2.resize(cropped, (224, 224))

                        output_path = os.path.join(output_dir, f"frame_{idx:04d}.jpg")
                        cv2.imwrite(output_path, resized)
                        keyframe_paths.append(output_path)

        except Exception as e:
            logger.debug(
                f"Failed to extract frame from {recording.path} at {relative_time}s: {e}"
            )
            continue

    return keyframe_paths


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
def collect_object_classification_examples(dataset_dir: str) -> list[str]:
    pass
