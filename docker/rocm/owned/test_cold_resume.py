"""Reject cross-runtime or modified caches when resuming bounded tuning."""

import tempfile
import unittest
from pathlib import Path

from qualify_model import cache_tree_sha256, validate_resume


class TestColdResume(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.cache = self.root / "model_tune.mxr"
        (self.root / "tuning.db").write_bytes(b"owned tuning data")
        self.receipt = {
            "state": "incomplete-cold",
            "cache_namespace": "own-runtime",
            "model_sha256": "model-hash",
            "initial_cache_empty_verified": True,
            "attempts": [{"window": "cold-1", "restored": True}],
            "cache_tree_sha256": cache_tree_sha256(self.root),
        }

    def test_exact_interrupted_cache_can_resume(self):
        validate_resume(self.cache, self.receipt, "own-runtime", "model-hash")

    def test_different_model_runtime_or_unproven_origin_is_rejected(self):
        for key, value in (
            ("model_sha256", "another-model"),
            ("cache_namespace", "another-runtime"),
            ("initial_cache_empty_verified", False),
            ("attempts", []),
            ("state", "passed"),
        ):
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_resume(
                    self.cache,
                    {**self.receipt, key: value},
                    "own-runtime",
                    "model-hash",
                )

    def test_changed_or_added_cache_files_are_rejected(self):
        (self.root / "tuning.db").write_bytes(b"changed tuning data")
        with self.assertRaises(ValueError):
            validate_resume(self.cache, self.receipt, "own-runtime", "model-hash")

    def test_symlinked_cache_is_rejected(self):
        (self.root / "alias").symlink_to("tuning.db")
        with self.assertRaisesRegex(ValueError, "symlinks"):
            validate_resume(self.cache, self.receipt, "own-runtime", "model-hash")


if __name__ == "__main__":
    unittest.main()
