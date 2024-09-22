"""Prints the semantic_search config as json to stdout."""

import json
import os

from ruamel.yaml import YAML

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

search_config: dict[str, any] = config.get("semantic_search", {"enabled": False})

print(json.dumps(search_config))
