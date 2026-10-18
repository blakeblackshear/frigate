"""Prints the nginx settings as json to stdout."""

import json
import os
import sys
from typing import Any

from ruamel.yaml import YAML

sys.path.insert(0, "/opt/frigate")
from frigate.util.config import find_config_file, parse_listen_address

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

# Frigate's own validation runs elsewhere, and a bad or colliding value here must
# not stop nginx from serving the safe-mode UI, which uses the default ports
listen_defaults = {"internal": 5000, "external": 8971}

try:
    listen_parsed = {
        key: parse_listen_address(listen_config.get(key, default))
        for key, default in listen_defaults.items()
    }
    if listen_parsed["internal"][1] == listen_parsed["external"][1]:
        raise ValueError("internal and external share a port")
except ValueError as e:
    print(f"[WARN] Invalid networking.listen ({e}), using defaults", file=sys.stderr)
    listen_parsed = {
        key: (default, default) for key, default in listen_defaults.items()
    }

for key, (value, port) in listen_parsed.items():
    listen_config[key] = value
    listen_config[f"{key}_port"] = port

base_path = os.environ.get("FRIGATE_BASE_PATH", "")

result: dict[str, Any] = {
    "tls": tls_config,
    "ipv6": ipv6_config,
    "listen": listen_config,
    "base_path": base_path,
}

print(json.dumps(result))
