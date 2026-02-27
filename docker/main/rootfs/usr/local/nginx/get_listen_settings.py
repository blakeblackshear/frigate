"""Prints the tls config as json to stdout."""

import json
import sys
from typing import Any

from ruamel.yaml import YAML

sys.path.insert(0, "/opt/frigate")
from frigate.util.config import find_config_file

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

tls_config: dict[str, any] = config.get("tls", {"enabled": True})
networking_config = config.get("networking", {})
ipv6_config = networking_config.get("ipv6", {"enabled": False})

output = {"tls": tls_config, "ipv6": ipv6_config}

print(json.dumps(output))
