import unittest

from pydantic import ValidationError

from frigate.config.camera.motion_path import MotionPathConfig


class TestMotionPathConfig(unittest.TestCase):
    def setUp(self):
        self.default_config = {
            "enabled": True,
            "max_history": 10,
            "mask": None,
            "raw_mask": None,
        }

    def test_default_motion_path_config(self):
        motion_path_config = MotionPathConfig(**self.default_config)
        assert motion_path_config.enabled is True
        assert motion_path_config.max_history == 10
        assert motion_path_config.mask is None
        assert motion_path_config.raw_mask is None

    def test_valid_max_history(self):
        config = self.default_config.copy()
        config["max_history"] = 50
        motion_path_config = MotionPathConfig(**config)
        assert motion_path_config.max_history == 50

    def test_invalid_max_history_below_minimum(self):
        config = self.default_config.copy()
        config["max_history"] = 1
        with self.assertRaises(ValidationError):
            MotionPathConfig(**config)

    def test_invalid_max_history_above_maximum(self):
        config = self.default_config.copy()
        config["max_history"] = 101
        with self.assertRaises(ValidationError):
            MotionPathConfig(**config)

    def test_serialize_mask(self):
        config = self.default_config.copy()
        config["raw_mask"] = "test_mask"
        motion_path_config = MotionPathConfig(**config)
        assert (
            motion_path_config.serialize_mask(motion_path_config.mask, None)
            == "test_mask"
        )

    def test_serialize_raw_mask(self):
        config = self.default_config.copy()
        config["raw_mask"] = "test_mask"
        motion_path_config = MotionPathConfig(**config)
        assert (
            motion_path_config.serialize_raw_mask(motion_path_config.raw_mask, None)
            is None
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
