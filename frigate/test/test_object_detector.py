import unittest
from unittest.mock import Mock, patch

import numpy as np
from pydantic import parse_obj_as

from frigate.config import DetectorConfig, InputTensorEnum, ModelConfig
from frigate.detectors import DetectorTypeEnum
import frigate.detectors as detectors
import frigate.object_detection


class TestLocalObjectDetector(unittest.TestCase):
    def test_localdetectorprocess_should_only_create_specified_detector_type(self):
        for det_type in detectors.api_types:
            with self.subTest(det_type=det_type):
                with patch.dict(
                    "frigate.detectors.api_types",
                    {det_type: Mock() for det_type in DetectorTypeEnum},
                ):
                    test_cfg = parse_obj_as(
                        DetectorConfig, ({"type": det_type, "model": {}})
                    )
                    test_cfg.model.path = "/test/modelpath"
                    test_obj = frigate.object_detection.LocalObjectDetector(
                        detector_config=test_cfg
                    )

                    assert test_obj is not None
                    for api_key, mock_detector in detectors.api_types.items():
                        if test_cfg.type == api_key:
                            mock_detector.assert_called_once_with(test_cfg)
                        else:
                            mock_detector.assert_not_called()

    @patch.dict(
        "frigate.detectors.api_types",
        {det_type: Mock() for det_type in DetectorTypeEnum},
    )
    def test_detect_raw_given_tensor_input_should_return_api_detect_raw_result(self):
        mock_cputfl = detectors.api_types[DetectorTypeEnum.cpu]

        TEST_DATA = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        TEST_DETECT_RESULT = np.ndarray([1, 2, 4, 8, 16, 32])
        test_obj_detect = frigate.object_detection.LocalObjectDetector(
            detector_config=parse_obj_as(DetectorConfig, {"type": "cpu", "model": {}})
        )

        mock_det_api = mock_cputfl.return_value
        mock_det_api.detect_raw.return_value = TEST_DETECT_RESULT

        test_result = test_obj_detect.detect_raw(TEST_DATA)

        mock_det_api.detect_raw.assert_called_once_with(tensor_input=TEST_DATA)
        assert test_result is mock_det_api.detect_raw.return_value

    @patch.dict(
        "frigate.detectors.api_types",
        {det_type: Mock() for det_type in DetectorTypeEnum},
    )
    def test_detect_raw_given_tensor_input_should_call_api_detect_raw_with_transposed_tensor(
        self,
    ):
        mock_cputfl = detectors.api_types[DetectorTypeEnum.cpu]

        TEST_DATA = np.zeros((1, 32, 32, 3), np.uint8)
        TEST_DETECT_RESULT = np.ndarray([1, 2, 4, 8, 16, 32])

        test_cfg = parse_obj_as(DetectorConfig, {"type": "cpu", "model": {}})
        test_cfg.model.input_tensor = InputTensorEnum.nchw

        test_obj_detect = frigate.object_detection.LocalObjectDetector(
            detector_config=test_cfg
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

    @patch.dict(
        "frigate.detectors.api_types",
        {det_type: Mock() for det_type in DetectorTypeEnum},
    )
    @patch("frigate.object_detection.load_labels")
    def test_detect_given_tensor_input_should_return_lfiltered_detections(
        self, mock_load_labels
    ):
        mock_cputfl = detectors.api_types[DetectorTypeEnum.cpu]

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

        test_cfg = parse_obj_as(DetectorConfig, {"type": "cpu", "model": {}})
        test_cfg.model = ModelConfig()
        test_obj_detect = frigate.object_detection.LocalObjectDetector(
            detector_config=test_cfg,
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
