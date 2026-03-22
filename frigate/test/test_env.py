"""Tests for environment variable handling."""

import os
import unittest

from frigate.config.env import (
    FRIGATE_ENV_VARS,
    validate_env_string,
    validate_env_vars,
)


class TestEnvString(unittest.TestCase):
    def setUp(self):
        self._original_env_vars = dict(FRIGATE_ENV_VARS)

    def tearDown(self):
        FRIGATE_ENV_VARS.clear()
        FRIGATE_ENV_VARS.update(self._original_env_vars)

    def test_substitution(self):
        """EnvString substitutes FRIGATE_ env vars."""
        FRIGATE_ENV_VARS["FRIGATE_TEST_HOST"] = "192.168.1.100"
        result = validate_env_string("{FRIGATE_TEST_HOST}")
        self.assertEqual(result, "192.168.1.100")

    def test_substitution_in_url(self):
        """EnvString substitutes vars embedded in a URL."""
        FRIGATE_ENV_VARS["FRIGATE_CAM_USER"] = "admin"
        FRIGATE_ENV_VARS["FRIGATE_CAM_PASS"] = "secret"
        result = validate_env_string(
            "rtsp://{FRIGATE_CAM_USER}:{FRIGATE_CAM_PASS}@10.0.0.1/stream"
        )
        self.assertEqual(result, "rtsp://admin:secret@10.0.0.1/stream")

    def test_no_placeholder(self):
        """Plain strings pass through unchanged."""
        result = validate_env_string("192.168.1.1")
        self.assertEqual(result, "192.168.1.1")

    def test_unknown_var_raises(self):
        """Referencing an unknown var raises KeyError."""
        with self.assertRaises(KeyError):
            validate_env_string("{FRIGATE_NONEXISTENT_VAR}")


class TestEnvVars(unittest.TestCase):
    def setUp(self):
        self._original_env_vars = dict(FRIGATE_ENV_VARS)
        self._original_environ = os.environ.copy()

    def tearDown(self):
        FRIGATE_ENV_VARS.clear()
        FRIGATE_ENV_VARS.update(self._original_env_vars)
        # Clean up any env vars we set
        for key in list(os.environ.keys()):
            if key not in self._original_environ:
                del os.environ[key]

    def _make_context(self, install: bool):
        """Create a mock ValidationInfo with the given install flag."""

        class MockContext:
            def __init__(self, ctx):
                self.context = ctx

        mock = MockContext({"install": install})
        return mock

    def test_install_sets_os_environ(self):
        """validate_env_vars with install=True sets os.environ."""
        ctx = self._make_context(install=True)
        validate_env_vars({"MY_CUSTOM_VAR": "value123"}, ctx)
        self.assertEqual(os.environ.get("MY_CUSTOM_VAR"), "value123")

    def test_install_updates_frigate_env_vars(self):
        """validate_env_vars with install=True updates FRIGATE_ENV_VARS for FRIGATE_ keys."""
        ctx = self._make_context(install=True)
        validate_env_vars({"FRIGATE_MQTT_PASS": "secret"}, ctx)
        self.assertEqual(FRIGATE_ENV_VARS["FRIGATE_MQTT_PASS"], "secret")

    def test_install_skips_non_frigate_in_env_vars_dict(self):
        """Non-FRIGATE_ keys are set in os.environ but not in FRIGATE_ENV_VARS."""
        ctx = self._make_context(install=True)
        validate_env_vars({"OTHER_VAR": "value"}, ctx)
        self.assertEqual(os.environ.get("OTHER_VAR"), "value")
        self.assertNotIn("OTHER_VAR", FRIGATE_ENV_VARS)

    def test_no_install_does_not_set(self):
        """validate_env_vars without install=True does not modify state."""
        ctx = self._make_context(install=False)
        validate_env_vars({"FRIGATE_SKIP": "nope"}, ctx)
        self.assertNotIn("FRIGATE_SKIP", FRIGATE_ENV_VARS)
        self.assertNotIn("FRIGATE_SKIP", os.environ)

    def test_env_vars_available_for_env_string(self):
        """Vars set via validate_env_vars are usable in validate_env_string."""
        ctx = self._make_context(install=True)
        validate_env_vars({"FRIGATE_BROKER": "mqtt.local"}, ctx)
        result = validate_env_string("{FRIGATE_BROKER}")
        self.assertEqual(result, "mqtt.local")


if __name__ == "__main__":
    unittest.main()
