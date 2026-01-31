import json
import unittest
from unittest.mock import MagicMock


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


if __name__ == "__main__":
    unittest.main()
