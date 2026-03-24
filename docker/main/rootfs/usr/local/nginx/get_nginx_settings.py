"""Prints the nginx settings as json to stdout."""

import json
import os
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

tls_config: dict[str, Any] = config.get("tls", {})
tls_config.setdefault("enabled", True)

networking_config: dict[str, Any] = config.get("networking", {})
ipv6_config: dict[str, Any] = networking_config.get("ipv6", {})
ipv6_config.setdefault("enabled", False)

listen_config: dict[str, Any] = networking_config.get("listen", {})
listen_config.setdefault("internal", 5000)
listen_config.setdefault("external", 8971)

# handle case where internal port is a string with ip:port
internal_port = listen_config["internal"]
if type(internal_port) is str:
    internal_port = int(internal_port.split(":")[-1])
listen_config["internal_port"] = internal_port

# handle case where external port is a string with ip:port
external_port = listen_config["external"]
if type(external_port) is str:
    external_port = int(external_port.split(":")[-1])
listen_config["external_port"] = external_port

base_path = os.environ.get("FRIGATE_BASE_PATH", "")

result: dict[str, Any] = {
    "tls": tls_config,
    "ipv6": ipv6_config,
    "listen": listen_config,
    "base_path": base_path,
}

print(json.dumps(result))
