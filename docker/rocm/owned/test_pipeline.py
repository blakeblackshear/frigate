"""Exercise pipeline isolation and completion gates without a Docker daemon."""

import contextlib
import copy
import io
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import pipeline

CID = "a" * 64
IMAGE = "sha256:" + "b" * 64
FINISHED = {"Status": "exited", "ExitCode": 0, "OOMKilled": False}
HOST = {
    "Privileged": False,
    "Devices": [],
    "DeviceRequests": [],
    "CpusetCpus": "2-7,10-15",
    "NetworkMode": "none",
    "Memory": 12 * 1024**3,
    "NanoCpus": 12_000_000_000,
    "CpuShares": 256,
    "PidsLimit": 2048,
}


class TestPipelineGates(unittest.TestCase):
    def runner(self, final=None, host=None):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        runner = pipeline.Pipeline.__new__(pipeline.Pipeline)
        runner.args = SimpleNamespace(cpuset="2-7,10-15", jobs=12, memory="12g")
        runner.directory = Path(directory.name)
        runner.profile = "101"
        runner.remote = "/owned/101"
        runner.journal = {
            "owner": "test-owner",
            "runtime_recipe_sha256": "inputs",
            "containers": [],
            "stages": {},
        }
        runner.pull = Mock(return_value=IMAGE)
        runner.text = Mock(return_value=CID)
        runner.json = Mock(
            side_effect=[
                [{"HostConfig": copy.deepcopy(host or HOST), "Image": IMAGE}],
                [{"State": copy.deepcopy(final or FINISHED)}],
            ]
        )
        runner.docker = Mock()
        runner.save = Mock()
        return runner

    def test_success_requires_a_finished_container(self):
        runner = self.runner()
        with contextlib.redirect_stdout(io.StringIO()):
            runner.run("source", "pinned", "true")
        self.assertEqual(runner.journal["stages"]["source"]["state"], FINISHED)

    def test_running_with_zero_exit_code_is_not_success(self):
        runner = self.runner(final={**FINISHED, "Status": "running"})
        with contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(RuntimeError, "did not finish"):
                runner.run("source", "pinned", "true")

    def test_oom_is_not_success_even_with_zero_exit(self):
        runner = self.runner(final={**FINISHED, "OOMKilled": True})
        with contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(RuntimeError, "did not finish"):
                runner.run("source", "pinned", "true")

    def test_gpu_passthrough_is_rejected_before_start(self):
        for changed in (
            {"Privileged": True},
            {"Devices": [{"PathOnHost": "/dev/kfd"}]},
            {"DeviceRequests": [{"Capabilities": [["gpu"]]}]},
        ):
            with self.subTest(changed=changed):
                runner = self.runner(host={**HOST, **changed})
                with self.assertRaisesRegex(ValueError, "Device isolation"):
                    runner.run("source", "pinned", "true")
                runner.docker.assert_not_called()

    def test_missing_memory_limit_is_rejected_before_start(self):
        runner = self.runner(host={**HOST, "Memory": 0})
        with self.assertRaisesRegex(ValueError, "limit changed"):
            runner.run("source", "pinned", "true")
        runner.docker.assert_not_called()

    def test_mounts_cannot_escape_owned_workspace(self):
        runner = self.runner()
        with self.assertRaisesRegex(ValueError, "owned workspace"):
            runner.run(
                "source",
                "pinned",
                "true",
                mounts=[("/production/config", "/work", False)],
            )
        runner.text.assert_not_called()

    def test_running_build_blocks_recipe_replacement_after_client_disconnect(self):
        runner = self.runner()
        runner.journal["containers"] = [{"id": CID}]
        runner.json = Mock(return_value=[{"State": {"Status": "running"}}])
        runner.host = Mock()
        with self.assertRaisesRegex(RuntimeError, "still active"):
            runner.prepare()
        runner.host.assert_not_called()

    def test_assembly_rejects_unfinished_or_changed_runtime(self):
        for state, recipe in (
            ({**FINISHED, "Status": "running"}, "inputs"),
            (FINISHED, "old-inputs"),
        ):
            runner = self.runner()
            runner.journal["stages"]["source"] = {
                "state": state,
                "runtime_recipe_sha256": recipe,
            }
            with self.subTest(state=state, recipe=recipe):
                with self.assertRaises(RuntimeError):
                    runner.assemble()
                runner.pull.assert_not_called()

    def test_native_assembly_does_not_require_separate_binding_stage(self):
        runner = self.runner()
        runner.journal["stages"]["source"] = {
            "state": FINISHED,
            "runtime_recipe_sha256": "inputs",
        }
        runner.pull.side_effect = RuntimeError("image acquisition boundary")
        with self.assertRaisesRegex(RuntimeError, "image acquisition boundary"):
            runner.assemble()
        runner.pull.assert_called_once_with(pipeline.APPLICATION["image"])

    def test_memory_limit_units(self):
        self.assertEqual(pipeline.memory_bytes("12g"), 12 * 1024**3)
        for value in ("0", "-1", "12gb", "1.5g", "unlimited"):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    pipeline.memory_bytes(value)


if __name__ == "__main__":
    unittest.main()
