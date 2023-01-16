"""Creates a go2rtc config file."""

import json
import os
import yaml


FRIGATE_ENV_VARS = {k: v for k, v in os.environ.items() if k.startswith("FRIGATE_")}
config_file = os.environ.get("CONFIG_FILE", "/config/config.yml")

# Check if we can use .yaml instead of .yml
config_file_yaml = config_file.replace(".yml", ".yaml")
if os.path.isfile(config_file_yaml):
    config_file = config_file_yaml

with open(config_file) as f:
    raw_config = f.read()

if config_file.endswith((".yaml", ".yml")):
    config = yaml.safe_load(raw_config)
elif config_file.endswith(".json"):
    config = json.loads(raw_config)

go2rtc_config: dict[str, any] = config["restream"]

if not go2rtc_config.get("log", {}).get("format"):
    go2rtc_config["log"] = {"format": "text"}

if not go2rtc_config.get("webrtc", {}).get("candidates", []):
    go2rtc_config["webrtc"] = {"candidates": ["stun:8555"]}

for name in go2rtc_config.get("streams", {}):
    go2rtc_config["streams"][name] = go2rtc_config["streams"][name].format(**FRIGATE_ENV_VARS)

print(json.dumps(go2rtc_config))