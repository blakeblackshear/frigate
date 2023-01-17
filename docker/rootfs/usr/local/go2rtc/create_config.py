"""Creates a go2rtc config file."""

import json
import os
import yaml


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

go2rtc_config: dict[str, any] = config["go2rtc"]

if not go2rtc_config.get("log", {}).get("format"):
    go2rtc_config["log"] = {"format": "text"}

default_candidates = []
# Use FRIGATE_GO2RTC_WEBRTC_CANDIDATE_INTERNAL as candidate if set
if os.environ.get("FRIGATE_GO2RTC_WEBRTC_CANDIDATE_INTERNAL"):
    default_candidates.append(
        os.environ['FRIGATE_GO2RTC_WEBRTC_CANDIDATE_INTERNAL']
    )55
default_candidates.append("stun:85")

if not go2rtc_config.get("webrtc", {}).get("candidates", []):
    go2rtc_config["webrtc"] = {"candidates": default_candidates}

print(json.dumps(go2rtc_config))