"""Configure and control camera via onvif."""

import asyncio
import logging
from enum import Enum
from importlib.util import find_spec
from pathlib import Path

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


class OnvifController:
    ptz_metrics: dict[str, PTZMetrics]

    def __init__(
        self, config: FrigateConfig, ptz_metrics: dict[str, PTZMetrics]
    ) -> None:
        self.cams: dict[str, ONVIFCamera] = {}
        self.config = config
        self.ptz_metrics = ptz_metrics

        for cam_name, cam in config.cameras.items():
            if not cam.enabled:
                continue

            if cam.onvif.host:
                try:
                    self.cams[cam_name] = {
                        "onvif": ONVIFCamera(
                            cam.onvif.host,
                            cam.onvif.port,
                            cam.onvif.user,
                            cam.onvif.password,
                            wsdl_dir=str(
                                Path(find_spec("onvif").origin).parent / "wsdl"
                            ),
                            adjust_time=cam.onvif.ignore_time_mismatch,
                            encrypt=not cam.onvif.tls_insecure,
                        ),
                        "init": False,
                        "active": False,
                        "features": [],
                        "presets": {},
                    }
                except ONVIFError as e:
                    logger.error(f"Onvif connection to {cam.name} failed: {e}")

    async def _init_onvif(self, camera_name: str) -> bool:
        onvif: ONVIFCamera = self.cams[camera_name]["onvif"]
        await onvif.update_xaddrs()

        # create init services
        media: ONVIFService = await onvif.create_media_service()
        logger.debug(f"Onvif media xaddr for {camera_name}: {media.xaddr}")

        try:
            # this will fire an exception if camera is not a ptz
            capabilities = onvif.get_definition("ptz")
            logger.debug(f"Onvif capabilities for {camera_name}: {capabilities}")
        except (ONVIFError, Fault, TransportError) as e:
            logger.error(
                f"Unable to get Onvif capabilities for camera: {camera_name}: {e}"
            )
            return False

        try:
            profiles = await media.GetProfiles()
            logger.debug(f"Onvif profiles for {camera_name}: {profiles}")
        except (ONVIFError, Fault, TransportError) as e:
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
                    if "Zoom" in move_request["Translation"]:
                        del move_request["Translation"]["Zoom"]
                    if "Zoom" in move_request["Speed"]:
                        del move_request["Speed"]["Zoom"]
                    logger.debug(
                        f"{camera_name}: Relative move request after deleting zoom: {move_request}"
                    )
            except Exception:
                self.config.cameras[
                    camera_name
                ].onvif.autotracking.zooming = ZoomingModeEnum.disabled
                logger.warning(
                    f"Disabling autotracking zooming for {camera_name}: Relative zoom not supported"
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
        except ONVIFError as e:
            logger.warning(f"Unable to get presets from camera: {camera_name}: {e}")
            presets = []

        for preset in presets:
            self.cams[camera_name]["presets"][
                (getattr(preset, "Name") or f"preset {preset['token']}").lower()
            ] = preset["token"]

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
                except Exception:
                    if (
                        self.config.cameras[camera_name].onvif.autotracking.zooming
                        == ZoomingModeEnum.relative
                    ):
                        self.config.cameras[
                            camera_name
                        ].onvif.autotracking.zooming = ZoomingModeEnum.disabled
                        logger.warning(
                            f"Disabling autotracking zooming for {camera_name}: Relative zoom not supported"
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
                except Exception:
                    if self.config.cameras[camera_name].onvif.autotracking.zooming:
                        self.config.cameras[
                            camera_name
                        ].onvif.autotracking.zooming = ZoomingModeEnum.disabled
                        logger.warning(
                            f"Disabling autotracking zooming for {camera_name}: Absolute zoom not supported"
                        )

        # set relative pan/tilt space for autotracker
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

    def _stop(self, camera_name: str) -> None:
        move_request = self.cams[camera_name]["move_request"]
        asyncio.run(
            self.cams[camera_name]["ptz"].Stop(
                {
                    "ProfileToken": move_request.ProfileToken,
                    "PanTilt": True,
                    "Zoom": True,
                }
            )
        )
        self.cams[camera_name]["active"] = False

    def _move(self, camera_name: str, command: OnvifCommandEnum) -> None:
        if self.cams[camera_name]["active"]:
            logger.warning(
                f"{camera_name} is already performing an action, stopping..."
            )
            self._stop(camera_name)

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
            asyncio.run(self.cams[camera_name]["ptz"].ContinuousMove(move_request))
        except ONVIFError as e:
            logger.warning(f"Onvif sending move request to {camera_name} failed: {e}")

    def _move_relative(self, camera_name: str, pan, tilt, zoom, speed) -> None:
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

        asyncio.run(self.cams[camera_name]["ptz"].RelativeMove(move_request))

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

    def _move_to_preset(self, camera_name: str, preset: str) -> None:
        if preset not in self.cams[camera_name]["presets"]:
            logger.error(f"{preset} is not a valid preset for {camera_name}")
            return

        self.cams[camera_name]["active"] = True
        self.ptz_metrics[camera_name].motor_stopped.clear()
        self.ptz_metrics[camera_name].start_time.value = 0
        self.ptz_metrics[camera_name].stop_time.value = 0
        move_request = self.cams[camera_name]["move_request"]
        preset_token = self.cams[camera_name]["presets"][preset]
        asyncio.run(
            self.cams[camera_name]["ptz"].GotoPreset(
                {
                    "ProfileToken": move_request.ProfileToken,
                    "PresetToken": preset_token,
                }
            )
        )

        self.cams[camera_name]["active"] = False

    def _zoom(self, camera_name: str, command: OnvifCommandEnum) -> None:
        if self.cams[camera_name]["active"]:
            logger.warning(
                f"{camera_name} is already performing an action, stopping..."
            )
            self._stop(camera_name)

        if "zoom" not in self.cams[camera_name]["features"]:
            logger.error(f"{camera_name} does not support ONVIF zooming.")
            return

        self.cams[camera_name]["active"] = True
        move_request = self.cams[camera_name]["move_request"]

        if command == OnvifCommandEnum.zoom_in:
            move_request.Velocity = {"Zoom": {"x": 0.5}}
        elif command == OnvifCommandEnum.zoom_out:
            move_request.Velocity = {"Zoom": {"x": -0.5}}

        asyncio.run(self.cams[camera_name]["ptz"].ContinuousMove(move_request))

    def _zoom_absolute(self, camera_name: str, zoom, speed) -> None:
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

        asyncio.run(self.cams[camera_name]["ptz"].AbsoluteMove(move_request))

        self.cams[camera_name]["active"] = False

    def handle_command(
        self, camera_name: str, command: OnvifCommandEnum, param: str = ""
    ) -> None:
        if camera_name not in self.cams.keys():
            logger.error(f"Onvif is not setup for {camera_name}")
            return

        if not self.cams[camera_name]["init"]:
            if not asyncio.run(self._init_onvif(camera_name)):
                return

        try:
            if command == OnvifCommandEnum.init:
                # already init
                return
            elif command == OnvifCommandEnum.stop:
                self._stop(camera_name)
            elif command == OnvifCommandEnum.preset:
                self._move_to_preset(camera_name, param)
            elif command == OnvifCommandEnum.move_relative:
                _, pan, tilt = param.split("_")
                self._move_relative(camera_name, float(pan), float(tilt), 0, 1)
            elif (
                command == OnvifCommandEnum.zoom_in
                or command == OnvifCommandEnum.zoom_out
            ):
                self._zoom(camera_name, command)
            else:
                self._move(camera_name, command)
        except ONVIFError as e:
            logger.error(f"Unable to handle onvif command: {e}")

    def get_camera_info(self, camera_name: str) -> dict[str, any]:
        if camera_name not in self.cams.keys():
            logger.debug(f"Onvif is not setup for {camera_name}")
            return {}

        if not self.cams[camera_name]["init"]:
            asyncio.run(self._init_onvif(camera_name))

        return {
            "name": camera_name,
            "features": self.cams[camera_name]["features"],
            "presets": list(self.cams[camera_name]["presets"].keys()),
        }

    def get_service_capabilities(self, camera_name: str) -> None:
        if camera_name not in self.cams.keys():
            logger.error(f"Onvif is not setup for {camera_name}")
            return {}

        if not self.cams[camera_name]["init"]:
            asyncio.run(self._init_onvif(camera_name))

        service_capabilities_request = self.cams[camera_name][
            "service_capabilities_request"
        ]
        try:
            service_capabilities = asyncio.run(
                self.cams[camera_name]["ptz"].GetServiceCapabilities(
                    service_capabilities_request
                )
            )

            logger.debug(
                f"Onvif service capabilities for {camera_name}: {service_capabilities}"
            )

            # MoveStatus is required for autotracking - should return "true" if supported
            return find_by_key(vars(service_capabilities), "MoveStatus")
        except Exception:
            logger.warning(
                f"Camera {camera_name} does not support the ONVIF GetServiceCapabilities method. Autotracking will not function correctly and must be disabled in your config."
            )
            return False

    def get_camera_status(self, camera_name: str) -> None:
        if camera_name not in self.cams.keys():
            logger.error(f"Onvif is not setup for {camera_name}")
            return {}

        if not self.cams[camera_name]["init"]:
            asyncio.run(self._init_onvif(camera_name))

        status_request = self.cams[camera_name]["status_request"]
        try:
            status = asyncio.run(
                self.cams[camera_name]["ptz"].GetStatus(status_request)
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

        if pan_tilt_status == "IDLE" and (zoom_status is None or zoom_status == "IDLE"):
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
            logger.warning(f"Camera {camera_name} is still in ONVIF 'MOVING' status.")
