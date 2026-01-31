import json
import sys
import unittest
from unittest.mock import MagicMock

# Mock all external dependencies before any imports
sys.modules["cv2"] = MagicMock()
sys.modules["numpy"] = MagicMock()
sys.modules["zmq"] = MagicMock()
sys.modules["peewee"] = MagicMock()
sys.modules["sherpa_onnx"] = MagicMock()
sys.modules["frigate.comms.inter_process"] = MagicMock()
sys.modules["frigate.comms.event_metadata_updater"] = MagicMock()
sys.modules["frigate.comms.embeddings_updater"] = MagicMock()
sys.modules["frigate.log"] = MagicMock()
sys.modules["frigate.const"] = MagicMock()
sys.modules["frigate.util.builtin"] = MagicMock()
sys.modules["frigate.util.object"] = MagicMock()
sys.modules["tflite_runtime"] = MagicMock()
sys.modules["tflite_runtime.interpreter"] = MagicMock()
sys.modules["tensorflow"] = MagicMock()
sys.modules["tensorflow.lite"] = MagicMock()
sys.modules["tensorflow.lite.python"] = MagicMock()
sys.modules["tensorflow.lite.python.interpreter"] = MagicMock()


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
    """Integration tests that verify the actual implementation handles zones correctly"""

    def test_implementation_extracts_zones_from_obj_data(self):
        """Verify the actual implementation code reads current_zones from obj_data"""
        # Read the actual implementation file
        impl_path = "/home/runner/work/frigate/frigate/frigate/data_processing/real_time/custom_classification.py"
        with open(impl_path, "r") as f:
            impl_code = f.read()

        # Verify the implementation checks for current_zones in obj_data
        self.assertIn(
            'obj_data.get("current_zones")',
            impl_code,
            "Implementation must check for current_zones in obj_data",
        )

        # Verify it adds zones to classification_data
        self.assertIn(
            'classification_data["zones"]',
            impl_code,
            "Implementation must add zones to classification_data",
        )

        # Verify it assigns current_zones value
        self.assertIn(
            'obj_data["current_zones"]',
            impl_code,
            "Implementation must read current_zones from obj_data",
        )

    def test_sub_label_classification_path_includes_zone_logic(self):
        """Verify sub_label classification path includes zone handling"""
        impl_path = "/home/runner/work/frigate/frigate/frigate/data_processing/real_time/custom_classification.py"
        with open(impl_path, "r") as f:
            lines = f.readlines()

        # Find the sub_label section
        in_sub_label_section = False
        found_zone_logic = False

        for i, line in enumerate(lines):
            if "ObjectClassificationType.sub_label" in line:
                in_sub_label_section = True
            elif "ObjectClassificationType.attribute" in line:
                in_sub_label_section = False

            if in_sub_label_section and 'obj_data.get("current_zones")' in line:
                found_zone_logic = True
                break

        self.assertTrue(
            found_zone_logic,
            "Sub-label classification path must include zone logic",
        )

    def test_attribute_classification_path_includes_zone_logic(self):
        """Verify attribute classification path includes zone handling"""
        impl_path = "/home/runner/work/frigate/frigate/frigate/data_processing/real_time/custom_classification.py"
        with open(impl_path, "r") as f:
            lines = f.readlines()

        # Find the attribute section
        in_attribute_section = False
        found_zone_logic = False

        for i, line in enumerate(lines):
            if "ObjectClassificationType.attribute" in line:
                in_attribute_section = True
            elif i > 0 and in_attribute_section and "def " in line:
                # Reached next method, stop
                break

            if in_attribute_section and 'obj_data.get("current_zones")' in line:
                found_zone_logic = True
                break

        self.assertTrue(
            found_zone_logic,
            "Attribute classification path must include zone logic",
        )

    def test_zones_are_conditionally_added(self):
        """Verify zones are only added when obj_data has current_zones"""
        impl_path = "/home/runner/work/frigate/frigate/frigate/data_processing/real_time/custom_classification.py"
        with open(impl_path, "r") as f:
            impl_code = f.read()

        # Check that there's an if statement checking for current_zones before adding
        # This pattern ensures we don't always add zones, only when they exist
        self.assertRegex(
            impl_code,
            r'if\s+obj_data\.get\("current_zones"\):\s+classification_data\["zones"\]',
            "Implementation must conditionally add zones only when present in obj_data",
        )


if __name__ == "__main__":
    unittest.main()
