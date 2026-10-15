"""Unit tests for the PTZ preset and home position management endpoints."""

import asyncio
import threading
from types import SimpleNamespace
from unittest.mock import AsyncMock

from frigate.models import Event, Recordings
from frigate.ptz.onvif import (
    DuplicatePresetError,
    OnvifRequestError,
    OnvifUnavailableError,
    PresetNotFoundError,
)
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp

CAMERA = "front_door"
VIEWER = {"remote-user": "viewer", "remote-role": "viewer"}


class CameraFault(Exception):
    """Mimics zeep.exceptions.Fault, which carries the camera's text in .message."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class TestHttpPtz(BaseTestHttp):
    def setUp(self):
        super().setUp([Event, Recordings])
        self.app = super().create_app()

        # the endpoints hand their work to the OnvifController loop thread
        loop = asyncio.new_event_loop()
        thread = threading.Thread(target=loop.run_forever, daemon=True)
        thread.start()

        def stop_loop() -> None:
            loop.call_soon_threadsafe(loop.stop)
            thread.join()
            loop.close()

        self.addCleanup(stop_loop)

        self.onvif = SimpleNamespace(
            loop=loop,
            set_preset=AsyncMock(return_value="token_1"),
            remove_preset=AsyncMock(),
            set_home=AsyncMock(),
        )
        self.app.onvif = self.onvif

    def test_viewer_cannot_manage_presets(self):
        with AuthTestClient(self.app) as client:
            for response in (
                client.post(
                    f"/{CAMERA}/ptz/presets", json={"name": "Porch"}, headers=VIEWER
                ),
                client.put(f"/{CAMERA}/ptz/presets/1", json={}, headers=VIEWER),
                client.delete(f"/{CAMERA}/ptz/presets/1", headers=VIEWER),
                client.post(f"/{CAMERA}/ptz/home", headers=VIEWER),
            ):
                assert response.status_code == 403

        self.onvif.set_preset.assert_not_awaited()
        self.onvif.remove_preset.assert_not_awaited()
        self.onvif.set_home.assert_not_awaited()

    def test_create_preset(self):
        with AuthTestClient(self.app) as client:
            response = client.post(f"/{CAMERA}/ptz/presets", json={"name": "Porch"})

        assert response.status_code == 200
        assert response.json()["token"] == "token_1"
        self.onvif.set_preset.assert_awaited_once_with(CAMERA, "Porch")

    def test_overwrite_preset_keeps_name_when_omitted(self):
        with AuthTestClient(self.app) as client:
            response = client.put(f"/{CAMERA}/ptz/presets/tok%201", json={})

        assert response.status_code == 200
        self.onvif.set_preset.assert_awaited_once_with(CAMERA, None, "tok 1")

    def test_delete_preset_and_set_home(self):
        with AuthTestClient(self.app) as client:
            assert client.delete(f"/{CAMERA}/ptz/presets/1").status_code == 200
            assert client.post(f"/{CAMERA}/ptz/home").status_code == 200

        self.onvif.remove_preset.assert_awaited_once_with(CAMERA, "1")
        self.onvif.set_home.assert_awaited_once_with(CAMERA)

    def test_errors_mapped_to_status_codes(self):
        for error, status, reason in (
            (
                DuplicatePresetError("A preset named Porch already exists"),
                409,
                "duplicate_name",
            ),
            (PresetNotFoundError("Preset 7 not found"), 404, "preset_not_found"),
            (
                OnvifRequestError("Preset name must not be empty"),
                400,
                "invalid_request",
            ),
            (
                OnvifUnavailableError("ONVIF is not configured"),
                404,
                "onvif_unavailable",
            ),
            (CameraFault("Preset table full"), 502, "camera_rejected"),
        ):
            with self.subTest(error=error):
                self.onvif.set_preset.side_effect = error

                with AuthTestClient(self.app) as client:
                    response = client.post(
                        f"/{CAMERA}/ptz/presets", json={"name": "Porch"}
                    )

                assert response.status_code == status
                body = response.json()
                assert body["reason"] == reason
                # exception text stays in the server log
                assert str(error) not in body["message"]

    def test_unknown_camera(self):
        with AuthTestClient(self.app) as client:
            response = client.post("/missing/ptz/presets", json={"name": "Porch"})

        assert response.status_code in (403, 404)
        self.onvif.set_preset.assert_not_awaited()

    def test_empty_name_rejected(self):
        with AuthTestClient(self.app) as client:
            response = client.post(f"/{CAMERA}/ptz/presets", json={"name": ""})

        assert response.status_code == 422
        self.onvif.set_preset.assert_not_awaited()
