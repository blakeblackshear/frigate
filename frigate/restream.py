"""Controls go2rtc restream."""


import logging
import requests

from frigate.config import FrigateConfig

logger = logging.getLogger(__name__)


def get_manual_go2rtc_stream(camera_url: str) -> str:
    """Get a manual stream for go2rtc."""
    return f"exec: /usr/lib/btbn-ffmpeg/bin/ffmpeg -i {camera_url} -c:v copy -c:a libopus -rtsp_transport tcp -f rtsp {{output}}"


class RestreamApi:
    """Control go2rtc relay API."""

    def __init__(self, config: FrigateConfig) -> None:
        self.config: FrigateConfig = config

    def add_cameras(self) -> None:
        """Add cameras to go2rtc."""
        self.relays: dict[str, str] = {}

        for cam_name, camera in self.config.cameras.items():
            if not camera.restream.enabled:
                continue

            for input in camera.ffmpeg.inputs:
                if "restream" in input.roles:
                    if (
                        input.path.startswith("rtsp")
                        and not camera.restream.force_audio
                    ):
                        self.relays[cam_name] = input.path
                    else:
                        # go2rtc only supports rtsp for direct relay, otherwise ffmpeg is used
                        self.relays[cam_name] = get_manual_go2rtc_stream(input.path)

        for name, path in self.relays.items():
            params = {"src": path, "name": name}
            requests.put("http://127.0.0.1:1984/api/streams", params=params)
