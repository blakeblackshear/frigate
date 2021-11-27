from onvif import ONVIFCamera

from frigate.config import CameraConfig


class Ptz:
    def __init__(self, config: CameraConfig):
        if config.onvif.host is not None:
            onvif_camera = ONVIFCamera(
                config.onvif.host,
                config.onvif.port,
                config.onvif.username,
                config.onvif.password,
            )
            media_service = onvif_camera.create_media_service()

            self.ptz_service = onvif_camera.create_ptz_service()

            profile = media_service.GetProfiles()[0]

            request = self.ptz_service.create_type("GetConfigurationOptions")
            request.ConfigurationToken = profile.PTZConfiguration.token
            self.ptz_configuration_options = self.ptz_service.GetConfigurationOptions(
                request
            )

            self.move_request = self.ptz_service.create_type("ContinuousMove")
            self.move_request.ProfileToken = profile.token
            if self.move_request.Velocity is None:
                self.move_request.Velocity = self.ptz_service.GetStatus(
                    {"ProfileToken": profile.token}
                ).Position

            self.set_preset_request = self.ptz_service.create_type("SetPreset")
            self.set_preset_request.ProfileToken = profile.token

            self.goto_preset_request = self.ptz_service.create_type("GotoPreset")
            self.goto_preset_request.ProfileToken = profile.token
            if self.goto_preset_request.Speed is None:
                self.goto_preset_request.Speed = self.ptz_service.GetStatus(
                    {"ProfileToken": profile.token}
                ).Position

            self.turn_speed = config.ptz.turn_speed
            self.invert_y_axis = config.ptz.invert_y_axis

            self.active = False

    def move(self, request):
        if self.active:
            self.ptz_service.Stop({"ProfileToken": request.ProfileToken})

        self.active = True
        self.ptz_service.ContinuousMove(request)

    def move_up(self):
        request = self.move_request
        request.Velocity.PanTilt.x = 0
        request.Velocity.PanTilt.y = -1 if self.invert_y_axis else 1 * self.turn_speed
        self.move(request)

    def move_down(self):
        request = self.move_request
        request.Velocity.PanTilt.x = 0
        request.Velocity.PanTilt.y = 1 if self.invert_y_axis else -1 * self.turn_speed
        self.move(request)

    def move_right(self):
        request = self.move_request
        request.Velocity.PanTilt.x = self.turn_speed
        request.Velocity.PanTilt.y = 0
        self.move(request)

    def move_left(self):
        request = self.move_request
        request.Velocity.PanTilt.x = -1 * self.turn_speed
        request.Velocity.PanTilt.y = 0
        self.move(request)

    def zoom_in(self):
        request = self.move_request
        request.Velocity.Zoom.x = 1
        self.move(request)

    def zoom_out(self):
        request = self.move_request
        request.Velocity.Zoom.x = -1
        self.move(request)

    def set_home(self):
        request = self.set_preset_request
        request.PresetToken = "1"
        self.ptz_service.SetPreset(request)

    def goto_home(self):
        request = self.goto_preset_request
        request.PresetToken = "1"
        request.Speed.PanTilt.x = self.turn_speed
        request.Speed.PanTilt.y = self.turn_speed
        self.ptz_service.GotoPreset(request)

    def stop(self):
        request = {
            "ProfileToken": self.move_request.ProfileToken,
            "PanTilt": True,
            "Zoom": True,
        }
        self.ptz_service.Stop(request)
        self.active = False
