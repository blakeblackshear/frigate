"""Aggregation of the known sub label names an object can be tagged with."""

import logging
import os

from pathvalidate import sanitize_filename

from frigate.config import FrigateConfig
from frigate.config.classification import ObjectClassificationType
from frigate.const import CLIPS_DIR, FACE_DIR, MODEL_CACHE_DIR
from frigate.util.builtin import load_labels

logger = logging.getLogger(__name__)

# subdirectory of FACE_DIR holding unassigned training images, not a face name
FACE_TRAIN_DIR = "train"

# category used by classification models for "no match", never attached to an object
CLASSIFICATION_NONE_CATEGORY = "none"


def get_categorized_object_names(
    config: FrigateConfig,
    allowed_cameras: list[str],
    object_type: str | None = None,
) -> dict[str, list[str]]:
    """Collect every sub label name this install can attach, by object type.

    Unlike the database-backed /sub_labels endpoint, this reads the config and
    model files, so it also covers names that are configured but have not been
    detected yet. Names come from the detector's logo attributes (limited to
    objects the allowed cameras actually track), LPR known plate names,
    registered face names, and custom object classification categories.

    Structural attributes such as `face` and `license_plate` are excluded: they
    describe a part of an object rather than naming it, and are never attached
    as a sub label.

    Args:
        config: The running Frigate config
        allowed_cameras: Cameras the requesting user may see
        object_type: Optional object label to restrict the result to

    Returns:
        Mapping of object label to its known sub label names, sorted and
        deduplicated. Object types with no known names are omitted.
    """
    tracked_objects = _get_tracked_objects(config, allowed_cameras)
    names: dict[str, set[str]] = {}
    logos = set(config.model.all_attribute_logos)

    # 1. detector logo attributes, only for objects that are actually tracked
    for label, label_attributes in config.model.attributes_map.items():
        if label not in tracked_objects:
            continue

        label_logos = logos.intersection(label_attributes)

        if label_logos:
            names.setdefault(label, set()).update(label_logos)

    # 2. LPR known plate names, for objects that can carry a plate
    if config.lpr.known_plates and _lpr_enabled(config, allowed_cameras):
        known_plates = set(config.lpr.known_plates)

        for label in _objects_with_attribute(config, tracked_objects, "license_plate"):
            names.setdefault(label, set()).update(known_plates)

    # 3. registered face names, for objects that can carry a face
    if _face_recognition_enabled(config, allowed_cameras):
        face_names = _get_face_names()

        if face_names:
            for label in _objects_with_attribute(config, tracked_objects, "face"):
                names.setdefault(label, set()).update(face_names)

    # 4. custom object classification categories
    for model_key, model_config in config.classification.custom.items():
        if not model_config.enabled or model_config.object_config is None:
            continue

        if (
            model_config.object_config.classification_type
            != ObjectClassificationType.sub_label
        ):
            continue

        categories = _get_classification_categories(model_key)

        if not categories:
            continue

        for label in model_config.object_config.objects:
            names.setdefault(label, set()).update(categories)

    return {
        label: sorted(label_names)
        for label, label_names in sorted(names.items())
        if label_names and (object_type is None or label == object_type)
    }


def _get_tracked_objects(config: FrigateConfig, allowed_cameras: list[str]) -> set[str]:
    """Get the union of objects tracked by the cameras the user can see."""
    tracked: set[str] = set()

    for camera_name in allowed_cameras:
        camera_config = config.cameras.get(camera_name)

        if camera_config is None:
            continue

        tracked.update(camera_config.objects.track)

    return tracked


def _objects_with_attribute(
    config: FrigateConfig, tracked_objects: set[str], attribute: str
) -> set[str]:
    """Get the tracked objects that a given attribute can be recognized on.

    The attribute may also be tracked as an object in its own right, as
    `license_plate` is on a dedicated LPR camera, in which case the name is
    attached to that object directly.
    """
    objects = {
        label
        for label, label_attributes in config.model.attributes_map.items()
        if attribute in label_attributes and label in tracked_objects
    }

    if attribute in tracked_objects:
        objects.add(attribute)

    return objects


def _lpr_enabled(config: FrigateConfig, allowed_cameras: list[str]) -> bool:
    return any(
        config.cameras[camera_name].lpr.enabled
        for camera_name in allowed_cameras
        if camera_name in config.cameras
    )


def _face_recognition_enabled(
    config: FrigateConfig, allowed_cameras: list[str]
) -> bool:
    return any(
        config.cameras[camera_name].face_recognition.enabled
        for camera_name in allowed_cameras
        if camera_name in config.cameras
    )


def _get_face_names() -> set[str]:
    """Get the names of every registered face collection."""
    if not os.path.exists(FACE_DIR):
        return set()

    try:
        entries = os.listdir(FACE_DIR)
    except OSError:
        logger.debug("Failed to read face directory %s", FACE_DIR)
        return set()

    return {
        name
        for name in entries
        if name != FACE_TRAIN_DIR and os.path.isdir(os.path.join(FACE_DIR, name))
    }


def _get_classification_categories(model_key: str) -> set[str]:
    """Get the categories a custom classification model can output.

    The trained labelmap is authoritative, but it only exists once the model
    has been trained, so fall back to the dataset directories that will become
    the labelmap on the next training run.
    """
    safe_key = sanitize_filename(model_key)
    categories: set[str] = set()
    labelmap_path = os.path.join(MODEL_CACHE_DIR, safe_key, "labelmap.txt")

    if os.path.exists(labelmap_path):
        try:
            labelmap = load_labels(labelmap_path, prefill=0, indexed=False)
        except OSError:
            logger.debug("Failed to read labelmap %s", labelmap_path)
            labelmap = {}

        categories.update(label for label in labelmap.values() if label)

    dataset_dir = os.path.join(CLIPS_DIR, safe_key, "dataset")

    if os.path.exists(dataset_dir):
        try:
            entries = os.listdir(dataset_dir)
        except OSError:
            logger.debug("Failed to read dataset directory %s", dataset_dir)
            entries = []

        categories.update(
            name for name in entries if os.path.isdir(os.path.join(dataset_dir, name))
        )

    categories.discard(CLASSIFICATION_NONE_CATEGORY)
    return categories
