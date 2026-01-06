import os
import re

INSTALL_DIR = "/opt/frigate"
CONFIG_DIR = "/config"
DEFAULT_DB_PATH = f"{CONFIG_DIR}/frigate.db"
MODEL_CACHE_DIR = f"{CONFIG_DIR}/model_cache"
BASE_DIR = "/media/frigate"
CLIPS_DIR = f"{BASE_DIR}/clips"
EXPORT_DIR = f"{BASE_DIR}/exports"
FACE_DIR = f"{CLIPS_DIR}/faces"
THUMB_DIR = f"{CLIPS_DIR}/thumbs"
RECORD_DIR = f"{BASE_DIR}/recordings"
TRIGGER_DIR = f"{CLIPS_DIR}/triggers"
BIRDSEYE_PIPE = "/tmp/cache/birdseye"
CACHE_DIR = "/tmp/cache"
FRIGATE_LOCALHOST = "http://127.0.0.1:5000"
PLUS_ENV_VAR = "PLUS_API_KEY"
PLUS_API_HOST = "https://api.frigate.video"

SHM_FRAMES_VAR = "SHM_MAX_FRAMES"

# Attribute & Object constants

DEFAULT_ATTRIBUTE_LABEL_MAP = {
    "person": ["amazon", "face"],
    "car": [
        "amazon",
        "an_post",
        "canada_post",
        "dhl",
        "dpd",
        "fedex",
        "gls",
        "license_plate",
        "nzpost",
        "postnl",
        "postnord",
        "purolator",
        "royal_mail",
        "ups",
        "usps",
    ],
    "motorcycle": ["license_plate"],
}
LABEL_CONSOLIDATION_MAP = {
    "car": 0.8,
    "face": 0.5,
}
LABEL_CONSOLIDATION_DEFAULT = 0.9
LABEL_NMS_MAP = {
    "car": 0.6,
}
LABEL_NMS_DEFAULT = 0.4

# Audio constants

AUDIO_DURATION = 0.975
AUDIO_FORMAT = "s16le"
AUDIO_MAX_BIT_RANGE = 32768.0
AUDIO_SAMPLE_RATE = 16000
AUDIO_MIN_CONFIDENCE = 0.5

# DB constants

MAX_WAL_SIZE = 10  # MB

# Ffmpeg constants

DEFAULT_FFMPEG_VERSION = os.environ.get("DEFAULT_FFMPEG_VERSION", "")
INCLUDED_FFMPEG_VERSIONS = os.environ.get("INCLUDED_FFMPEG_VERSIONS", "").split(":")
LIBAVFORMAT_VERSION_MAJOR = int(os.environ.get("LIBAVFORMAT_VERSION_MAJOR", "59"))
FFMPEG_HWACCEL_NVIDIA = "preset-nvidia"
FFMPEG_HWACCEL_VAAPI = "preset-vaapi"
FFMPEG_HWACCEL_VULKAN = "preset-vulkan"
FFMPEG_HWACCEL_RKMPP = "preset-rkmpp"
FFMPEG_HWACCEL_AMF = "preset-amd-amf"
FFMPEG_HVC1_ARGS = ["-tag:v", "hvc1"]

# RKNN constants
SUPPORTED_RK_SOCS = ["rk3562", "rk3566", "rk3568", "rk3576", "rk3588"]

# Regex constants

REGEX_CAMERA_NAME = r"^[a-zA-Z0-9_-]+$"
REGEX_RTSP_CAMERA_USER_PASS = r":\/\/[a-zA-Z0-9_-]+:[\S]+@"
REGEX_HTTP_CAMERA_USER_PASS = r"user=[a-zA-Z0-9_-]+&password=[\S]+"
REGEX_JSON = re.compile(r"^\s*\{")

# Known Driver Names

DRIVER_ENV_VAR = "LIBVA_DRIVER_NAME"
DRIVER_AMD = "radeonsi"
DRIVER_INTEL_i965 = "i965"
DRIVER_INTEL_iHD = "iHD"

# Preview Values

PREVIEW_FRAME_TYPE = "webp"

# Record Values

CACHE_SEGMENT_FORMAT = "%Y%m%d%H%M%S%z"
MAX_PRE_CAPTURE = 60
MAX_SEGMENT_DURATION = 600
MAX_SEGMENTS_IN_CACHE = 6
MAX_PLAYLIST_SECONDS = 7200  # support 2 hour segments for a single playlist to account for cameras with inconsistent segment times

# Internal Comms Topics

INSERT_MANY_RECORDINGS = "insert_many_recordings"
INSERT_PREVIEW = "insert_preview"
REQUEST_REGION_GRID = "request_region_grid"
UPSERT_REVIEW_SEGMENT = "upsert_review_segment"
CLEAR_ONGOING_REVIEW_SEGMENTS = "clear_ongoing_review_segments"
UPDATE_CAMERA_ACTIVITY = "update_camera_activity"
UPDATE_AUDIO_ACTIVITY = "update_audio_activity"
EXPIRE_AUDIO_ACTIVITY = "expire_audio_activity"
UPDATE_AUDIO_TRANSCRIPTION_STATE = "update_audio_transcription_state"
UPDATE_EVENT_DESCRIPTION = "update_event_description"
UPDATE_REVIEW_DESCRIPTION = "update_review_description"
UPDATE_MODEL_STATE = "update_model_state"
UPDATE_EMBEDDINGS_REINDEX_PROGRESS = "handle_embeddings_reindex_progress"
UPDATE_BIRDSEYE_LAYOUT = "update_birdseye_layout"
UPDATE_JOB_STATE = "update_job_state"
NOTIFICATION_TEST = "notification_test"

# IO Nice Values

PROCESS_PRIORITY_HIGH = 0
PROCESS_PRIORITY_MED = 10
PROCESS_PRIORITY_LOW = 19

# Stats Values

FREQUENCY_STATS_POINTS = 15

# Autotracking

AUTOTRACKING_MAX_AREA_RATIO = 0.6
AUTOTRACKING_MOTION_MIN_DISTANCE = 20
AUTOTRACKING_MOTION_MAX_POINTS = 500
AUTOTRACKING_MAX_MOVE_METRICS = 500
AUTOTRACKING_ZOOM_OUT_HYSTERESIS = 1.1
AUTOTRACKING_ZOOM_IN_HYSTERESIS = 0.95
AUTOTRACKING_ZOOM_EDGE_THRESHOLD = 0.05

# Auth

JWT_SECRET_ENV_VAR = "FRIGATE_JWT_SECRET"
PASSWORD_HASH_ALGORITHM = "pbkdf2_sha256"

# Queues

FAST_QUEUE_TIMEOUT = 0.00001  # seconds
