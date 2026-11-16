"""Training and inference must give a classification model the same input.

The realtime processor saves the crop at its own size for the user to
categorise, and resizes it to the model input for inference. Training later
loads the saved crop from the dataset. If the two resize it differently, the
model learns pixels it never sees live.
"""

import math
import os
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch

import cv2
import numpy as np
from hypothesis import given, settings
from hypothesis import strategies as st

# Mock TFLite before importing the classification processor
_MOCK_MODULES = [
    "tflite_runtime",
    "tflite_runtime.interpreter",
    "ai_edge_litert",
    "ai_edge_litert.interpreter",
]
for mod in _MOCK_MODULES:
    if mod not in sys.modules:
        sys.modules[mod] = MagicMock()

import frigate.util.classification as classification  # noqa: E402
from frigate.data_processing.real_time.custom_classification import (  # noqa: E402
    CustomStateClassificationProcessor,
)

CAMERA = "cam"
MODEL_NAME = "parity"
MIN_CROP = 64


class _TrainingStopped(Exception):
    pass


@st.composite
def frames_and_crops(draw):
    """A random I420 frame and a realistic crop inside it.

    Crops are at least MIN_CROP px each way: smaller than the 79 px crop this
    was found on, but not degenerate. The largest is the whole frame, so
    crops that are shrunk to the model input are covered too.
    """
    width = draw(st.integers(MIN_CROP // 2, 640).map(lambda v: v * 2))
    height = draw(st.integers(MIN_CROP // 2, 360).map(lambda v: v * 2))
    seed = draw(st.integers(0, 2**32 - 1))
    frame = np.random.default_rng(seed).integers(
        0, 256, (height * 3 // 2, width), dtype=np.uint8
    )

    # crop corners on the pixel grid. The half pixel keeps the processor's
    # int() truncation on the intended pixel; it clips the far edge to the
    # frame.
    x1 = draw(st.integers(0, width - MIN_CROP))
    x2 = draw(st.integers(x1 + MIN_CROP, width))
    y1 = draw(st.integers(0, height - MIN_CROP))
    y2 = draw(st.integers(y1 + MIN_CROP, height))
    crop = [
        (x1 + 0.5) / width,
        (y1 + 0.5) / height,
        (x2 + 0.5) / width,
        (y2 + 0.5) / height,
    ]
    return frame, crop


def _inference_input_and_saved_crop(
    frame: np.ndarray, crop: list[float]
) -> tuple[np.ndarray, np.ndarray]:
    """Run the state processor on a frame.

    Returns the image it classifies and the crop it saves for training.
    """
    height = frame.shape[0] * 2 // 3
    width = frame.shape[1]

    config = MagicMock()
    config.cameras[CAMERA].detect.width = width
    config.cameras[CAMERA].detect.height = height
    model_config = MagicMock()
    model_config.name = MODEL_NAME
    model_config.state_config.cameras = {CAMERA: MagicMock(crop=crop)}
    model_config.state_config.interval = 1

    with tempfile.TemporaryDirectory() as model_cache:
        with patch(
            "frigate.data_processing.real_time.custom_classification.MODEL_CACHE_DIR",
            model_cache,
        ):
            processor = CustomStateClassificationProcessor(
                config, model_config, MagicMock(), None
            )

    try:
        tasks = []
        processor._enqueue_task = tasks.append
        processor.last_run = -math.inf
        processor.process_frame({"camera": CAMERA, "motion": []}, frame)
    finally:
        processor.shutdown()

    assert len(tasks) == 1, "processor did not classify the frame"
    _, _, _, resized_frame, crop_bgr = tasks[0]
    return resized_frame, crop_bgr


def _training_batch(dataset_crop_bgr: np.ndarray) -> np.ndarray:
    """Run the training process up to the first batch it would train on."""
    with tempfile.TemporaryDirectory() as root:
        clips_dir = os.path.join(root, "clips")
        model_cache = os.path.join(root, "model_cache")

        # Two classes are required. Both get the same image, so every image
        # in the batch must match the inference input regardless of shuffling.
        for class_name in ("a", "b"):
            class_dir = os.path.join(clips_dir, MODEL_NAME, "dataset", class_name)
            os.makedirs(class_dir)
            cv2.imwrite(os.path.join(class_dir, "crop.png"), dataset_crop_bgr)

        import tensorflow as tf

        captured = []

        def fit(train_gen, *args, **kwargs):
            # read the batch now, while the training images still exist
            captured.append(train_gen[0][0])
            raise _TrainingStopped()

        model = MagicMock()
        model.fit.side_effect = fit

        process = classification.ClassificationTrainingProcess(MODEL_NAME)
        process.BASE_WEIGHT_URL = ""

        with (
            patch.object(classification, "CLIPS_DIR", clips_dir),
            patch.object(classification, "MODEL_CACHE_DIR", model_cache),
            patch.object(tf.keras.applications, "MobileNetV2"),
            patch.object(tf.keras.models, "Sequential", return_value=model),
        ):
            process._ClassificationTrainingProcess__train_classification_model()

    assert captured, "training did not reach model.fit"
    return captured[0]


class TestTrainingMatchesInference(unittest.TestCase):
    @settings(max_examples=40, deadline=None)
    @given(frames_and_crops())
    def test_training_input_matches_inference_input(self, frame_and_crop):
        frame, crop = frame_and_crop
        inference_input, saved_crop = _inference_input_and_saved_crop(frame, crop)

        # Saved training crops are webp, which cv2 writes losslessly by
        # default, and categorising converts them to png. Writing png here
        # gives the same dataset pixels.
        batch = _training_batch(saved_crop)

        # training rescales by 1/255; the quantised model takes uint8 input
        training_input = np.rint(batch * 255.0).astype(np.uint8)

        self.assertEqual(training_input.shape[1:], inference_input.shape)
        for image in training_input:
            np.testing.assert_array_equal(image, inference_input)


class TestPrepareTrainingDataset(unittest.TestCase):
    @settings(max_examples=50, deadline=None)
    @given(
        width=st.integers(1, 1000),
        height=st.integers(1, 1000),
        seed=st.integers(0, 2**32 - 1),
    )
    def test_prepared_images_are_model_input_size(self, width, height, seed):
        """Keras is then given nothing to resize, whatever its interpolation."""
        image = np.random.default_rng(seed).integers(
            0, 256, (height, width, 3), dtype=np.uint8
        )

        with (
            tempfile.TemporaryDirectory() as dataset_dir,
            tempfile.TemporaryDirectory() as output_dir,
        ):
            os.makedirs(os.path.join(dataset_dir, "open"))
            cv2.imwrite(os.path.join(dataset_dir, "open", "a.png"), image)

            classification.prepare_training_dataset(dataset_dir, output_dir)

            prepared = cv2.imread(os.path.join(output_dir, "open", "a.png"))
            self.assertEqual(
                prepared.shape[:2], classification.CLASSIFICATION_INPUT_SIZE
            )

    def test_skips_files_that_are_not_images(self):
        with (
            tempfile.TemporaryDirectory() as dataset_dir,
            tempfile.TemporaryDirectory() as output_dir,
        ):
            os.makedirs(os.path.join(dataset_dir, "open"))
            cv2.imwrite(
                os.path.join(dataset_dir, "open", "a.png"),
                np.zeros((79, 79, 3), dtype=np.uint8),
            )

            with open(os.path.join(dataset_dir, "open", "broken.png"), "w") as f:
                f.write("not an image")

            with open(os.path.join(dataset_dir, ".training_metadata.json"), "w") as f:
                f.write("{}")

            classification.prepare_training_dataset(dataset_dir, output_dir)

            self.assertEqual(os.listdir(output_dir), ["open"])
            self.assertEqual(os.listdir(os.path.join(output_dir, "open")), ["a.png"])


if __name__ == "__main__":
    unittest.main()
