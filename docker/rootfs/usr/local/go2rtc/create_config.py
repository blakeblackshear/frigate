"""Creates a go2rtc config file."""

import json
import os
import sys
import yaml

sys.path.insert(0, "/opt/frigate")
from frigate.const import BIRDSEYE_PIPE, BTBN_PATH
from frigate.ffmpeg_presets import parse_preset_hardware_acceleration_encode

sys.path.remove("/opt/frigate")


FRIGATE_ENV_VARS = {k: v for k, v in os.environ.items() if k.startswith("FRIGATE_")}
config_file = os.environ.get("CONFIG_FILE", "/config/config.yml")

# Check if we can use .yaml instead of .yml
config_file_yaml = config_file.replace(".yml", ".yaml")
if os.path.isfile(config_file_yaml):
    config_file = config_file_yaml

with open(config_file) as f:
    raw_config = f.read()

if config_file.endswith((".yaml", ".yml")):
    config: dict[str, any] = yaml.safe_load(raw_config)
elif config_file.endswith(".json"):
    config: dict[str, any] = json.loads(raw_config)

go2rtc_config: dict[str, any] = config.get("go2rtc", {})

# Need to enable CORS for go2rtc so the frigate integration / card work automatically
if go2rtc_config.get("api") is None:
    go2rtc_config["api"] = {"origin": "*"}
elif go2rtc_config["api"].get("origin") is None:
    go2rtc_config["api"]["origin"] = "*"

# we want to ensure that logs are easy to read
if go2rtc_config.get("log") is None:
    go2rtc_config["log"] = {"format": "text"}
elif go2rtc_config["log"].get("format") is None:
    go2rtc_config["log"]["format"] = "text"

if not go2rtc_config.get("webrtc", {}).get("candidates", []):
    default_candidates = []
    # use internal candidate if it was discovered when running through the add-on
    internal_candidate = os.environ.get(
        "FRIGATE_GO2RTC_WEBRTC_CANDIDATE_INTERNAL", None
    )
    if internal_candidate is not None:
        default_candidates.append(internal_candidate)
    # should set default stun server so webrtc can work
    default_candidates.append("stun:8555")

    go2rtc_config["webrtc"] = {"candidates": default_candidates}
else:
    print(
        "[INFO] Not injecting WebRTC candidates into go2rtc config as it has been set manually",
    )

# sets default RTSP response to be equivalent to ?video=h264,h265&audio=aac
# this means user does not need to specify audio codec when using restream
# as source for frigate and the integration supports HLS playback
if go2rtc_config.get("rtsp") is None:
    go2rtc_config["rtsp"] = {"default_query": "mp4"}
elif go2rtc_config["rtsp"].get("default_query") is None:
    go2rtc_config["rtsp"]["default_query"] = "mp4"

# need to replace ffmpeg command when using ffmpeg4
if not os.path.exists(BTBN_PATH):
    if go2rtc_config.get("ffmpeg") is None:
        go2rtc_config["ffmpeg"] = {
            "rtsp": "-fflags nobuffer -flags low_delay -stimeout 5000000 -user_agent go2rtc/ffmpeg -rtsp_transport tcp -i {input}"
        }
    elif go2rtc_config["ffmpeg"].get("rtsp") is None:
        go2rtc_config["ffmpeg"][
            "rtsp"
        ] = "-fflags nobuffer -flags low_delay -stimeout 5000000 -user_agent go2rtc/ffmpeg -rtsp_transport tcp -i {input}"

for name in go2rtc_config.get("streams", {}):
    stream = go2rtc_config["streams"][name]

    if isinstance(stream, str):
        go2rtc_config["streams"][name] = go2rtc_config["streams"][name].format(
            **FRIGATE_ENV_VARS
        )
    elif isinstance(stream, list):
        for i, stream in enumerate(stream):
            go2rtc_config["streams"][name][i] = stream.format(**FRIGATE_ENV_VARS)

# add birdseye restream stream if enabled
if config.get("birdseye", {}).get("restream", False):
    birdseye: dict[str, any] = config.get("birdseye")

    input = f"-f rawvideo -pix_fmt yuv420p -video_size {birdseye.get('width', 1280)}x{birdseye.get('height', 720)} -r 10 -i {BIRDSEYE_PIPE}"
    ffmpeg_cmd = f"exec:{parse_preset_hardware_acceleration_encode(config.get('ffmpeg', {}).get('hwaccel_args'), input, '-rtsp_transport tcp -f rtsp {output}')}"

    if go2rtc_config.get("streams"):
        go2rtc_config["streams"]["birdseye"] = ffmpeg_cmd
    else:
        go2rtc_config["streams"] = {"birdseye": ffmpeg_cmd}

# Write go2rtc_config to /dev/shm/go2rtc.yaml
with open("/dev/shm/go2rtc.yaml", "w") as f:
    yaml.dump(go2rtc_config, f)
