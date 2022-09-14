import unittest
import numpy as np
from pydantic import ValidationError
from frigate.config import (
    BirdseyeModeEnum,
    FrigateConfig,
    DetectorTypeEnum,
)
from frigate.ffmpeg_presets import parse_preset_input


class TestFfmpegPresets(unittest.TestCase):
    def setUp(self):
        self.default_ffmpeg = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {
                        "height": 1080,
                        "width": 1920,
                        "fps": 5,
                    },
                }
            },
        }

    def test_default_ffmpeg(self):
        frigate_config = FrigateConfig(**self.default_ffmpeg)
        assert self.default_ffmpeg == frigate_config.dict(exclude_unset=True)

    def test_ffmpeg_hwaccel_preset(self):
        self.default_ffmpeg["cameras"]["back"]["ffmpeg"]["hwaccel_args"] = "preset-rpi-64-h264"
        frigate_config = FrigateConfig(**self.default_ffmpeg)
        assert "preset-rpi-64-h264" not in frigate_config.cameras["back"]["ffmpeg_cmds"][0]
        assert "-c:v h264_v4l2m2m" in frigate_config.cameras["back"]["ffmpeg_cmds"][0]

    def test_ffmpeg_hwaccel_not_preset(self):
        self.default_ffmpeg["cameras"]["back"]["ffmpeg"]["hwaccel_args"] = "-other-hwaccel args"
        frigate_config = FrigateConfig(**self.default_ffmpeg)
        assert "-other-hwaccel args" in frigate_config.cameras["back"]["ffmpeg_cmds"][0]

    def test_default_ffmpeg_input_arg_preset(self):
        frigate_config = FrigateConfig(**self.default_ffmpeg)

        self.default_ffmpeg["cameras"]["back"]["ffmpeg"]["input_args"] = "preset-rtsp-generic"
        frigate_preset_config = FrigateConfig(**self.default_ffmpeg)
        assert frigate_preset_config.cameras["back"]["ffmpeg_cms"][0] == frigate_config.cameras["back"]["ffmpeg_cmds"][0]

    def test_ffmpeg_input_preset(self):
        self.default_ffmpeg["cameras"]["back"]["ffmpeg"]["input_args"] = "preset-rtmp-generic"
        frigate_config = FrigateConfig(**self.default_ffmpeg)
        assert "preset-rtmp-generic" not in frigate_config.cameras["back"]["ffmpeg_cmds"][0]
        assert parse_preset_input("preset-rtmp-generic") in frigate_config.cameras["back"]["ffmpeg_cmds"][0]

    def test_ffmpeg_input_not_preset(self):
        self.default_ffmpeg["cameras"]["back"]["ffmpeg"]["input_args"] = "-some inputs"
        frigate_config = FrigateConfig(**self.default_ffmpeg)
        assert "-some inputs" in frigate_config.cameras["back"]["ffmpeg_cmds"][0]

    def test_ffmpeg_output_record_preset(self):
        self.default_ffmpeg["cameras"]["back"]["ffmpeg"]["output_args"] = "preset-record-generic-audio"
        frigate_config = FrigateConfig(**self.default_ffmpeg)
        assert "preset-record-generic-audio" not in frigate_config.cameras["back"]["ffmpeg_cmds"][0]
        assert "-c:v copy -c:a aac" in frigate_config.cameras["back"]["ffmpeg_cmds"][0]

    def test_ffmpeg_output_record_not_preset(self):
        self.default_ffmpeg["cameras"]["back"]["ffmpeg"]["input_args"] = "-some output"
        frigate_config = FrigateConfig(**self.default_ffmpeg)
        assert "-some output" in frigate_config.cameras["back"]["ffmpeg_cmds"][0]

    def test_ffmpeg_output_rtmp_preset(self):
        self.default_ffmpeg["cameras"]["back"]["ffmpeg"]["input_args"] = "preset-rtmp-jpeg"
        frigate_config = FrigateConfig(**self.default_ffmpeg)
        assert "preset-rtmp-jpeg" not in frigate_config.cameras["back"]["ffmpeg_cmds"][0]
        assert "-c:v libx264" in frigate_config.cameras["back"]["ffmpeg_cmds"][0]

    def test_ffmpeg_output_rtmp_not_preset(self):
        self.default_ffmpeg["cameras"]["back"]["ffmpeg"]["input_args"] = "-some output"
        frigate_config = FrigateConfig(**self.default_ffmpeg)
        assert "-some output" in frigate_config.cameras["back"]["ffmpeg_cmds"][0]


if __name__ == "__main__":
    unittest.main(verbosity=2)
