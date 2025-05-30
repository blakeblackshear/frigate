"""Creates a go2rtc config file."""

import json
import os
import sys
from pathlib import Path
from typing import Any

from ruamel.yaml import YAML

sys.path.insert(0, "/opt/frigate")
from frigate.const import (
    BIRDSEYE_PIPE,
    DEFAULT_FFMPEG_VERSION,
    INCLUDED_FFMPEG_VERSIONS,
    LIBAVFORMAT_VERSION_MAJOR,
)
from frigate.ffmpeg_presets import parse_preset_hardware_acceleration_encode
from frigate.util.config import find_config_file

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

try:
    with open(config_file) as f:
        raw_config = f.read()

    if config_file.endswith((".yaml", ".yml")):
        config: dict[str, Any] = yaml.load(raw_config)
    elif config_file.endswith(".json"):
        config: dict[str, Any] = json.loads(raw_config)
except FileNotFoundError:
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

# Write go2rtc_config to /dev/shm/go2rtc.yaml
with open("/dev/shm/go2rtc.yaml", "w") as f:
    yaml.dump(go2rtc_config, f)
