"""Configure and control camera via onvif."""

import logging

from enum import Enum
from onvif import ONVIFCamera

from frigate.config import FrigateConfig


logger = logging.getLogger(__name__)


class OnvifCommandEnum(str, Enum):
    """Holds all possible move commands"""

    move_down = "move_down"
    move_left = "move_left"
    move_right = "move_right"
    move_up = "move_up"
    stop = "stop"


class OnvifController:
    def __init__(self, config: FrigateConfig) -> None:
        self.cams: dict[str, ONVIFCamera] = {}

        for cam_name, cam in config.cameras.items():
            if cam.onvif.host:
                self.cams[cam_name] = {
                    "onvif": ONVIFCamera(
                        cam.onvif.host,
                        cam.onvif.port,
                        cam.onvif.user,
                        cam.onvif.password,
                    ),
                    "init": False,
                    "active": False,
                }

    def _init_onvif(self, camera_name: str) -> None:
        onvif: ONVIFCamera = self.cams[camera_name]["onvif"]
        media = onvif.create_media_service()
        profile = media.GetProfiles()[0]
        ptz = onvif.create_ptz_service()
        request = ptz.create_type("GetConfigurationOptions")
        request.ConfigurationToken = profile.PTZConfiguration.token
        ptz_config = ptz.GetConfigurationOptions(request)
        move_request = ptz.create_type("ContinuousMove")
        move_request.ProfileToken = profile.token
        self.cams[camera_name]["move_request"] = move_request
        self.cams[camera_name]["init"] = True

    def _stop(self, camera_name: str) -> None:
        logger.error(f"Stop onvif")
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
        logger.error(f"Move onvif {command}")
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
        else:
            move_request.Velocity = {
                "PanTilt": {
                    "x": 0,
                    "y": -0.5,
                }
            }

        onvif.get_service("ptz").ContinuousMove(move_request)

    def handle_command(self, camera_name, command: OnvifCommandEnum) -> None:
        if camera_name not in self.cams.keys():
            logger.error(f"Onvif is not setup for {camera_name}")
            return

        if not self.cams[camera_name]["init"]:
            self._init_onvif(camera_name)

        if command == OnvifCommandEnum.stop:
            self._stop(camera_name)
        else:
            self._move(camera_name, command)
