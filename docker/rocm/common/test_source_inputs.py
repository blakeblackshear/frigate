"""Check source-build input integrity without Docker, networking, or GPU imports."""

import hashlib
import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "source_inputs", Path(__file__).with_name("source_inputs.py")
)
source_inputs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(source_inputs)


class TestSourceInputs(unittest.TestCase):
    def test_rejects_changed_input_with_identical_size(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "source.tar.gz"
            path.write_bytes(b"original")
            artifact = {
                "path": path.name,
                "bytes": 8,
                "sha256": hashlib.sha256(b"original").hexdigest(),
            }
            source_inputs.verify(path, artifact)
            path.write_bytes(b"modified")
            with self.assertRaisesRegex(ValueError, "checksum mismatch"):
                source_inputs.verify(path, artifact)

    def test_rejects_missing_input(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "Missing or incomplete"):
                source_inputs.verify(
                    Path(directory) / "absent", {"path": "absent", "bytes": 1}
                )

    def test_rejects_input_outside_cache(self):
        for name in ("../outside.tar.gz", "/outside.tar.gz"):
            with self.subTest(path=name):
                with self.assertRaisesRegex(ValueError, "Invalid cached input"):
                    source_inputs.selected_artifacts(
                        {"artifacts": [{"path": name}]}, []
                    )

    def test_selects_only_requested_group(self):
        source = {"path": "sources/core.tar.gz", "group": "source"}
        sdk = {"path": "sdk/tool.deb", "group": "sdk"}
        self.assertEqual(
            source_inputs.selected_artifacts({"artifacts": [source, sdk]}, ["source"]),
            [source],
        )


if __name__ == "__main__":
    unittest.main()
