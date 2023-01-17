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

if not go2rtc_config.get("webrtc", {}).get("candidates", []):
    default_candidates = []
    # Use FRIGATE_GO2RTC_WEBRTC_CANDIDATE_INTERNAL as candidate if set
    internal_candidate = os.environ.get("FRIGATE_GO2RTC_WEBRTC_CANDIDATE_INTERNAL", None)
    if internal_candidate is not None:
        default_candidates.append(internal_candidate)
    default_candidates.append("stun:8555")

    go2rtc_config["webrtc"] = {"candidates": default_candidates}

# Write YAML config to /dev/shm/go2rtc.yaml
with open("/dev/shm/go2rtc.yaml", "w") as f:
    yaml.dump(go2rtc_config, f)
