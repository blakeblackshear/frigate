"""Tests for GET /classification/attributes."""

import os
import shutil
import unittest

from frigate.api.auth import get_allowed_cameras_for_filter
from frigate.const import CLIPS_DIR
from frigate.models import Event, Recordings, ReviewSegment
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp

# "limited_user" only reaches front_door, so it never sees the values that were
# recorded on back_door.
_CONFIG = {
    "mqtt": {"host": "mqtt"},
    "auth": {"roles": {"limited_user": ["front_door"]}},
    "classification": {
        "custom": {
            "delivery_service": {
                "enabled": True,
                "object_config": {
                    "objects": ["car"],
                    "classification_type": "attribute",
                },
            }
        }
    },
    "cameras": {
        "front_door": {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}]
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
        },
        "back_door": {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.2:554/video", "roles": ["detect"]}]
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
        },
    },
}


class TestClassificationAttributesAccess(BaseTestHttp):
    """The attribute list is read from the training dataset on disk, which holds
    every label a model can emit regardless of which camera recorded it. Callers
    without full camera access are cut back to the values on their own cameras,
    so these tests pin that scoping.
    """

    def setUp(self):
        super().setUp([Event, ReviewSegment, Recordings])
        self.minimal_config = _CONFIG
        self.app = super().create_app()
        self.model_dir = os.path.join(CLIPS_DIR, "delivery_service")

        for category in ("DHL", "Amazon", "Hermes", "none"):
            os.makedirs(
                os.path.join(self.model_dir, "dataset", category), exist_ok=True
            )

    def tearDown(self):
        shutil.rmtree(self.model_dir, ignore_errors=True)
        self.app.dependency_overrides.clear()
        super().tearDown()

    def _insert_event(self, event_id: str, camera: str, attribute: str | None):
        data = {"type": "object", "score": 0.9}

        if attribute is not None:
            data["delivery_service"] = attribute

        Event.insert(
            id=event_id,
            label="car",
            camera=camera,
            start_time=100,
            end_time=200,
            top_score=0.9,
            score=0.9,
            false_positive=False,
            zones=[],
            thumbnail="",
            has_clip=True,
            has_snapshot=True,
            region=[],
            box=[],
            area=0,
            retain_indefinitely=False,
            ratio=1.0,
            plus_id=None,
            model_hash="",
            detector_type="cpu",
            model_type="ssd",
            data=data,
        ).execute()

    def _get(self, role: str, **params):
        # the base class resolves every camera by default, so drop the override
        # to exercise the real role to allowed-cameras resolution
        self.app.dependency_overrides.pop(get_allowed_cameras_for_filter, None)

        with AuthTestClient(self.app) as client:
            return client.get(
                "/classification/attributes",
                params=params,
                headers={"remote-user": "test", "remote-role": role},
            )

    def _insert_split_events(self):
        self._insert_event("front", "front_door", "DHL")
        self._insert_event("back", "back_door", "Amazon")

    def test_admin_gets_every_trained_label(self):
        self._insert_split_events()
        assert self._get("admin").json() == ["Amazon", "DHL", "Hermes"]

    def test_viewer_gets_every_trained_label(self):
        self._insert_split_events()
        assert self._get("viewer").json() == ["Amazon", "DHL", "Hermes"]

    def test_restricted_role_only_gets_its_own_cameras(self):
        self._insert_split_events()
        assert self._get("limited_user").json() == ["DHL"]

    def test_restricted_role_grouped_by_model(self):
        self._insert_split_events()
        assert self._get("limited_user", group_by_model="true").json() == {
            "delivery_service": ["DHL"]
        }

    def test_restricted_role_with_no_recorded_values(self):
        self._insert_event("back", "back_door", "Amazon")
        assert self._get("limited_user").json() == []
        assert self._get("limited_user", group_by_model="true").json() == {}

    def test_restricted_role_ignores_events_without_the_attribute(self):
        self._insert_event("front", "front_door", None)
        assert self._get("limited_user").json() == []

    def test_restricted_role_with_a_dotted_model_name(self):
        # model names are unrestricted config keys, and an unquoted "." in the
        # json path would be read as a nested lookup and match nothing
        self.app.frigate_config.classification.custom["delivery.service"] = (
            self.app.frigate_config.classification.custom.pop("delivery_service")
        )
        self.app.frigate_config.classification.custom[
            "delivery.service"
        ].name = "delivery.service"
        os.rename(self.model_dir, os.path.join(CLIPS_DIR, "delivery.service"))
        self.model_dir = os.path.join(CLIPS_DIR, "delivery.service")

        data = {"type": "object", "score": 0.9, "delivery.service": "DHL"}
        Event.insert(
            id="front",
            label="car",
            camera="front_door",
            start_time=100,
            end_time=200,
            top_score=0.9,
            score=0.9,
            false_positive=False,
            zones=[],
            thumbnail="",
            has_clip=True,
            has_snapshot=True,
            region=[],
            box=[],
            area=0,
            retain_indefinitely=False,
            ratio=1.0,
            plus_id=None,
            model_hash="",
            detector_type="cpu",
            model_type="ssd",
            data=data,
        ).execute()

        assert self._get("limited_user").json() == ["DHL"]

    def test_object_type_filters_out_unrelated_models(self):
        self._insert_split_events()
        assert self._get("limited_user", object_type="person").json() == []
        assert self._get("limited_user", object_type="car").json() == ["DHL"]


if __name__ == "__main__":
    unittest.main()
