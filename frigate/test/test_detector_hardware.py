"""Tests for detection hardware discovery."""

import os
import tempfile
import unittest
from unittest.mock import patch

from frigate.detectors import hardware
from frigate.detectors.detector_types import config_types
from frigate.detectors.hardware import HardwareProber


def write(path: str, content: str = "") -> None:
    """Create a file and any parent directories."""
    os.makedirs(os.path.dirname(path), exist_ok=True)

    with open(path, "w") as f:
        f.write(content)


class HardwareProbeTestCase(unittest.TestCase):
    """Points every probe at an empty fixture tree, so nothing is found by default."""

    def setUp(self):
        self.root = tempfile.TemporaryDirectory()
        self.addCleanup(self.root.cleanup)

        for name in ("SYS_ROOT", "DEV_ROOT", "PROC_ROOT", "ETC_ROOT"):
            sub = os.path.join(self.root.name, name.split("_")[0].lower())
            os.makedirs(sub, exist_ok=True)
            patcher = patch.object(hardware, name, sub)
            patcher.start()
            self.addCleanup(patcher.stop)
            setattr(self, name.lower(), sub)

        drm = patch.object(hardware, "enumerate_drm_devices", return_value={})
        self.drm = drm.start()
        self.addCleanup(drm.stop)

    def probe(self) -> dict[str, hardware.DetectionHardware]:
        return {found.key: found for found in HardwareProber().probe()}


class TestNoHardware(HardwareProbeTestCase):
    def test_only_the_cpu_is_reported(self):
        self.assertEqual(list(self.probe()), ["cpu"])

    def test_the_cpu_is_unlimited(self):
        self.assertTrue(self.probe()["cpu"].unlimited)


class TestCoral(HardwareProbeTestCase):
    def test_each_apex_device_is_a_unit(self):
        for name in ("apex_0", "apex_1"):
            os.makedirs(os.path.join(self.sys_root, "class", "apex", name))

        coral = self.probe()["edgetpu:pci"]

        self.assertEqual(coral.count, 2)
        self.assertEqual(
            [unit.device for unit in coral.units],
            ["edgetpu:pci:0", "edgetpu:pci:1"],
        )

    def test_a_coral_is_not_unlimited(self):
        os.makedirs(os.path.join(self.sys_root, "class", "apex", "apex_0"))

        self.assertFalse(self.probe()["edgetpu:pci"].unlimited)

    def test_usb_corals_are_found_by_their_usb_ids(self):
        usb = os.path.join(self.sys_root, "bus", "usb", "devices")
        # a Coral reports as Global Unichip before its firmware loads
        write(os.path.join(usb, "1-1", "idVendor"), "1a6e")
        write(os.path.join(usb, "1-1", "idProduct"), "089a")
        # and as Google afterwards
        write(os.path.join(usb, "1-2", "idVendor"), "18d1")
        write(os.path.join(usb, "1-2", "idProduct"), "9302")

        coral = self.probe()["edgetpu:usb"]

        self.assertEqual(coral.count, 2)
        self.assertEqual(coral.units[0].device, "edgetpu:usb:0")

    def test_other_usb_devices_are_ignored(self):
        usb = os.path.join(self.sys_root, "bus", "usb", "devices")
        write(os.path.join(usb, "1-1", "idVendor"), "046d")
        write(os.path.join(usb, "1-1", "idProduct"), "0825")

        self.assertNotIn("edgetpu:usb", self.probe())


class TestGpus(HardwareProbeTestCase):
    def test_a_single_intel_gpu_is_the_unnumbered_device(self):
        self.drm.return_value = {"0000:00:02.0": "i915"}

        gpu = self.probe()["openvino:GPU"]

        self.assertEqual([unit.device for unit in gpu.units], ["openvino:GPU"])
        self.assertTrue(gpu.unlimited)

    def test_multiple_intel_gpus_are_numbered(self):
        self.drm.return_value = {"0000:00:02.0": "i915", "0000:03:00.0": "xe"}

        gpu = self.probe()["openvino:GPU"]

        self.assertEqual(
            [unit.device for unit in gpu.units],
            ["openvino:GPU.0", "openvino:GPU.1"],
        )

    def test_non_gpu_drm_devices_are_ignored(self):
        self.drm.return_value = {"0000:00:02.0": "virtio-mmio"}

        self.assertNotIn("openvino:GPU", self.probe())

    def test_amd_gpus_run_through_onnx(self):
        self.drm.return_value = {"0000:03:00.0": "amdgpu"}

        self.assertEqual(self.probe()["onnx:amd"].units[0].device, "onnx")

    def test_an_intel_npu_is_found_by_its_driver(self):
        accel = os.path.join(self.sys_root, "class", "accel", "accel0", "device")
        os.makedirs(accel)
        os.symlink("/drivers/intel_vpu", os.path.join(accel, "driver"))

        self.assertEqual(self.probe()["openvino:NPU"].units[0].device, "openvino:NPU")

    def test_other_accel_devices_are_ignored(self):
        accel = os.path.join(self.sys_root, "class", "accel", "accel0", "device")
        os.makedirs(accel)
        os.symlink("/drivers/something_else", os.path.join(accel, "driver"))

        self.assertNotIn("openvino:NPU", self.probe())


class TestNvidia(HardwareProbeTestCase):
    def _add_gpu(self, address: str, model: str) -> None:
        write(
            os.path.join(
                self.proc_root, "driver", "nvidia", "gpus", address, "information"
            ),
            f"Model: \t {model}\nIRQ:   \t 62\n",
        )

    def test_the_model_name_is_read_from_proc(self):
        self._add_gpu("0000:01:00.0", "NVIDIA GeForce RTX 3060")

        gpu = self.probe()["onnx:nvidia"]

        self.assertEqual(gpu.name, "NVIDIA GeForce RTX 3060")
        self.assertEqual(gpu.units[0].device, "onnx:0")

    def test_multiple_gpus_are_indexed(self):
        self._add_gpu("0000:01:00.0", "NVIDIA GeForce RTX 3060")
        self._add_gpu("0000:02:00.0", "NVIDIA GeForce RTX 4090")

        gpu = self.probe()["onnx:nvidia"]

        self.assertEqual(gpu.name, "NVIDIA GPU")
        self.assertEqual([unit.device for unit in gpu.units], ["onnx:0", "onnx:1"])
        self.assertEqual(gpu.units[1].label, "NVIDIA GeForce RTX 4090")

    def test_a_jetson_runs_through_tensorrt(self):
        write(os.path.join(self.etc_root, "nv_tegra_release"), "# R36 (release)")

        self.assertEqual(self.probe()["tensorrt"].units[0].device, "tensorrt:0")


class TestAccelerators(HardwareProbeTestCase):
    def test_hailo_is_found_by_its_device_node(self):
        write(os.path.join(self.dev_root, "hailo0"))

        self.assertEqual(self.probe()["hailo8l"].units[0].device, "hailo8l:PCIe")

    def test_each_memryx_node_is_a_unit(self):
        write(os.path.join(self.dev_root, "memx0"))
        write(os.path.join(self.dev_root, "memx1"))

        memryx = self.probe()["memryx"]

        self.assertEqual(
            [unit.device for unit in memryx.units],
            ["memryx:PCIe:0", "memryx:PCIe:1"],
        )
        self.assertFalse(memryx.unlimited)

    def test_a_supported_rockchip_soc_is_reported(self):
        write(
            os.path.join(self.proc_root, "device-tree", "compatible"),
            "rockchip,rk3588\x00",
        )

        self.assertEqual(self.probe()["rknn"].units[0].device, "rknn")

    def test_an_unsupported_soc_is_ignored(self):
        write(
            os.path.join(self.proc_root, "device-tree", "compatible"),
            "nvidia,tegra\x00",
        )

        self.assertNotIn("rknn", self.probe())

    def test_axengine_is_found_by_its_control_node(self):
        write(os.path.join(self.dev_root, "axcl_host"))

        self.assertEqual(self.probe()["axengine"].units[0].device, "axengine")

    def test_synaptics_is_found_by_its_device_node(self):
        write(os.path.join(self.dev_root, "synap"))

        self.assertEqual(self.probe()["synaptics"].units[0].device, "synaptics")


class TestProber(HardwareProbeTestCase):
    def test_the_result_is_cached_until_refreshed(self):
        prober = HardwareProber()
        self.assertNotIn("edgetpu:pci", {found.key for found in prober.probe()})

        os.makedirs(os.path.join(self.sys_root, "class", "apex", "apex_0"))

        self.assertNotIn("edgetpu:pci", {found.key for found in prober.probe()})
        self.assertIn(
            "edgetpu:pci", {found.key for found in prober.probe(refresh=True)}
        )

    def test_a_failing_probe_does_not_break_the_rest(self):
        with patch.object(hardware, "detect_hailo", side_effect=OSError("boom")):
            self.assertIn("cpu", self.probe())

    def test_unlimited_tracks_the_detector_shareable_flag(self):
        for name in ("apex_0",):
            os.makedirs(os.path.join(self.sys_root, "class", "apex", name))
        write(os.path.join(self.dev_root, "memx0"))
        self.drm.return_value = {"0000:00:02.0": "i915"}

        for found in self.probe().values():
            config_class = config_types.get(found.detector)

            if config_class is None:
                continue

            with self.subTest(hardware=found.key):
                self.assertEqual(found.unlimited, config_class.shareable)


if __name__ == "__main__":
    unittest.main(verbosity=2)
