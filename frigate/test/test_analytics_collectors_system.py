"""Tests for the install and hardware collectors."""

import os
import tempfile
import unittest
from collections import Counter
from types import SimpleNamespace
from unittest.mock import patch

from frigate.analytics.collectors import hardware, install
from frigate.analytics.collectors.common import closed, histogram, rate
from frigate.analytics.schema import (
    Arch,
    DecodeFamily,
    GpuVendor,
    HardwareKey,
    ImageVariant,
    InstallType,
)
from frigate.const import RECORD_DIR
from frigate.test.analytics_helpers import make_context


class TestCommon(unittest.TestCase):
    def test_closed_falls_back_for_unknown_values(self):
        self.assertEqual(closed(Arch, "x86_64", Arch.other), Arch.x86_64)
        self.assertEqual(closed(Arch, "sparc", Arch.other), Arch.other)
        self.assertEqual(closed(Arch, None, Arch.other), Arch.other)

    def test_rate_rounds_and_rejects_bad_numbers(self):
        self.assertEqual(rate("12.346"), 12.35)
        self.assertEqual(rate(-3), 0.0)
        self.assertEqual(rate(float("nan")), 0.0)
        self.assertEqual(rate(float("inf")), 0.0)
        self.assertEqual(rate(None), 0.0)

    def test_histogram_drops_empty_buckets(self):
        self.assertEqual(
            histogram(Counter({Arch.x86_64: 2, Arch.other: 0})), {"x86_64": 2}
        )


class TestInstallCollector(unittest.TestCase):
    def test_collects_version_variant_and_platform(self):
        with (
            patch.dict(os.environ, {"FRIGATE_IMAGE_VARIANT": "tensorrt-jp6"}),
            patch.object(install, "install_type", return_value=InstallType.docker),
            patch("platform.machine", return_value="aarch64"),
            patch("platform.release", return_value="6.8.0-45-generic"),
            patch("os.geteuid", return_value=1000),
        ):
            section = install.collect(make_context())

        self.assertEqual(section.image_variant, ImageVariant.tensorrt_jp6)
        self.assertEqual(section.install_type, InstallType.docker)
        self.assertEqual(section.arch, Arch.aarch64)
        self.assertEqual(section.kernel, "6.8")
        self.assertFalse(section.run_as_root)

    def test_image_variant_is_dev_when_unset_and_other_when_unknown(self):
        self.assertEqual(install.image_variant(None), ImageVariant.dev)
        self.assertEqual(install.image_variant(""), ImageVariant.dev)
        self.assertEqual(install.image_variant("h8l"), ImageVariant.other)

    def test_install_type_checks_the_add_on_first(self):
        with patch("os.path.isfile", return_value=True):
            self.assertEqual(install.install_type(), InstallType.ha_addon)

        with (
            patch("os.path.isfile", return_value=False),
            patch.dict(os.environ, {"KUBERNETES_SERVICE_HOST": "10.0.0.1"}),
        ):
            self.assertEqual(install.install_type(), InstallType.kubernetes)

        env = {k: v for k, v in os.environ.items() if k != "KUBERNETES_SERVICE_HOST"}

        with (
            patch("os.path.isfile", return_value=False),
            patch.dict(os.environ, env, clear=True),
            patch("os.path.exists", side_effect=lambda path: path == "/.dockerenv"),
        ):
            self.assertEqual(install.install_type(), InstallType.docker)

    def test_kernel_and_arch_fall_back(self):
        self.assertEqual(install.kernel("weird"), "unknown")
        self.assertEqual(install.arch("armv7l"), Arch.other)
        self.assertEqual(install.arch("amd64"), Arch.x86_64)


class TestHardwareCollector(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)

    def write(self, name: str, content: str) -> str:
        path = os.path.join(self.dir.name, name)

        with open(path, "w") as f:
            f.write(content)

        return path

    def test_cpu_model_prefers_the_board_model(self):
        board = self.write("model", "Raspberry Pi 5 Model B Rev 1.0\x00")
        cpuinfo = self.write("cpuinfo", "model name\t: Cortex-A76\n")

        with (
            patch.object(hardware, "DEVICE_TREE_MODEL", board),
            patch.object(hardware, "CPUINFO", cpuinfo),
        ):
            self.assertEqual(hardware.cpu_model(), "Raspberry Pi 5 Model B Rev 1.0")

    def test_cpu_model_reads_cpuinfo_and_truncates(self):
        cpuinfo = self.write("cpuinfo", "processor\t: 0\nmodel name\t: " + "x" * 80)

        with (
            patch.object(hardware, "DEVICE_TREE_MODEL", self.dir.name + "/none"),
            patch.object(hardware, "CPUINFO", cpuinfo),
        ):
            self.assertEqual(hardware.cpu_model(), "x" * 64)

    def test_collects_gpus_decode_detection_and_storage(self):
        stats = {
            "gpu_usages": {
                "NVIDIA GeForce RTX 3060": {"vendor": "nvidia"},
                "mystery": {},
            },
            "service": {
                "storage": {
                    RECORD_DIR: {
                        "total": 2048000.0,
                        "used": 512000.0,
                        "mount_type": "nfs4",
                    }
                }
            },
        }
        probed = [
            SimpleNamespace(key="edgetpu:usb", count=2),
            SimpleNamespace(key="new:thing", count=1),
            SimpleNamespace(key="cpu", count=1),
        ]
        families = [
            SimpleNamespace(key="vaapi"),
            SimpleNamespace(key="intel-qsv"),
            SimpleNamespace(key="future"),
        ]

        with (
            patch.object(hardware.hardware_prober, "probe", return_value=probed),
            patch.object(hardware, "hwaccel_options", return_value=("vaapi", families)),
            patch.object(hardware, "cpu_model", return_value="Intel(R) N100"),
            patch("os.cpu_count", return_value=4),
            patch(
                "psutil.virtual_memory", return_value=SimpleNamespace(total=16 * 2**30)
            ),
        ):
            section = hardware.collect(make_context(stats=stats))

        self.assertEqual(section.cpu_model, "Intel(R) N100")
        self.assertEqual(section.cpu_cores, 4)
        self.assertEqual(section.memory_gb, 16)
        self.assertEqual(
            [(gpu.vendor, gpu.name) for gpu in section.gpus],
            [
                (GpuVendor.nvidia, "NVIDIA GeForce RTX 3060"),
                (GpuVendor.other, "mystery"),
            ],
        )
        self.assertEqual(
            section.decode_families,
            [DecodeFamily.vaapi, DecodeFamily.intel_qsv, DecodeFamily.other],
        )
        self.assertEqual(
            section.detection_hardware,
            {HardwareKey.edgetpu_usb: 2, HardwareKey.other: 1, HardwareKey.cpu: 1},
        )
        self.assertEqual(section.storage.record_fs, "nfs4")
        self.assertEqual(section.storage.record_total_gb, 2000)
        self.assertEqual(section.storage.record_used_pct, 25)

    def test_storage_without_stats_is_unknown_and_empty(self):
        section = hardware.storage({})

        self.assertEqual(
            (section.record_fs, section.record_total_gb, section.record_used_pct),
            ("unknown", 0, 0),
        )
