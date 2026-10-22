"""Check single-runtime branch selection and relocated build inputs offline."""

import json
import sys
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

import pipeline


class TestBranchRecipe(unittest.TestCase):
    def test_default_profile_matches_this_branch(self):
        with (
            tempfile.TemporaryDirectory() as directory,
            patch.object(
                sys,
                "argv",
                [
                    "pipeline.py",
                    "prepare",
                    "--workspace",
                    "/owned/build",
                    "--receipts",
                    directory,
                ],
            ),
            patch.object(pipeline, "Pipeline") as constructor,
        ):
            pipeline.main()
        self.assertEqual(constructor.call_args.args[0].profile, pipeline.PROFILE)
        constructor.return_value.prepare.assert_called_once_with()

    def test_other_runtime_is_rejected_before_host_access(self):
        other = "101" if pipeline.PROFILE == "724" else "724"
        with self.assertRaisesRegex(ValueError, "only runtime profile"):
            pipeline.Pipeline(SimpleNamespace(profile=other))

    def test_staging_preserves_qualified_runtime_input_names(self):
        runner = pipeline.Pipeline.__new__(pipeline.Pipeline)
        runner.profile = pipeline.PROFILE
        runner.remote = "/owned/build/" + runner.profile
        runner.recipe = pipeline.HERE.parent / "runtime"
        runner.journal = {"owner": "offline-unit", "containers": []}
        runner.text = Mock(return_value="")
        runner.host = Mock()
        runner.upload = Mock()
        runner.save = Mock()
        runner.prepare()
        entries = runner.upload.call_args.args[0]
        targets = [name for _, name in entries]
        self.assertEqual(len(targets), len(set(targets)))
        self.assertTrue(all(source.is_file() for source, _ in entries))
        self.assertIn("recipes/source_inputs.py", targets)
        self.assertIn("recipes/runtime-os-lock.json", targets)
        self.assertIn("recipes/build_source.sh", targets)
        directory = "legacy724" if runner.profile == "724" else "native101"
        self.assertIn(
            f"docker/rocm/{directory}/source-lock.json",
            runner.journal["input_files"],
        )
        self.assertIn(
            "docker/rocm/legacy724/runtime-os-lock.json",
            runner.journal["input_files"],
        )
        self.assertFalse(
            any("/runtime/" in name for name in runner.journal["input_files"])
        )
        lock = json.loads((runner.recipe / "source-lock.json").read_text())
        expected = "7.2.4" if runner.profile == "724" else "10.1.0"
        self.assertEqual(lock["runtime"]["rocm"], expected)


if __name__ == "__main__":
    unittest.main()
