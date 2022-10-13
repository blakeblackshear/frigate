"""Controls go2rtc restream."""


import requests
import urllib.parse

from frigate.config import FrigateConfig


class RestreamApi:
    """Control go2rtc relay API."""

    def __init__(self, config: FrigateConfig) -> None:
        self.config: FrigateConfig = config

    def add_cameras(self) -> None:
        """Add cameras to go2rtc."""
        self.relays: dict[str, str] = {}

        for cam_name, camera in self.config.cameras.items():
            for input in camera.ffmpeg.inputs:
                if "restream" in input.roles:
                    self.relays[cam_name] = input.path

        for name, path in self.relays.items():
            params = {"src": urllib.parse.quote_plus(path), "name": name}
            requests.put("http://localhost:1984/api/streams", params=params)
