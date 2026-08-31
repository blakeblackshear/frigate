"""Tests for config driven hardware stats collection."""

import time
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from frigate.config import FrigateConfig
from frigate.detectors.device import DeviceSpec
from frigate.detectors.hardware import DetectionHardware
from frigate.stats import hardware
from frigate.stats.hardware import (
    HardwarePollResult,
    HardwareStats,
    _hwaccel_hardware,
    get_hardware_temperatures,
)


def found(key: str) -> DetectionHardware:
    """A probe result carrying only the fields the scanners read."""
    return DetectionHardware(
        key=key,
        detector=key.partition(":")[0],
        name=key,
        units=[],
        count=0,
        unlimited=True,
    )


class HardwareStatsTestCase(unittest.TestCase):
    def setUp(self):
        subscriber = patch("frigate.stats.hardware.CameraConfigUpdateSubscriber")
        self.subscriber = subscriber.start()
        self.addCleanup(subscriber.stop)
        self.subscriber.return_value.check_for_updates.return_value = {}

        hardware._is_amd_vaapi.cache_clear()
        self.addCleanup(hardware._is_amd_vaapi.cache_clear)

    def make_config(self, hwaccel_args: str = "", **overrides) -> FrigateConfig:
        config = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "hwaccel_args": hwaccel_args,
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ],
                    },
                },
            },
            **overrides,
        }

        with patch("frigate.config.config.auto_detect_hwaccel", return_value=""):
            return FrigateConfig(**config)

    def make_stats(
        self, config: FrigateConfig | None = None, present: tuple[str, ...] = ()
    ) -> HardwareStats:
        with patch.object(
            hardware.hardware_prober,
            "probe",
            return_value=[found(key) for key in present],
        ):
            stats = HardwareStats(config or self.make_config())

        self.addCleanup(stats.stop)
        return stats


class TestHwaccelHardware(HardwareStatsTestCase):
    def test_preset_and_raw_args(self):
        cases = {
            "preset-nvidia": "nvidia",
            "-c:v h264_cuvid": "nvidia",
            "preset-jetson-h264": "jetson",
            "-c:v h264_nvmpi": "jetson",
            "preset-intel-qsv-h264": "intel_gpu",
            "-hwaccel qsv": "intel_gpu",
            "preset-amd-amf": "amd_gpu",
            "preset-rk-h264": "rockchip",
            "preset-rkmpp": "rockchip",
            "preset-rpi-64-h264": "rpi",
            "-c:v h264_v4l2m2m": "rpi",
            "": None,
            "-hwaccel none": None,
        }

        for args, expected in cases.items():
            self.assertEqual(_hwaccel_hardware(args), expected, args)

    def test_vaapi_driver_disambiguation(self):
        with patch("frigate.stats.hardware.is_vaapi_amd_driver", return_value=True):
            self.assertEqual(_hwaccel_hardware("preset-vaapi"), "amd_gpu")

        hardware._is_amd_vaapi.cache_clear()

        with patch("frigate.stats.hardware.is_vaapi_amd_driver", return_value=False):
            self.assertEqual(_hwaccel_hardware("-hwaccel vaapi"), "intel_gpu")

    def test_vulkan_resolves_to_present_gpu(self):
        with patch.object(
            hardware.hardware_prober,
            "probe",
            return_value=[found("cpu"), found("onnx:amd")],
        ):
            self.assertEqual(_hwaccel_hardware("preset-vulkan"), "amd_gpu")

        with patch.object(
            hardware.hardware_prober, "probe", return_value=[found("cpu")]
        ):
            self.assertIsNone(_hwaccel_hardware("preset-vulkan"))


class TestScanFfmpeg(HardwareStatsTestCase):
    def test_camera_and_input_args(self):
        config = self.make_config("preset-nvidia")
        config.cameras["back"].ffmpeg.inputs[0].hwaccel_args = "-hwaccel qsv"
        stats = self.make_stats(config)

        self.assertEqual(stats._scan_ffmpeg(), {"nvidia", "intel_gpu"})

    def test_no_hwaccel(self):
        stats = self.make_stats(self.make_config())
        self.assertEqual(stats._scan_ffmpeg(), set())


class TestScanDetectors(HardwareStatsTestCase):
    def scan(self, specs: list[DeviceSpec], present: tuple[str, ...] = ()) -> set[str]:
        stats = self.make_stats()
        model = SimpleNamespace()
        stats.config = SimpleNamespace(
            models=[model], devices_for_model=lambda m: specs
        )

        with patch.object(
            hardware.hardware_prober,
            "probe",
            return_value=[found(key) for key in present],
        ):
            return stats._scan_detectors()

    def test_detector_mapping(self):
        self.assertEqual(self.scan([DeviceSpec("rknn", "rknn", None)]), {"rockchip"})
        self.assertEqual(
            self.scan([DeviceSpec("axengine", "axengine", None)]), {"axengine"}
        )
        self.assertEqual(
            self.scan([DeviceSpec("tensorrt:0", "tensorrt", "0")]), {"jetson"}
        )
        self.assertEqual(
            self.scan([DeviceSpec("openvino:NPU", "openvino", "NPU")]), {"intel_npu"}
        )
        self.assertEqual(
            self.scan([DeviceSpec("openvino:GPU", "openvino", "GPU")]), {"intel_gpu"}
        )
        self.assertEqual(
            self.scan([DeviceSpec("openvino", "openvino", None)]), {"intel_gpu"}
        )
        self.assertEqual(
            self.scan([DeviceSpec("openvino:CPU", "openvino", "CPU")]), set()
        )
        self.assertEqual(self.scan([DeviceSpec("cpu", "cpu", None)]), set())
        self.assertEqual(self.scan([DeviceSpec("hailo8l", "hailo8l", None)]), set())

    def test_onnx_resolves_to_present_gpu(self):
        spec = DeviceSpec("onnx", "onnx", None)
        self.assertEqual(self.scan([spec], ("onnx:nvidia",)), {"nvidia"})
        self.assertEqual(self.scan([spec], ("onnx:amd",)), {"amd_gpu"})
        self.assertEqual(self.scan([spec], ("cpu",)), set())


class TestScanEnrichments(HardwareStatsTestCase):
    def scan(self, config: FrigateConfig, present: tuple[str, ...]) -> set[str]:
        stats = self.make_stats(config)

        with patch.object(
            hardware.hardware_prober,
            "probe",
            return_value=[found(key) for key in present],
        ):
            return stats._scan_enrichments()

    def test_semantic_search_large_demands_gpu(self):
        config = self.make_config(
            semantic_search={"enabled": True, "model_size": "large"}
        )
        self.assertEqual(self.scan(config, ("onnx:nvidia",)), {"nvidia"})

    def test_semantic_search_small_stays_cpu(self):
        config = self.make_config(
            semantic_search={"enabled": True, "model_size": "small"}
        )
        self.assertEqual(self.scan(config, ("onnx:nvidia",)), set())

    def test_semantic_search_explicit_cpu_device(self):
        config = self.make_config(
            semantic_search={"enabled": True, "model_size": "large", "device": "CPU"}
        )
        self.assertEqual(self.scan(config, ("onnx:nvidia",)), set())

    def test_face_recognition_defaults_to_gpu(self):
        config = self.make_config(face_recognition={"enabled": True})
        self.assertEqual(self.scan(config, ("onnx:amd",)), {"amd_gpu"})

    def test_lpr_defaults_to_auto(self):
        config = self.make_config(lpr={"enabled": True})
        self.assertEqual(self.scan(config, ("openvino:GPU",)), {"intel_gpu"})

    def test_no_gpu_present_means_no_demand(self):
        config = self.make_config(
            semantic_search={"enabled": True, "model_size": "large"}
        )
        self.assertEqual(self.scan(config, ("cpu",)), set())

    def test_audio_transcription_gpu_is_cuda_only(self):
        config = self.make_config()
        config.audio_transcription.enabled = True
        config.audio_transcription.device = "GPU"
        self.assertEqual(self.scan(config, ("onnx:nvidia",)), {"nvidia"})
        self.assertEqual(self.scan(config, ("onnx:amd",)), set())


class TestUpdateConfig(HardwareStatsTestCase):
    def test_catalog_from_hwaccel(self):
        stats = self.make_stats(self.make_config("preset-nvidia"))
        self.assertEqual(set(stats._monitored), {"nvidia"})

    def test_telemetry_gates(self):
        config = self.make_config(
            "preset-intel-qsv-h264",
            telemetry={"stats": {"intel_gpu_stats": False}},
        )
        stats = self.make_stats(config)
        self.assertEqual(set(stats._monitored), set())

    def test_recalculated_on_config_update(self):
        config = self.make_config()
        stats = self.make_stats(config)
        self.assertEqual(set(stats._monitored), set())

        config.cameras["back"].ffmpeg.hwaccel_args = "preset-rk-h264"
        self.subscriber.return_value.check_for_updates.return_value = {
            "ffmpeg": ["back"]
        }

        with patch("frigate.stats.hardware.get_cpu_stats", return_value={}):
            stats.update_stats({})

        self.assertEqual(set(stats._monitored), {"rockchip"})


class TestUpdateStats(HardwareStatsTestCase):
    def run_stats(self, stats: HardwareStats) -> dict:
        all_stats: dict = {}

        with patch("frigate.stats.hardware.get_cpu_stats", return_value={}):
            stats.update_stats(all_stats)

        return all_stats

    def test_polls_once_and_formats_legacy_shape(self):
        stats = self.make_stats(self.make_config("preset-nvidia"))
        usage = {
            0: {"name": "RTX", "gpu": 12.5, "mem": 25.0, "enc": 1, "dec": 2, "temp": 60}
        }

        with patch(
            "frigate.stats.hardware.get_nvidia_gpu_stats", return_value=usage
        ) as nvidia:
            all_stats = self.run_stats(stats)

        nvidia.assert_called_once()
        self.assertEqual(
            all_stats["gpu_usages"],
            {
                "RTX": {
                    "vendor": "nvidia",
                    "gpu": "12.5%",
                    "mem": "25.0%",
                    "enc": "1.0%",
                    "dec": "2.0%",
                    "temp": "60",
                }
            },
        )

    def test_failure_emits_fallback_and_latches_cooldown(self):
        stats = self.make_stats(self.make_config("preset-nvidia"))

        with patch(
            "frigate.stats.hardware.get_nvidia_gpu_stats", return_value={}
        ) as nvidia:
            all_stats = self.run_stats(stats)

            self.assertEqual(
                all_stats["gpu_usages"],
                {"nvidia-gpu": {"vendor": "nvidia", "gpu": "", "mem": ""}},
            )
            self.assertIn("nvidia", stats._errors)

            # in cooldown, the second cycle skips the poll
            all_stats = self.run_stats(stats)
            nvidia.assert_called_once()
            self.assertNotIn("gpu_usages", all_stats)

            # an expired cooldown is retried
            stats._errors["nvidia"] -= hardware.HARDWARE_ERROR_COOLDOWN_SECONDS + 1
            self.run_stats(stats)
            self.assertEqual(nvidia.call_count, 2)

    def test_npu_failure_latches_cooldown(self):
        stats = self.make_stats(self.make_config())
        stats._monitored = {"axengine": lambda: hardware._poll_axengine(stats.config)}

        with patch(
            "frigate.stats.hardware.get_axcl_npu_stats", return_value=None
        ) as axcl:
            all_stats = self.run_stats(stats)
            self.assertNotIn("npu_usages", all_stats)
            self.assertIn("axengine", stats._errors)

            self.run_stats(stats)
            axcl.assert_called_once()

    def test_rockchip_fills_both_buckets(self):
        stats = self.make_stats(self.make_config("preset-rk-h264"))

        with (
            patch(
                "frigate.stats.hardware.get_rockchip_gpu_stats",
                return_value={"gpu": "12.5%", "mem": "-%"},
            ),
            patch(
                "frigate.stats.hardware.get_rockchip_npu_stats",
                return_value={"npu": 42.0, "mem": "-%"},
            ),
        ):
            all_stats = self.run_stats(stats)

        self.assertEqual(
            all_stats["gpu_usages"],
            {"rockchip": {"vendor": "rockchip", "gpu": "12.5%", "mem": "-%"}},
        )
        self.assertEqual(
            all_stats["npu_usages"], {"rockchip": {"npu": 42.0, "mem": "-%"}}
        )

    def test_pollers_run_concurrently(self):
        stats = self.make_stats(self.make_config())

        def slow_poll() -> HardwarePollResult:
            time.sleep(0.2)
            return HardwarePollResult()

        stats._monitored = {"nvidia": slow_poll, "intel_gpu": slow_poll}
        start = time.monotonic()
        self.run_stats(stats)

        self.assertLess(time.monotonic() - start, 0.35)

    def test_bandwidth_gated_by_telemetry(self):
        config = self.make_config(telemetry={"stats": {"network_bandwidth": True}})
        stats = self.make_stats(config)

        with patch(
            "frigate.stats.hardware.get_bandwidth_stats",
            return_value={"123": {"bandwidth": 1.5}},
        ):
            all_stats = self.run_stats(stats)

        self.assertEqual(all_stats["bandwidth_usages"], {"123": {"bandwidth": 1.5}})

        stats = self.make_stats(self.make_config())

        with patch("frigate.stats.hardware.get_bandwidth_stats") as bandwidth:
            self.run_stats(stats)

        bandwidth.assert_not_called()


class TestHardwareTemperatures(unittest.TestCase):
    @patch("frigate.stats.hardware.read_temperature", side_effect=[45.0, 55.0])
    @patch("frigate.stats.hardware.os.listdir", return_value=["apex_1", "apex_0"])
    @patch("frigate.stats.hardware.os.path.isdir", return_value=True)
    def test_edgetpu_sorted_by_device(self, isdir, listdir, read):
        self.assertEqual(get_hardware_temperatures("edgetpu"), [45.0, 55.0])
        read.assert_any_call("/sys/class/apex/apex_0/temp")

    @patch(
        "frigate.stats.hardware.get_hailo_temps",
        return_value={"hailo8l-1": 52.0, "hailo8l-0": 51.0},
    )
    def test_hailo_sorted_by_name(self, temps):
        self.assertEqual(get_hardware_temperatures("hailo8l"), [51.0, 52.0])

    def test_unsupported_type(self):
        self.assertEqual(get_hardware_temperatures("rknn"), [])
