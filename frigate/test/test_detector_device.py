"""Tests for parsing detection hardware device strings."""

import unittest

from frigate.detectors.detector_config import ModelConfig
from frigate.detectors.device import (
    DeviceParseError,
    build_detector_config,
    parse_device,
    runner_names,
)


class TestParseDevice(unittest.TestCase):
    def test_bare_detector_has_no_device(self):
        spec = parse_device("cpu")

        self.assertEqual(spec.detector, "cpu")
        self.assertIsNone(spec.device)

    def test_device_is_everything_after_the_first_colon(self):
        spec = parse_device("edgetpu:pci:0")

        self.assertEqual(spec.detector, "edgetpu")
        self.assertEqual(spec.device, "pci:0")

    def test_trailing_colon_keeps_an_empty_device(self):
        # an empty edgetpu device selects a native Coral
        spec = parse_device("edgetpu:")

        self.assertEqual(spec.detector, "edgetpu")
        self.assertEqual(spec.device, "")

    def test_unknown_detector_is_rejected(self):
        with self.assertRaises(DeviceParseError):
            parse_device("not_a_detector:0")

    def test_device_that_the_detector_cannot_use_is_rejected(self):
        # tensorrt takes a gpu index
        with self.assertRaises(DeviceParseError):
            parse_device("tensorrt:the-fast-one")


class TestBuildDetectorConfig(unittest.TestCase):
    def _build(self, raw: str):
        return build_detector_config(parse_device(raw), ModelConfig())

    def test_device_lands_on_the_detector_field(self):
        for raw, expected in (
            ("edgetpu:usb", "usb"),
            ("edgetpu:pci:1", "pci:1"),
            ("openvino:GPU.1", "GPU.1"),
            ("onnx:CPU", "CPU"),
            ("memryx:PCIe:0", "PCIe:0"),
        ):
            with self.subTest(raw=raw):
                self.assertEqual(self._build(raw).device, expected)

    def test_detectors_that_name_the_field_something_else(self):
        self.assertEqual(self._build("cpu:4").num_threads, 4)
        self.assertEqual(self._build("rknn:2").num_cores, 2)

    def test_device_is_coerced_to_the_detector_field_type(self):
        self.assertEqual(self._build("tensorrt:1").device, 1)

    def test_omitted_device_falls_back_to_the_detector_default(self):
        self.assertEqual(self._build("cpu").num_threads, 3)
        self.assertEqual(self._build("rknn").num_cores, 0)
        self.assertEqual(self._build("openvino").device, "AUTO")
        self.assertIsNone(self._build("edgetpu").device)

    def test_the_model_is_attached(self):
        model = ModelConfig(path="/cpu_model.tflite")

        self.assertIs(build_detector_config(parse_device("cpu"), model).model, model)


class TestRunnerNames(unittest.TestCase):
    def test_unique_devices_keep_their_name(self):
        devices = [parse_device("edgetpu:pci:0"), parse_device("edgetpu:pci:1")]

        self.assertEqual(runner_names(devices), ["edgetpu:pci:0", "edgetpu:pci:1"])

    def test_repeated_devices_are_numbered(self):
        devices = [parse_device("openvino:GPU")] * 3

        self.assertEqual(
            runner_names(devices),
            ["openvino:GPU", "openvino:GPU#2", "openvino:GPU#3"],
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
