"""Controls go2rtc restream."""


import logging
import requests

from frigate.config import FrigateConfig
from frigate.const import BIRDSEYE_PIPE
from frigate.ffmpeg_presets import (
    parse_preset_hardware_acceleration_encode,
)

logger = logging.getLogger(__name__)


class RestreamApi:
    """Control go2rtc relay API."""

    def __init__(self, config: FrigateConfig) -> None:
        self.config: FrigateConfig = config

    def add_cameras(self) -> None:
        """Add cameras to go2rtc."""
        self.relays: dict[str, str] = {}

        if self.config.birdseye.restream:
            self.relays[
                "birdseye"
            ] = f"exec:{parse_preset_hardware_acceleration_encode(self.config.ffmpeg.hwaccel_args, f'-f rawvideo -pix_fmt yuv420p -video_size {self.config.birdseye.width}x{self.config.birdseye.height} -r 10 -i {BIRDSEYE_PIPE}', '-rtsp_transport tcp -f rtsp {output}')}"

        for name, path in self.relays.items():
            params = {"src": path, "name": name}
            requests.put("http://127.0.0.1:1984/api/streams", params=params)
