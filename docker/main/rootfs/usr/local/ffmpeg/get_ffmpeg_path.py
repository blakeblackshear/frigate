import json
import os
import shutil
import sys

from ruamel.yaml import YAML

sys.path.insert(0, "/opt/frigate")
from frigate.const import (
    DEFAULT_FFMPEG_VERSION,
    INCLUDED_FFMPEG_VERSIONS,
)

sys.path.remove("/opt/frigate")

yaml = YAML()

config_file = os.environ.get("CONFIG_FILE", "/config/config.yml")

# Check if we can use .yaml instead of .yml
config_file_yaml = config_file.replace(".yml", ".yaml")
if os.path.isfile(config_file_yaml):
    config_file = config_file_yaml

try:
    with open(config_file) as f:
        raw_config = f.read()

    if config_file.endswith((".yaml", ".yml")):
        config: dict[str, any] = yaml.load(raw_config)
    elif config_file.endswith(".json"):
        config: dict[str, any] = json.loads(raw_config)
except FileNotFoundError:
    config: dict[str, any] = {}

path = config.get("ffmpeg", {}).get("path", "default")
if path == "default":
    if shutil.which("ffmpeg") is None:
        print(f"/usr/lib/ffmpeg/{DEFAULT_FFMPEG_VERSION}/bin/ffmpeg")
    else:
        print("ffmpeg")
elif path in INCLUDED_FFMPEG_VERSIONS:
    print(f"/usr/lib/ffmpeg/{path}/bin/ffmpeg")
else:
    print(f"{path}/bin/ffmpeg")
