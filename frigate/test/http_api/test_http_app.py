from unittest.mock import Mock

from frigate.models import Event, Recordings, ReviewSegment
from frigate.stats.emitter import StatsEmitter
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


class TestHttpApp(BaseTestHttp):
    def setUp(self):
        super().setUp([Event, Recordings, ReviewSegment])
        self.app = super().create_app()

    ####################################################################################################################
    ###################################  GET /stats Endpoint   #########################################################
    ####################################################################################################################
    def test_stats_endpoint(self):
        stats = Mock(spec=StatsEmitter)
        stats.get_latest_stats.return_value = self.test_stats
        app = super().create_app(stats)

        with AuthTestClient(app) as client:
            response = client.get("/stats")
            response_json = response.json()
            assert response_json == self.test_stats

    def test_recordings_storage_requires_admin(self):
        stats = Mock(spec=StatsEmitter)
        stats.get_latest_stats.return_value = self.test_stats
        app = super().create_app(stats)
        app.storage_maintainer = Mock()
        app.storage_maintainer.calculate_camera_usages.return_value = {
            "front_door": {"usage": 2.0},
        }

        with AuthTestClient(app) as client:
            response = client.get(
                "/recordings/storage",
                headers={"remote-user": "viewer", "remote-role": "viewer"},
            )
            assert response.status_code == 403

            response = client.get("/recordings/storage")
            assert response.status_code == 200
            assert response.json()["front_door"]["usage_percent"] == 25.0

    def test_config_set_in_memory_replaces_objects_track_list(self):
        self.minimal_config["cameras"]["front_door"]["objects"] = {
            "track": ["person", "car"],
        }
        app = super().create_app()
        app.config_publisher = Mock()

        with AuthTestClient(app) as client:
            response = client.put(
                "/config/set",
                json={
                    "requires_restart": 0,
                    "skip_save": True,
                    "update_topic": "config/cameras/front_door/objects",
                    "config_data": {
                        "cameras": {
                            "front_door": {
                                "objects": {
                                    "track": ["person"],
                                }
                            }
                        }
                    },
                },
            )

            assert response.status_code == 200
            assert app.frigate_config.cameras["front_door"].objects.track == ["person"]
