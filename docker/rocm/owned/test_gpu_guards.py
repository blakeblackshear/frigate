"""Verify hardware authorization gates without loading a GPU library."""

import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import gpu_canary
import qualify_model


class TestGpuGuards(unittest.TestCase):
    def test_present_device_does_not_replace_explicit_authorization(self):
        with (
            patch.object(gpu_canary.Path, "exists", return_value=True),
            patch.object(gpu_canary.ct, "CDLL") as load,
        ):
            with self.assertRaisesRegex(RuntimeError, "allow-gpu"):
                gpu_canary.require_gpu(False)
            with self.assertRaisesRegex(RuntimeError, "allow-gpu"):
                qualify_model.gpu(SimpleNamespace(allow_gpu=False))
            load.assert_not_called()

    def test_missing_sdma_and_inherited_override_are_rejected(self):
        with (
            patch.object(gpu_canary.Path, "exists", return_value=True),
            patch.object(gpu_canary.ct, "CDLL") as load,
        ):
            for environment, error in (
                ({}, "SDMA"),
                (
                    {
                        "HSA_ENABLE_SDMA": "0",
                        "FRIGATE_ROCM_NATIVE_GFX90C": "1",
                        "HSA_OVERRIDE_GFX_VERSION": "9.0.0",
                    },
                    "inherit",
                ),
                ({"HSA_ENABLE_SDMA": "0"}, "override"),
            ):
                with (
                    self.subTest(environment=environment),
                    patch.dict(os.environ, environment, clear=True),
                ):
                    with self.assertRaisesRegex(RuntimeError, error):
                        gpu_canary.require_gpu(True)
                    with self.assertRaisesRegex(RuntimeError, error):
                        qualify_model.gpu(SimpleNamespace(allow_gpu=True))
            load.assert_not_called()


if __name__ == "__main__":
    unittest.main()
