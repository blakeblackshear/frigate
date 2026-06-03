import json
import sys
from typing import Any

from ruamel.yaml import YAML

sys.path.insert(0, "/opt/frigate")
from frigate.util.config import find_config_file, resolve_ffmpeg_path

sys.path.remove("/opt/frigate")

yaml = YAML()

config_file = find_config_file()

try:
    with open(config_file) as f:
        raw_config = f.read()

    if config_file.endswith((".yaml", ".yml")):
        config: dict[str, Any] = yaml.load(raw_config)
    elif config_file.endswith(".json"):
        config: dict[str, Any] = json.loads(raw_config)
except FileNotFoundError:
    config: dict[str, Any] = {}

path = config.get("ffmpeg", {}).get("path", "default")
print(resolve_ffmpeg_path(path, "ffmpeg"))
