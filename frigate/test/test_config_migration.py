"""Test Frigate configuration migrations."""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from ruamel.yaml import YAML

from frigate.util.config import migrate_018_1, migrate_frigate_config


class TestConfigMigration018(unittest.TestCase):
    def test_migrates_birdseye_modes_at_each_override_level(self):
        config = {
            "version": "0.17-0",
            "birdseye": {"mode": "objects"},
            "cameras": {
                "front": {
                    "birdseye": {"mode": "motion"},
                    "profiles": {"away": {"birdseye": {"mode": "continuous"}}},
                }
            },
        }

        migrated = migrate_018_1(config)

        self.assertEqual(
            migrated["birdseye"]["mode"],
            {
                "continuous": False,
                "motion": False,
                "objects": True,
                "stationary_objects": False,
            },
        )
        self.assertEqual(
            migrated["cameras"]["front"]["birdseye"]["mode"],
            {
                "continuous": False,
                "motion": True,
                "objects": False,
                "stationary_objects": False,
            },
        )
        self.assertEqual(
            migrated["cameras"]["front"]["profiles"]["away"]["birdseye"]["mode"],
            {
                "continuous": True,
                "motion": False,
                "objects": False,
                "stationary_objects": False,
            },
        )

    def test_preserves_boolean_birdseye_mode(self):
        mode = {"motion": True, "objects": True}

        migrated = migrate_018_1({"birdseye": {"mode": mode}})

        self.assertEqual(migrated["birdseye"]["mode"], mode)

    def test_current_config_version_runs_birdseye_migration(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            config_path = Path(temp_dir) / "config.yml"
            config_path.write_text(
                "version: 0.18-0\nbirdseye:\n  mode: objects\n",
                encoding="utf-8",
            )

            with patch("frigate.util.config.CONFIG_DIR", temp_dir):
                migrate_frigate_config(str(config_path))

            migrated = YAML().load(config_path.read_text(encoding="utf-8"))

        self.assertEqual(migrated["version"], "0.18-1")
        self.assertEqual(
            migrated["birdseye"]["mode"],
            {
                "continuous": False,
                "motion": False,
                "objects": True,
                "stationary_objects": False,
            },
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
