import unittest

from frigate.config import FrigateConfig


class TestRetainPolicyConfig(unittest.TestCase):
    def setUp(self):
        self.base_config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "front_door": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                }
            },
        }

    def test_default_retain_policy_is_time(self):
        config = FrigateConfig(**self.base_config)
        assert config.record.retain_policy.value == "time"

    def test_continuous_rollover_policy(self):
        self.base_config["record"] = {
            "enabled": True,
            "retain_policy": "continuous_rollover",
        }
        config = FrigateConfig(**self.base_config)
        assert config.record.retain_policy.value == "continuous_rollover"

    def test_continuous_rollover_ignores_continuous_days(self):
        self.base_config["record"] = {
            "enabled": True,
            "retain_policy": "continuous_rollover",
            "continuous": {"days": 30},
        }
        config = FrigateConfig(**self.base_config)
        assert config.record.retain_policy.value == "continuous_rollover"
        assert config.record.continuous.days == 30

    def test_invalid_retain_policy_rejected(self):
        self.base_config["record"] = {
            "retain_policy": "invalid_value",
        }
        with self.assertRaises(Exception):
            FrigateConfig(**self.base_config)
