"""Controls go2rtc relay."""


import requests
import urllib.parse

from frigate.config import CameraConfig, FrigateConfig


class RelayApi:
    """Control go2rtc relay API."""

    def __init__(self, config: FrigateConfig) -> None:
        self.config: FrigateConfig = config

    def add_cameras(self) -> None:
        """Add cameras to go2rtc relay."""
        self.relays: dict[str, str] = {}

        for cam_name, camera in self.config.cameras.items():
            for input in camera.ffmpeg.inputs:
                if "relay" in input.roles:
                    self.relays[cam_name] = input.path

        for name, path in self.relays.items():
            params = {"src": urllib.parse.quote_plus(path), "name": name}
            requests.put("http://localhost:1984/api/streams", params=params)
