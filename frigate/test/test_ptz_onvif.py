"""Tests for ONVIF state that must not depend on the autotracking config.

Regression coverage for a camera that is initialized while autotracking is off and
has it enabled later, which is the normal wizard flow: set the camera up first,
configure autotracking afterwards. The autotracking-only request objects used to
be created only when autotracking was enabled at init time, so the camera was left
with init=True but no status_request. get_camera_status skips its re-init branch
when init is True, so it went straight to the missing key and raised KeyError on
the tracking thread.

The request objects are built from the locally parsed WSDL and cost no network, so
they are always created and init=True now implies they exist.

Also covers the inverse direction: the ptz movement timestamps must not be written
for a camera that has autotracking off, because nothing clears them back out.
"""

import unittest
from unittest.mock import AsyncMock, MagicMock

from frigate.camera import PTZMetrics
from frigate.config import FrigateConfig
from frigate.ptz.autotrack import ptz_moving_at_frame_time
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


def _make_move_controller(autotracking_enabled: bool) -> OnvifController:
    """Build an already initialized controller for a camera that supports relative
    FOV movement, with real metrics so the timestamp writes can be asserted on."""
    config = _config(autotracking_enabled)
    controller = OnvifController.__new__(OnvifController)
    controller.config = config
    controller.camera_configs = {CAMERA: config.cameras[CAMERA]}
    controller.failed_cams = {}

    ptz = MagicMock()
    ptz.RelativeMove = AsyncMock()
    controller.cams = {
        CAMERA: {
            "init": True,
            "active": False,
            "ptz": ptz,
            "features": ["pt", "pt-r-fov"],
            "relative_move_request": MagicMock(),
            "relative_fov_range": {
                "XRange": {"Min": -1.0, "Max": 1.0},
                "YRange": {"Min": -1.0, "Max": 1.0},
            },
        }
    }
    controller.ptz_metrics = {
        CAMERA: PTZMetrics(autotracker_enabled=autotracking_enabled)
    }
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


class TestManualRelativeMoveMetrics(unittest.IsolatedAsyncioTestCase):
    """A manual move from the UI (click to move, drag to zoom) sends move_relative
    for any camera that advertises pt-r-fov, autotracking or not."""

    async def test_metrics_untouched_when_autotracking_disabled(self) -> None:
        # only camera_maintenance polls get_camera_status, and only for autotracking
        # cameras, so a manual move that starts the clock here is never stopped
        controller = _make_move_controller(autotracking_enabled=False)
        metrics = controller.ptz_metrics[CAMERA]
        metrics.frame_time.value = 1000.0

        await controller._move_relative(CAMERA, 0.25, -0.25, 0, 1)

        controller.cams[CAMERA]["ptz"].RelativeMove.assert_awaited_once()
        self.assertEqual(metrics.start_time.value, 0)
        self.assertEqual(metrics.stop_time.value, 0)
        self.assertTrue(metrics.motor_stopped.is_set())

    async def test_detection_regions_not_suppressed_after_manual_move(self) -> None:
        # the symptom of the bug: object detection stops entirely because motion
        # boxes are never promoted to detection regions again
        controller = _make_move_controller(autotracking_enabled=False)
        metrics = controller.ptz_metrics[CAMERA]
        metrics.frame_time.value = 1000.0

        await controller._move_relative(CAMERA, 0.25, -0.25, 0, 1)

        for later_frame_time in (1001.0, 1060.0, 4600.0):
            with self.subTest(frame_time=later_frame_time):
                self.assertFalse(
                    ptz_moving_at_frame_time(
                        later_frame_time,
                        metrics.start_time.value,
                        metrics.stop_time.value,
                    )
                )

    async def test_metrics_written_when_autotracking_enabled(self) -> None:
        # get_camera_status resets stop_time once the camera reports IDLE, so the
        # autotracking path keeps its motion estimation timestamps
        controller = _make_move_controller(autotracking_enabled=True)
        metrics = controller.ptz_metrics[CAMERA]
        metrics.frame_time.value = 1000.0

        await controller._move_relative(CAMERA, 0.25, -0.25, 0, 1)

        self.assertEqual(metrics.start_time.value, 1000.0)
        self.assertEqual(metrics.stop_time.value, 0)
        self.assertFalse(metrics.motor_stopped.is_set())
        self.assertTrue(
            ptz_moving_at_frame_time(
                1001.0, metrics.start_time.value, metrics.stop_time.value
            )
        )


if __name__ == "__main__":
    unittest.main()
