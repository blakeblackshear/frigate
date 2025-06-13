"""Util for classification models."""

import os
import sys

import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, optimizers
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator

from frigate.comms.embeddings_updater import EmbeddingsRequestEnum, EmbeddingsRequestor
from frigate.comms.inter_process import InterProcessRequestor
from frigate.const import CLIPS_DIR, MODEL_CACHE_DIR, UPDATE_MODEL_STATE
from frigate.types import ModelStatusTypesEnum
from frigate.util.process import FrigateProcess

BATCH_SIZE = 16
EPOCHS = 50
LEARNING_RATE = 0.001


@staticmethod
def __generate_representative_dataset_factory(dataset_dir: str):
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


@staticmethod
def __train_classification_model(model_name: str) -> bool:
    """Train a classification model."""
    dataset_dir = os.path.join(CLIPS_DIR, model_name, "dataset")
    model_dir = os.path.join(MODEL_CACHE_DIR, model_name)
    num_classes = len(
        [
            d
            for d in os.listdir(dataset_dir)
            if os.path.isdir(os.path.join(dataset_dir, d))
        ]
    )

    # TF and Keras are very loud with logging
    # we want to avoid these logs so we
    # temporarily redirect stdout / stderr
    original_stdout = sys.stdout
    original_stderr = sys.stderr
    sys.stdout = open(os.devnull, "w")
    sys.stderr = open(os.devnull, "w")

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
    converter.representative_dataset = __generate_representative_dataset_factory(
        dataset_dir
    )
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
    converter.inference_input_type = tf.uint8
    converter.inference_output_type = tf.uint8
    tflite_model = converter.convert()

    # write model
    with open(os.path.join(model_dir, "model.tflite"), "wb") as f:
        f.write(tflite_model)

    # restore original stdout / stderr
    sys.stdout = original_stdout
    sys.stderr = original_stderr


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
    training_process = FrigateProcess(
        target=__train_classification_model,
        name=f"model_training:{model_name}",
        args=(model_name,),
    )
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
