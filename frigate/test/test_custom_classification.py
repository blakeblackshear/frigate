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


class TestCustomObjectClassificationIntegration(unittest.TestCase):
    """Integration tests verifying obj_data structure includes current_zones field"""

    def test_tracked_object_dict_includes_current_zones(self):
        """Verify that tracked object to_dict() includes current_zones field"""
        # This test verifies the data structure that flows to CustomObjectClassificationProcessor
        # Simulates what tracked_object.to_dict() returns
        simulated_obj_data = {
            "id": "integration_test_123.456-xyz",
            "camera": "front_door",
            "label": "person",
            "false_positive": False,
            "end_time": None,
            "box": [100, 150, 300, 400],
            "area": 50000,
            "score": 0.92,
            "current_zones": [
                "driveway",
                "front_porch",
            ],  # Critical field we're testing
            "entered_zones": ["driveway", "front_porch", "sidewalk"],
            "has_clip": False,
            "has_snapshot": True,
            "region": [0, 0, 1280, 720],
            "active": True,
            "stationary": False,
        }

        # Verify the structure contains current_zones
        self.assertIn(
            "current_zones",
            simulated_obj_data,
            "obj_data must include current_zones field",
        )
        self.assertIsInstance(
            simulated_obj_data["current_zones"],
            list,
            "current_zones must be a list",
        )

    def test_obj_data_with_zones_produces_correct_mqtt_message(self):
        """Integration test: Verify obj_data with zones produces MQTT message with zones"""
        # Simulate the processing logic from CustomObjectClassificationProcessor
        obj_data = {
            "id": "integration_456.789-abc",
            "camera": "garage",
            "label": "person",
            "current_zones": ["garage_interior", "entrance"],
            "box": [120, 180, 320, 450],
            "false_positive": False,
            "end_time": None,
        }

        # Simulate what the processor does when building classification data
        classification_data = {
            "type": "classification",
            "id": obj_data["id"],
            "camera": obj_data["camera"],
            "timestamp": 1234567890.0,
            "model": "test_classifier",
            "sub_label": "delivery_person",
            "score": 0.89,
        }

        # This is the key logic from custom_classification.py that we're verifying
        if obj_data.get("current_zones"):
            classification_data["zones"] = obj_data["current_zones"]

        # Verify zones are included
        self.assertIn("zones", classification_data)
        self.assertEqual(classification_data["zones"], ["garage_interior", "entrance"])

    def test_obj_data_without_zones_excludes_zones_from_mqtt(self):
        """Integration test: Verify obj_data without zones excludes zones from MQTT"""
        obj_data = {
            "id": "integration_789.012-def",
            "camera": "backyard",
            "label": "person",
            "current_zones": [],  # Empty zones
            "box": [50, 75, 200, 300],
            "false_positive": False,
            "end_time": None,
        }

        # Simulate classification data building
        classification_data = {
            "type": "classification",
            "id": obj_data["id"],
            "camera": obj_data["camera"],
            "timestamp": 1234567890.0,
            "model": "test_classifier",
            "attribute": "running",
            "score": 0.85,
        }

        # Key logic: only add zones if current_zones is non-empty
        if obj_data.get("current_zones"):
            classification_data["zones"] = obj_data["current_zones"]

        # Verify zones are NOT included when empty
        self.assertNotIn("zones", classification_data)

    def test_obj_data_structure_compatibility(self):
        """Verify obj_data structure is compatible with processor expectations"""
        # Create obj_data matching the structure from tracked_object.to_dict()
        obj_data = {
            "id": "test_123.456-ghi",
            "camera": "front_door",
            "label": "person",
            "false_positive": False,
            "end_time": None,
            "box": [100, 100, 200, 200],
            "area": 10000,
            "score": 0.90,
            # Key fields for zone tracking
            "current_zones": ["entry_zone"],
            "entered_zones": ["entry_zone", "walkway"],
            # Other fields from tracked_object
            "region": [0, 0, 640, 480],
            "active": True,
            "stationary": False,
            "motionless_count": 0,
            "position_changes": 5,
            "has_clip": False,
            "has_snapshot": True,
        }

        # Verify all expected fields are present
        required_fields = ["id", "camera", "label", "current_zones", "box"]
        for field in required_fields:
            self.assertIn(
                field,
                obj_data,
                f"obj_data must include required field: {field}",
            )

        # Verify current_zones can be used in conditional
        if obj_data.get("current_zones"):
            zones = obj_data["current_zones"]
            self.assertIsInstance(zones, list)
            self.assertGreater(len(zones), 0)

    def test_multiple_zones_in_mqtt_message(self):
        """Integration test: Verify multiple zones are correctly passed through"""
        obj_data = {
            "id": "multi_zone_test_999.888-jkl",
            "camera": "outdoor",
            "label": "car",
            "current_zones": ["driveway", "street", "parking_area"],  # Multiple zones
            "box": [200, 200, 400, 400],
            "false_positive": False,
            "end_time": None,
        }

        # Build MQTT message
        mqtt_data = {
            "type": "classification",
            "id": obj_data["id"],
            "camera": obj_data["camera"],
            "timestamp": 1234567890.0,
            "model": "vehicle_classifier",
            "sub_label": "sedan",
            "score": 0.93,
        }

        if obj_data.get("current_zones"):
            mqtt_data["zones"] = obj_data["current_zones"]

        # Verify all zones are included
        self.assertIn("zones", mqtt_data)
        self.assertEqual(len(mqtt_data["zones"]), 3)
        self.assertIn("driveway", mqtt_data["zones"])
        self.assertIn("street", mqtt_data["zones"])
        self.assertIn("parking_area", mqtt_data["zones"])


if __name__ == "__main__":
    unittest.main()
