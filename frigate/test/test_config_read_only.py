"""Tests for treating the config file as externally managed."""

import os
import tempfile
import unittest
from unittest.mock import patch

from ruamel.yaml import YAML

from frigate import __main__ as frigate_main
from frigate.config import FrigateConfig
from frigate.util.config import CURRENT_CONFIG_VERSION, migrate_frigate_config

READ_ONLY_ENV = {"FRIGATE_CONFIG_READ_ONLY": "true"}

MIGRATABLE_CONFIG = {
    "version": "0.18-0",
    "mqtt": {"enabled": False},
    "cameras": {
        "back": {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}]
            },
        }
    },
}


def write_config(config_dir: str, config: dict) -> str:
    config_file = os.path.join(config_dir, "config.yml")

    with open(config_file, "w") as f:
        YAML().dump(config, f)

    return config_file


class TestReadOnlyMigration(unittest.TestCase):
    """A config Frigate does not own must not be rewritten underneath its owner."""

    def test_config_is_migrated_when_writable(self) -> None:
        with tempfile.TemporaryDirectory() as config_dir:
            config_file = write_config(config_dir, MIGRATABLE_CONFIG)

            with patch("frigate.util.config.CONFIG_DIR", config_dir):
                migrate_frigate_config(config_file)

            with open(config_file) as f:
                migrated = YAML().load(f)

            self.assertEqual(migrated["version"], CURRENT_CONFIG_VERSION)

    def test_config_is_left_alone_when_read_only(self) -> None:
        with tempfile.TemporaryDirectory() as config_dir:
            config_file = write_config(config_dir, MIGRATABLE_CONFIG)

            with open(config_file) as f:
                before = f.read()

            with (
                patch.dict("os.environ", READ_ONLY_ENV),
                patch("frigate.util.config.CONFIG_DIR", config_dir),
            ):
                migrate_frigate_config(config_file)

            with open(config_file) as f:
                self.assertEqual(f.read(), before)

            self.assertEqual(os.listdir(config_dir), ["config.yml"])


class TestReadOnlyStartup(unittest.TestCase):
    """Frigate cannot repair a read-only config, so it has to fail instead."""

    def test_missing_config_is_an_error(self) -> None:
        with tempfile.TemporaryDirectory() as config_dir:
            config_file = os.path.join(config_dir, "config.yml")

            with (
                patch.dict("os.environ", {"CONFIG_FILE": config_file, **READ_ONLY_ENV}),
                self.assertRaises(FileNotFoundError),
            ):
                FrigateConfig.load()

    def test_invalid_config_does_not_start_safe_mode(self) -> None:
        with tempfile.TemporaryDirectory() as config_dir:
            config_file = write_config(config_dir, {"not_a_real_option": True})

            with (
                patch.dict("os.environ", {"CONFIG_FILE": config_file, **READ_ONLY_ENV}),
                patch("sys.argv", ["frigate"]),
                # a regression here would otherwise boot Frigate from the test
                patch("frigate.__main__.FrigateApp"),
                self.assertRaises(SystemExit) as exit_call,
            ):
                frigate_main.main()

            self.assertEqual(exit_call.exception.code, 1)
