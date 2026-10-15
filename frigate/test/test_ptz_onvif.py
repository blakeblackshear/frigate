"""Tests for ONVIF state that must not depend on the autotracking config.

Regression coverage for a camera that is initialized while autotracking is off and
has it enabled later, which is the normal wizard flow: set the camera up first,
configure autotracking afterwards. get_camera_status skips its re-init branch when
init is True, so everything it reads must exist whether or not autotracking was
enabled at init time.

Also covers the inverse direction: the ptz movement timestamps must not be written
for a camera that has autotracking off, because nothing clears them back out.
"""

import asyncio
import threading
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from frigate.camera import PTZMetrics
from frigate.config import FrigateConfig
from frigate.ptz.autotrack import ptz_moving_at_frame_time
from frigate.ptz.onvif import (
    DuplicatePresetError,
    OnvifCommandEnum,
    OnvifController,
    OnvifRequestError,
    OnvifUnavailableError,
    PresetNotFoundError,
)

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
    controller.ptz_metrics = {CAMERA: MagicMock()}
    return controller


def _make_move_controller(autotracking_enabled: bool) -> OnvifController:
    """Build an already initialized controller for a camera that supports relative
    FOV movement, with real metrics so the timestamp writes can be asserted on."""
    config = _config(autotracking_enabled)
    controller = OnvifController.__new__(OnvifController)
    controller.config = config
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
    controller.ptz_metrics = {CAMERA: PTZMetrics()}
    return controller


class TestOnvifInitRequests(unittest.IsolatedAsyncioTestCase):
    async def test_camera_status_independent_of_autotracking_at_init(self) -> None:
        # the wizard flow: onvif configured first, autotracking enabled later
        for autotracking_enabled in (True, False):
            with self.subTest(autotracking_enabled=autotracking_enabled):
                controller = _make_controller(autotracking_enabled)
                controller.status_locks = {CAMERA: asyncio.Lock()}

                self.assertTrue(await controller._init_onvif(CAMERA))

                status = MagicMock()
                status.MoveStatus.PanTilt = "IDLE"
                status.MoveStatus.Zoom = "IDLE"
                ptz = controller.cams[CAMERA]["ptz"]
                ptz.GetStatus = AsyncMock(return_value=status)

                await controller.get_camera_status(CAMERA)

                ptz.GetStatus.assert_awaited_once_with({"ProfileToken": "profile_1"})
                self.assertFalse(controller.cams[CAMERA]["active"])

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


class _Preset(dict):
    """zeep preset objects support both item and attribute access."""

    def __init__(self, token: str, name: str) -> None:
        super().__init__(token=token)
        self.Name = name


def _make_node(
    home_supported: bool = True, fixed_home: bool | None = None
) -> SimpleNamespace:
    # SimpleNamespace rather than MagicMock, whose missing attributes are truthy
    node = SimpleNamespace(
        token="node_1", HomeSupported=home_supported, MaximumNumberOfPresets=8
    )
    if fixed_home is not None:
        node.FixedHomePosition = fixed_home
    return node


async def _make_preset_controller(
    presets: list[_Preset], node: SimpleNamespace | None = None
) -> OnvifController:
    """An initialized controller whose camera serves presets like a real one:
    SetPreset and RemovePreset change what GetPresets returns next."""
    controller = _make_controller(autotracking_enabled=False)
    controller.cams[CAMERA].update(
        {"presets": {}, "preset_details": [], "max_presets": None}
    )
    controller.preset_locks = {CAMERA: asyncio.Lock()}
    ptz = controller.cams[CAMERA]["onvif"].create_ptz_service.return_value
    stored = list(presets)

    async def set_preset(request: dict) -> str:
        # yield like a network call so overlapping requests can interleave
        await asyncio.sleep(0)
        token = request.get("PresetToken")
        if token is None:
            token = f"new_{len(stored)}"
            stored.append(_Preset(token, request["PresetName"]))
        else:
            index = next(i for i, p in enumerate(stored) if p["token"] == token)
            stored[index] = _Preset(token, request["PresetName"])
        return token

    async def remove_preset(request: dict) -> None:
        stored[:] = [p for p in stored if p["token"] != request["PresetToken"]]

    ptz.GetPresets = AsyncMock(side_effect=lambda _: list(stored))
    ptz.SetPreset = AsyncMock(side_effect=set_preset)
    ptz.RemovePreset = AsyncMock(side_effect=remove_preset)
    ptz.SetHomePosition = AsyncMock()
    ptz.GotoHomePosition = AsyncMock()
    ptz.GetNodes = AsyncMock(return_value=[node or _make_node()])

    assert await controller._init_onvif(CAMERA)
    return controller


class TestPresetManagement(unittest.IsolatedAsyncioTestCase):
    async def test_presets_loaded_with_original_names(self) -> None:
        controller = await _make_preset_controller(
            [_Preset("1", "Driveway"), _Preset("2", "Gate")]
        )
        cam = controller.cams[CAMERA]

        self.assertEqual(cam["presets"], {"driveway": "1", "gate": "2"})
        self.assertEqual(
            cam["preset_details"],
            [{"token": "1", "name": "Driveway"}, {"token": "2", "name": "Gate"}],
        )
        self.assertEqual(cam["max_presets"], 8)

    async def test_create_preset_refreshes_cache(self) -> None:
        controller = await _make_preset_controller([_Preset("1", "Driveway")])
        ptz = controller.cams[CAMERA]["ptz"]

        token = await controller.set_preset(CAMERA, "  Porch ")

        ptz.SetPreset.assert_awaited_once_with(
            {"ProfileToken": "profile_1", "PresetName": "Porch"}
        )
        self.assertEqual(token, "new_1")
        self.assertEqual(controller.cams[CAMERA]["presets"]["porch"], "new_1")

    async def test_overwrite_keeps_name_and_sends_token(self) -> None:
        controller = await _make_preset_controller([_Preset("1", "Driveway")])
        ptz = controller.cams[CAMERA]["ptz"]

        token = await controller.set_preset(CAMERA, None, "1")

        ptz.SetPreset.assert_awaited_once_with(
            {"ProfileToken": "profile_1", "PresetName": "Driveway", "PresetToken": "1"}
        )
        self.assertEqual(token, "1")

    async def test_overwrite_with_new_name(self) -> None:
        controller = await _make_preset_controller([_Preset("1", "Driveway")])

        await controller.set_preset(CAMERA, "Garage", "1")

        self.assertEqual(controller.cams[CAMERA]["presets"], {"garage": "1"})

    async def test_rejected_without_contacting_camera(self) -> None:
        controller = await _make_preset_controller(
            [_Preset("1", "Driveway"), _Preset("2", "Gate")]
        )
        ptz = controller.cams[CAMERA]["ptz"]

        for name, token, error in (
            # duplicate, recalled by lowercase name
            ("driveway", None, DuplicatePresetError),
            ("Gate", "1", DuplicatePresetError),  # renaming onto another preset
            ("   ", None, OnvifRequestError),
            ("Porch", "missing", PresetNotFoundError),
        ):
            with self.subTest(name=name, token=token):
                with self.assertRaises(error):
                    await controller.set_preset(CAMERA, name, token)

        with self.assertRaises(PresetNotFoundError):
            await controller.remove_preset(CAMERA, "missing")

        ptz.SetPreset.assert_not_awaited()
        ptz.RemovePreset.assert_not_awaited()

    async def test_camera_fault_propagates(self) -> None:
        controller = await _make_preset_controller([])
        controller.cams[CAMERA]["ptz"].SetPreset.side_effect = Exception("full")

        with self.assertRaisesRegex(Exception, "full"):
            await controller.set_preset(CAMERA, "Porch")

    async def test_remove_preset_refreshes_cache(self) -> None:
        controller = await _make_preset_controller(
            [_Preset("1", "Driveway"), _Preset("2", "Gate")]
        )

        await controller.remove_preset(CAMERA, "1")

        controller.cams[CAMERA]["ptz"].RemovePreset.assert_awaited_once_with(
            {"ProfileToken": "profile_1", "PresetToken": "1"}
        )
        self.assertEqual(controller.cams[CAMERA]["presets"], {"gate": "2"})

    async def test_unconfigured_camera(self) -> None:
        controller = await _make_preset_controller([])

        with self.assertRaises(OnvifUnavailableError):
            await controller.set_preset("other_cam", "Porch")

    async def test_home_features(self) -> None:
        for node, expected in (
            (_make_node(home_supported=True), ["home", "home-set"]),
            (_make_node(home_supported=True, fixed_home=True), ["home"]),
            (_make_node(home_supported=False), []),
        ):
            with self.subTest(node=node):
                controller = await _make_preset_controller([], node)
                features = controller.cams[CAMERA]["features"]
                self.assertEqual(
                    [f for f in features if f.startswith("home")], expected
                )

    async def test_home_commands(self) -> None:
        controller = await _make_preset_controller([])
        controller.ptz_metrics = {CAMERA: PTZMetrics()}
        ptz = controller.cams[CAMERA]["ptz"]

        await controller.set_home(CAMERA)
        await controller.handle_command_async(CAMERA, OnvifCommandEnum.home)

        ptz.SetHomePosition.assert_awaited_once_with({"ProfileToken": "profile_1"})
        ptz.GotoHomePosition.assert_awaited_once_with({"ProfileToken": "profile_1"})
        self.assertFalse(controller.cams[CAMERA]["active"])

    async def test_failed_home_command_clears_active(self) -> None:
        controller = await _make_preset_controller([])
        controller.ptz_metrics = {CAMERA: PTZMetrics()}
        controller.cams[CAMERA]["ptz"].GotoHomePosition.side_effect = Exception(
            "home not supported"
        )

        await controller.handle_command_async(CAMERA, OnvifCommandEnum.home)

        self.assertFalse(controller.cams[CAMERA]["active"])

    async def test_write_succeeds_when_refresh_fails(self) -> None:
        controller = await _make_preset_controller(
            [_Preset("1", "Driveway"), _Preset("2", "Gate")]
        )
        ptz = controller.cams[CAMERA]["ptz"]
        ptz.GetPresets.side_effect = Exception("timeout")

        token = await controller.set_preset(CAMERA, "Porch")
        await controller.set_preset(CAMERA, "Garage", "1")
        await controller.remove_preset(CAMERA, "2")

        self.assertEqual(token, "new_2")
        self.assertEqual(
            controller.cams[CAMERA]["presets"], {"porch": "new_2", "garage": "1"}
        )

    async def test_overlapping_creates_reject_duplicate(self) -> None:
        controller = await _make_preset_controller([])

        results = await asyncio.gather(
            controller.set_preset(CAMERA, "Porch"),
            controller.set_preset(CAMERA, "porch"),
            return_exceptions=True,
        )

        self.assertEqual(sum(isinstance(r, DuplicatePresetError) for r in results), 1)
        self.assertEqual(controller.cams[CAMERA]["presets"], {"porch": "new_0"})


class TestOnvifClose(unittest.TestCase):
    """close() must release everything on the loop, since whatever it leaves is
    garbage collected during interpreter shutdown, where the resulting warnings
    fail to log and fill the shutdown output with logging errors."""

    def setUp(self) -> None:
        self.controller = _make_controller(autotracking_enabled=False)
        self.onvif = self.controller.cams[CAMERA]["onvif"]
        self.onvif.close = AsyncMock()
        self.controller.config_subscriber = MagicMock()
        self.controller.loop = asyncio.new_event_loop()
        self.controller.loop_thread = threading.Thread(
            target=self.controller._run_event_loop, daemon=True
        )
        self.controller.loop_thread.start()
        self.addCleanup(self.controller.loop.close)

    def test_close_closes_camera_sessions(self) -> None:
        self.controller.close()

        self.onvif.close.assert_awaited_once()

    def test_close_cancels_tasks_left_on_the_loop(self) -> None:
        async def forever() -> None:
            while True:
                await asyncio.sleep(1)

        poll = asyncio.run_coroutine_threadsafe(forever(), self.controller.loop)

        self.controller.close()

        self.assertTrue(poll.cancelled())
        self.assertFalse(self.controller.loop_thread.is_alive())


if __name__ == "__main__":
    unittest.main()
