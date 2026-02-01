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
from onvif import ONVIFCamera, ONVIFError, ONVIFService
from zeep.exceptions import Fault, TransportError

from frigate.camera import PTZMetrics
from frigate.config import FrigateConfig, ZoomingModeEnum
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

        self.camera_configs = {}
        for cam_name, cam in config.cameras.items():
            if not cam.enabled:
                continue
            if cam.onvif.host:
                self.camera_configs[cam_name] = cam
                self.status_locks[cam_name] = asyncio.Lock()

        asyncio.run_coroutine_threadsafe(self._init_cameras(), self.loop)

    def _run_event_loop(self) -> None:
        """Run the event loop in a separate thread."""
        asyncio.set_event_loop(self.loop)
        try:
            self.loop.run_forever()
        except Exception as e:
            logger.error(f"Onvif event loop terminated unexpectedly: {e}")

    async def _init_cameras(self) -> None:
        """Initialize all configured cameras."""
        for cam_name in self.camera_configs:
            await self._init_single_camera(cam_name)

    async def _init_single_camera(self, cam_name: str) -> bool:
        """Initialize a single camera by name.

        Args:
            cam_name: The name of the camera to initialize

        Returns:
            bool: True if initialization succeeded, False otherwise
        """
        if cam_name not in self.camera_configs:
            logger.error(f"No configuration found for camera {cam_name}")
            return False

        cam = self.camera_configs[cam_name]
        try:
            user = cam.onvif.user
            password = cam.onvif.password

            if user is not None and isinstance(user, bytes):
                user = user.decode("utf-8")

            if password is not None and isinstance(password, bytes):
                password = password.decode("utf-8")

            self.cams[cam_name] = {
                "onvif": ONVIFCamera(
                    cam.onvif.host,
                    cam.onvif.port,
                    user,
                    password,
                    wsdl_dir=str(Path(find_spec("onvif").origin).parent / "wsdl"),
                    adjust_time=cam.onvif.ignore_time_mismatch,
                    encrypt=not cam.onvif.tls_insecure,
                ),
                "init": False,
                "active": False,
                "features": [],
                "presets": {},
            }
            return True
        except (Fault, ONVIFError, TransportError, Exception) as e:
            logger.error(f"Failed to create ONVIF camera instance for {cam_name}: {e}")
            # track initial failures
            self.failed_cams[cam_name] = {
                "retry_attempts": 0,
                "last_error": str(e),
                "last_attempt": time.time(),
            }
            return False

    async def _init_onvif(self, camera_name: str) -> bool:
        onvif: ONVIFCamera = self.cams[camera_name]["onvif"]
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
        except (Fault, ONVIFError, TransportError, Exception) as e:
            logger.error(
                f"Unable to get Onvif capabilities for camera: {camera_name}: {e}"
            )
            return False

        try:
            profiles = await media.GetProfiles()
            logger.debug(f"Onvif profiles for {camera_name}: {profiles}")
        except (Fault, ONVIFError, TransportError, Exception) as e:
            logger.error(
                f"Unable to get Onvif media profiles for camera: {camera_name}: {e}"
            )
            return False

        profile = None
        for _, onvif_profile in enumerate(profiles):
            if (
                onvif_profile.VideoEncoderConfiguration
                and onvif_profile.PTZConfiguration
                and (
                    onvif_profile.PTZConfiguration.DefaultContinuousPanTiltVelocitySpace
                    is not None
                    or onvif_profile.PTZConfiguration.DefaultContinuousZoomVelocitySpace
                    is not None
                )
            ):
                # use the first profile that has a valid ptz configuration
                profile = onvif_profile
                logger.debug(f"Selected Onvif profile for {camera_name}: {profile}")
                break

        if profile is None:
            logger.error(
                f"No appropriate Onvif profiles found for camera: {camera_name}."
            )
            return False

        # get the PTZ config for the profile
        try:
            configs = profile.PTZConfiguration
            logger.debug(
                f"Onvif ptz config for media profile in {camera_name}: {configs}"
            )
        except Exception as e:
            logger.error(
                f"Invalid Onvif PTZ configuration for camera: {camera_name}: {e}"
            )
            return False

        ptz: ONVIFService = await onvif.create_ptz_service()
        self.cams[camera_name]["ptz"] = ptz

        try:
            imaging: ONVIFService = await onvif.create_imaging_service()
        except (Fault, ONVIFError, TransportError, Exception) as e:
            logger.debug(f"Imaging service not supported for {camera_name}: {e}")
            imaging = None
        self.cams[camera_name]["imaging"] = imaging
        try:
            video_sources = await media.GetVideoSources()
            if video_sources and len(video_sources) > 0:
                self.cams[camera_name]["video_source_token"] = video_sources[0].token
        except (Fault, ONVIFError, TransportError, Exception) as e:
            logger.debug(f"Unable to get video sources for {camera_name}: {e}")
            self.cams[camera_name]["video_source_token"] = None

        # setup continuous moving request
        move_request = ptz.create_type("ContinuousMove")
        move_request.ProfileToken = profile.token
        self.cams[camera_name]["move_request"] = move_request

        # extra setup for autotracking cameras
        if (
            self.config.cameras[camera_name].onvif.autotracking.enabled_in_config
            and self.config.cameras[camera_name].onvif.autotracking.enabled
        ):
            request = ptz.create_type("GetConfigurationOptions")
            request.ConfigurationToken = profile.PTZConfiguration.token
            ptz_config = await ptz.GetConfigurationOptions(request)
            logger.debug(f"Onvif config for {camera_name}: {ptz_config}")

            service_capabilities_request = ptz.create_type("GetServiceCapabilities")
            self.cams[camera_name]["service_capabilities_request"] = (
                service_capabilities_request
            )

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

            # status request for autotracking and filling ptz-parameters
            status_request = ptz.create_type("GetStatus")
            status_request.ProfileToken = profile.token
            self.cams[camera_name]["status_request"] = status_request
            try:
                status = await ptz.GetStatus(status_request)
                logger.debug(f"Onvif status config for {camera_name}: {status}")
            except Exception as e:
                logger.warning(f"Unable to get status from camera: {camera_name}: {e}")
                status = None

            # autotracking relative panning/tilting needs a relative zoom value set to 0
            # if camera supports relative movement
            if (
                self.config.cameras[camera_name].onvif.autotracking.zooming
                != ZoomingModeEnum.disabled
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

            # setup relative moving request for autotracking
            move_request = ptz.create_type("RelativeMove")
            move_request.ProfileToken = profile.token
            logger.debug(f"{camera_name}: Relative move request: {move_request}")
            if move_request.Translation is None and fov_space_id is not None:
                move_request.Translation = status.Position
                move_request.Translation.PanTilt.space = ptz_config["Spaces"][
                    "RelativePanTiltTranslationSpace"
                ][fov_space_id]["URI"]

            # try setting relative zoom translation space
            try:
                if (
                    self.config.cameras[camera_name].onvif.autotracking.zooming
                    != ZoomingModeEnum.disabled
                ):
                    if zoom_space_id is not None:
                        move_request.Translation.Zoom.space = ptz_config["Spaces"][
                            "RelativeZoomTranslationSpace"
                        ][zoom_space_id]["URI"]
                else:
                    if (
                        move_request["Translation"] is not None
                        and "Zoom" in move_request["Translation"]
                    ):
                        del move_request["Translation"]["Zoom"]
                    if (
                        move_request["Speed"] is not None
                        and "Zoom" in move_request["Speed"]
                    ):
                        del move_request["Speed"]["Zoom"]
                    logger.debug(
                        f"{camera_name}: Relative move request after deleting zoom: {move_request}"
                    )
            except Exception as e:
                self.config.cameras[
                    camera_name
                ].onvif.autotracking.zooming = ZoomingModeEnum.disabled
                logger.warning(
                    f"Disabling autotracking zooming for {camera_name}: Relative zoom not supported. Exception: {e}"
                )

            if move_request.Speed is None:
                move_request.Speed = configs.DefaultPTZSpeed if configs else None
            logger.debug(
                f"{camera_name}: Relative move request after setup: {move_request}"
            )
            self.cams[camera_name]["relative_move_request"] = move_request

            # setup absolute moving request for autotracking zooming
            move_request = ptz.create_type("AbsoluteMove")
            move_request.ProfileToken = profile.token
            self.cams[camera_name]["absolute_move_request"] = move_request

        # setup existing presets
        try:
            presets: list[dict] = await ptz.GetPresets({"ProfileToken": profile.token})
        except (Fault, ONVIFError, TransportError, Exception) as e:
            logger.warning(f"Unable to get presets from camera: {camera_name}: {e}")
            presets = []

        for preset in presets:
            # Ensure preset name is a Unicode string and handle UTF-8 characters correctly
            preset_name = getattr(preset, "Name") or f"preset {preset['token']}"

            if isinstance(preset_name, bytes):
                preset_name = preset_name.decode("utf-8")

            # Convert to lowercase while preserving UTF-8 characters
            preset_name_lower = preset_name.lower()
            self.cams[camera_name]["presets"][preset_name_lower] = preset["token"]

        # get list of supported features
        supported_features = []

        if configs.DefaultContinuousPanTiltVelocitySpace:
            supported_features.append("pt")

        if configs.DefaultContinuousZoomVelocitySpace:
            supported_features.append("zoom")

        if configs.DefaultRelativePanTiltTranslationSpace:
            supported_features.append("pt-r")

        if configs.DefaultRelativeZoomTranslationSpace:
            supported_features.append("zoom-r")
            if (
                self.config.cameras[camera_name].onvif.autotracking.enabled_in_config
                and self.config.cameras[camera_name].onvif.autotracking.enabled
            ):
                try:
                    # get camera's zoom limits from onvif config
                    self.cams[camera_name]["relative_zoom_range"] = (
                        ptz_config.Spaces.RelativeZoomTranslationSpace[0]
                    )
                except Exception as e:
                    if (
                        self.config.cameras[camera_name].onvif.autotracking.zooming
                        == ZoomingModeEnum.relative
                    ):
                        self.config.cameras[
                            camera_name
                        ].onvif.autotracking.zooming = ZoomingModeEnum.disabled
                        logger.warning(
                            f"Disabling autotracking zooming for {camera_name}: Relative zoom not supported. Exception: {e}"
                        )

        if configs.DefaultAbsoluteZoomPositionSpace:
            supported_features.append("zoom-a")
            if (
                self.config.cameras[camera_name].onvif.autotracking.enabled_in_config
                and self.config.cameras[camera_name].onvif.autotracking.enabled
            ):
                try:
                    # get camera's zoom limits from onvif config
                    self.cams[camera_name]["absolute_zoom_range"] = (
                        ptz_config.Spaces.AbsoluteZoomPositionSpace[0]
                    )
                    self.cams[camera_name]["zoom_limits"] = configs.ZoomLimits
                except Exception as e:
                    if self.config.cameras[camera_name].onvif.autotracking.zooming:
                        self.config.cameras[
                            camera_name
                        ].onvif.autotracking.zooming = ZoomingModeEnum.disabled
                        logger.warning(
                            f"Disabling autotracking zooming for {camera_name}: Absolute zoom not supported. Exception: {e}"
                        )

        if (
            self.cams[camera_name]["video_source_token"] is not None
            and imaging is not None
        ):
            try:
                imaging_capabilities = await imaging.GetImagingSettings(
                    {"VideoSourceToken": self.cams[camera_name]["video_source_token"]}
                )
                if (
                    hasattr(imaging_capabilities, "Focus")
                    and imaging_capabilities.Focus
                ):
                    supported_features.append("focus")
            except (Fault, ONVIFError, TransportError, Exception) as e:
                logger.debug(f"Focus not supported for {camera_name}: {e}")

        if (
            self.config.cameras[camera_name].onvif.autotracking.enabled_in_config
            and self.config.cameras[camera_name].onvif.autotracking.enabled
            and fov_space_id is not None
            and configs.DefaultRelativePanTiltTranslationSpace is not None
        ):
            supported_features.append("pt-r-fov")
            self.cams[camera_name]["relative_fov_range"] = (
                ptz_config.Spaces.RelativePanTiltTranslationSpace[fov_space_id]
            )

        self.cams[camera_name]["features"] = supported_features
        self.cams[camera_name]["init"] = True
        return True

    async def _stop(self, camera_name: str) -> None:
        move_request = self.cams[camera_name]["move_request"]
        await self.cams[camera_name]["ptz"].Stop(
            {
                "ProfileToken": move_request.ProfileToken,
                "PanTilt": True,
                "Zoom": True,
            }
        )
        if (
            "focus" in self.cams[camera_name]["features"]
            and self.cams[camera_name]["video_source_token"]
            and self.cams[camera_name]["imaging"] is not None
        ):
            try:
                stop_request = self.cams[camera_name]["imaging"].create_type("Stop")
                stop_request.VideoSourceToken = self.cams[camera_name][
                    "video_source_token"
                ]
                await self.cams[camera_name]["imaging"].Stop(stop_request)
            except (Fault, ONVIFError, TransportError, Exception) as e:
                logger.warning(f"Failed to stop focus for {camera_name}: {e}")
        self.cams[camera_name]["active"] = False

    async def _move(self, camera_name: str, command: OnvifCommandEnum) -> None:
        if self.cams[camera_name]["active"]:
            logger.warning(
                f"{camera_name} is already performing an action, stopping..."
            )
            await self._stop(camera_name)

        if "pt" not in self.cams[camera_name]["features"]:
            logger.error(f"{camera_name} does not support ONVIF pan/tilt movement.")
            return

        self.cams[camera_name]["active"] = True
        move_request = self.cams[camera_name]["move_request"]

        if command == OnvifCommandEnum.move_left:
            move_request.Velocity = {"PanTilt": {"x": -0.5, "y": 0}}
        elif command == OnvifCommandEnum.move_right:
            move_request.Velocity = {"PanTilt": {"x": 0.5, "y": 0}}
        elif command == OnvifCommandEnum.move_up:
            move_request.Velocity = {
                "PanTilt": {
                    "x": 0,
                    "y": 0.5,
                }
            }
        elif command == OnvifCommandEnum.move_down:
            move_request.Velocity = {
                "PanTilt": {
                    "x": 0,
                    "y": -0.5,
                }
            }

        try:
            await self.cams[camera_name]["ptz"].ContinuousMove(move_request)
        except (Fault, ONVIFError, TransportError, Exception) as e:
            logger.warning(f"Onvif sending move request to {camera_name} failed: {e}")

    async def _move_relative(self, camera_name: str, pan, tilt, zoom, speed) -> None:
        if "pt-r-fov" not in self.cams[camera_name]["features"]:
            logger.error(f"{camera_name} does not support ONVIF RelativeMove (FOV).")
            return

        logger.debug(
            f"{camera_name} called RelativeMove: pan: {pan} tilt: {tilt} zoom: {zoom}"
        )

        if self.cams[camera_name]["active"]:
            logger.warning(
                f"{camera_name} is already performing an action, not moving..."
            )
            return

        self.cams[camera_name]["active"] = True
        self.ptz_metrics[camera_name].motor_stopped.clear()
        logger.debug(
            f"{camera_name}: PTZ start time: {self.ptz_metrics[camera_name].frame_time.value}"
        )
        self.ptz_metrics[camera_name].start_time.value = self.ptz_metrics[
            camera_name
        ].frame_time.value
        self.ptz_metrics[camera_name].stop_time.value = 0
        move_request = self.cams[camera_name]["relative_move_request"]

        # function takes in -1 to 1 for pan and tilt, interpolate to the values of the camera.
        # The onvif spec says this can report as +INF and -INF, so this may need to be modified
        pan = numpy.interp(
            pan,
            [-1, 1],
            [
                self.cams[camera_name]["relative_fov_range"]["XRange"]["Min"],
                self.cams[camera_name]["relative_fov_range"]["XRange"]["Max"],
            ],
        )
        tilt = numpy.interp(
            tilt,
            [-1, 1],
            [
                self.cams[camera_name]["relative_fov_range"]["YRange"]["Min"],
                self.cams[camera_name]["relative_fov_range"]["YRange"]["Max"],
            ],
        )

        move_request.Speed = {
            "PanTilt": {
                "x": speed,
                "y": speed,
            },
        }

        move_request.Translation.PanTilt.x = pan
        move_request.Translation.PanTilt.y = tilt

        if (
            "zoom-r" in self.cams[camera_name]["features"]
            and self.config.cameras[camera_name].onvif.autotracking.zooming
            == ZoomingModeEnum.relative
        ):
            move_request.Speed = {
                "PanTilt": {
                    "x": speed,
                    "y": speed,
                },
                "Zoom": {"x": speed},
            }
            move_request.Translation.Zoom.x = zoom

        await self.cams[camera_name]["ptz"].RelativeMove(move_request)

        # reset after the move request
        move_request.Translation.PanTilt.x = 0
        move_request.Translation.PanTilt.y = 0

        if (
            "zoom-r" in self.cams[camera_name]["features"]
            and self.config.cameras[camera_name].onvif.autotracking.zooming
            == ZoomingModeEnum.relative
        ):
            move_request.Translation.Zoom.x = 0

        self.cams[camera_name]["active"] = False

    async def _move_to_preset(self, camera_name: str, preset: str) -> None:
        if isinstance(preset, bytes):
            preset = preset.decode("utf-8")

        preset = preset.lower()

        if preset not in self.cams[camera_name]["presets"]:
            logger.error(f"{preset} is not a valid preset for {camera_name}")
            return

        self.cams[camera_name]["active"] = True
        self.ptz_metrics[camera_name].start_time.value = 0
        self.ptz_metrics[camera_name].stop_time.value = 0
        move_request = self.cams[camera_name]["move_request"]
        preset_token = self.cams[camera_name]["presets"][preset]

        await self.cams[camera_name]["ptz"].GotoPreset(
            {
                "ProfileToken": move_request.ProfileToken,
                "PresetToken": preset_token,
            }
        )

        self.cams[camera_name]["active"] = False

    async def _zoom(self, camera_name: str, command: OnvifCommandEnum) -> None:
        if self.cams[camera_name]["active"]:
            logger.warning(
                f"{camera_name} is already performing an action, stopping..."
            )
            await self._stop(camera_name)

        if "zoom" not in self.cams[camera_name]["features"]:
            logger.error(f"{camera_name} does not support ONVIF zooming.")
            return

        self.cams[camera_name]["active"] = True
        move_request = self.cams[camera_name]["move_request"]

        if command == OnvifCommandEnum.zoom_in:
            move_request.Velocity = {"Zoom": {"x": 0.5}}
        elif command == OnvifCommandEnum.zoom_out:
            move_request.Velocity = {"Zoom": {"x": -0.5}}

        await self.cams[camera_name]["ptz"].ContinuousMove(move_request)

    async def _zoom_absolute(self, camera_name: str, zoom, speed) -> None:
        if "zoom-a" not in self.cams[camera_name]["features"]:
            logger.error(f"{camera_name} does not support ONVIF AbsoluteMove zooming.")
            return

        logger.debug(f"{camera_name} called AbsoluteMove: zoom: {zoom}")

        if self.cams[camera_name]["active"]:
            logger.warning(
                f"{camera_name} is already performing an action, not moving..."
            )
            return

        self.cams[camera_name]["active"] = True
        self.ptz_metrics[camera_name].motor_stopped.clear()
        logger.debug(
            f"{camera_name}: PTZ start time: {self.ptz_metrics[camera_name].frame_time.value}"
        )
        self.ptz_metrics[camera_name].start_time.value = self.ptz_metrics[
            camera_name
        ].frame_time.value
        self.ptz_metrics[camera_name].stop_time.value = 0
        move_request = self.cams[camera_name]["absolute_move_request"]

        # function takes in 0 to 1 for zoom, interpolate to the values of the camera.
        zoom = numpy.interp(
            zoom,
            [0, 1],
            [
                self.cams[camera_name]["absolute_zoom_range"]["XRange"]["Min"],
                self.cams[camera_name]["absolute_zoom_range"]["XRange"]["Max"],
            ],
        )

        move_request.Speed = {"Zoom": speed}
        move_request.Position = {"Zoom": zoom}

        logger.debug(f"{camera_name}: Absolute zoom: {zoom}")

        await self.cams[camera_name]["ptz"].AbsoluteMove(move_request)

        self.cams[camera_name]["active"] = False

    async def _focus(self, camera_name: str, command: OnvifCommandEnum) -> None:
        if self.cams[camera_name]["active"]:
            logger.warning(
                f"{camera_name} is already performing an action, not moving..."
            )
            await self._stop(camera_name)

        if (
            "focus" not in self.cams[camera_name]["features"]
            or not self.cams[camera_name]["video_source_token"]
            or self.cams[camera_name]["imaging"] is None
        ):
            logger.error(f"{camera_name} does not support ONVIF continuous focus.")
            return

        self.cams[camera_name]["active"] = True
        move_request = self.cams[camera_name]["imaging"].create_type("Move")
        move_request.VideoSourceToken = self.cams[camera_name]["video_source_token"]
        move_request.Focus = {
            "Continuous": {
                "Speed": 0.5 if command == OnvifCommandEnum.focus_in else -0.5
            }
        }

        try:
            await self.cams[camera_name]["imaging"].Move(move_request)
        except (Fault, ONVIFError, TransportError, Exception) as e:
            logger.warning(f"Onvif sending focus request to {camera_name} failed: {e}")
            self.cams[camera_name]["active"] = False

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
                _, pan, tilt = param.split("_")
                await self._move_relative(camera_name, float(pan), float(tilt), 0, 1)
            elif command in (OnvifCommandEnum.zoom_in, OnvifCommandEnum.zoom_out):
                await self._zoom(camera_name, command)
            elif command in (OnvifCommandEnum.focus_in, OnvifCommandEnum.focus_out):
                await self._focus(camera_name, command)
            else:
                await self._move(camera_name, command)
        except (Fault, ONVIFError, TransportError, Exception) as e:
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
        except asyncio.TimeoutError:
            logger.error(f"Command {command} timed out for camera {camera_name}")
        except Exception as e:
            logger.error(
                f"Error executing command {command} for camera {camera_name}: {e}"
            )

    async def get_camera_info(self, camera_name: str) -> dict[str, Any]:
        """
        Get ptz capabilities and presets, attempting to reconnect if ONVIF is configured
        but not initialized.

        Returns camera details including features and presets if available.
        """
        if not self.config.cameras[camera_name].enabled:
            logger.debug(
                f"Camera {camera_name} disabled, won't try to initialize ONVIF"
            )
            return {}

        if camera_name not in self.cams.keys() and (
            camera_name not in self.config.cameras
            or not self.config.cameras[camera_name].onvif.host
        ):
            logger.debug(f"ONVIF is not configured for {camera_name}")
            return {}

        if camera_name in self.cams.keys() and self.cams[camera_name]["init"]:
            return {
                "name": camera_name,
                "features": self.cams[camera_name]["features"],
                "presets": list(self.cams[camera_name]["presets"].keys()),
            }

        if camera_name not in self.cams.keys() and camera_name in self.config.cameras:
            success = await self._init_single_camera(camera_name)
            if not success:
                return {}

        # Reset retry count after timeout
        attempts = self.failed_cams.get(camera_name, {}).get("retry_attempts", 0)
        last_attempt = self.failed_cams.get(camera_name, {}).get("last_attempt", 0)

        if last_attempt and (time.time() - last_attempt) > self.reset_timeout:
            logger.debug(f"Resetting retry count for {camera_name} after timeout")
            attempts = 0
            self.failed_cams[camera_name]["retry_attempts"] = 0

        # Attempt initialization/reconnection
        if attempts < self.max_retries:
            logger.info(
                f"Attempting ONVIF initialization for {camera_name} (retry {attempts + 1}/{self.max_retries})"
            )
            try:
                if await self._init_onvif(camera_name):
                    if camera_name in self.failed_cams:
                        del self.failed_cams[camera_name]
                    return {
                        "name": camera_name,
                        "features": self.cams[camera_name]["features"],
                        "presets": list(self.cams[camera_name]["presets"].keys()),
                    }
                else:
                    logger.warning(f"ONVIF initialization failed for {camera_name}")
            except Exception as e:
                logger.error(
                    f"Error during ONVIF initialization for {camera_name}: {e}"
                )
                if camera_name not in self.failed_cams:
                    self.failed_cams[camera_name] = {"retry_attempts": 0}
                self.failed_cams[camera_name].update(
                    {
                        "retry_attempts": attempts + 1,
                        "last_error": str(e),
                        "last_attempt": time.time(),
                    }
                )

        if attempts >= self.max_retries:
            remaining_time = max(
                0, int((self.reset_timeout - (time.time() - last_attempt)) / 60)
            )
            logger.error(
                f"Too many ONVIF initialization attempts for {camera_name}, retry in {remaining_time} minute{'s' if remaining_time != 1 else ''}"
            )

        logger.debug(f"Could not initialize ONVIF for {camera_name}")
        return {}

    async def get_service_capabilities(self, camera_name: str) -> None:
        if camera_name not in self.cams.keys():
            logger.error(f"ONVIF is not configured for {camera_name}")
            return {}

        if not self.cams[camera_name]["init"]:
            await self._init_onvif(camera_name)

        service_capabilities_request = self.cams[camera_name][
            "service_capabilities_request"
        ]
        try:
            service_capabilities = await self.cams[camera_name][
                "ptz"
            ].GetServiceCapabilities(service_capabilities_request)

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

            if not self.cams[camera_name]["init"]:
                if not await self._init_onvif(camera_name):
                    return

            status_request = self.cams[camera_name]["status_request"]
            try:
                status = await self.cams[camera_name]["ptz"].GetStatus(status_request)
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
                self.cams[camera_name]["active"] = False
                if not self.ptz_metrics[camera_name].motor_stopped.is_set():
                    self.ptz_metrics[camera_name].motor_stopped.set()

                    logger.debug(
                        f"{camera_name}: PTZ stop time: {self.ptz_metrics[camera_name].frame_time.value}"
                    )

                    self.ptz_metrics[camera_name].stop_time.value = self.ptz_metrics[
                        camera_name
                    ].frame_time.value
            else:
                self.cams[camera_name]["active"] = True
                if self.ptz_metrics[camera_name].motor_stopped.is_set():
                    self.ptz_metrics[camera_name].motor_stopped.clear()

                    logger.debug(
                        f"{camera_name}: PTZ start time: {self.ptz_metrics[camera_name].frame_time.value}"
                    )

                    self.ptz_metrics[camera_name].start_time.value = self.ptz_metrics[
                        camera_name
                    ].frame_time.value
                    self.ptz_metrics[camera_name].stop_time.value = 0

            if (
                self.config.cameras[camera_name].onvif.autotracking.zooming
                != ZoomingModeEnum.disabled
            ):
                # store absolute zoom level as 0 to 1 interpolated from the values of the camera
                self.ptz_metrics[camera_name].zoom_level.value = numpy.interp(
                    round(status.Position.Zoom.x, 2),
                    [
                        self.cams[camera_name]["absolute_zoom_range"]["XRange"]["Min"],
                        self.cams[camera_name]["absolute_zoom_range"]["XRange"]["Max"],
                    ],
                    [0, 1],
                )
                logger.debug(
                    f"{camera_name}: Camera zoom level: {self.ptz_metrics[camera_name].zoom_level.value}"
                )

            # some hikvision cams won't update MoveStatus, so warn if it hasn't changed
            if (
                not self.ptz_metrics[camera_name].motor_stopped.is_set()
                and not self.ptz_metrics[camera_name].reset.is_set()
                and self.ptz_metrics[camera_name].start_time.value != 0
                and self.ptz_metrics[camera_name].frame_time.value
                > (self.ptz_metrics[camera_name].start_time.value + 10)
                and self.ptz_metrics[camera_name].stop_time.value == 0
            ):
                logger.debug(
                    f"Start time: {self.ptz_metrics[camera_name].start_time.value}, Stop time: {self.ptz_metrics[camera_name].stop_time.value}, Frame time: {self.ptz_metrics[camera_name].frame_time.value}"
                )
                # set the stop time so we don't come back into this again and spam the logs
                self.ptz_metrics[camera_name].stop_time.value = self.ptz_metrics[
                    camera_name
                ].frame_time.value
                logger.warning(
                    f"Camera {camera_name} is still in ONVIF 'MOVING' status."
                )

    def close(self) -> None:
        """Gracefully shut down the ONVIF controller."""
        if not hasattr(self, "loop") or self.loop.is_closed():
            logger.debug("ONVIF controller already closed")
            return

        logger.info("Exiting ONVIF controller...")

        def stop_and_cleanup():
            try:
                self.loop.stop()
            except Exception as e:
                logger.error(f"Error during loop cleanup: {e}")

        # Schedule stop and cleanup in the loop thread
        self.loop.call_soon_threadsafe(stop_and_cleanup)

        self.loop_thread.join()
