"""Tests for renaming and deleting a zone through config_set's JSON body."""

import os
import tempfile
from unittest.mock import MagicMock, Mock, patch

import ruamel.yaml
from fastapi import Request

from frigate.api.auth import get_allowed_cameras_for_filter, get_current_user
from frigate.api.fastapi_app import create_fastapi_app
from frigate.config import FrigateConfig
from frigate.config.camera.updater import CameraConfigUpdatePublisher
from frigate.models import Event, Recordings, ReviewSegment
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


class TestConfigSetZones(BaseTestHttp):
    def setUp(self):
        super().setUp(models=[Event, Recordings, ReviewSegment])
        self.minimal_config = {
            "mqtt": {"host": "mqtt"},
            "profiles": {"armed": {"friendly_name": "Armed"}},
            "snapshots": {"required_zones": ["driveway"]},
            "cameras": {
                "front": {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                    "zones": {
                        "driveway": {
                            "coordinates": "0,0,1,0,1,1",
                            "inertia": 5,
                            "filters": {"person": {"min_area": 5000}},
                        },
                        "porch": {"coordinates": "0,0,0.5,0,0.5,0.5"},
                    },
                    "review": {
                        "alerts": {
                            "labels": ["person"],
                            "required_zones": ["driveway"],
                        },
                    },
                    "mqtt": {"required_zones": ["driveway", "porch"]},
                    "profiles": {
                        "armed": {
                            "zones": {
                                "driveway": {
                                    "coordinates": "0,0,1,0,1,1",
                                    "objects": ["car"],
                                },
                            },
                        },
                    },
                },
            },
        }

        yaml = ruamel.yaml.YAML()
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".yml", delete=False
        ) as config_file:
            yaml.dump(self.minimal_config, config_file)
        self.config_path = config_file.name
        self.addCleanup(os.unlink, self.config_path)

    def _create_app(self):
        publisher = Mock(spec=CameraConfigUpdatePublisher)
        publisher.publisher = MagicMock()
        app = create_fastapi_app(
            FrigateConfig(**self.minimal_config),
            self.db,
            None,
            None,
            None,
            None,
            None,
            None,
            publisher,
            None,
            enforce_default_admin=False,
        )

        async def mock_get_current_user(request: Request):
            return {
                "username": request.headers.get("remote-user"),
                "role": request.headers.get("remote-role"),
            }

        async def mock_get_allowed_cameras_for_filter(request: Request):
            return ["front"]

        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_allowed_cameras_for_filter] = (
            mock_get_allowed_cameras_for_filter
        )
        return app

    def _put(self, camera_data: dict):
        with patch("frigate.api.app.find_config_file", return_value=self.config_path):
            with AuthTestClient(self._create_app()) as client:
                return client.put(
                    "/config/set",
                    json={
                        "config_data": {"cameras": {"front": camera_data}},
                        "requires_restart": 0,
                        "update_topic": "config/cameras/front/zones",
                    },
                )

    def _front(self) -> dict:
        with open(self.config_path) as f:
            return ruamel.yaml.YAML().load(f)["cameras"]["front"]

    def test_rename_moves_zone_references_in_one_request(self):
        """The new base zone exists when validation checks the moved override."""
        resp = self._put(
            {
                "zones": {
                    "driveway": None,
                    "front_drive": {
                        "coordinates": "0,0,1,0,1,1",
                        "enabled": True,
                        # as /api/config returns them, with defaults filled in
                        "filters": {
                            "person": {
                                "min_area": 5000,
                                "max_area": 24000000,
                                "min_ratio": 0.0,
                                "max_ratio": 24000000.0,
                                "threshold": 0.7,
                                "min_score": 0.5,
                                "mask": {},
                            }
                        },
                        "inertia": 5,
                    },
                },
                "review": {"alerts": {"required_zones": ["front_drive"]}},
                # inherited from the global snapshots config, so no camera key
                "snapshots": {"required_zones": ["front_drive"]},
                "mqtt": {"required_zones": ["front_drive", "porch"]},
                "profiles": {
                    "armed": {
                        "zones": {
                            "driveway": None,
                            "front_drive": {
                                "coordinates": "0,0,1,0,1,1",
                                "objects": ["car"],
                            },
                        },
                    },
                },
            }
        )

        self.assertEqual(resp.status_code, 200, resp.json())
        front = self._front()
        self.assertEqual(list(front["zones"]), ["porch", "front_drive"])
        self.assertEqual(front["zones"]["front_drive"]["inertia"], 5)
        self.assertEqual(
            front["zones"]["front_drive"]["filters"]["person"]["min_area"], 5000
        )
        self.assertEqual(front["review"]["alerts"]["labels"], ["person"])
        self.assertEqual(front["review"]["alerts"]["required_zones"], ["front_drive"])
        self.assertEqual(front["snapshots"]["required_zones"], ["front_drive"])
        self.assertEqual(front["mqtt"]["required_zones"], ["front_drive", "porch"])
        self.assertEqual(
            dict(front["profiles"]["armed"]["zones"]),
            {"front_drive": {"coordinates": "0,0,1,0,1,1", "objects": ["car"]}},
        )

    def test_delete_empties_lists_without_dropping_their_section(self):
        resp = self._put(
            {
                "zones": {"driveway": None},
                "review": {"alerts": {"required_zones": []}},
                "snapshots": {"required_zones": []},
                "mqtt": {"required_zones": ["porch"]},
                "profiles": {"armed": {"zones": {"driveway": None}}},
            }
        )

        self.assertEqual(resp.status_code, 200, resp.json())
        front = self._front()
        self.assertEqual(list(front["zones"]), ["porch"])
        self.assertEqual(front["review"]["alerts"]["labels"], ["person"])
        self.assertEqual(front["review"]["alerts"]["required_zones"], [])
        self.assertEqual(front["mqtt"]["required_zones"], ["porch"])
        self.assertNotIn("driveway", front["profiles"]["armed"]["zones"] or {})
