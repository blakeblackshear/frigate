"""Tests for migrating detectors and model into the models list."""

import logging
import os
import tempfile
import unittest
from unittest.mock import patch

from ruamel.yaml import YAML

from frigate.util.config import (
    CURRENT_CONFIG_VERSION,
    migrate_frigate_config,
    migrate_models,
)


class TestMigrateModels(unittest.TestCase):
    def test_single_cpu_detector(self):
        migrated = migrate_models({"detectors": {"cpu": {"type": "cpu"}}})

        self.assertEqual(migrated["models"], [{"scene": "all", "devices": ["cpu"]}])
        self.assertNotIn("detectors", migrated)

    def test_model_settings_are_carried_over(self):
        migrated = migrate_models(
            {
                "detectors": {"coral": {"type": "edgetpu", "device": "pci:0"}},
                "model": {"path": "plus://abc", "width": 320},
            }
        )

        self.assertEqual(
            migrated["models"],
            [
                {
                    "scene": "all",
                    "path": "plus://abc",
                    "width": 320,
                    "devices": ["edgetpu:pci:0"],
                }
            ],
        )
        self.assertNotIn("model", migrated)

    def test_multiple_corals_become_multiple_devices(self):
        migrated = migrate_models(
            {
                "detectors": {
                    "coral1": {"type": "edgetpu", "device": "pci:0"},
                    "coral2": {"type": "edgetpu", "device": "pci:1"},
                }
            }
        )

        self.assertEqual(
            migrated["models"][0]["devices"], ["edgetpu:pci:0", "edgetpu:pci:1"]
        )

    def test_several_detectors_on_one_device_stay_separate(self):
        # a repeated device is now what running two inference processes on one
        # piece of hardware looks like
        migrated = migrate_models(
            {
                "detectors": {
                    "ov_0": {"type": "openvino", "device": "GPU"},
                    "ov_1": {"type": "openvino", "device": "GPU"},
                }
            }
        )

        self.assertEqual(
            migrated["models"][0]["devices"], ["openvino:GPU", "openvino:GPU"]
        )

    def test_repeated_exclusive_devices_are_collapsed(self):
        # two detectors both grabbing the first TPU was never really two TPUs
        migrated = migrate_models(
            {
                "detectors": {
                    "coral_0": {"type": "edgetpu", "device": "usb"},
                    "coral_1": {"type": "edgetpu", "device": "usb"},
                }
            }
        )

        self.assertEqual(migrated["models"][0]["devices"], ["edgetpu:usb"])

    def test_detectors_that_named_the_device_field_differently(self):
        migrated = migrate_models(
            {
                "detectors": {
                    "rk": {"type": "rknn", "num_cores": 2},
                }
            }
        )

        self.assertEqual(migrated["models"][0]["devices"], ["rknn:2"])

    def test_empty_edgetpu_device_is_kept(self):
        # an empty device selects a native Coral, which is not the same as
        # letting the delegate pick
        migrated = migrate_models(
            {"detectors": {"coral": {"type": "edgetpu", "device": ""}}}
        )

        self.assertEqual(migrated["models"][0]["devices"], ["edgetpu:"])

    def test_model_path_overrides_the_model(self):
        migrated = migrate_models(
            {
                "detectors": {
                    "coral": {"type": "edgetpu", "model_path": "/custom.tflite"}
                },
                "model": {"path": "/ignored.tflite", "width": 320},
            }
        )

        self.assertEqual(migrated["models"][0]["path"], "/custom.tflite")

    def test_no_detectors_falls_back_to_cpu(self):
        migrated = migrate_models({"model": {"width": 320}})

        self.assertEqual(migrated["models"][0]["devices"], ["cpu"])

    def test_dropped_remote_detector_options_are_logged(self):
        with self.assertLogs("frigate.util.config", level=logging.ERROR) as logs:
            migrated = migrate_models(
                {
                    "detectors": {
                        "ds": {
                            "type": "deepstack",
                            "api_url": "http://host:5000/v1/vision/detection",
                            "api_key": "secret",
                        }
                    }
                }
            )

        self.assertEqual(
            migrated["models"][0]["devices"],
            ["deepstack:http://host:5000/v1/vision/detection"],
        )
        self.assertTrue(any("api_key" in message for message in logs.output))

    def test_mixed_detector_types_are_logged(self):
        with self.assertLogs("frigate.util.config", level=logging.ERROR) as logs:
            migrate_models(
                {
                    "detectors": {
                        "ov": {"type": "openvino", "device": "GPU"},
                        "coral": {"type": "edgetpu", "device": "pci:0"},
                    }
                }
            )

        self.assertTrue(any("more than one type" in message for message in logs.output))

    def test_other_keys_are_untouched(self):
        migrated = migrate_models(
            {"mqtt": {"host": "mqtt"}, "detectors": {"cpu": {"type": "cpu"}}}
        )

        self.assertEqual(migrated["mqtt"], {"host": "mqtt"})


class TestMigrateConfigFile(unittest.TestCase):
    """The full file migration, which is gated on shape as well as version."""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.config_file = os.path.join(self.temp_dir.name, "config.yml")
        patcher = patch("frigate.util.config.CONFIG_DIR", self.temp_dir.name)
        patcher.start()
        self.addCleanup(patcher.stop)

    def _migrate(self, config: str) -> dict:
        with open(self.config_file, "w") as f:
            f.write(config)

        migrate_frigate_config(self.config_file)

        with open(self.config_file) as f:
            return YAML().load(f)

    def test_migrates_a_config_already_stamped_with_the_current_version(self):
        # 0.19 is unreleased, so a dev config can be current and still use
        # the pre-models keys
        migrated = self._migrate(
            "mqtt:\n"
            "  enabled: false\n"
            "detectors:\n"
            "  ov:\n"
            "    type: openvino\n"
            "    device: GPU\n"
            "cameras: {}\n"
            f"version: {CURRENT_CONFIG_VERSION}\n"
        )

        self.assertEqual(migrated["models"][0]["devices"], ["openvino:GPU"])
        self.assertNotIn("detectors", migrated)

    def test_a_migrated_config_is_left_alone(self):
        migrated = self._migrate(
            "mqtt:\n"
            "  enabled: false\n"
            "models:\n"
            "  - scene: all\n"
            "    devices:\n"
            "      - openvino:GPU\n"
            "cameras: {}\n"
            f"version: {CURRENT_CONFIG_VERSION}\n"
        )

        self.assertEqual(
            migrated["models"], [{"scene": "all", "devices": ["openvino:GPU"]}]
        )
        self.assertFalse(
            os.path.exists(os.path.join(self.temp_dir.name, "backup_config.yaml"))
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
