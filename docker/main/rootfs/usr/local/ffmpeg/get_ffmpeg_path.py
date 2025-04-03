import json
import sys

from ruamel.yaml import YAML

sys.path.insert(0, "/opt/frigate")
from frigate.const import (
    DEFAULT_FFMPEG_VERSION,
    INCLUDED_FFMPEG_VERSIONS,
)
from frigate.util.config import find_config_file

sys.path.remove("/opt/frigate")

yaml = YAML()

config_file = find_config_file()

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
    print(f"/usr/lib/ffmpeg/{DEFAULT_FFMPEG_VERSION}/bin/ffmpeg")
elif path in INCLUDED_FFMPEG_VERSIONS:
    print(f"/usr/lib/ffmpeg/{path}/bin/ffmpeg")
else:
    print(f"{path}/bin/ffmpeg")
