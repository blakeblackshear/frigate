"""Keep interrupted tuning within each backend's proven private cache."""

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from qualify_model import configure_tuning_cache, sanitize_legacy_tuning_cache


class TestTuningCache(unittest.TestCase):
    def setUp(self):
        environment = patch.dict(os.environ, {}, clear=True)
        environment.start()
        self.addCleanup(environment.stop)
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.cache = Path(directory.name) / "model_tune.mxr"

    def test_older_backend_does_not_use_native_cache_format(self):
        settings = configure_tuning_cache(self.cache)
        self.assertEqual(
            settings["MIGRAPHX_PROBLEM_CACHE"],
            str(self.cache.parent / "problems.json"),
        )
        self.assertEqual(settings["MIGRAPHX_TRACE_BENCHMARKING"], "1")
        self.assertNotIn("MIGRAPHX_GPU_OPTIONS", os.environ)

    def test_legacy_null_marks_are_removed_without_changing_completed_choices(self):
        path = self.cache.parent / "problems.json"
        completed = [
            {"name": "gpu::mlir_op", "problem": {"shape": [1, 3, 320, 320]}},
            "v3:fixture",
        ]
        path.write_text(
            json.dumps([completed, [{"name": "other", "problem": {}}, None]])
        )
        result = sanitize_legacy_tuning_cache(path)
        self.assertEqual(json.loads(path.read_text()), [completed])
        self.assertEqual(result["unfinished_marks_removed"], 1)
        self.assertEqual(result["completed_choices_retained"], 1)
        self.assertNotEqual(result["sha256_before"], result["sha256_after"])
        original = path.read_bytes()
        self.assertEqual(
            sanitize_legacy_tuning_cache(path)["unfinished_marks_removed"], 0
        )
        self.assertEqual(path.read_bytes(), original)

    def test_legacy_absent_empty_and_invalid_cache_handling(self):
        path = self.cache.parent / "problems.json"
        self.assertIsNone(sanitize_legacy_tuning_cache(path))
        path.write_text("[]")
        self.assertEqual(
            sanitize_legacy_tuning_cache(path)["completed_choices_retained"], 0
        )
        for value in (
            {"native": "format"},
            [[{}, None]],
            [[{"name": "op", "problem": {}}]],
        ):
            path.write_text(json.dumps(value))
            original = path.read_bytes()
            with self.subTest(value=value), self.assertRaises(ValueError):
                sanitize_legacy_tuning_cache(path)
            self.assertEqual(path.read_bytes(), original)

    def test_legacy_symlink_and_conflicting_environment_are_rejected(self):
        path = self.cache.parent / "problems.json"
        target = self.cache.parent / "other.json"
        target.write_text("[]")
        path.symlink_to(target)
        with self.assertRaisesRegex(ValueError, "symlink"):
            sanitize_legacy_tuning_cache(path)
        with patch.dict(
            os.environ, {"MIGRAPHX_PROBLEM_CACHE": "/another-runtime/problems.json"}
        ):
            with self.assertRaises(ValueError):
                configure_tuning_cache(self.cache)

    def test_native_cache_is_private_and_completed_choices_are_saved(self):
        os.environ["FRIGATE_ROCM_NATIVE_GFX90C"] = "1"
        settings = configure_tuning_cache(self.cache)
        self.assertEqual(
            json.loads(settings["MIGRAPHX_GPU_OPTIONS"]),
            {"problem_cache_files": [str(self.cache.parent / "problems.json")]},
        )
        self.assertEqual(settings["MIGRAPHX_TRACE_BENCHMARKING"], "1")
        self.assertEqual(configure_tuning_cache(self.cache), settings)

    def test_inherited_backend_or_trace_settings_are_rejected(self):
        os.environ["FRIGATE_ROCM_NATIVE_GFX90C"] = "1"
        for key, value in (
            ("MIGRAPHX_GPU_OPTIONS", '{"convolution_layout":"channels_last"}'),
            ("MIGRAPHX_TRACE_BENCHMARKING", "0"),
        ):
            with patch.dict(os.environ, {key: value}):
                with self.subTest(key=key), self.assertRaises(ValueError):
                    configure_tuning_cache(self.cache)


if __name__ == "__main__":
    unittest.main()
