"""Controls go2rtc restream."""


import logging
import requests
from frigate.util import escape_special_characters

from frigate.config import FrigateConfig
from frigate.const import BIRDSEYE_PIPE
from frigate.ffmpeg_presets import parse_preset_hardware_acceleration_encode

logger = logging.getLogger(__name__)


def get_manual_go2rtc_stream(camera_url: str) -> str:
    """Get a manual stream for go2rtc."""
    return f"ffmpeg:{camera_url}#video=copy#audio=aac#audio=opus"


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
                        self.relays[cam_name] = escape_special_characters(input.path)
                    else:
                        # go2rtc only supports rtsp for direct relay, otherwise ffmpeg is used
                        self.relays[cam_name] = get_manual_go2rtc_stream(
                            escape_special_characters(input.path)
                        )

        if self.config.restream.birdseye:
            self.relays[
                "birdseye"
            ] = f"exec:ffmpeg -hide_banner -f rawvideo -pix_fmt yuv420p -s {self.config.birdseye.width}x{self.config.birdseye.height} -r 10 -i {BIRDSEYE_PIPE} {' '.join(parse_preset_hardware_acceleration_encode(self.config.ffmpeg.hwaccel_args))} -rtsp_transport tcp -f rtsp {{output}}"

        for name, path in self.relays.items():
            params = {"src": path, "name": name}
            requests.put("http://127.0.0.1:1984/api/streams", params=params)
