"""Tests for reading Rockchip GPU and NPU load as root and as a non-root user."""

import builtins
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from frigate.util import services
from frigate.util.services import get_rockchip_gpu_stats, get_rockchip_npu_stats

NPU_LOAD = "NPU load:  Core0: 10%, Core1: 20%, Core2: 30%,\n"
RGA_LOAD = (
    "num of scheduler = 2\n"
    "================= load ==================\n"
    "scheduler[0]: rga3\n\t load = 40%\n"
    "scheduler[1]: rga2\n\t load = 60%\n"
)


class TestRockchipStats(unittest.TestCase):
    def setUp(self):
        services._rockchip_load_warning_logged = False

        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.debugfs = Path(tmp.name, "debugfs")
        self.bound = Path(tmp.name, "rockchip")
        self.debugfs.mkdir()

        for name, value in (
            ("ROCKCHIP_DEBUGFS_DIR", str(self.debugfs)),
            ("ROCKCHIP_LOAD_DIR", str(self.bound)),
        ):
            patcher = patch.object(services, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)

        warn = patch.object(services.logger, "warning")
        self.warn = warn.start()
        self.addCleanup(warn.stop)

    def _write(self, base: Path, driver: str, content: str) -> None:
        Path(base, driver).mkdir(parents=True, exist_ok=True)
        Path(base, driver, "load").write_text(content)

    def _deny_debugfs(self):
        """Fail opens under debugfs the way its root-only directory does."""
        debugfs = str(self.debugfs)

        def guarded_open(path, *args, **kwargs):
            if os.fspath(path).startswith(debugfs):
                raise PermissionError(13, "Permission denied", path)
            return builtins.open(path, *args, **kwargs)

        return patch("frigate.util.services.open", guarded_open, create=True)

    def test_reads_debugfs_when_accessible(self):
        self._write(self.debugfs, "rknpu", NPU_LOAD)
        self._write(self.debugfs, "rkrga", RGA_LOAD)

        self.assertEqual(20.0, get_rockchip_npu_stats()["npu"])
        self.assertEqual("50.0%", get_rockchip_gpu_stats()["gpu"])
        self.warn.assert_not_called()

    def test_missing_drivers_report_nothing_without_warning(self):
        self.assertIsNone(get_rockchip_npu_stats())
        self.assertIsNone(get_rockchip_gpu_stats())
        self.warn.assert_not_called()

    def test_reads_bound_files_when_debugfs_is_denied(self):
        self._write(self.debugfs, "rknpu", NPU_LOAD)
        self._write(self.debugfs, "rkrga", RGA_LOAD)
        self._write(self.bound, "rknpu", NPU_LOAD)
        self._write(self.bound, "rkrga", RGA_LOAD)

        with self._deny_debugfs():
            self.assertEqual(20.0, get_rockchip_npu_stats()["npu"])
            self.assertEqual("50.0%", get_rockchip_gpu_stats()["gpu"])

        self.warn.assert_not_called()

    def test_warns_once_when_denied_and_nothing_is_bound(self):
        self._write(self.debugfs, "rknpu", NPU_LOAD)
        self._write(self.debugfs, "rkrga", RGA_LOAD)

        with self._deny_debugfs():
            for _ in range(2):
                self.assertIsNone(get_rockchip_npu_stats())
                self.assertIsNone(get_rockchip_gpu_stats())

        self.warn.assert_called_once()

    def test_binding_only_the_present_driver_does_not_warn(self):
        # a board without RGA in debugfs binds only the NPU load file
        self._write(self.debugfs, "rknpu", NPU_LOAD)
        self._write(self.bound, "rknpu", NPU_LOAD)

        with self._deny_debugfs():
            self.assertEqual(20.0, get_rockchip_npu_stats()["npu"])
            self.assertIsNone(get_rockchip_gpu_stats())

        self.warn.assert_not_called()


if __name__ == "__main__":
    unittest.main()
