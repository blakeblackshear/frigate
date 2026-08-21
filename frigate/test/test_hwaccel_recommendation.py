"""Tests for the hardware decoding recommendation."""

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

    def options(self, keys=(), detector_key=None, codecs=None):
        """Run the recommendation against a fixed set of hardware keys."""
        with patch.object(
            hwaccel.hardware_prober,
            "probe",
            return_value=[found(key) for key in keys],
        ):
            return hwaccel.hwaccel_options(detector_key, codecs)

    def recommend(self, keys=(), detector_key=None, codecs=None) -> str:
        """The recommended family key."""
        return self.options(keys, detector_key, codecs)[0]

    def available(self, keys=(), detector_key=None, codecs=None) -> list[str]:
        """The keys of the usable families, best first."""
        return [family.key for family in self.options(keys, detector_key, codecs)[1]]

    def presets(self, keys=(), detector_key=None, codecs=None) -> dict:
        """The presets each usable family provides."""
        return {
            family.key: family.presets
            for family in self.options(keys, detector_key, codecs)[1]
        }

    def write_cpuinfo(self, model_name: str) -> None:
        with open(os.path.join(self.proc_root, "cpuinfo"), "w") as f:
            f.write(f"processor\t: 0\nmodel name\t: {model_name}\n")

    def write_device_tree(self) -> None:
        os.makedirs(os.path.join(self.proc_root, "device-tree"), exist_ok=True)
        with open(os.path.join(self.proc_root, "device-tree", "compatible"), "w") as f:
            f.write("raspberrypi,5-model-b\x00brcm,bcm2712\x00")


class TestPriority(HwaccelRecommendationTestCase):
    def test_nothing_found_recommends_nothing(self):
        self.assertEqual(self.recommend(), "")

    def test_nvidia_wins_over_intel(self):
        self.assertEqual(self.recommend(["onnx:nvidia", "openvino:GPU"]), "nvidia")

    def test_a_jetson_uses_its_own_family(self):
        self.assertEqual(self.recommend(["tensorrt"]), "jetson")

    def test_a_rockchip_uses_rkmpp(self):
        self.assertEqual(self.recommend(["rknn"]), "rkmpp")

    def test_an_amd_gpu_uses_vaapi(self):
        self.assertEqual(self.recommend(["onnx:amd"]), "vaapi")


class TestDetectorBias(HwaccelRecommendationTestCase):
    def test_a_chosen_intel_gpu_beats_a_present_nvidia(self):
        self.assertEqual(
            self.recommend(["onnx:nvidia", "openvino:GPU"], "openvino:GPU"), "vaapi"
        )

    def test_a_chosen_npu_decodes_through_the_igpu(self):
        self.assertEqual(
            self.recommend(["openvino:NPU", "openvino:GPU"], "openvino:NPU"), "vaapi"
        )

    def test_an_npu_without_an_igpu_falls_through(self):
        self.assertEqual(self.recommend(["openvino:NPU"], "openvino:NPU"), "")

    def test_a_cpu_choice_still_recommends_the_present_gpu(self):
        self.assertEqual(self.recommend(["cpu", "openvino:GPU"], "cpu"), "vaapi")


class TestIntelGeneration(HwaccelRecommendationTestCase):
    def test_the_xe_driver_prefers_qsv(self):
        self.drm.return_value = {"0000:00:02.0": "xe"}
        self.assertEqual(self.recommend(["openvino:GPU"], codecs={"h264"}), "intel-qsv")

    def test_gen13_prefers_qsv(self):
        self.write_cpuinfo("13th Gen Intel(R) Core(TM) i5-13500")
        self.assertEqual(self.recommend(["openvino:GPU"], codecs={"h264"}), "intel-qsv")

    def test_a_core_ultra_prefers_qsv(self):
        self.write_cpuinfo("Intel(R) Core(TM) Ultra 7 155H")
        self.assertEqual(self.recommend(["openvino:GPU"], codecs={"h264"}), "intel-qsv")

    def test_gen13_prefers_qsv_for_mixed_codecs(self):
        # each camera resolves the family to its own codec
        self.write_cpuinfo("13th Gen Intel(R) Core(TM) i5-13500")
        self.assertEqual(
            self.recommend(["openvino:GPU"], codecs={"h264", "h265"}), "intel-qsv"
        )

    def test_gen12_prefers_vaapi(self):
        self.write_cpuinfo("12th Gen Intel(R) Core(TM) i5-12400")
        self.assertEqual(self.recommend(["openvino:GPU"], codecs={"h264"}), "vaapi")

    def test_gen12_still_offers_qsv(self):
        self.write_cpuinfo("12th Gen Intel(R) Core(TM) i5-12400")
        self.assertEqual(self.available(["openvino:GPU"]), ["vaapi", "intel-qsv"])

    def test_an_older_model_string_prefers_vaapi(self):
        self.write_cpuinfo("Intel(R) Core(TM) i7-8700K CPU @ 3.70GHz")
        self.assertEqual(self.recommend(["openvino:GPU"], codecs={"h264"}), "vaapi")

    def test_missing_cpuinfo_prefers_vaapi(self):
        self.assertEqual(self.recommend(["openvino:GPU"], codecs={"h264"}), "vaapi")

    def test_qsv_is_not_offered_before_gen8(self):
        self.write_cpuinfo("7th Gen Intel(R) Core(TM) i5-7500")
        self.assertEqual(self.available(["openvino:GPU"]), ["vaapi"])


class TestUnknownCodecs(HwaccelRecommendationTestCase):
    def test_a_codec_agnostic_family_wins_when_no_codec_is_known(self):
        # a qsv preset would have to guess a codec for cameras added later
        self.drm.return_value = {"0000:00:02.0": "xe"}
        self.assertEqual(self.recommend(["openvino:GPU"]), "vaapi")

    def test_hardware_with_no_agnostic_family_still_recommends(self):
        self.assertEqual(self.recommend(["tensorrt"]), "jetson")


class TestAvailableFamilies(HwaccelRecommendationTestCase):
    def test_nothing_found_offers_nothing(self):
        self.assertEqual(self.available(), [])

    def test_only_families_the_hardware_can_use_are_offered(self):
        self.assertEqual(self.available(["onnx:nvidia"]), ["nvidia"])

    def test_a_pi_does_not_offer_desktop_gpu_families(self):
        self.write_device_tree()
        self.assertEqual(self.available(), ["rpi"])

    def test_an_intel_system_does_not_offer_the_pi_family(self):
        offered = self.available(["openvino:GPU"])

        self.assertIn("vaapi", offered)
        self.assertNotIn("rpi", offered)
        self.assertNotIn("nvidia", offered)

    def test_every_gpu_present_is_offered(self):
        offered = self.available(["onnx:nvidia", "openvino:GPU"])

        self.assertEqual(offered[0], "nvidia")
        self.assertIn("vaapi", offered)

    def test_a_gpu_wins_over_the_pi_fallback(self):
        self.write_device_tree()
        self.assertEqual(self.recommend(["onnx:nvidia"]), "nvidia")

    def test_the_recommendation_is_always_offered(self):
        recommended, families = self.options(["openvino:GPU"], codecs={"h264"})

        self.assertIn(recommended, [family.key for family in families])


class TestCodecCoverage(HwaccelRecommendationTestCase):
    def test_a_family_carries_a_preset_per_codec(self):
        self.assertEqual(
            self.presets(["tensorrt"])["jetson"],
            {"h264": "preset-jetson-h264", "h265": "preset-jetson-h265"},
        )

    def test_a_codec_agnostic_family_carries_one_preset(self):
        self.assertEqual(
            self.presets(["onnx:nvidia"])["nvidia"], {"any": "preset-nvidia"}
        )

    def test_hevc_is_treated_as_h265(self):
        self.assertEqual(self.available(["tensorrt"], codecs={"hevc"}), ["jetson"])

    def test_a_family_that_cannot_decode_a_codec_is_dropped(self):
        # a jetson decodes h264 and h265 only, so an mjpeg camera rules it out
        self.assertEqual(self.available(["tensorrt"], codecs={"mjpeg"}), [])

    def test_codec_agnostic_families_survive_any_codec(self):
        self.assertEqual(
            self.available(["onnx:nvidia"], codecs={"mjpeg", "h265"}), ["nvidia"]
        )

    def test_a_dropped_family_hands_off_to_the_next_hardware(self):
        self.assertEqual(
            self.recommend(["tensorrt", "onnx:nvidia"], codecs={"mjpeg"}), "nvidia"
        )


if __name__ == "__main__":
    unittest.main()
