"""Tests for the ffmpeg hwaccel preset recommendation."""

import os
import tempfile
import unittest
from unittest.mock import patch

from frigate.detectors.hardware import DetectionHardware
from frigate.util import hwaccel


def found(key: str) -> DetectionHardware:
    """A probe result carrying only the fields the recommendation reads."""
    return DetectionHardware(
        key=key,
        detector=key.partition(":")[0],
        name=key,
        units=[],
        count=0,
        unlimited=True,
    )


class HwaccelRecommendationTestCase(unittest.TestCase):
    """Points every read at an empty fixture tree, so nothing is found by default."""

    def setUp(self):
        self.root = tempfile.TemporaryDirectory()
        self.addCleanup(self.root.cleanup)

        self.proc_root = os.path.join(self.root.name, "proc")
        os.makedirs(self.proc_root)
        patcher = patch.object(hwaccel, "PROC_ROOT", self.proc_root)
        patcher.start()
        self.addCleanup(patcher.stop)

        drm = patch.object(hwaccel, "enumerate_drm_devices", return_value={})
        self.drm = drm.start()
        self.addCleanup(drm.stop)

    def recommend(self, keys=(), detector_key=None) -> str:
        """Recommend with the prober reporting exactly these hardware keys."""
        with patch.object(
            hwaccel.hardware_prober,
            "probe",
            return_value=[found(key) for key in keys],
        ):
            return hwaccel.recommend_hwaccel(detector_key)

    def write_cpuinfo(self, model_name: str) -> None:
        with open(os.path.join(self.proc_root, "cpuinfo"), "w") as f:
            f.write(f"processor\t: 0\nmodel name\t: {model_name}\n")


class TestPriority(HwaccelRecommendationTestCase):
    def test_nothing_found_recommends_nothing(self):
        self.assertEqual(self.recommend(), "")

    def test_nvidia_wins_over_intel(self):
        self.assertEqual(
            self.recommend(["onnx:nvidia", "openvino:GPU"]), "preset-nvidia"
        )

    def test_a_jetson_uses_its_own_preset(self):
        self.assertEqual(self.recommend(["tensorrt"]), "preset-jetson-h264")

    def test_a_rockchip_uses_rkmpp(self):
        self.assertEqual(self.recommend(["rknn"]), "preset-rkmpp")

    def test_an_amd_gpu_uses_vaapi(self):
        self.assertEqual(self.recommend(["onnx:amd"]), "preset-vaapi")


class TestDetectorBias(HwaccelRecommendationTestCase):
    def test_a_chosen_intel_gpu_beats_a_present_nvidia(self):
        self.assertEqual(
            self.recommend(["onnx:nvidia", "openvino:GPU"], "openvino:GPU"),
            "preset-vaapi",
        )

    def test_a_chosen_npu_decodes_through_the_igpu(self):
        self.assertEqual(
            self.recommend(["openvino:NPU", "openvino:GPU"], "openvino:NPU"),
            "preset-vaapi",
        )

    def test_an_npu_without_an_igpu_falls_through(self):
        self.assertEqual(self.recommend(["openvino:NPU"], "openvino:NPU"), "")

    def test_a_cpu_choice_still_recommends_the_present_gpu(self):
        self.assertEqual(self.recommend(["cpu", "openvino:GPU"], "cpu"), "preset-vaapi")

    def test_a_detector_key_for_absent_hardware_is_ignored(self):
        self.assertEqual(
            self.recommend(["openvino:GPU"], "onnx:nvidia"), "preset-vaapi"
        )


class TestIntelGeneration(HwaccelRecommendationTestCase):
    def test_the_xe_driver_uses_qsv(self):
        self.drm.return_value = {"0000:00:02.0": "xe"}
        self.assertEqual(self.recommend(["openvino:GPU"]), "preset-intel-qsv-h264")

    def test_gen13_uses_qsv(self):
        self.write_cpuinfo("13th Gen Intel(R) Core(TM) i5-13500")
        self.assertEqual(self.recommend(["openvino:GPU"]), "preset-intel-qsv-h264")

    def test_gen12_uses_vaapi(self):
        self.write_cpuinfo("12th Gen Intel(R) Core(TM) i5-12400")
        self.assertEqual(self.recommend(["openvino:GPU"]), "preset-vaapi")

    def test_an_older_model_string_uses_vaapi(self):
        self.write_cpuinfo("Intel(R) Core(TM) i7-8700K CPU @ 3.70GHz")
        self.assertEqual(self.recommend(["openvino:GPU"]), "preset-vaapi")

    def test_missing_cpuinfo_uses_vaapi(self):
        self.assertEqual(self.recommend(["openvino:GPU"]), "preset-vaapi")

    def test_a_core_ultra_uses_qsv(self):
        self.write_cpuinfo("Intel(R) Core(TM) Ultra 7 155H")
        self.assertEqual(self.recommend(["openvino:GPU"]), "preset-intel-qsv-h264")


class TestRaspberryPi(HwaccelRecommendationTestCase):
    def write_device_tree(self) -> None:
        os.makedirs(os.path.join(self.proc_root, "device-tree"))
        with open(os.path.join(self.proc_root, "device-tree", "compatible"), "w") as f:
            f.write("raspberrypi,5-model-b\x00brcm,bcm2712\x00")

    def test_a_pi_uses_v4l2(self):
        self.write_device_tree()
        self.assertEqual(self.recommend(), "preset-rpi-64-h264")

    def test_a_gpu_wins_over_the_pi_fallback(self):
        self.write_device_tree()
        self.assertEqual(self.recommend(["onnx:nvidia"]), "preset-nvidia")


if __name__ == "__main__":
    unittest.main()
