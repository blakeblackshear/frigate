"""Configure and control camera via onvif."""

import asyncio
import logging
import threading
import time
from enum import Enum
from importlib.util import find_spec
from pathlib import Path
from typing import Any

import numpy
from onvif import ONVIFCamera, ONVIFService

from frigate.camera import PTZMetrics
from frigate.config import FrigateConfig, ZoomingModeEnum
from frigate.config.camera.updater import (
    CameraConfigUpdateEnum,
    CameraConfigUpdateSubscriber,
)
from frigate.util.builtin import find_by_key

logger = logging.getLogger(__name__)


class OnvifCommandEnum(str, Enum):
    """Holds all possible move commands"""

    init = "init"
    move_down = "move_down"
    move_left = "move_left"
    move_relative = "move_relative"
    move_right = "move_right"
    move_up = "move_up"
    preset = "preset"
    stop = "stop"
    zoom_in = "zoom_in"
    zoom_out = "zoom_out"
    focus_in = "focus_in"
    focus_out = "focus_out"


PAN_TILT_VELOCITY = {
    OnvifCommandEnum.move_left: (-0.5, 0),
    OnvifCommandEnum.move_right: (0.5, 0),
    OnvifCommandEnum.move_up: (0, 0.5),
    OnvifCommandEnum.move_down: (0, -0.5),
}


class OnvifController:
    ptz_metrics: dict[str, PTZMetrics]

    def __init__(
        self, config: FrigateConfig, ptz_metrics: dict[str, PTZMetrics]
    ) -> None:
        self.cams: dict[str, dict] = {}
        self.failed_cams: dict[str, dict] = {}
        self.max_retries = 5
        self.reset_timeout = 900  # 15 minutes
        self.config = config
        self.ptz_metrics = ptz_metrics

        self.status_locks: dict[str, asyncio.Lock] = {}

        # Create a dedicated event loop and run it in a separate thread
        self.loop = asyncio.new_event_loop()
        self.loop_thread = threading.Thread(target=self._run_event_loop, daemon=True)
        self.loop_thread.start()

        self.config_subscriber = CameraConfigUpdateSubscriber(
            self.config,
            self.config.cameras,
            [
                CameraConfigUpdateEnum.onvif,
                CameraConfigUpdateEnum.add,
                CameraConfigUpdateEnum.remove,
            ],
        )

        asyncio.run_coroutine_threadsafe(self._init_cameras(), self.loop)
        asyncio.run_coroutine_threadsafe(self._poll_config_updates(), self.loop)

    def _run_event_loop(self) -> None:
        """Run the event loop in a separate thread."""
        asyncio.set_event_loop(self.loop)
        try:
            self.loop.run_forever()
        except Exception as e:
            logger.error(f"Onvif event loop terminated unexpectedly: {e}")

    async def _init_cameras(self) -> None:
        """Initialize all configured cameras."""
        for cam_name, cam in list(self.config.cameras.items()):
            if cam.enabled and cam.onvif.host:
                await self._init_single_camera(cam_name)

    async def _poll_config_updates(self) -> None:
        """Poll for ONVIF config updates and re-initialize cameras as needed."""
        while True:
            await asyncio.sleep(1)
            try:
                updates = self.config_subscriber.check_for_updates()
                for update_type, cameras in updates.items():
                    if update_type == CameraConfigUpdateEnum.onvif.name:
                        for cam_name in cameras:
                            await self._reinit_camera(cam_name)
                    elif update_type == CameraConfigUpdateEnum.add.name:
                        # a camera added at runtime only needs ONVIF set up if
                        # it actually has an onvif host configured
                        for cam_name in cameras:
                            cam = self.config.cameras.get(cam_name)
                            if cam and cam.onvif.host:
                                await self._reinit_camera(cam_name)
                    elif update_type == CameraConfigUpdateEnum.remove.name:
                        for cam_name in cameras:
                            await self._remove_camera(cam_name)
            except Exception:
                logger.error("Error checking for ONVIF config updates")

    async def _close_camera(self, cam_name: str) -> None:
        """Close the ONVIF client session for a camera."""
        cam_state = self.cams.get(cam_name)
        if cam_state and "onvif" in cam_state:
            try:
                await cam_state["onvif"].close()
            except Exception:
                logger.debug(f"Error closing ONVIF session for {cam_name}")

    async def _remove_camera(self, cam_name: str) -> None:
        """Tear down the ONVIF session for a camera removed at runtime."""
        logger.debug(f"Tearing down ONVIF for {cam_name} after camera removal")
        await self._close_camera(cam_name)
        self.cams.pop(cam_name, None)
        self.failed_cams.pop(cam_name, None)
        self.status_locks.pop(cam_name, None)

    async def _reinit_camera(self, cam_name: str) -> None:
        """Re-initialize a camera after config change."""
        logger.info(f"Re-initializing ONVIF for {cam_name} due to config change")

        # close existing session and reset state before re-init
        await self._close_camera(cam_name)
        self.cams.pop(cam_name, None)
        self.failed_cams.pop(cam_name, None)

        cam = self.config.cameras.get(cam_name)
        if cam and cam.onvif.host:
            await self._init_single_camera(cam_name)

    async def _init_single_camera(self, cam_name: str) -> bool:
        """Initialize a single camera by name.

        Args:
            cam_name: The name of the camera to initialize

        Returns:
            bool: True if initialization succeeded, False otherwise
        """
        cam = self.config.cameras.get(cam_name)
        if cam is None:
            logger.error(f"No configuration found for camera {cam_name}")
            return False

        self.status_locks.setdefault(cam_name, asyncio.Lock())
        try:
            self.cams[cam_name] = {
                "onvif": ONVIFCamera(
                    cam.onvif.host,
                    cam.onvif.port,
                    cam.onvif.user,
                    cam.onvif.password,
                    wsdl_dir=str(Path(find_spec("onvif").origin).parent / "wsdl"),
                    adjust_time=cam.onvif.ignore_time_mismatch,
                    encrypt=not cam.onvif.tls_insecure,
                ),
                "init": False,
                "active": False,
                "features": [],
                "presets": {},
                "profiles": [],
            }
            return True
        except Exception as e:
            logger.error(f"Failed to create ONVIF camera instance for {cam_name}: {e}")
            # track initial failures
            self.failed_cams[cam_name] = {
                "retry_attempts": 0,
                "last_attempt": time.time(),
            }
            return False

    async def _init_onvif(self, camera_name: str) -> bool:
        camera_config = self.config.cameras.get(camera_name)

        if camera_config is None:
            return False

        cam = self.cams[camera_name]
        onvif: ONVIFCamera = cam["onvif"]
        try:
            await onvif.update_xaddrs()
        except Exception as e:
            logger.error(f"Onvif connection failed for {camera_name}: {e}")
            return False

        # create init services
        media: ONVIFService = await onvif.create_media_service()
        logger.debug(f"Onvif media xaddr for {camera_name}: {media.xaddr}")

        try:
            # this will fire an exception if camera is not a ptz
            capabilities = onvif.get_definition("ptz")
            logger.debug(f"Onvif capabilities for {camera_name}: {capabilities}")
        except Exception as e:
            logger.error(
                f"Unable to get Onvif capabilities for camera: {camera_name}: {e}"
            )
            return False

        try:
            profiles = await media.GetProfiles()
            logger.debug(f"Onvif profiles for {camera_name}: {profiles}")
        except Exception as e:
            logger.error(
                f"Unable to get Onvif media profiles for camera: {camera_name}: {e}"
            )
            return False

        # build list of valid PTZ profiles
        valid_profiles = [
            p
            for p in profiles
            if p.VideoEncoderConfiguration
            and p.PTZConfiguration
            and (
                p.PTZConfiguration.DefaultContinuousPanTiltVelocitySpace is not None
                or p.PTZConfiguration.DefaultContinuousZoomVelocitySpace is not None
            )
        ]

        # store available profiles for API response and log for debugging
        cam["profiles"] = [
            {"name": getattr(p, "Name", None) or p.token, "token": p.token}
            for p in valid_profiles
        ]
        for p in valid_profiles:
            logger.debug(
                "Onvif profile for %s: name='%s', token='%s'",
                camera_name,
                getattr(p, "Name", None),
                p.token,
            )

        configured_profile = camera_config.onvif.profile

        if configured_profile is not None:
            # match by exact token first, then by name
            profile = next(
                (
                    p
                    for key in ("token", "Name")
                    for p in valid_profiles
                    if getattr(p, key, None) == configured_profile
                ),
                None,
            )
            if profile is None:
                available = [
                    f"name='{getattr(p, 'Name', None)}', token='{p.token}'"
                    for p in valid_profiles
                ]
                logger.error(
                    "Onvif profile '%s' not found for camera %s. Available profiles: %s",
                    configured_profile,
                    camera_name,
                    available,
                )
                return False
        else:
            # use the first profile that has a valid ptz configuration
            profile = valid_profiles[0] if valid_profiles else None

        if profile is None:
            logger.error(
                f"No appropriate Onvif profiles found for camera: {camera_name}."
            )
            return False

        logger.debug(f"Selected Onvif profile for {camera_name}: {profile}")

        configs = profile.PTZConfiguration
        logger.debug(f"Onvif ptz config for media profile in {camera_name}: {configs}")

        ptz: ONVIFService = await onvif.create_ptz_service()
        cam["ptz"] = ptz

        try:
            imaging: ONVIFService = await onvif.create_imaging_service()
        except Exception as e:
            logger.debug(f"Imaging service not supported for {camera_name}: {e}")
            imaging = None
        cam["imaging"] = imaging
        try:
            video_sources = await media.GetVideoSources()
            if video_sources and len(video_sources) > 0:
                cam["video_source_token"] = video_sources[0].token
        except Exception as e:
            logger.debug(f"Unable to get video sources for {camera_name}: {e}")
            cam["video_source_token"] = None

        # setup continuous moving request
        move_request = ptz.create_type("ContinuousMove")
        move_request.ProfileToken = profile.token
        cam["move_request"] = move_request

        # get PTZ configuration options for feature detection and relative movement
        ptz_config = None
        fov_space_id = None

        try:
            request = ptz.create_type("GetConfigurationOptions")
            request.ConfigurationToken = profile.PTZConfiguration.token
            ptz_config = await ptz.GetConfigurationOptions(request)
            logger.debug(
                f"Onvif PTZ configuration options for {camera_name}: {ptz_config}"
            )
        except Exception as e:
            logger.debug(
                f"Unable to get PTZ configuration options for {camera_name}: {e}"
            )

        # detect FOV translation space for relative movement
        if ptz_config is not None:
            try:
                fov_space_id = next(
                    (
                        i
                        for i, space in enumerate(
                            ptz_config.Spaces.RelativePanTiltTranslationSpace
                        )
                        if "TranslationSpaceFov" in space["URI"]
                    ),
                    None,
                )
            except (AttributeError, TypeError):
                fov_space_id = None

        autotracking_config = camera_config.onvif.autotracking
        autotracking_enabled = (
            autotracking_config.enabled_in_config and autotracking_config.enabled
        )

        # setup relative move request when FOV relative movement is supported
        if (
            fov_space_id is not None
            and configs.DefaultRelativePanTiltTranslationSpace is not None
        ):
            # one-off GetStatus to seed Translation field
            status = None
            try:
                status = await ptz.GetStatus({"ProfileToken": profile.token})
                logger.debug(f"Onvif status for {camera_name}: {status}")
            except Exception as e:
                logger.warning(f"Unable to get status from camera {camera_name}: {e}")

            rel_move_request = ptz.create_type("RelativeMove")
            rel_move_request.ProfileToken = profile.token
            logger.debug(f"{camera_name}: Relative move request: {rel_move_request}")

            fov_uri = ptz_config["Spaces"]["RelativePanTiltTranslationSpace"][
                fov_space_id
            ]["URI"]

            if rel_move_request.Translation is None:
                if status is not None:
                    # seed from current position
                    rel_move_request.Translation = status.Position
                    rel_move_request.Translation.PanTilt.space = fov_uri
                else:
                    # fallback: construct Translation explicitly
                    rel_move_request.Translation = {
                        "PanTilt": {"x": 0, "y": 0, "space": fov_uri}
                    }

            # configure zoom on relative move request
            if (
                autotracking_enabled
                and autotracking_config.zooming == ZoomingModeEnum.relative
            ):
                zoom_space_id = next(
                    (
                        i
                        for i, space in enumerate(
                            ptz_config.Spaces.RelativeZoomTranslationSpace
                        )
                        if "TranslationGenericSpace" in space["URI"]
                    ),
                    None,
                )
                try:
                    if zoom_space_id is not None:
                        rel_move_request.Translation.Zoom.space = ptz_config["Spaces"][
                            "RelativeZoomTranslationSpace"
                        ][zoom_space_id]["URI"]
                except Exception as e:
                    autotracking_config.zooming = ZoomingModeEnum.disabled
                    logger.warning(
                        f"Disabling autotracking zooming for {camera_name}: Relative zoom not supported. Exception: {e}"
                    )
            else:
                # remove zoom fields from relative move request
                if (
                    rel_move_request["Translation"] is not None
                    and "Zoom" in rel_move_request["Translation"]
                ):
                    del rel_move_request["Translation"]["Zoom"]
                if (
                    rel_move_request["Speed"] is not None
                    and "Zoom" in rel_move_request["Speed"]
                ):
                    del rel_move_request["Speed"]["Zoom"]
                logger.debug(
                    f"{camera_name}: Relative move request after deleting zoom: {rel_move_request}"
                )

            if rel_move_request.Speed is None:
                rel_move_request.Speed = configs.DefaultPTZSpeed
            logger.debug(
                f"{camera_name}: Relative move request after setup: {rel_move_request}"
            )
            cam["relative_move_request"] = rel_move_request

        # setup existing presets
        try:
            presets: list[dict] = await ptz.GetPresets({"ProfileToken": profile.token})
        except Exception as e:
            logger.warning(f"Unable to get presets from camera: {camera_name}: {e}")
            presets = []

        for preset in presets:
            preset_name = getattr(preset, "Name") or f"preset {preset['token']}"
            # Some cameras (e.g. Reolink) return UTF-8 bytes that zeep decodes
            # as latin-1, producing mojibake. Detect that and repair it by
            # round-tripping through latin-1 -> utf-8.
            try:
                preset_name = preset_name.encode("latin-1").decode("utf-8")
            except (UnicodeEncodeError, UnicodeDecodeError):
                pass
            cam["presets"][preset_name.lower()] = preset["token"]

        # get list of supported features
        supported_features = []

        if configs.DefaultContinuousPanTiltVelocitySpace:
            supported_features.append("pt")

        if configs.DefaultContinuousZoomVelocitySpace:
            supported_features.append("zoom")

        if configs.DefaultRelativePanTiltTranslationSpace:
            supported_features.append("pt-r")

        spaces = getattr(ptz_config, "Spaces", None)

        if configs.DefaultRelativeZoomTranslationSpace:
            supported_features.append("zoom-r")
            if getattr(spaces, "RelativeZoomTranslationSpace", None):
                cam["relative_zoom_range"] = spaces.RelativeZoomTranslationSpace[0]

        if configs.DefaultAbsoluteZoomPositionSpace:
            supported_features.append("zoom-a")
            if getattr(spaces, "AbsoluteZoomPositionSpace", None):
                cam["absolute_zoom_range"] = spaces.AbsoluteZoomPositionSpace[0]

        # autotracking zoom needs the range for its mode, and get_camera_status
        # reads the absolute range in both modes
        zooming = autotracking_config.zooming
        if zooming != ZoomingModeEnum.disabled and (
            "absolute_zoom_range" not in cam or f"{zooming.value}_zoom_range" not in cam
        ):
            autotracking_config.zooming = ZoomingModeEnum.disabled
            logger.warning(
                f"Disabling autotracking zooming for {camera_name}: {zooming.value} zoom range unavailable"
            )

        if cam["video_source_token"] is not None and imaging is not None:
            try:
                imaging_capabilities = await imaging.GetImagingSettings(
                    {"VideoSourceToken": cam["video_source_token"]}
                )
                if (
                    hasattr(imaging_capabilities, "Focus")
                    and imaging_capabilities.Focus
                ):
                    supported_features.append("focus")
            except Exception as e:
                logger.debug(f"Focus not supported for {camera_name}: {e}")

        # detect FOV relative movement support
        if (
            fov_space_id is not None
            and configs.DefaultRelativePanTiltTranslationSpace is not None
        ):
            supported_features.append("pt-r-fov")
            cam["relative_fov_range"] = (
                ptz_config.Spaces.RelativePanTiltTranslationSpace[fov_space_id]
            )

        cam["features"] = supported_features
        cam["init"] = True
        return True

    async def _stop(self, camera_name: str) -> None:
        cam = self.cams[camera_name]
        move_request = cam["move_request"]
        await cam["ptz"].Stop(
            {
                "ProfileToken": move_request.ProfileToken,
                "PanTilt": True,
                "Zoom": True,
            }
        )
        if (
            "focus" in cam["features"]
            and cam["video_source_token"]
            and cam["imaging"] is not None
        ):
            try:
                stop_request = cam["imaging"].create_type("Stop")
                stop_request.VideoSourceToken = cam["video_source_token"]
                await cam["imaging"].Stop(stop_request)
            except Exception as e:
                logger.warning(f"Failed to stop focus for {camera_name}: {e}")
        cam["active"] = False

    async def _move(self, camera_name: str, command: OnvifCommandEnum) -> None:
        cam = self.cams[camera_name]

        if cam["active"]:
            logger.warning(
                f"{camera_name} is already performing an action, stopping..."
            )
            await self._stop(camera_name)

        if "pt" not in cam["features"]:
            logger.error(f"{camera_name} does not support ONVIF pan/tilt movement.")
            return

        cam["active"] = True
        move_request = cam["move_request"]

        x, y = PAN_TILT_VELOCITY[command]
        move_request.Velocity = {"PanTilt": {"x": x, "y": y}}

        try:
            await cam["ptz"].ContinuousMove(move_request)
        except Exception as e:
            logger.warning(f"Onvif sending move request to {camera_name} failed: {e}")

    async def _move_relative(self, camera_name: str, pan, tilt, zoom, speed) -> None:
        cam = self.cams[camera_name]

        if "pt-r-fov" not in cam["features"]:
            logger.error(f"{camera_name} does not support ONVIF RelativeMove (FOV).")
            return

        metrics = self.ptz_metrics.get(camera_name)

        if metrics is None:
            return

        logger.debug(
            f"{camera_name} called RelativeMove: pan: {pan} tilt: {tilt} zoom: {zoom}"
        )

        if cam["active"]:
            logger.warning(
                f"{camera_name} is already performing an action, not moving..."
            )
            return

        cam["active"] = True

        # only track start_time for autotracking
        if metrics.autotracker_enabled.value:
            metrics.motor_stopped.clear()
            logger.debug(f"{camera_name}: PTZ start time: {metrics.frame_time.value}")
            metrics.start_time.value = metrics.frame_time.value
            metrics.stop_time.value = 0

        move_request = cam["relative_move_request"]

        # function takes in -1 to 1 for pan and tilt, interpolate to the values of the camera.
        # The onvif spec says this can report as +INF and -INF, so this may need to be modified
        pan = numpy.interp(
            pan,
            [-1, 1],
            [
                cam["relative_fov_range"]["XRange"]["Min"],
                cam["relative_fov_range"]["XRange"]["Max"],
            ],
        )
        tilt = numpy.interp(
            tilt,
            [-1, 1],
            [
                cam["relative_fov_range"]["YRange"]["Min"],
                cam["relative_fov_range"]["YRange"]["Max"],
            ],
        )

        move_speed = {"PanTilt": {"x": speed, "y": speed}}

        move_request.Translation.PanTilt.x = pan
        move_request.Translation.PanTilt.y = tilt

        # include zoom if requested and camera supports relative zoom
        include_zoom = zoom != 0 and "zoom-r" in cam["features"]

        if include_zoom:
            move_speed["Zoom"] = {"x": speed}
            move_request["Translation"]["Zoom"] = {"x": zoom}

        move_request.Speed = move_speed

        await cam["ptz"].RelativeMove(move_request)

        # reset after the move request
        move_request.Translation.PanTilt.x = 0
        move_request.Translation.PanTilt.y = 0

        if include_zoom:
            del move_request["Translation"]["Zoom"]

        cam["active"] = False

    async def _move_to_preset(self, camera_name: str, preset: str) -> None:
        cam = self.cams[camera_name]
        preset = preset.lower()

        if preset not in cam["presets"]:
            logger.error(f"{preset} is not a valid preset for {camera_name}")
            return

        metrics = self.ptz_metrics.get(camera_name)

        if metrics is None:
            return

        cam["active"] = True
        metrics.start_time.value = 0
        metrics.stop_time.value = 0
        move_request = cam["move_request"]
        preset_token = cam["presets"][preset]

        await cam["ptz"].GotoPreset(
            {
                "ProfileToken": move_request.ProfileToken,
                "PresetToken": preset_token,
            }
        )

        cam["active"] = False

    async def _zoom(self, camera_name: str, command: OnvifCommandEnum) -> None:
        cam = self.cams[camera_name]

        if cam["active"]:
            logger.warning(
                f"{camera_name} is already performing an action, stopping..."
            )
            await self._stop(camera_name)

        if "zoom" not in cam["features"]:
            logger.error(f"{camera_name} does not support ONVIF zooming.")
            return

        cam["active"] = True
        move_request = cam["move_request"]

        if command == OnvifCommandEnum.zoom_in:
            move_request.Velocity = {"Zoom": {"x": 0.5}}
        elif command == OnvifCommandEnum.zoom_out:
            move_request.Velocity = {"Zoom": {"x": -0.5}}

        await cam["ptz"].ContinuousMove(move_request)

    async def _zoom_absolute(self, camera_name: str, zoom, speed) -> None:
        cam = self.cams[camera_name]

        if "zoom-a" not in cam["features"]:
            logger.error(f"{camera_name} does not support ONVIF AbsoluteMove zooming.")
            return

        metrics = self.ptz_metrics.get(camera_name)

        if metrics is None:
            return

        logger.debug(f"{camera_name} called AbsoluteMove: zoom: {zoom}")

        if cam["active"]:
            logger.warning(
                f"{camera_name} is already performing an action, not moving..."
            )
            return

        cam["active"] = True
        metrics.motor_stopped.clear()
        logger.debug(f"{camera_name}: PTZ start time: {metrics.frame_time.value}")
        metrics.start_time.value = metrics.frame_time.value
        metrics.stop_time.value = 0
        # function takes in 0 to 1 for zoom, interpolate to the values of the camera.
        zoom = numpy.interp(
            zoom,
            [0, 1],
            [
                cam["absolute_zoom_range"]["XRange"]["Min"],
                cam["absolute_zoom_range"]["XRange"]["Max"],
            ],
        )

        logger.debug(f"{camera_name}: Absolute zoom: {zoom}")

        await cam["ptz"].AbsoluteMove(
            {
                "ProfileToken": cam["move_request"].ProfileToken,
                "Position": {"Zoom": zoom},
                "Speed": {"Zoom": speed},
            }
        )

        cam["active"] = False

    async def _focus(self, camera_name: str, command: OnvifCommandEnum) -> None:
        cam = self.cams[camera_name]

        if cam["active"]:
            logger.warning(
                f"{camera_name} is already performing an action, not moving..."
            )
            await self._stop(camera_name)

        if (
            "focus" not in cam["features"]
            or not cam["video_source_token"]
            or cam["imaging"] is None
        ):
            logger.error(f"{camera_name} does not support ONVIF continuous focus.")
            return

        cam["active"] = True
        move_request = cam["imaging"].create_type("Move")
        move_request.VideoSourceToken = cam["video_source_token"]
        move_request.Focus = {
            "Continuous": {
                "Speed": 0.5 if command == OnvifCommandEnum.focus_in else -0.5
            }
        }

        try:
            await cam["imaging"].Move(move_request)
        except Exception as e:
            logger.warning(f"Onvif sending focus request to {camera_name} failed: {e}")
            cam["active"] = False

    async def handle_command_async(
        self, camera_name: str, command: OnvifCommandEnum, param: str = ""
    ) -> None:
        """Handle ONVIF commands asynchronously"""
        if camera_name not in self.cams.keys():
            logger.error(f"ONVIF is not configured for {camera_name}")
            return

        if not self.cams[camera_name]["init"]:
            if not await self._init_onvif(camera_name):
                return

        try:
            if command == OnvifCommandEnum.init:
                # already init
                return
            elif command == OnvifCommandEnum.stop:
                await self._stop(camera_name)
            elif command == OnvifCommandEnum.preset:
                await self._move_to_preset(camera_name, param)
            elif command == OnvifCommandEnum.move_relative:
                parts = param.split("_")
                if len(parts) == 3:
                    _, pan, tilt = parts
                    zoom = 0.0
                elif len(parts) == 4:
                    _, pan, tilt, zoom = parts
                else:
                    logger.error(f"Invalid move_relative params: {param}")
                    return
                await self._move_relative(
                    camera_name, float(pan), float(tilt), float(zoom), 1
                )
            elif command in (OnvifCommandEnum.zoom_in, OnvifCommandEnum.zoom_out):
                await self._zoom(camera_name, command)
            elif command in (OnvifCommandEnum.focus_in, OnvifCommandEnum.focus_out):
                await self._focus(camera_name, command)
            else:
                await self._move(camera_name, command)
        except Exception as e:
            logger.error(f"Unable to handle onvif command: {e}")

    def handle_command(
        self, camera_name: str, command: OnvifCommandEnum, param: str = ""
    ) -> None:
        """
        Handle ONVIF commands by scheduling them in the event loop.
        """
        future = asyncio.run_coroutine_threadsafe(
            self.handle_command_async(camera_name, command, param), self.loop
        )

        try:
            # Wait with a timeout to prevent blocking indefinitely
            future.result(timeout=10)
        except TimeoutError:
            logger.error(f"Command {command} timed out for camera {camera_name}")
        except Exception as e:
            logger.error(
                f"Error executing command {command} for camera {camera_name}: {e}"
            )

    def _camera_info(self, camera_name: str) -> dict[str, Any]:
        cam = self.cams[camera_name]
        return {
            "name": camera_name,
            "features": cam["features"],
            "presets": list(cam["presets"]),
            "profiles": cam["profiles"],
        }

    async def get_camera_info(self, camera_name: str) -> dict[str, Any]:
        """
        Get ptz capabilities and presets, attempting to reconnect if ONVIF is configured
        but not initialized.

        Returns camera details including features and presets if available.
        """
        camera_config = self.config.cameras.get(camera_name)

        if camera_config is None:
            return {}

        if not camera_config.enabled:
            logger.debug(
                f"Camera {camera_name} disabled, won't try to initialize ONVIF"
            )
            return {}

        if camera_name not in self.cams.keys() and (not camera_config.onvif.host):
            logger.debug(f"ONVIF is not configured for {camera_name}")
            return {}

        if camera_name in self.cams.keys() and self.cams[camera_name]["init"]:
            return self._camera_info(camera_name)

        if camera_name not in self.cams.keys() and camera_name in self.config.cameras:
            success = await self._init_single_camera(camera_name)
            if not success:
                return {}

        failed = self.failed_cams.get(camera_name, {})
        attempts = failed.get("retry_attempts", 0)
        last_attempt = failed.get("last_attempt", 0)

        # Reset retry count after timeout
        if last_attempt and (time.time() - last_attempt) > self.reset_timeout:
            logger.debug(f"Resetting retry count for {camera_name} after timeout")
            attempts = 0

        if attempts >= self.max_retries:
            remaining_time = max(
                0, int((self.reset_timeout - (time.time() - last_attempt)) / 60)
            )
            logger.error(
                f"Too many ONVIF initialization attempts for {camera_name}, retry in {remaining_time} minute{'s' if remaining_time != 1 else ''}"
            )
            return {}

        logger.info(
            f"Attempting ONVIF initialization for {camera_name} (retry {attempts + 1}/{self.max_retries})"
        )
        try:
            if await self._init_onvif(camera_name):
                self.failed_cams.pop(camera_name, None)
                return self._camera_info(camera_name)

            logger.warning(f"ONVIF initialization failed for {camera_name}")
        except Exception as e:
            logger.error(f"Error during ONVIF initialization for {camera_name}: {e}")

        self.failed_cams[camera_name] = {
            "retry_attempts": attempts + 1,
            "last_attempt": time.time(),
        }
        return {}

    async def get_service_capabilities(self, camera_name: str) -> None:
        if camera_name not in self.cams.keys():
            logger.error(f"ONVIF is not configured for {camera_name}")
            return {}

        cam = self.cams[camera_name]

        if not cam["init"]:
            await self._init_onvif(camera_name)

        try:
            service_capabilities = await cam["ptz"].GetServiceCapabilities()

            logger.debug(
                f"Onvif service capabilities for {camera_name}: {service_capabilities}"
            )

            # MoveStatus is required for autotracking - should return "true" if supported
            return find_by_key(vars(service_capabilities), "MoveStatus")
        except Exception as e:
            logger.warning(
                f"Camera {camera_name} does not support the ONVIF GetServiceCapabilities method. Autotracking will not function correctly and must be disabled in your config. Exception: {e}"
            )
            return False

    async def get_camera_status(self, camera_name: str) -> None:
        async with self.status_locks[camera_name]:
            if camera_name not in self.cams.keys():
                logger.error(f"ONVIF is not configured for {camera_name}")
                return

            metrics = self.ptz_metrics.get(camera_name)
            camera_config = self.config.cameras.get(camera_name)

            if metrics is None or camera_config is None:
                return

            cam = self.cams[camera_name]

            if not cam["init"]:
                if not await self._init_onvif(camera_name):
                    return

            try:
                status = await cam["ptz"].GetStatus(
                    {"ProfileToken": cam["move_request"].ProfileToken}
                )
            except Exception:
                pass  # We're unsupported, that'll be reported in the next check.

            try:
                pan_tilt_status = getattr(status.MoveStatus, "PanTilt", None)
                zoom_status = getattr(status.MoveStatus, "Zoom", None)

                # if it's not an attribute, see if MoveStatus even exists in the status result
                if pan_tilt_status is None:
                    pan_tilt_status = getattr(status, "MoveStatus", None)

                    # we're unsupported
                    if pan_tilt_status is None or pan_tilt_status not in [
                        "IDLE",
                        "MOVING",
                    ]:
                        raise Exception
            except Exception:
                logger.warning(
                    f"Camera {camera_name} does not support the ONVIF GetStatus method. Autotracking will not function correctly and must be disabled in your config."
                )
                return

            logger.debug(
                f"{camera_name}: Pan/tilt status: {pan_tilt_status}, Zoom status: {zoom_status}"
            )

            if pan_tilt_status == "IDLE" and (
                zoom_status is None or zoom_status == "IDLE"
            ):
                cam["active"] = False
                if not metrics.motor_stopped.is_set():
                    metrics.motor_stopped.set()

                    logger.debug(
                        f"{camera_name}: PTZ stop time: {metrics.frame_time.value}"
                    )

                    metrics.stop_time.value = metrics.frame_time.value
            else:
                cam["active"] = True
                if metrics.motor_stopped.is_set():
                    metrics.motor_stopped.clear()

                    logger.debug(
                        f"{camera_name}: PTZ start time: {metrics.frame_time.value}"
                    )

                    metrics.start_time.value = metrics.frame_time.value
                    metrics.stop_time.value = 0

            if camera_config.onvif.autotracking.zooming != ZoomingModeEnum.disabled:
                # store absolute zoom level as 0 to 1 interpolated from the values of the camera
                metrics.zoom_level.value = numpy.interp(
                    round(status.Position.Zoom.x, 2),
                    [
                        cam["absolute_zoom_range"]["XRange"]["Min"],
                        cam["absolute_zoom_range"]["XRange"]["Max"],
                    ],
                    [0, 1],
                )
                logger.debug(
                    f"{camera_name}: Camera zoom level: {metrics.zoom_level.value}"
                )

            # some hikvision cams won't update MoveStatus, so warn if it hasn't changed
            if (
                not metrics.motor_stopped.is_set()
                and not metrics.reset.is_set()
                and metrics.start_time.value != 0
                and metrics.frame_time.value > (metrics.start_time.value + 10)
                and metrics.stop_time.value == 0
            ):
                logger.debug(
                    f"Start time: {metrics.start_time.value}, Stop time: {metrics.stop_time.value}, Frame time: {metrics.frame_time.value}"
                )
                # set the stop time so we don't come back into this again and spam the logs
                metrics.stop_time.value = metrics.frame_time.value
                logger.warning(
                    f"Camera {camera_name} is still in ONVIF 'MOVING' status."
                )

    async def _shutdown(self) -> None:
        """Close the camera sessions and cancel the tasks running on the loop."""
        for cam_name in list(self.cams):
            await self._close_camera(cam_name)

        tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]

        for task in tasks:
            task.cancel()

        await asyncio.gather(*tasks, return_exceptions=True)

    def close(self) -> None:
        """Gracefully shut down the ONVIF controller."""
        if self.loop.is_closed():
            logger.debug("ONVIF controller already closed")
            return

        logger.info("Exiting ONVIF controller...")

        # anything left open here is garbage collected during interpreter
        # shutdown, where its warnings can no longer be logged cleanly
        try:
            asyncio.run_coroutine_threadsafe(self._shutdown(), self.loop).result(
                timeout=5
            )
        except TimeoutError:
            logger.debug("Timed out closing ONVIF sessions")

        self.config_subscriber.stop()

        self.loop.call_soon_threadsafe(self.loop.stop)

        self.loop_thread.join()
