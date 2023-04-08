BASE_DIR = "/media/frigate"
CLIPS_DIR = f"{BASE_DIR}/clips"
RECORD_DIR = f"{BASE_DIR}/recordings"
BIRDSEYE_PIPE = "/tmp/cache/birdseye"
CACHE_DIR = "/tmp/cache"
YAML_EXT = (".yaml", ".yml")
PLUS_ENV_VAR = "PLUS_API_KEY"
PLUS_API_HOST = "https://api.frigate.video"
MAX_SEGMENT_DURATION = 600
BTBN_PATH = "/usr/lib/btbn-ffmpeg"

# Regex Consts

REGEX_CAMERA_NAME = "^[a-zA-Z0-9_-]+$"
REGEX_RTSP_CAMERA_USER_PASS = ":\/\/[a-zA-Z0-9_-]+:[\S]+@"
REGEX_HTTP_CAMERA_USER_PASS = "user=[a-zA-Z0-9_-]+&password=[\S]+"

# Known Driver Names

DRIVER_ENV_VAR = "LIBVA_DRIVER_NAME"
DRIVER_AMD = "radeonsi"
DRIVER_INTEL_i965 = "i965"
DRIVER_INTEL_iHD = "iHD"
