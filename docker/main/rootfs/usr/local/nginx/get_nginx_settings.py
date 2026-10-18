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

# Frigate's own validation runs elsewhere, and a bad value here must not stop nginx
# from serving the safe-mode UI. Valid values are kept so a fallback never widens
# the unauthenticated internal listener beyond the configured address.
for key, default in (("internal", 5000), ("external", 8971)):
    try:
        value, port = parse_listen_address(listen_config.get(key, default))
    except ValueError:
        print(
            f"[WARN] Invalid networking.listen.{key}, using {default}",
            file=sys.stderr,
        )
        value, port = default, default

    listen_config[key] = value
    listen_config[f"{key}_port"] = port

if listen_config["internal_port"] == listen_config["external_port"]:
    print(
        "[ERROR] networking.listen.internal and external share a port",
        file=sys.stderr,
    )
    sys.exit(1)

base_path = os.environ.get("FRIGATE_BASE_PATH", "")

result: dict[str, Any] = {
    "tls": tls_config,
    "ipv6": ipv6_config,
    "listen": listen_config,
    "base_path": base_path,
}

print(json.dumps(result))
