"""Tests for the safe mode fallback and FRIGATE_ALLOW_SAFE_MODE."""

import io
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest.mock import MagicMock, patch

from pydantic import ValidationError

from frigate.util.config import is_safe_mode_allowed


def _make_validation_error() -> ValidationError:
    """Build the same shape of error main() reports, without parsing a config."""
    return ValidationError.from_exception_data(
        "FrigateConfig",
        [
            {
                "type": "bool_parsing",
                "loc": ("mqtt", "enabled"),
                "msg": "Input should be a valid boolean",
                "input": {},
            }
        ],
    )


class TestIsSafeModeAllowed(unittest.TestCase):
    def setUp(self):
        self._original_environ = os.environ.copy()

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self._original_environ)

    def test_allowed_by_default(self):
        """No env var keeps the current behavior: safe mode is allowed."""
        os.environ.pop("FRIGATE_ALLOW_SAFE_MODE", None)
        self.assertTrue(is_safe_mode_allowed())

    def test_allowed_when_true(self):
        os.environ["FRIGATE_ALLOW_SAFE_MODE"] = "true"
        self.assertTrue(is_safe_mode_allowed())

    def test_disabled_when_false(self):
        os.environ["FRIGATE_ALLOW_SAFE_MODE"] = "false"
        self.assertFalse(is_safe_mode_allowed())


class TestMainSafeModeFallback(unittest.TestCase):
    """Behavior of frigate.__main__.main() when the config fails validation."""

    def setUp(self):
        self._dir = tempfile.TemporaryDirectory()
        self.addCleanup(self._dir.cleanup)
        self.config_path = os.path.join(self._dir.name, "config.yml")
        with open(self.config_path, "w") as f:
            f.write("mqtt:\n  enabled: {}\ncameras: {}\n")

        self._env = patch.dict(os.environ, {"CONFIG_FILE": self.config_path})
        self._env.start()
        self.addCleanup(self._env.stop)

    def _run_main(
        self,
        argv: list[str],
        load_side_effect: list,
    ) -> tuple[str, MagicMock, MagicMock]:
        """Run main() with the app machinery mocked out.

        Returns captured stdout plus the mocked FrigateConfig and FrigateApp.
        """
        import frigate.__main__ as frigate_main

        config_cls = MagicMock()
        config_cls.load.side_effect = load_side_effect
        frigate_app = MagicMock()

        with (
            patch.object(frigate_main, "mp"),
            patch.object(frigate_main, "setup_logging"),
            patch.object(frigate_main, "FrigateConfig", config_cls),
            patch.object(frigate_main, "FrigateApp", frigate_app),
            patch.object(sys, "argv", argv),
            redirect_stdout(io.StringIO()) as out,
        ):
            try:
                frigate_main.main()
            except SystemExit as e:
                print(f"[exit {e.code}]")

        return out.getvalue(), config_cls, frigate_app

    def test_invalid_config_starts_safe_mode_by_default(self):
        os.environ.pop("FRIGATE_ALLOW_SAFE_MODE", None)
        output, config_cls, frigate_app = self._run_main(
            ["frigate"], [_make_validation_error(), MagicMock(name="safe_config")]
        )
        self.assertIn("Starting Frigate in safe mode.", output)
        self.assertEqual(config_cls.load.call_count, 2)
        frigate_app.assert_called_once()

    def test_invalid_config_exits_when_safe_mode_disabled(self):
        os.environ["FRIGATE_ALLOW_SAFE_MODE"] = "false"
        output, config_cls, frigate_app = self._run_main(
            ["frigate"], [_make_validation_error(), MagicMock(name="safe_config")]
        )
        self.assertIn("Safe mode is disabled", output)
        self.assertNotIn("Starting Frigate in safe mode.", output)
        # the safe mode fallback was never attempted
        self.assertEqual(config_cls.load.call_count, 1)
        frigate_app.assert_not_called()
        self.assertIn("[exit 1]", output)

    def test_validate_config_exits_regardless_of_safe_mode(self):
        os.environ["FRIGATE_ALLOW_SAFE_MODE"] = "false"
        output, config_cls, frigate_app = self._run_main(
            ["frigate", "--validate-config"],
            [_make_validation_error(), MagicMock(name="safe_config")],
        )
        self.assertIn("[exit 1]", output)
        self.assertEqual(config_cls.load.call_count, 1)
        frigate_app.assert_not_called()

    def test_valid_config_is_unaffected(self):
        os.environ["FRIGATE_ALLOW_SAFE_MODE"] = "false"
        output, config_cls, frigate_app = self._run_main(
            ["frigate"], [MagicMock(name="config")]
        )
        self.assertNotIn("Safe mode is disabled", output)
        self.assertNotIn("Starting Frigate in safe mode.", output)
        self.assertEqual(config_cls.load.call_count, 1)
        frigate_app.assert_called_once()


if __name__ == "__main__":
    unittest.main()
