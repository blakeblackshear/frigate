"""Tests for ONVIF init state that must not depend on the autotracking config.

Regression coverage for a camera that is initialized while autotracking is off and
has it enabled later, which is the normal wizard flow: set the camera up first,
configure autotracking afterwards. The autotracking-only request objects used to
be created only when autotracking was enabled at init time, so the camera was left
with init=True but no status_request. get_camera_status skips its re-init branch
when init is True, so it went straight to the missing key and raised KeyError on
the tracking thread.

The request objects are built from the locally parsed WSDL and cost no network, so
they are always created and init=True now implies they exist.
"""

import unittest
from unittest.mock import AsyncMock, MagicMock

from frigate.config import FrigateConfig
from frigate.ptz.onvif import OnvifController

CAMERA = "ptz_cam"


def _config(autotracking_enabled: bool) -> FrigateConfig:
    return FrigateConfig(
        **{
            "mqtt": {"enabled": False},
            "cameras": {
                CAMERA: {
                    "ffmpeg": {
                        "inputs": [
                            {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                        ]
                    },
                    "detect": {"width": 1920, "height": 1080},
                    "zones": {"zone": {"coordinates": "0,0,1,0,1,1,0,1"}},
                    "onvif": {
                        "host": "10.0.0.1",
                        "autotracking": {
                            "enabled": autotracking_enabled,
                            "required_zones": ["zone"],
                        },
                    },
                }
            },
        }
    )


def _make_profile() -> MagicMock:
    profile = MagicMock()
    profile.token = "profile_1"
    profile.Name = "MainStream"
    profile.VideoEncoderConfiguration = MagicMock()
    ptz_config = MagicMock()
    ptz_config.token = "ptz_config_1"
    ptz_config.DefaultContinuousPanTiltVelocitySpace = "space"
    ptz_config.DefaultContinuousZoomVelocitySpace = "space"
    profile.PTZConfiguration = ptz_config
    return profile


def _make_onvif_camera() -> MagicMock:
    """A camera that supports PTZ but nothing optional, so init takes the simplest
    path through the feature detection below."""
    onvif = MagicMock()
    onvif.update_xaddrs = AsyncMock()

    video_source = MagicMock()
    video_source.token = "video_source_1"

    media = MagicMock()
    media.GetProfiles = AsyncMock(return_value=[_make_profile()])
    media.GetVideoSources = AsyncMock(return_value=[video_source])
    onvif.create_media_service = AsyncMock(return_value=media)
    onvif.get_definition = MagicMock(return_value={"ptz": "definition"})

    ptz = MagicMock()
    # create_type is a local WSDL lookup, so tag the result to assert on it later
    ptz.create_type = MagicMock(side_effect=lambda name: MagicMock(request_type=name))
    ptz.GetConfigurationOptions = AsyncMock(side_effect=Exception("not supported"))
    onvif.create_ptz_service = AsyncMock(return_value=ptz)
    onvif.create_imaging_service = AsyncMock(side_effect=Exception("not supported"))
    return onvif


def _make_controller(autotracking_enabled: bool) -> OnvifController:
    """Build a controller without invoking __init__, which would start an event loop
    thread and reach out to the camera."""
    config = _config(autotracking_enabled)
    controller = OnvifController.__new__(OnvifController)
    controller.config = config
    controller.cams = {CAMERA: {"onvif": _make_onvif_camera(), "init": False}}
    controller.failed_cams = {}
    controller.camera_configs = {CAMERA: config.cameras[CAMERA]}
    controller.ptz_metrics = {CAMERA: MagicMock()}
    return controller


class TestOnvifInitRequests(unittest.IsolatedAsyncioTestCase):
    async def test_status_request_created_when_autotracking_disabled(self) -> None:
        # the wizard flow: onvif configured first, autotracking enabled later
        controller = _make_controller(autotracking_enabled=False)

        self.assertTrue(await controller._init_onvif(CAMERA))

        cam = controller.cams[CAMERA]
        self.assertTrue(cam["init"])
        self.assertIn("status_request", cam)
        self.assertIn("service_capabilities_request", cam)

    async def test_status_request_created_when_autotracking_enabled(self) -> None:
        controller = _make_controller(autotracking_enabled=True)

        self.assertTrue(await controller._init_onvif(CAMERA))

        cam = controller.cams[CAMERA]
        self.assertIn("status_request", cam)
        self.assertIn("service_capabilities_request", cam)

    async def test_init_implies_status_request_exists(self) -> None:
        # the invariant get_camera_status relies on: it skips re-init when init is
        # True and then reads status_request without guarding
        for autotracking_enabled in (True, False):
            with self.subTest(autotracking_enabled=autotracking_enabled):
                controller = _make_controller(autotracking_enabled)

                await controller._init_onvif(CAMERA)

                cam = controller.cams[CAMERA]
                if cam["init"]:
                    self.assertEqual(cam["status_request"].request_type, "GetStatus")

    async def test_requests_built_without_contacting_camera(self) -> None:
        # create_type is a local WSDL lookup; cameras that do not implement
        # GetServiceCapabilities must not be asked about it during init
        controller = _make_controller(autotracking_enabled=False)

        await controller._init_onvif(CAMERA)

        ptz = controller.cams[CAMERA]["ptz"]
        ptz.GetServiceCapabilities.assert_not_called()
        ptz.GetStatus.assert_not_called()


if __name__ == "__main__":
    unittest.main()
