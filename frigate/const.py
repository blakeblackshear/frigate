BASE_DIR = "/media/frigate"
CLIPS_DIR = f"{BASE_DIR}/clips"
RECORD_DIR = f"{BASE_DIR}/recordings"
CACHE_DIR = "/tmp/cache"
YAML_EXT = (".yaml", ".yml")
PLUS_ENV_VAR = "PLUS_API_KEY"
PLUS_API_HOST = "https://api.frigate.video"

# Regex Consts

REGEX_CAMERA_NAME = "^[a-zA-Z0-9_-]+$"
REGEX_CAMERA_USER_PASS = ":\/\/[a-zA-Z0-9_-]+:[\S]+@"
