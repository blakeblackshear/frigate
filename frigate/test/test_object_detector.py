import unittest
from unittest.mock import patch

import numpy as np
from frigate.config import DetectorTypeEnum, ModelConfig
import frigate.object_detection


class TestLocalObjectDetector(unittest.TestCase):
    @patch("frigate.object_detection.EdgeTpuTfl")
    @patch("frigate.object_detection.CpuTfl")
    def test_localdetectorprocess_given_type_cpu_should_call_cputfl_init(
        self, mock_cputfl, mock_edgetputfl
    ):
        test_cfg = ModelConfig()
        test_cfg.path = "/test/modelpath"
        test_obj = frigate.object_detection.LocalObjectDetector(
            det_type=DetectorTypeEnum.cpu, model_config=test_cfg, num_threads=6
        )

        assert test_obj is not None
        mock_edgetputfl.assert_not_called()
        mock_cputfl.assert_called_once_with(model_config=test_cfg, num_threads=6)

    @patch("frigate.object_detection.EdgeTpuTfl")
    @patch("frigate.object_detection.CpuTfl")
    def test_localdetectorprocess_given_type_edgtpu_should_call_edgtpu_init(
        self, mock_cputfl, mock_edgetputfl
    ):
        test_cfg = ModelConfig()
        test_cfg.path = "/test/modelpath"

        test_obj = frigate.object_detection.LocalObjectDetector(
            det_type=DetectorTypeEnum.edgetpu,
            det_device="usb",
            model_config=test_cfg,
        )

        assert test_obj is not None
        mock_cputfl.assert_not_called()
        mock_edgetputfl.assert_called_once_with(det_device="usb", model_config=test_cfg)

    @patch("frigate.object_detection.CpuTfl")
    def test_detect_raw_given_tensor_input_should_return_api_detect_raw_result(
        self, mock_cputfl
    ):
        TEST_DATA = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        TEST_DETECT_RESULT = np.ndarray([1, 2, 4, 8, 16, 32])
        test_obj_detect = frigate.object_detection.LocalObjectDetector(
            det_device=DetectorTypeEnum.cpu
        )

        mock_det_api = mock_cputfl.return_value
        mock_det_api.detect_raw.return_value = TEST_DETECT_RESULT

        test_result = test_obj_detect.detect_raw(TEST_DATA)

        mock_det_api.detect_raw.assert_called_once_with(tensor_input=TEST_DATA)
        assert test_result is mock_det_api.detect_raw.return_value

    @patch("frigate.object_detection.CpuTfl")
    def test_detect_raw_given_tensor_input_should_call_api_detect_raw_with_transposed_tensor(
        self, mock_cputfl
    ):
        TEST_DATA = np.zeros((1, 32, 32, 3), np.uint8)
        TEST_DETECT_RESULT = np.ndarray([1, 2, 4, 8, 16, 32])

        test_cfg = ModelConfig()
        test_cfg.input_tensor = ["B", "C", "H", "W"]

        test_obj_detect = frigate.object_detection.LocalObjectDetector(
            det_device=DetectorTypeEnum.cpu, model_config=test_cfg
        )

        mock_det_api = mock_cputfl.return_value
        mock_det_api.detect_raw.return_value = TEST_DETECT_RESULT

        test_result = test_obj_detect.detect_raw(TEST_DATA)

        mock_det_api.detect_raw.assert_called_once()
        assert (
            mock_det_api.detect_raw.call_args.kwargs["tensor_input"].shape
            == np.zeros((1, 3, 32, 32)).shape
        )

        assert test_result is mock_det_api.detect_raw.return_value

    @patch("frigate.object_detection.CpuTfl")
    @patch("frigate.object_detection.load_labels")
    def test_detect_given_tensor_input_should_return_lfiltered_detections(
        self, mock_load_labels, mock_cputfl
    ):
        TEST_DATA = np.zeros((1, 32, 32, 3), np.uint8)
        TEST_DETECT_RAW = [
            [2, 0.9, 5, 4, 3, 2],
            [1, 0.5, 8, 7, 6, 5],
            [0, 0.4, 2, 4, 8, 16],
        ]
        TEST_DETECT_RESULT = [
            ("label-3", 0.9, (5, 4, 3, 2)),
            ("label-2", 0.5, (8, 7, 6, 5)),
        ]
        TEST_LABEL_FILE = "/test_labels.txt"
        mock_load_labels.return_value = [
            "label-1",
            "label-2",
            "label-3",
            "label-4",
            "label-5",
        ]

        test_obj_detect = frigate.object_detection.LocalObjectDetector(
            det_device=DetectorTypeEnum.cpu,
            model_config=ModelConfig(),
            labels=TEST_LABEL_FILE,
        )

        mock_load_labels.assert_called_once_with(TEST_LABEL_FILE)

        mock_det_api = mock_cputfl.return_value
        mock_det_api.detect_raw.return_value = TEST_DETECT_RAW

        test_result = test_obj_detect.detect(tensor_input=TEST_DATA, threshold=0.5)

        mock_det_api.detect_raw.assert_called_once()
        assert (
            mock_det_api.detect_raw.call_args.kwargs["tensor_input"].shape
            == np.zeros((1, 32, 32, 3)).shape
        )
        assert test_result == TEST_DETECT_RESULT
