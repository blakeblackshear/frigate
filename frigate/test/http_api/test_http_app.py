import copy
import json
import os
from unittest.mock import Mock, patch

import frigate.genai
from frigate.config import GenAIProviderEnum
from frigate.config.config import RuntimeFilterConfig
from frigate.const import MODEL_CACHE_DIR, REDACTED_CREDENTIAL_SENTINEL
from frigate.genai import GenAIClient
from frigate.models import Event, Recordings, ReviewSegment
from frigate.stats.emitter import StatsEmitter
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp
from frigate.util.env import FRIGATE_ENV_VARS


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

    def test_stats_endpoint_strips_cmdline_for_viewers(self):
        stats = Mock(spec=StatsEmitter)
        stats.get_latest_stats.return_value = {
            **self.test_stats,
            "cpu_usages": {"52": {"cpu": "1.0", "cmdline": "ffmpeg -i rtsp://"}},
            "bandwidth_usages": {"52": {"bandwidth": 1.0}},
        }
        app = super().create_app(stats)

        with AuthTestClient(app) as client:
            response = client.get(
                "/stats",
                headers={"remote-user": "viewer", "remote-role": "viewer"},
            )
            assert response.json()["cpu_usages"] == {"52": {"cpu": "1.0"}}
            assert "bandwidth_usages" not in response.json()

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

    def test_camera_name_collision_keeps_admin_default(self):
        self.minimal_config["cameras"]["faces"] = self.minimal_config["cameras"].pop(
            "front_door"
        )
        app = super().create_app(enforce_default_admin=True)
        viewer = {"remote-user": "viewer", "remote-role": "viewer"}

        with AuthTestClient(app) as client:
            assert client.get("/faces", headers=viewer).status_code == 403
            assert client.get("/faces").status_code == 200
            assert (
                client.post("/faces/train/person/classify", headers=viewer).status_code
                == 403
            )

            # Camera routes for the same name stay reachable by viewers
            response = client.get("/faces/recordings/summary", headers=viewer)
            assert response.status_code == 200

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

    def test_config_set_in_memory_adds_filters_for_new_tracked_labels(self):
        self.minimal_config["cameras"]["front_door"]["objects"] = {
            "track": ["person"],
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
                            "front_door": {"objects": {"track": ["person", "cat"]}}
                        }
                    },
                },
            )

        assert response.status_code == 200
        filters = app.frigate_config.cameras["front_door"].objects.filters
        assert isinstance(filters["cat"], RuntimeFilterConfig)

    @patch("frigate.detectors.detector_config.load_labels")
    def test_config_set_in_memory_rebinds_replay_model_on_scene_change(
        self, mock_labels
    ):
        mock_labels.return_value = {}
        replay = "_replay_front_door"
        self.minimal_config["models"] = [
            {"devices": ["cpu"]},
            {"scene": "thermal", "devices": ["openvino:CPU"], "width": 300},
        ]
        self.minimal_config["cameras"][replay] = self.minimal_config["cameras"].pop(
            "front_door"
        )
        app = super().create_app()
        app.config_publisher = Mock()
        assert app.frigate_config.model_for_camera(replay).scene == "default"

        with AuthTestClient(app) as client:
            response = client.put(
                "/config/set",
                json={
                    "requires_restart": 0,
                    "skip_save": True,
                    "update_topic": f"config/cameras/{replay}/detect",
                    "config_data": {
                        "cameras": {replay: {"detect": {"scene": "thermal"}}}
                    },
                },
            )

        assert response.status_code == 200
        assert app.frigate_config.cameras[replay].detect.scene == "thermal"
        assert app.frigate_config.model_for_camera(replay).scene == "thermal"
        topics = [
            call.args[0].update_type.name
            for call in app.config_publisher.publish_update.call_args_list
        ]
        assert topics[0] == "detect"
        assert topics[-1] == "refresh"

    ####################################################################################################################
    ###################################  Credential redaction sentinel  ################################################
    ####################################################################################################################
    def test_config_response_redacts_mqtt_password_with_sentinel(self):
        self.minimal_config["mqtt"]["user"] = "mqttuser"
        self.minimal_config["mqtt"]["password"] = "supersecret"
        app = super().create_app()

        with AuthTestClient(app) as client:
            response = client.get("/config")
            assert response.status_code == 200
            mqtt = response.json()["mqtt"]
            assert mqtt["password"] == REDACTED_CREDENTIAL_SENTINEL

    def test_config_response_hides_notification_email_from_viewers(self):
        self.minimal_config["notifications"] = {"email": "{FRIGATE_TEST_EMAIL}"}
        self.minimal_config["profiles"] = {"away": {"friendly_name": "Away"}}
        self.minimal_config["cameras"]["front_door"]["profiles"] = {
            "away": {"notifications": {"email": "{FRIGATE_TEST_EMAIL}"}}
        }

        with patch.dict(FRIGATE_ENV_VARS, {"FRIGATE_TEST_EMAIL": "me@example.com"}):
            app = super().create_app()

        assert app.frigate_config.notifications.email == "me@example.com"

        with AuthTestClient(app) as client:
            response = client.get(
                "/config",
                headers={"remote-user": "viewer", "remote-role": "viewer"},
            )
            assert response.status_code == 200
            config = response.json()
            assert config["notifications"]["email"] == REDACTED_CREDENTIAL_SENTINEL
            assert (
                config["cameras"]["front_door"]["notifications"]["email"]
                == REDACTED_CREDENTIAL_SENTINEL
            )
            assert (
                config["cameras"]["front_door"]["profiles"]["away"]["notifications"][
                    "email"
                ]
                == REDACTED_CREDENTIAL_SENTINEL
            )

            response = client.get("/config")
            assert response.json()["notifications"]["email"] == "me@example.com"

    def test_config_response_limits_urls_and_go2rtc_for_viewers(self):
        secret_path = "rtsp://10.0.0.1:554/user=admin_password=hunter2_channel=1"
        self.minimal_config["cameras"]["front_door"]["ffmpeg"]["inputs"][0]["path"] = (
            secret_path
        )
        auth_header = "-headers 'Authorization: Basic c2VjcmV0'"
        args = {
            "global_args": auth_header,
            "input_args": auth_header,
            "output_args": {"detect": auth_header},
        }
        self.minimal_config["ffmpeg"] = dict(args)
        front_door = self.minimal_config["cameras"]["front_door"]
        front_door["ffmpeg"].update(args)
        front_door["ffmpeg"]["inputs"][0].update(
            global_args=auth_header, input_args=auth_header
        )
        front_door["webui_url"] = "http://admin:hunter2@10.0.0.1/"
        self.minimal_config["go2rtc"] = {
            "streams": {"front_door": [secret_path, "ffmpeg:front_door#audio=opus"]},
            "webrtc": {"candidates": ["10.0.0.2:8555"]},
            "webtorrent": {"shares": {"share": {"src": "front_door", "pwd": "x"}}},
        }
        app = super().create_app()

        with AuthTestClient(app) as client:
            response = client.get(
                "/config",
                headers={"remote-user": "viewer", "remote-role": "viewer"},
            )
            assert response.status_code == 200
            config = response.json()
            camera = config["cameras"]["front_door"]
            assert camera["ffmpeg"]["inputs"][0]["path"] == ""
            assert camera["ffmpeg_cmds"] == []
            assert "webui_url" not in camera
            assert "hunter2" not in response.text
            assert "c2VjcmV0" not in response.text
            assert config["go2rtc"] == {
                "streams": {"front_door": []},
                "webrtc": {"candidates": ["10.0.0.2:8555"]},
            }

            config = client.get("/config").json()
            camera = config["cameras"]["front_door"]
            assert camera["ffmpeg"]["inputs"][0]["path"] == secret_path
            assert camera["ffmpeg"]["inputs"][0]["input_args"] == auth_header
            assert camera["ffmpeg"]["input_args"] == auth_header
            assert camera["ffmpeg_cmds"]
            assert config["go2rtc"]["streams"]["front_door"][0] == secret_path
            assert "webtorrent" in config["go2rtc"]

    def test_config_response_hides_genai_endpoint_from_viewers(self):
        self.minimal_config["genai"] = {
            "local": {
                "provider": "ollama",
                "model": "llava",
                "base_url": "http://user:pass@ollama:11434",
                "provider_options": {"keep_alive": -1},
            }
        }
        app = super().create_app()

        with AuthTestClient(app) as client:
            genai = client.get(
                "/config",
                headers={"remote-user": "viewer", "remote-role": "viewer"},
            ).json()["genai"]["local"]
            assert "base_url" not in genai
            assert "provider_options" not in genai
            assert genai["provider"] == "ollama"

            genai = client.get("/config").json()["genai"]["local"]
            assert genai["base_url"] == "http://user:pass@ollama:11434"

    def test_metrics_requires_admin(self):
        stats = Mock(spec=StatsEmitter)
        stats.get_latest_stats.return_value = self.test_stats
        app = super().create_app(stats)

        with AuthTestClient(app) as client:
            response = client.get(
                "/metrics",
                headers={"remote-user": "viewer", "remote-role": "viewer"},
            )
            assert response.status_code == 403

            assert client.get("/metrics").status_code == 200

    def test_config_response_allows_null_profile_notifications(self):
        self.minimal_config["profiles"] = {"away": {"friendly_name": "Away"}}
        self.minimal_config["cameras"]["front_door"]["profiles"] = {
            "away": {"notifications": None}
        }
        app = super().create_app()

        with AuthTestClient(app) as client:
            response = client.get(
                "/config",
                headers={"remote-user": "viewer", "remote-role": "viewer"},
            )
            assert response.status_code == 200

    def test_go2rtc_stream_producer_sources_hidden_from_viewers(self):
        secret_url = "ffmpeg:rtsp://admin:hunter2@10.0.0.1:554/live"
        stream = {
            "producers": [
                {
                    "url": secret_url,
                    "source": "ffmpeg -i rtsp://admin:hunter2@10.0.0.1:554/live",
                    "medias": ["video, recvonly, H264"],
                }
            ],
            "consumers": [{"url": "rtmp://a.rtmp.youtube.com/live2/hunter2"}],
        }
        app = super().create_app()
        viewer = {"remote-user": "viewer", "remote-role": "viewer"}

        with (
            patch("frigate.api.camera.requests.get") as get,
            AuthTestClient(app) as client,
        ):
            get.return_value.json.side_effect = lambda: copy.deepcopy(stream)

            viewer_stream = {"producers": [{"medias": ["video, recvonly, H264"]}]}

            response = client.get("/go2rtc/streams/front_door", headers=viewer)
            assert response.json() == viewer_stream

            producer = client.get("/go2rtc/streams/front_door").json()["producers"][0]
            assert producer["medias"] == ["video, recvonly, H264"]
            assert "hunter2" not in producer["url"]

            get.return_value.json.side_effect = lambda: {
                "front_door": copy.deepcopy(stream)
            }
            response = client.get("/go2rtc/streams", headers=viewer)
            assert response.json() == {"front_door": viewer_stream}

            # unconnected streams have url-only producers and null consumers
            get.return_value.json.side_effect = lambda: {
                "front_door": {"producers": [{"url": secret_url}], "consumers": None}
            }
            response = client.get("/go2rtc/streams")
            assert response.status_code == 200
            assert "hunter2" not in response.text
            response = client.get("/go2rtc/streams", headers=viewer)
            assert response.json() == {"front_door": {"producers": [{"medias": None}]}}

    def test_config_response_keeps_plus_model_reference(self):
        model_id = "test_plus_reference"
        model_path = os.path.join(MODEL_CACHE_DIR, model_id)
        os.makedirs(MODEL_CACHE_DIR, exist_ok=True)

        with open(model_path, "w") as f:
            f.write("model")

        with open(f"{model_path}.json", "w") as f:
            json.dump(
                {
                    "id": model_id,
                    "type": "ssd",
                    "supportedDetectors": ["cpu"],
                    "width": 320,
                    "height": 320,
                    "inputShape": "nhwc",
                    "pixelFormat": "rgb",
                    "labelMap": {"0": "person"},
                },
                f,
            )

        self.addCleanup(os.remove, model_path)
        self.addCleanup(os.remove, f"{model_path}.json")
        self.minimal_config["models"] = [
            {"path": f"plus://{model_id}", "devices": ["cpu"]}
        ]
        app = super().create_app()

        with AuthTestClient(app) as client:
            response = client.get("/config")
            assert response.status_code == 200
            assert response.json()["models"][0]["path"] == f"plus://{model_id}"

        # detection still loads the resolved cache file
        assert app.frigate_config.models[0].path == model_path

    ####################################################################################################################
    ###################################  POST /genai/probe Endpoint   ##################################################
    ####################################################################################################################
    def test_genai_probe_requires_admin(self):
        app = super().create_app()

        with AuthTestClient(app) as client:
            response = client.post(
                "/genai/probe",
                json={"provider": "openai"},
                headers={"remote-user": "viewer", "remote-role": "viewer"},
            )
            assert response.status_code == 403

    def test_genai_probe_returns_models_from_transient_client(self):
        class FakeClient(GenAIClient):
            def list_models(self):
                return ["fake-model-a", "fake-model-b"]

        app = super().create_app()

        with (
            AuthTestClient(app) as client,
            patch.dict(
                frigate.genai.PROVIDERS,
                {GenAIProviderEnum.openai: FakeClient},
            ),
        ):
            response = client.post(
                "/genai/probe",
                json={
                    "provider": "openai",
                    "api_key": "sk-test",
                    "base_url": "https://example.invalid",
                },
            )
            assert response.status_code == 200
            assert response.json() == {
                "success": True,
                "models": ["fake-model-a", "fake-model-b"],
            }

    def test_genai_probe_resolves_sentinel_to_saved_api_key(self):
        # After a save the UI's api_key field holds the redaction sentinel;
        # the probe must substitute the saved key for the named entry instead
        # of sending the literal sentinel to the provider (GH discussion 23754).
        probed_keys: list[str | None] = []

        class CapturingClient(GenAIClient):
            def list_models(self):
                probed_keys.append(self.genai_config.api_key)
                return ["fake-model"]

        self.minimal_config["genai"] = {
            "llm": {
                "provider": "openai",
                "api_key": "sk-saved",
                "base_url": "https://example.invalid",
                "model": "fake-model",
            }
        }
        app = super().create_app()

        with (
            AuthTestClient(app) as client,
            patch.dict(
                frigate.genai.PROVIDERS,
                {GenAIProviderEnum.openai: CapturingClient},
            ),
        ):
            response = client.post(
                "/genai/probe",
                json={
                    "provider": "openai",
                    "name": "llm",
                    "api_key": REDACTED_CREDENTIAL_SENTINEL,
                    "base_url": "https://example.invalid",
                },
            )
            assert response.status_code == 200
            assert response.json()["success"] is True
            assert probed_keys == ["sk-saved"]

    def test_genai_probe_sentinel_without_saved_entry_sends_no_key(self):
        # If the sentinel arrives for an entry that has no saved config, the
        # probe must drop the key entirely rather than leak the sentinel.
        probed_keys: list[str | None] = []

        class CapturingClient(GenAIClient):
            def list_models(self):
                probed_keys.append(self.genai_config.api_key)
                return ["fake-model"]

        app = super().create_app()

        with (
            AuthTestClient(app) as client,
            patch.dict(
                frigate.genai.PROVIDERS,
                {GenAIProviderEnum.openai: CapturingClient},
            ),
        ):
            response = client.post(
                "/genai/probe",
                json={
                    "provider": "openai",
                    "name": "llm",
                    "api_key": REDACTED_CREDENTIAL_SENTINEL,
                },
            )
            assert response.status_code == 200
            assert probed_keys == [None]

    def test_genai_probe_empty_list_is_treated_as_failure(self):
        # The plugin's list_models() returns [] on connection failure rather
        # than raising. The endpoint should surface that as success=false so
        # the UI can show a meaningful error.
        class EmptyClient(GenAIClient):
            def list_models(self):
                return []

        app = super().create_app()

        with (
            AuthTestClient(app) as client,
            patch.dict(
                frigate.genai.PROVIDERS,
                {GenAIProviderEnum.openai: EmptyClient},
            ),
        ):
            response = client.post(
                "/genai/probe",
                json={"provider": "openai"},
            )
            assert response.status_code == 200
            payload = response.json()
            assert payload["success"] is False
            assert "message" in payload

    def test_genai_probe_handles_provider_failure(self):
        class FailingClient(GenAIClient):
            def list_models(self):
                raise RuntimeError("provider unreachable")

        app = super().create_app()

        with (
            AuthTestClient(app) as client,
            patch.dict(
                frigate.genai.PROVIDERS,
                {GenAIProviderEnum.openai: FailingClient},
            ),
        ):
            response = client.post(
                "/genai/probe",
                json={"provider": "openai"},
            )
            assert response.status_code == 200
            payload = response.json()
            assert payload["success"] is False
            assert "message" in payload
