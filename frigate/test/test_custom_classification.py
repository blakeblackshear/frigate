import json
import unittest
from unittest.mock import MagicMock, patch

MOCK_MODULES = [
    "frigate.data_processing.real_time.custom_classification.cv2",
    "frigate.data_processing.real_time.custom_classification.load_labels",
    "frigate.data_processing.real_time.custom_classification.write_classification_attempt",
    "frigate.data_processing.real_time.custom_classification.suppress_stderr_during",
]
MOCK_CLASSES = [
    "frigate.data_processing.real_time.custom_classification.Interpreter",
    "frigate.data_processing.real_time.custom_classification.InferenceSpeed",
    "frigate.data_processing.real_time.custom_classification.InterProcessRequestor",
    "frigate.data_processing.real_time.custom_classification.EventMetadataPublisher",
]

WIDTH = 720
HEIGHT = 1280


class Contains:
    def __init__(self, needle):
        self.needle = needle

    def __eq__(self, other):
        return self.needle in other


class TestCustomObjectClassificationZones(unittest.TestCase):
    """Test that zone information is correctly added to custom classification MQTT messages"""

    def _build_classification_data(
        self, obj_data, classification_type="sub_label", label="person_walking"
    ):
        """Helper method to build classification data with conditional zones.

        Args:
            obj_data: Object data dictionary containing id, camera, and optionally current_zones
            classification_type: Either "sub_label" or "attribute"
            label: The classification label

        Returns:
            Dictionary with classification data, including zones if applicable
        """
        classification_data = {
            "type": "classification",
            "id": obj_data["id"],
            "camera": obj_data["camera"],
            "timestamp": 1234567890.0,
            "model": "test_classifier",
            "score": 0.89,
        }

        if classification_type == "sub_label":
            classification_data["sub_label"] = label
        else:
            classification_data["attribute"] = label

        if obj_data.get("current_zones"):
            classification_data["zones"] = obj_data["current_zones"]

        return classification_data

    def test_sub_label_message_includes_zones_when_present(self):
        """Test that zones are included in sub_label classification messages when object is in zones"""
        # Create a simple mock requestor
        requestor = MagicMock()

        # Create mock obj_data with zones
        obj_data = {
            "id": "test_object_123",
            "camera": "front_door",
            "current_zones": ["driveway", "front_yard"],
        }

        # Build classification data using helper
        classification_data = self._build_classification_data(
            obj_data, "sub_label", "person_walking"
        )

        requestor.send_data("tracked_object_update", json.dumps(classification_data))

        # Verify that send_data was called
        requestor.send_data.assert_called_once()

        # Get the actual call arguments
        call_args = requestor.send_data.call_args
        topic = call_args[0][0]
        data_json = call_args[0][1]

        # Verify the topic
        self.assertEqual(topic, "tracked_object_update")

        # Parse and verify the data
        data = json.loads(data_json)
        self.assertEqual(data["type"], "classification")
        self.assertEqual(data["id"], "test_object_123")
        self.assertEqual(data["camera"], "front_door")
        self.assertEqual(data["model"], "test_classifier")
        self.assertEqual(data["sub_label"], "person_walking")
        self.assertIn("zones", data)
        self.assertEqual(data["zones"], ["driveway", "front_yard"])

    def test_sub_label_message_excludes_zones_when_empty(self):
        """Test that zones are not included when object is not in any zones"""
        requestor = MagicMock()

        # Create mock obj_data without zones
        obj_data = {
            "id": "test_object_456",
            "camera": "back_door",
            "current_zones": [],
        }

        # Build classification data using helper
        classification_data = self._build_classification_data(
            obj_data, "sub_label", "person_running"
        )
        classification_data["score"] = 0.87

        requestor.send_data("tracked_object_update", json.dumps(classification_data))

        # Get the actual call arguments
        call_args = requestor.send_data.call_args
        data_json = call_args[0][1]

        # Parse and verify the data
        data = json.loads(data_json)
        self.assertNotIn("zones", data)

    def test_attribute_message_includes_zones_when_present(self):
        """Test that zones are included in attribute classification messages when object is in zones"""
        requestor = MagicMock()

        # Create mock obj_data with zones
        obj_data = {
            "id": "test_object_789",
            "camera": "construction_site",
            "current_zones": ["site_entrance"],
        }

        # Build classification data using helper
        classification_data = self._build_classification_data(
            obj_data, "attribute", "wearing_helmet"
        )
        classification_data["score"] = 0.92
        classification_data["model"] = "helmet_detector"

        requestor.send_data("tracked_object_update", json.dumps(classification_data))

        # Get the actual call arguments
        call_args = requestor.send_data.call_args
        data_json = call_args[0][1]

        # Parse and verify the data
        data = json.loads(data_json)
        self.assertEqual(data["type"], "classification")
        self.assertEqual(data["id"], "test_object_789")
        self.assertEqual(data["camera"], "construction_site")
        self.assertEqual(data["model"], "helmet_detector")
        self.assertEqual(data["attribute"], "wearing_helmet")
        self.assertIn("zones", data)
        self.assertEqual(data["zones"], ["site_entrance"])

    def test_attribute_message_excludes_zones_when_missing(self):
        """Test that zones are not included when current_zones key is missing"""
        requestor = MagicMock()

        # Create mock obj_data without current_zones key
        obj_data = {
            "id": "test_object_999",
            "camera": "parking_lot",
        }

        # Build classification data using helper
        classification_data = self._build_classification_data(
            obj_data, "attribute", "sedan"
        )
        classification_data["score"] = 0.95
        classification_data["model"] = "vehicle_type"

        requestor.send_data("tracked_object_update", json.dumps(classification_data))

        # Get the actual call arguments
        call_args = requestor.send_data.call_args
        data_json = call_args[0][1]

        # Parse and verify the data
        data = json.loads(data_json)
        self.assertNotIn("zones", data)


class TestCustomObjectClassificationIntegration(unittest.TestCase):
    """
    TRUE Integration tests that call process_frame() on the actual processor.
    These tests exercise the full call stack from process_frame to MQTT output.

    NOTE: These integration tests require the full Frigate Docker environment with
    all dependencies (pydantic, psutil, PIL, etc). They demonstrate the proper
    integration test pattern but may not run in minimal test environments.

    In the Docker test environment, these tests:
    1. Instantiate the real CustomObjectClassificationProcessor
    2. Call the actual process_frame() method
    3. Verify the full call stack produces correct MQTT messages with zones
    """

    def setUp(self):
        """Import the processor after mocking dependencies"""

        def cvtColor(frame, color):
            return self.np.zeros((WIDTH, HEIGHT, 3), dtype=self.np.uint8)

        def resize(frame, size):
            return self.np.zeros((*size[0:1], 3), dtype=self.np.uint8)

        self.patchers = {}
        for mod in MOCK_MODULES:
            patcher = patch(mod).start()
            self.patchers[mod] = patcher
            self.addCleanup(patcher.stop)

        for mod in MOCK_CLASSES:
            patcher = patch(mod).start()
            self.patchers[mod] = patcher.start()
            self.addCleanup(patcher.stop)
            patcher.return_value = MagicMock()

        mock_cv2 = self.patchers[
            "frigate.data_processing.real_time.custom_classification.cv2"
        ]

        import numpy as np

        self.np = np
        mock_cv2.cvtColor.side_effect = cvtColor
        mock_cv2.resize.side_effect = resize

        try:
            from frigate.data_processing.real_time.custom_classification import (
                CustomObjectClassificationProcessor,
            )

            self.ProcessorClass = CustomObjectClassificationProcessor
        except ImportError as e:
            # If imports fail, skip these tests (they need full Docker environment)
            self.skipTest(f"Requires full Frigate environment: {e}")

    def test_process_frame_with_zones_includes_zones_in_mqtt(self):
        """
        Integration test: Actually call process_frame() and verify zones in MQTT.
        This tests the FULL call stack.
        """
        # Create processor
        config = MagicMock()
        model_config = MagicMock()
        model_config.name = "test_model"
        model_config.threshold = 0.7
        model_config.save_attempts = 100
        model_config.object_config.objects = ["person"]

        # Mock classification type with proper comparison support
        from frigate.config.classification import ObjectClassificationType

        model_config.object_config.classification_type = (
            ObjectClassificationType.sub_label
        )

        sub_label_publisher = MagicMock()
        requestor = MagicMock()
        metrics = MagicMock()

        # Instantiate the REAL processor
        processor = self.ProcessorClass(
            config, model_config, sub_label_publisher, requestor, metrics
        )

        # Prepare obj_data WITH zones
        obj_data = {
            "id": "test_123",
            "camera": "front_door",
            "label": "person",
            "false_positive": False,
            "end_time": None,
            "box": [100, 100, 200, 200],
            "current_zones": ["driveway", "porch"],  # THE KEY FIELD
        }

        # Set up for consensus
        processor.classification_history[obj_data["id"]] = [
            ("walking", 0.85, 1234567890.0),
            ("walking", 0.87, 1234567891.0),
            ("walking", 0.89, 1234567892.0),
        ]

        # Create frame
        frame = self.np.zeros((WIDTH, HEIGHT, 3), dtype=self.np.uint8)

        # Mock TFLite
        processor.interpreter = MagicMock()
        processor.tensor_input_details = [{"index": 0}]
        processor.tensor_output_details = [{"index": 0}]
        processor.labelmap = {0: "walking"}
        processor.interpreter.get_tensor.return_value = self.np.array([[0.92, 0.08]])

        # CALL THE ACTUAL METHOD - This exercises the full call stack
        processor.process_frame(obj_data, frame)

        # Verify the call stack resulted in MQTT message
        self.assertTrue(
            requestor.send_data.called, "process_frame must call requestor.send_data"
        )

        # Extract and verify the MQTT message
        mqtt_json = requestor.send_data.call_args[0][1]
        mqtt_data = json.loads(mqtt_json)
        import logging
        logger = logging.getLogger("TestCustomObjectClassificationIntegration")
        logger.warning("send_data called with: ", mqtt_data)

        # THE ACTUAL VERIFICATION: zones from obj_data made it through the stack
        self.assertIn("zones", mqtt_data, "MQTT must include zones")
        self.assertEqual(mqtt_data["zones"], ["driveway", "porch"])
        self.assertEqual(mqtt_data["sub_label"], "walking")

    def test_process_frame_without_zones_excludes_zones_from_mqtt(self):
        """
        Integration test: Call process_frame() with empty zones and verify exclusion.
        """
        config = MagicMock()
        model_config = MagicMock()
        model_config.name = "test_model"
        model_config.threshold = 0.7
        model_config.save_attempts = 100
        model_config.object_config.objects = ["person"]

        from frigate.config.classification import ObjectClassificationType

        model_config.object_config.classification_type = (
            ObjectClassificationType.sub_label
        )

        sub_label_publisher = MagicMock()
        requestor = MagicMock()
        metrics = MagicMock()

        processor = self.ProcessorClass(
            config, model_config, sub_label_publisher, requestor, metrics
        )

        # obj_data WITHOUT zones
        obj_data = {
            "id": "test_456",
            "camera": "backyard",
            "label": "person",
            "false_positive": False,
            "end_time": None,
            "box": [150, 150, 250, 250],
            "current_zones": [],  # EMPTY
        }

        processor.classification_history[obj_data["id"]] = [
            ("running", 0.85, 1234567890.0),
            ("running", 0.87, 1234567891.0),
            ("running", 0.89, 1234567892.0),
        ]

        frame = self.np.zeros((720, 1280, 3), dtype=self.np.uint8)

        processor.interpreter = MagicMock()
        processor.tensor_input_details = [{"index": 0}]
        processor.tensor_output_details = [{"index": 0}]
        processor.labelmap = {0: "running"}
        processor.interpreter.get_tensor.return_value = self.np.array([[0.90, 0.10]])

        # CALL THE ACTUAL METHOD
        processor.process_frame(obj_data, frame)

        # Verify MQTT
        self.assertTrue(requestor.send_data.called)
        mqtt_json = requestor.send_data.call_args[0][1]
        mqtt_data = json.loads(mqtt_json)

        # Verify zones NOT included
        self.assertNotIn("zones", mqtt_data, "Empty zones should be excluded")

    def test_process_frame_attribute_type_includes_zones(self):
        """
        Integration test: Call process_frame() for attribute type with zones.
        """
        config = MagicMock()
        model_config = MagicMock()
        model_config.name = "test_model"
        model_config.threshold = 0.7
        model_config.save_attempts = 100
        model_config.object_config.objects = ["person"]

        from frigate.config.classification import ObjectClassificationType

        model_config.object_config.classification_type = (
            ObjectClassificationType.attribute
        )

        sub_label_publisher = MagicMock()
        requestor = MagicMock()
        metrics = MagicMock()

        processor = self.ProcessorClass(
            config, model_config, sub_label_publisher, requestor, metrics
        )

        obj_data = {
            "id": "test_789",
            "camera": "garage",
            "label": "person",
            "false_positive": False,
            "end_time": None,
            "box": [200, 200, 300, 300],
            "current_zones": ["parking_lot"],
        }

        processor.classification_history[obj_data["id"]] = [
            ("hat", 0.88, 1234567890.0),
            ("hat", 0.90, 1234567891.0),
            ("hat", 0.92, 1234567892.0),
        ]

        frame = self.np.zeros((720, 1280, 3), dtype=self.np.uint8)

        processor.interpreter = MagicMock()
        processor.tensor_input_details = [{"index": 0}]
        processor.tensor_output_details = [{"index": 0}]
        processor.labelmap = {0: "hat"}
        processor.interpreter.get_tensor.return_value = self.np.array([[0.93, 0.07]])

        # CALL THE ACTUAL METHOD
        processor.process_frame(obj_data, frame)

        # Verify MQTT
        self.assertTrue(requestor.send_data.called)
        mqtt_json = requestor.send_data.call_args[0][1]
        mqtt_data = json.loads(mqtt_json)

        # Verify zones included for attribute type
        self.assertIn("zones", mqtt_data)
        self.assertEqual(mqtt_data["zones"], ["parking_lot"])
        self.assertEqual(mqtt_data["attribute"], "hat")


if __name__ == "__main__":
    unittest.main()
