"""Reject unqualified or mismatched model caches before warm timing."""

import tempfile
import unittest
from pathlib import Path

from qualify_model import sha256, validate_warm


class TestWarmReceipt(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.cache = Path(directory.name) / "model.mxr"
        self.cache.write_bytes(b"qualified program")
        self.receipt = {
            "passed": True,
            "cache_policy": "resume-cold",
            "model_sha256": "model",
            "reference_manifest_sha256": "reference",
            "cache_namespace": "own",
            "cache_sha256": sha256(self.cache),
            "hip_device_flags": 4,
            "tuning": {
                "conserve_cpu": True,
                "fast_math": True,
                "exhaustive_tune": True,
            },
        }

    def check_receipt(self, receipt):
        validate_warm(self.cache, receipt, "own", "model", "reference")

    def test_matching_passed_cold_or_resumed_result_is_required(self):
        self.check_receipt(self.receipt)
        self.check_receipt({**self.receipt, "cache_policy": "cold"})
        for key, value in (
            ("passed", False),
            ("cache_policy", "warm"),
            ("model_sha256", "different"),
            ("reference_manifest_sha256", "different"),
            ("cache_namespace", "different"),
            ("hip_device_flags", 0),
            ("tuning", {}),
        ):
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.check_receipt({**self.receipt, key: value})

    def test_changed_program_cannot_supply_warm_timing(self):
        self.cache.write_bytes(b"unqualified replacement")
        with self.assertRaises(ValueError):
            self.check_receipt(self.receipt)


if __name__ == "__main__":
    unittest.main()
