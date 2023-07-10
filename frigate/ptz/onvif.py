"""Configure and control camera via onvif."""

import logging
import site
from enum import Enum

import numpy
from onvif import ONVIFCamera, ONVIFError

from frigate.config import FrigateConfig
from frigate.types import CameraMetricsTypes

logger = logging.getLogger(__name__)


class OnvifCommandEnum(str, Enum):
    """Holds all possible move commands"""

    init = "init"
    move_down = "move_down"
    move_left = "move_left"
    move_right = "move_right"
    move_up = "move_up"
    preset = "preset"
    stop = "stop"
    zoom_in = "zoom_in"
    zoom_out = "zoom_out"


class OnvifController:
    def __init__(
        self, config: FrigateConfig, camera_metrics: dict[str, CameraMetricsTypes]
    ) -> None:
        self.cams: dict[str, ONVIFCamera] = {}
        self.camera_metrics = camera_metrics

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
                            wsdl_dir=site.getsitepackages()[0].replace(
                                "dist-packages", "site-packages"
                            )
                            + "/wsdl",
                        ),
                        "init": False,
                        "active": False,
                        "presets": {},
                    }
                except ONVIFError as e:
                    logger.error(f"Onvif connection to {cam.name} failed: {e}")

    def _init_onvif(self, camera_name: str) -> bool:
        onvif: ONVIFCamera = self.cams[camera_name]["onvif"]

        # create init services
        media = onvif.create_media_service()

        try:
            profile = media.GetProfiles()[0]
        except ONVIFError as e:
            logger.error(f"Unable to connect to camera: {camera_name}: {e}")
            return False

        ptz = onvif.create_ptz_service()
        request = ptz.create_type("GetConfigurationOptions")
        request.ConfigurationToken = profile.PTZConfiguration.token
        ptz_config = ptz.GetConfigurationOptions(request)

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

        # setup continuous moving request
        move_request = ptz.create_type("ContinuousMove")
        move_request.ProfileToken = profile.token
        self.cams[camera_name]["move_request"] = move_request

        # setup relative moving request for autotracking
        move_request = ptz.create_type("RelativeMove")
        move_request.ProfileToken = profile.token
        if move_request.Translation is None and fov_space_id is not None:
            move_request.Translation = ptz.GetStatus(
                {"ProfileToken": profile.token}
            ).Position
            move_request.Translation.PanTilt.space = ptz_config["Spaces"][
                "RelativePanTiltTranslationSpace"
            ][fov_space_id]["URI"]
            move_request.Translation.Zoom.space = ptz_config["Spaces"][
                "RelativeZoomTranslationSpace"
            ][0]["URI"]
        if move_request.Speed is None:
            move_request.Speed = ptz.GetStatus({"ProfileToken": profile.token}).Position
        self.cams[camera_name]["relative_move_request"] = move_request

        # setup relative moving request for autotracking
        move_request = ptz.create_type("AbsoluteMove")
        move_request.ProfileToken = profile.token
        self.cams[camera_name]["absolute_move_request"] = move_request

        # status request for autotracking
        status_request = ptz.create_type("GetStatus")
        status_request.ProfileToken = profile.token
        self.cams[camera_name]["status_request"] = status_request

        # setup existing presets
        try:
            presets: list[dict] = ptz.GetPresets({"ProfileToken": profile.token})
        except ONVIFError as e:
            logger.warning(f"Unable to get presets from camera: {camera_name}: {e}")
            presets = []

        for preset in presets:
            self.cams[camera_name]["presets"][preset["Name"].lower()] = preset["token"]

        # get list of supported features
        ptz_config = ptz.GetConfigurationOptions(request)
        supported_features = []

        if ptz_config.Spaces and ptz_config.Spaces.ContinuousPanTiltVelocitySpace:
            supported_features.append("pt")

        if ptz_config.Spaces and ptz_config.Spaces.ContinuousZoomVelocitySpace:
            supported_features.append("zoom")

        if ptz_config.Spaces and ptz_config.Spaces.RelativePanTiltTranslationSpace:
            supported_features.append("pt-r")

        if ptz_config.Spaces and ptz_config.Spaces.RelativeZoomTranslationSpace:
            supported_features.append("zoom-r")

        if fov_space_id is not None:
            supported_features.append("pt-r-fov")
            self.cams[camera_name][
                "relative_fov_range"
            ] = ptz_config.Spaces.RelativePanTiltTranslationSpace[fov_space_id]

        self.cams[camera_name]["relative_fov_supported"] = fov_space_id is not None

        self.cams[camera_name]["features"] = supported_features

        self.cams[camera_name]["init"] = True
        return True

    def _stop(self, camera_name: str) -> None:
        onvif: ONVIFCamera = self.cams[camera_name]["onvif"]
        move_request = self.cams[camera_name]["move_request"]
        onvif.get_service("ptz").Stop(
            {
                "ProfileToken": move_request.ProfileToken,
                "PanTilt": True,
                "Zoom": True,
            }
        )
        self.cams[camera_name]["active"] = False

    def _move(self, camera_name: str, command: OnvifCommandEnum) -> None:
        if self.cams[camera_name]["active"]:
            logger.warning(
                f"{camera_name} is already performing an action, stopping..."
            )
            self._stop(camera_name)

        self.cams[camera_name]["active"] = True
        onvif: ONVIFCamera = self.cams[camera_name]["onvif"]
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

        onvif.get_service("ptz").ContinuousMove(move_request)

    def _move_relative(self, camera_name: str, pan, tilt, speed) -> None:
        if not self.cams[camera_name]["relative_fov_supported"]:
            logger.error(f"{camera_name} does not support ONVIF RelativeMove (FOV).")
            return

        logger.debug(f"{camera_name} called RelativeMove: pan: {pan} tilt: {tilt}")
        self.get_camera_status(camera_name)

        if self.cams[camera_name]["active"]:
            logger.warning(
                f"{camera_name} is already performing an action, not moving..."
            )
            return

        self.cams[camera_name]["active"] = True
        self.camera_metrics[camera_name]["ptz_stopped"].clear()
        onvif: ONVIFCamera = self.cams[camera_name]["onvif"]
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
            "Zoom": 0,
        }

        move_request.Translation.PanTilt.x = pan
        move_request.Translation.PanTilt.y = tilt
        move_request.Translation.Zoom.x = 0

        onvif.get_service("ptz").RelativeMove(move_request)

        self.cams[camera_name]["active"] = False

    def _move_to_preset(self, camera_name: str, preset: str) -> None:
        if preset not in self.cams[camera_name]["presets"]:
            logger.error(f"{preset} is not a valid preset for {camera_name}")
            return

        self.cams[camera_name]["active"] = True
        self.camera_metrics[camera_name]["ptz_stopped"].clear()
        move_request = self.cams[camera_name]["move_request"]
        onvif: ONVIFCamera = self.cams[camera_name]["onvif"]
        preset_token = self.cams[camera_name]["presets"][preset]
        onvif.get_service("ptz").GotoPreset(
            {
                "ProfileToken": move_request.ProfileToken,
                "PresetToken": preset_token,
            }
        )
        self.camera_metrics[camera_name]["ptz_stopped"].set()
        self.cams[camera_name]["active"] = False

    def _zoom(self, camera_name: str, command: OnvifCommandEnum) -> None:
        if self.cams[camera_name]["active"]:
            logger.warning(
                f"{camera_name} is already performing an action, stopping..."
            )
            self._stop(camera_name)

        self.cams[camera_name]["active"] = True
        onvif: ONVIFCamera = self.cams[camera_name]["onvif"]
        move_request = self.cams[camera_name]["move_request"]

        if command == OnvifCommandEnum.zoom_in:
            move_request.Velocity = {"Zoom": {"x": 0.5}}
        elif command == OnvifCommandEnum.zoom_out:
            move_request.Velocity = {"Zoom": {"x": -0.5}}

        onvif.get_service("ptz").ContinuousMove(move_request)

    def handle_command(
        self, camera_name: str, command: OnvifCommandEnum, param: str = ""
    ) -> None:
        if camera_name not in self.cams.keys():
            logger.error(f"Onvif is not setup for {camera_name}")
            return

        if not self.cams[camera_name]["init"]:
            if not self._init_onvif(camera_name):
                return

        if command == OnvifCommandEnum.init:
            # already init
            return
        elif command == OnvifCommandEnum.stop:
            self._stop(camera_name)
        elif command == OnvifCommandEnum.preset:
            self._move_to_preset(camera_name, param)
        elif (
            command == OnvifCommandEnum.zoom_in or command == OnvifCommandEnum.zoom_out
        ):
            self._zoom(camera_name, command)
        else:
            self._move(camera_name, command)

    def get_camera_info(self, camera_name: str) -> dict[str, any]:
        if camera_name not in self.cams.keys():
            logger.error(f"Onvif is not setup for {camera_name}")
            return {}

        if not self.cams[camera_name]["init"]:
            self._init_onvif(camera_name)

        return {
            "name": camera_name,
            "features": self.cams[camera_name]["features"],
            "presets": list(self.cams[camera_name]["presets"].keys()),
        }

    def get_camera_status(self, camera_name: str) -> dict[str, any]:
        if camera_name not in self.cams.keys():
            logger.error(f"Onvif is not setup for {camera_name}")
            return {}

        if not self.cams[camera_name]["init"]:
            self._init_onvif(camera_name)

        onvif: ONVIFCamera = self.cams[camera_name]["onvif"]
        status_request = self.cams[camera_name]["status_request"]
        status = onvif.get_service("ptz").GetStatus(status_request)

        if status.MoveStatus.PanTilt == "IDLE" and status.MoveStatus.Zoom == "IDLE":
            self.cams[camera_name]["active"] = False
            self.camera_metrics[camera_name]["ptz_stopped"].set()
        else:
            self.cams[camera_name]["active"] = True
            self.camera_metrics[camera_name]["ptz_stopped"].clear()

        return {
            "pan": status.Position.PanTilt.x,
            "tilt": status.Position.PanTilt.y,
            "zoom": status.Position.Zoom.x,
            "pantilt_moving": status.MoveStatus.PanTilt,
            "zoom_moving": status.MoveStatus.Zoom,
        }
