#!/usr/bin/env python3
"""Creates a go2rtc config file with proper permissions."""

import json
import os
import sys
import shutil
from pathlib import Path
from typing import Any

try:
    from ruamel.yaml import YAML
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "ruamel.yaml"])
    from ruamel.yaml import YAML

# Add frigate to path
sys.path.insert(0, "/opt/frigate")
try:
    from frigate.const import (
        BIRDSEYE_PIPE,
        DEFAULT_FFMPEG_VERSION,
        INCLUDED_FFMPEG_VERSIONS,
        LIBAVFORMAT_VERSION_MAJOR,
    )
    from frigate.ffmpeg_presets import parse_preset_hardware_acceleration_encode
    from frigate.util.config import find_config_file
except ImportError:
    # Fallback if imports fail
    print("Warning: Could not import from frigate module. Using fallback values.")
    BIRDSEYE_PIPE = "/tmp/birdseye"
    DEFAULT_FFMPEG_VERSION = "v5.1.2"
    INCLUDED_FFMPEG_VERSIONS = ["v5.1.2", "v4.4"]
    LIBAVFORMAT_VERSION_MAJOR = 59
    
    def parse_preset_hardware_acceleration_encode(ffmpeg_path, hwaccel_args, input_args, output_args):
        return f"{ffmpeg_path} {hwaccel_args} {input_args} {output_args}"
    
    def find_config_file():
        config_file = os.environ.get("CONFIG_FILE", "/config/config.yml")
        if os.path.exists(config_file):
            return config_file
        
        # Try common locations
        for ext in [".yml", ".yaml", ".json"]:
            for path in ["/config/config", "/etc/frigate/config"]:
                if os.path.exists(f"{path}{ext}"):
                    return f"{path}{ext}"
        return "/config/config.yml"

# Remove frigate from path
if "/opt/frigate" in sys.path:
    sys.path.remove("/opt/frigate")

yaml = YAML()

FRIGATE_ENV_VARS = {k: v for k, v in os.environ.items() if k.startswith("FRIGATE_")}
# read docker secret files as env vars too
if os.path.isdir("/run/secrets"):
    for secret_file in os.listdir("/run/secrets"):
        if secret_file.startswith("FRIGATE_"):
            FRIGATE_ENV_VARS[secret_file] = (
                Path(os.path.join("/run/secrets", secret_file)).read_text().strip()
            )

config_file = find_config_file()
print(f"Using config file: {config_file}")

try:
    with open(config_file) as f:
        raw_config = f.read()

    if config_file.endswith((".yaml", ".yml")):
        config: dict[str, Any] = yaml.load(raw_config)
    elif config_file.endswith(".json"):
        config: dict[str, Any] = json.loads(raw_config)
except FileNotFoundError:
    print(f"Config file not found: {config_file}")
    config: dict[str, Any] = {}

go2rtc_config: dict[str, Any] = config.get("go2rtc", {})

# Need to enable CORS for go2rtc so the frigate integration / card work automatically
if go2rtc_config.get("api") is None:
    go2rtc_config["api"] = {"origin": "*"}
elif go2rtc_config["api"].get("origin") is None:
    go2rtc_config["api"]["origin"] = "*"

# Need to set default location for HA config
if go2rtc_config.get("hass") is None:
    go2rtc_config["hass"] = {"config": "/homeassistant"}

# we want to ensure that logs are easy to read
if go2rtc_config.get("log") is None:
    go2rtc_config["log"] = {"format": "text"}
elif go2rtc_config["log"].get("format") is None:
    go2rtc_config["log"]["format"] = "text"

# ensure there is a default webrtc config
if go2rtc_config.get("webrtc") is None:
    go2rtc_config["webrtc"] = {}

if go2rtc_config["webrtc"].get("candidates") is None:
    default_candidates = []
    # use internal candidate if it was discovered when running through the add-on
    internal_candidate = os.environ.get("FRIGATE_GO2RTC_WEBRTC_CANDIDATE_INTERNAL")
    if internal_candidate is not None:
        default_candidates.append(internal_candidate)
    # should set default stun server so webrtc can work
    default_candidates.append("stun:8555")

    go2rtc_config["webrtc"]["candidates"] = default_candidates

if go2rtc_config.get("rtsp", {}).get("username") is not None:
    go2rtc_config["rtsp"]["username"] = go2rtc_config["rtsp"]["username"].format(
        **FRIGATE_ENV_VARS
    )

if go2rtc_config.get("rtsp", {}).get("password") is not None:
    go2rtc_config["rtsp"]["password"] = go2rtc_config["rtsp"]["password"].format(
        **FRIGATE_ENV_VARS
    )

# ensure ffmpeg path is set correctly
path = config.get("ffmpeg", {}).get("path", "default")
if path == "default":
    ffmpeg_path = f"/usr/lib/ffmpeg/{DEFAULT_FFMPEG_VERSION}/bin/ffmpeg"
elif path in INCLUDED_FFMPEG_VERSIONS:
    ffmpeg_path = f"/usr/lib/ffmpeg/{path}/bin/ffmpeg"
else:
    ffmpeg_path = f"{path}/bin/ffmpeg"

if go2rtc_config.get("ffmpeg") is None:
    go2rtc_config["ffmpeg"] = {"bin": ffmpeg_path}
elif go2rtc_config["ffmpeg"].get("bin") is None:
    go2rtc_config["ffmpeg"]["bin"] = ffmpeg_path

# need to replace ffmpeg command when using ffmpeg4
if LIBAVFORMAT_VERSION_MAJOR < 59:
    rtsp_args = "-fflags nobuffer -flags low_delay -stimeout 10000000 -user_agent go2rtc/ffmpeg -rtsp_transport tcp -i {input}"
    if go2rtc_config.get("ffmpeg") is None:
        go2rtc_config["ffmpeg"] = {"rtsp": rtsp_args}
    elif go2rtc_config["ffmpeg"].get("rtsp") is None:
        go2rtc_config["ffmpeg"]["rtsp"] = rtsp_args

for name in go2rtc_config.get("streams", {}):
    stream = go2rtc_config["streams"][name]

    if isinstance(stream, str):
        try:
            go2rtc_config["streams"][name] = go2rtc_config["streams"][name].format(
                **FRIGATE_ENV_VARS
            )
        except KeyError as e:
            print(
                "[ERROR] Invalid substitution found, see https://docs.frigate.video/configuration/restream#advanced-restream-configurations for more info."
            )
            sys.exit(e)

    elif isinstance(stream, list):
        for i, stream in enumerate(stream):
            try:
                go2rtc_config["streams"][name][i] = stream.format(**FRIGATE_ENV_VARS)
            except KeyError as e:
                print(
                    "[ERROR] Invalid substitution found, see https://docs.frigate.video/configuration/restream#advanced-restream-configurations for more info."
                )
                sys.exit(e)

# add birdseye restream stream if enabled
if config.get("birdseye", {}).get("restream", False):
    birdseye: dict[str, Any] = config.get("birdseye")

    input = f"-f rawvideo -pix_fmt yuv420p -video_size {birdseye.get('width', 1280)}x{birdseye.get('height', 720)} -r 10 -i {BIRDSEYE_PIPE}"
    ffmpeg_cmd = f"exec:{parse_preset_hardware_acceleration_encode(ffmpeg_path, config.get('ffmpeg', {}).get('hwaccel_args', ''), input, '-rtsp_transport tcp -f rtsp {output}')}"

    if go2rtc_config.get("streams"):
        go2rtc_config["streams"]["birdseye"] = ffmpeg_cmd
    else:
        go2rtc_config["streams"] = {"birdseye": ffmpeg_cmd}

# Write go2rtc_config to multiple possible locations with proper permissions
config_paths = [
    "/dev/shm/go2rtc.yaml",  # Primary location
    "/tmp/go2rtc.yaml",      # Fallback location 1
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "go2rtc.yaml")  # Fallback location 2
]

success = False
for config_path in config_paths:
    try:
        # Try to create directory if it doesn't exist
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        
        # Write to a temporary file first
        temp_path = f"{config_path}.tmp"
        with open(temp_path, "w") as f:
            yaml.dump(go2rtc_config, f)
        
        # Make the file world-readable and writable
        os.chmod(temp_path, 0o666)
        
        # Move the temporary file to the final location
        shutil.move(temp_path, config_path)
        
        print(f"Successfully wrote go2rtc config to {config_path}")
        success = True
        break
    except (PermissionError, OSError) as e:
        print(f"Failed to write to {config_path}: {e}")

if not success:
    print("ERROR: Could not write go2rtc config to any location")
    sys.exit(1)