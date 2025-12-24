import datetime
import os
import time
import cv2
import numpy as np


def _get_env(var_name, default, cast_type):
    """Helper to read and cast an environment variable."""
    value = os.environ.get(var_name)
    if value is None:
        return default
    try:
        if cast_type == bool:
            return value.lower() in ("true", "1", "t", "y", "yes")
        return cast_type(value)
    except (ValueError, TypeError):
        return default

# --- Configuration from Environment Variables ---
# Master switch to enable/disable this feature.
DEBUG_ENABLED = _get_env("FRIGATE_DEBUG_SNAPSHOT", False, bool)
# Rate limiting for frames with no detections (in seconds).
NO_DETECTION_RATE_LIMIT = _get_env("FRIGATE_DEBUG_NO_DETECTION_RATE_LIMIT", 60, int)
# Rate limiting for frames with detections (in seconds).
DETECTION_RATE_LIMIT = _get_env("FRIGATE_DEBUG_DETECTION_RATE_LIMIT", 10, int)
# Minimum confidence score for an object to be considered for saving.
MIN_CONFIDENCE = _get_env("FRIGATE_DEBUG_MIN_CONFIDENCE", 0.50, float)
# --- End Configuration ---

# Module-level state to track last save times
_last_no_detection_save_time = 0
_last_detection_save_time = 0


def save_debug_snapshot(input_frame, detections, detector_name, detector_config):
    """
    Saves a snapshot of the input frame for debugging, with rate limiting and
    confidence filtering, configurable via environment variables.
    """
    if not DEBUG_ENABLED:
        return

    global _last_no_detection_save_time, _last_detection_save_time
    current_time = time.time()

    confident_detections = [d for d in detections if d[1] >= MIN_CONFIDENCE]

    base_filename = _get_base_filename(detector_name)

    if confident_detections:
        if (current_time - _last_detection_save_time) < DETECTION_RATE_LIMIT:
            return
        _last_detection_save_time = current_time
        _save_image(input_frame, f"{base_filename}.jpg")

        yolo_data = []
        for d in confident_detections:
            label_id, score, ymin, xmin, ymax, xmax = int(d[0]), d[1], d[2], d[3], d[4], d[5]
            x_center = (xmin + xmax) / 2
            y_center = (ymin + ymax) / 2
            width = xmax - xmin
            height = ymax - ymin
            yolo_data.append(f"{label_id} {x_center} {y_center} {width} {height} {score}")
        
        if yolo_data:
            _write_yolo_file("\n".join(yolo_data), f"{base_filename}.txt")

    else:
        if (current_time - _last_no_detection_save_time) < NO_DETECTION_RATE_LIMIT:
            return
        _last_no_detection_save_time = current_time
        _save_image(input_frame, f"{base_filename}.jpg")


def _get_base_filename(detector_name):
    """Generates a unique base filename with path."""
    debug_dir = "/tmp/frigate_debug"
    os.makedirs(debug_dir, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    return os.path.join(debug_dir, f"{timestamp}_{detector_name}")


def _save_image(input_frame, image_path):
    """Prepares and saves the raw input frame as a JPG image."""
    img = input_frame.squeeze()
    if img.dtype == np.float32 or img.dtype == np.float16:
        img = (img * 255).astype(np.uint8)
    else:
        img = img.astype(np.uint8)
    
    img = cv2.cvtColor(img.copy(), cv2.COLOR_RGB2BGR)
    cv2.imwrite(image_path, img)


def _write_yolo_file(content, label_path):
    """Writes the given content to a .txt file."""
    with open(label_path, "w") as f:
        f.write(content)
