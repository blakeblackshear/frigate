"""Configure and control camera via onvif."""

import logging
import site

from enum import Enum
from onvif import ONVIFCamera, ONVIFError

from frigate.config import FrigateConfig


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
    def __init__(self, config: FrigateConfig) -> None:
        self.cams: dict[str, ONVIFCamera] = {}

        for cam_name, cam in config.cameras.items():
            if not cam.enabled:
                continue

            if cam.onvif.host:
                self.cams[cam_name] = {
                    "onvif": ONVIFCamera(
                        cam.onvif.host,
                        cam.onvif.port,
                        cam.onvif.user,
                        cam.onvif.password,
                        wsdl_dir="/home/vscode/.local/lib/python3.4/site-packages/wsdl/",
                    ),
                    "init": False,
                    "active": False,
                    "presets": {},
                }

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

        # setup moving request
        move_request = ptz.create_type("ContinuousMove")
        move_request.ProfileToken = profile.token
        self.cams[camera_name]["move_request"] = move_request

        # setup existing presets
        presets: list[dict] = ptz.GetPresets({"ProfileToken": profile.token})
        for preset in presets:
            self.cams[camera_name]["presets"][preset["Name"].lower()] = preset["token"]

        # get list of supported features
        ptz_config = ptz.GetConfigurationOptions(request)
        supported_features = []

        if ptz_config.Spaces and ptz_config.Spaces.ContinuousPanTiltVelocitySpace:
            supported_features.append("pt")

        if ptz_config.Spaces and ptz_config.Spaces.ContinuousZoomVelocitySpace:
            supported_features.append("zoom")

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

    def _move_to_preset(self, camera_name: str, preset: str) -> None:
        if not preset in self.cams[camera_name]["presets"]:
            logger.error(f"{preset} is not a valid preset for {camera_name}")
            return

        self.cams[camera_name]["active"] = True
        move_request = self.cams[camera_name]["move_request"]
        onvif: ONVIFCamera = self.cams[camera_name]["onvif"]
        preset_token = self.cams[camera_name]["presets"][preset]
        onvif.get_service("ptz").GotoPreset(
            {
                "ProfileToken": move_request.ProfileToken,
                "PresetToken": preset_token,
            }
        )
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
