import re

CONFIG_DIR = "/config"
DEFAULT_DB_PATH = f"{CONFIG_DIR}/frigate.db"
MODEL_CACHE_DIR = f"{CONFIG_DIR}/model_cache"
BASE_DIR = "/media/frigate"
CLIPS_DIR = f"{BASE_DIR}/clips"
RECORD_DIR = f"{BASE_DIR}/recordings"
EXPORT_DIR = f"{BASE_DIR}/exports"
BIRDSEYE_PIPE = "/tmp/cache/birdseye"
CACHE_DIR = "/tmp/cache"
FRIGATE_LOCALHOST = "http://127.0.0.1:5000"
PLUS_ENV_VAR = "PLUS_API_KEY"
PLUS_API_HOST = "https://api.frigate.video"

# Attribute & Object constants

DEFAULT_ATTRIBUTE_LABEL_MAP = {
    "person": ["amazon", "face"],
    "car": ["amazon", "fedex", "license_plate", "ups"],
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

DEFAULT_FFMPEG_VERSION = "7.0"
INCLUDED_FFMPEG_VERSIONS = ["7.0", "5.0"]
FFMPEG_HWACCEL_NVIDIA = "preset-nvidia"
FFMPEG_HWACCEL_VAAPI = "preset-vaapi"
FFMPEG_HWACCEL_VULKAN = "preset-vulkan"

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
UPDATE_EVENT_DESCRIPTION = "update_event_description"
UPDATE_MODEL_STATE = "update_model_state"
UPDATE_EMBEDDINGS_REINDEX_PROGRESS = "handle_embeddings_reindex_progress"

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
