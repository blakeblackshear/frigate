import unittest
from unittest.mock import MagicMock, Mock, patch

import numpy as np
import zmq
from pydantic import parse_obj_as

import frigate.detectors as detectors
import frigate.object_detection.base
from frigate.config import DetectorConfig, ModelConfig
from frigate.detectors import DetectorTypeEnum
from frigate.detectors.detector_config import InputTensorEnum


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
                    test_obj = frigate.object_detection.base.LocalObjectDetector(
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
        test_obj_detect = frigate.object_detection.base.LocalObjectDetector(
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

        test_obj_detect = frigate.object_detection.base.LocalObjectDetector(
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
    @patch("frigate.object_detection.base.load_labels")
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
        mock_load_labels.return_value = {
            0: "label-1",
            1: "label-2",
            2: "label-3",
            3: "label-4",
            4: "label-5",
        }

        test_cfg = parse_obj_as(DetectorConfig, {"type": "cpu", "model": {}})
        test_cfg.model = ModelConfig()
        test_obj_detect = frigate.object_detection.base.LocalObjectDetector(
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


class TestRemoteObjectDetector(unittest.TestCase):
    """Cover the label lookup that turns raw class ids into detections."""

    def _build_detector(self, labels, rows):
        detector = frigate.object_detection.base.RemoteObjectDetector.__new__(
            frigate.object_detection.base.RemoteObjectDetector
        )
        detector.labels = labels
        detector.name = "front_door"
        detector.fps = MagicMock()
        detector.stop_event = MagicMock()
        detector.stop_event.is_set.return_value = False
        detector.unnamed_class_ids = set()
        detector.np_shm = np.zeros((1, 320, 320, 3), np.uint8)
        detector.out_np_shm = np.array(rows, np.float32)
        detector.detection_queue = MagicMock()
        detector.detector_subscriber = MagicMock()
        detector.detector_subscriber.socket.recv_string.side_effect = zmq.Again()
        detector.detector_subscriber.check_for_update.return_value = "front_door"
        return detector

    def test_maps_class_ids_to_labels(self):
        rows = [[2, 0.9, 0.1, 0.2, 0.3, 0.4], [0, 0.8, 0.5, 0.6, 0.7, 0.8]] + [
            [0, 0, 0, 0, 0, 0]
        ] * 18
        detector = self._build_detector({0: "person", 2: "car"}, rows)

        results = detector.detect(np.zeros((1, 320, 320, 3), np.uint8))

        self.assertEqual([r[0] for r in results], ["car", "person"])

    def test_skips_class_ids_the_labelmap_does_not_name(self):
        # a labelmap that names fewer classes than the model emits
        rows = [[7, 0.9, 0.1, 0.2, 0.3, 0.4], [0, 0.8, 0.5, 0.6, 0.7, 0.8]] + [
            [0, 0, 0, 0, 0, 0]
        ] * 18
        detector = self._build_detector({0: "person"}, rows)

        results = detector.detect(np.zeros((1, 320, 320, 3), np.uint8))

        self.assertEqual([r[0] for r in results], ["person"])
        self.assertEqual(detector.unnamed_class_ids, {7})

    def test_warns_once_per_unnamed_class_id(self):
        rows = [
            [7, 0.9, 0.1, 0.2, 0.3, 0.4],
            [7, 0.8, 0.1, 0.2, 0.3, 0.4],
            [9, 0.7, 0.1, 0.2, 0.3, 0.4],
        ] + [[0, 0, 0, 0, 0, 0]] * 17
        detector = self._build_detector({0: "person"}, rows)

        with self.assertLogs("frigate.object_detection.base", level="WARNING") as logs:
            detector.detect(np.zeros((1, 320, 320, 3), np.uint8))

        self.assertEqual(len(logs.output), 2)
        self.assertEqual(detector.unnamed_class_ids, {7, 9})

    def test_empty_labelmap_drops_detections_instead_of_raising(self):
        rows = [[0, 0.9, 0.1, 0.2, 0.3, 0.4]] + [[0, 0, 0, 0, 0, 0]] * 19
        detector = self._build_detector({}, rows)

        results = detector.detect(np.zeros((1, 320, 320, 3), np.uint8))

        self.assertEqual(results, [])
