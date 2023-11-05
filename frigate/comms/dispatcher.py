"""Handle communication between Frigate and other applications."""

import logging
from abc import ABC, abstractmethod
from typing import Any, Callable

from frigate.config import BirdseyeModeEnum, FrigateConfig
from frigate.const import INSERT_MANY_RECORDINGS, REQUEST_REGION_GRID
from frigate.models import Recordings
from frigate.ptz.onvif import OnvifCommandEnum, OnvifController
from frigate.types import CameraMetricsTypes, FeatureMetricsTypes, PTZMetricsTypes
from frigate.util.object import get_camera_regions_grid
from frigate.util.services import restart_frigate

logger = logging.getLogger(__name__)


class Communicator(ABC):
    """pub/sub model via specific protocol."""

    @abstractmethod
    def publish(self, topic: str, payload: Any, retain: bool = False) -> None:
        """Send data via specific protocol."""
        pass

    @abstractmethod
    def subscribe(self, receiver: Callable) -> None:
        """Pass receiver so communicators can pass commands."""
        pass

    @abstractmethod
    def stop(self) -> None:
        """Stop the communicator."""
        pass


class Dispatcher:
    """Handle communication between Frigate and communicators."""

    def __init__(
        self,
        config: FrigateConfig,
        onvif: OnvifController,
        camera_metrics: dict[str, CameraMetricsTypes],
        feature_metrics: dict[str, FeatureMetricsTypes],
        ptz_metrics: dict[str, PTZMetricsTypes],
        communicators: list[Communicator],
    ) -> None:
        self.config = config
        self.onvif = onvif
        self.camera_metrics = camera_metrics
        self.feature_metrics = feature_metrics
        self.ptz_metrics = ptz_metrics
        self.comms = communicators

        self._camera_settings_handlers: dict[str, Callable] = {
            "audio": self._on_audio_command,
            "detect": self._on_detect_command,
            "improve_contrast": self._on_motion_improve_contrast_command,
            "ptz_autotracker": self._on_ptz_autotracker_command,
            "motion": self._on_motion_command,
            "motion_contour_area": self._on_motion_contour_area_command,
            "motion_threshold": self._on_motion_threshold_command,
            "recordings": self._on_recordings_command,
            "snapshots": self._on_snapshots_command,
            "birdseye": self._on_birdseye_command,
            "birdseye_mode": self._on_birdseye_mode_command,
        }

        for comm in self.comms:
            comm.subscribe(self._receive)

    def _receive(self, topic: str, payload: str) -> None:
        """Handle receiving of payload from communicators."""
        if topic.endswith("set"):
            try:
                # example /cam_name/detect/set payload=ON|OFF
                camera_name = topic.split("/")[-3]
                command = topic.split("/")[-2]
                self._camera_settings_handlers[command](camera_name, payload)
            except IndexError:
                logger.error(f"Received invalid set command: {topic}")
                return
        elif topic.endswith("ptz"):
            try:
                # example /cam_name/ptz payload=MOVE_UP|MOVE_DOWN|STOP...
                camera_name = topic.split("/")[-2]
                self._on_ptz_command(camera_name, payload)
            except IndexError:
                logger.error(f"Received invalid ptz command: {topic}")
                return
        elif topic == "restart":
            restart_frigate()
        elif topic == INSERT_MANY_RECORDINGS:
            Recordings.insert_many(payload).execute()
        elif topic == REQUEST_REGION_GRID:
            camera = payload
            self.camera_metrics[camera]["region_grid_queue"].put(
                get_camera_regions_grid(
                    camera,
                    self.config.cameras[camera].detect,
                    max(self.config.model.width, self.config.model.height),
                )
            )
        else:
            self.publish(topic, payload, retain=False)

    def publish(self, topic: str, payload: Any, retain: bool = False) -> None:
        """Handle publishing to communicators."""
        for comm in self.comms:
            comm.publish(topic, payload, retain)

    def stop(self) -> None:
        for comm in self.comms:
            comm.stop()

    def _on_detect_command(self, camera_name: str, payload: str) -> None:
        """Callback for detect topic."""
        detect_settings = self.config.cameras[camera_name].detect

        if payload == "ON":
            if not self.camera_metrics[camera_name]["detection_enabled"].value:
                logger.info(f"Turning on detection for {camera_name}")
                self.camera_metrics[camera_name]["detection_enabled"].value = True
                detect_settings.enabled = True

                if not self.camera_metrics[camera_name]["motion_enabled"].value:
                    logger.info(
                        f"Turning on motion for {camera_name} due to detection being enabled."
                    )
                    self.camera_metrics[camera_name]["motion_enabled"].value = True
                    self.publish(f"{camera_name}/motion/state", payload, retain=True)
        elif payload == "OFF":
            if self.camera_metrics[camera_name]["detection_enabled"].value:
                logger.info(f"Turning off detection for {camera_name}")
                self.camera_metrics[camera_name]["detection_enabled"].value = False
                detect_settings.enabled = False

        self.publish(f"{camera_name}/detect/state", payload, retain=True)

    def _on_motion_command(self, camera_name: str, payload: str) -> None:
        """Callback for motion topic."""
        if payload == "ON":
            if not self.camera_metrics[camera_name]["motion_enabled"].value:
                logger.info(f"Turning on motion for {camera_name}")
                self.camera_metrics[camera_name]["motion_enabled"].value = True
        elif payload == "OFF":
            if self.camera_metrics[camera_name]["detection_enabled"].value:
                logger.error(
                    "Turning off motion is not allowed when detection is enabled."
                )
                return

            if self.camera_metrics[camera_name]["motion_enabled"].value:
                logger.info(f"Turning off motion for {camera_name}")
                self.camera_metrics[camera_name]["motion_enabled"].value = False

        self.publish(f"{camera_name}/motion/state", payload, retain=True)

    def _on_motion_improve_contrast_command(
        self, camera_name: str, payload: str
    ) -> None:
        """Callback for improve_contrast topic."""
        motion_settings = self.config.cameras[camera_name].motion

        if payload == "ON":
            if not self.camera_metrics[camera_name]["improve_contrast_enabled"].value:
                logger.info(f"Turning on improve contrast for {camera_name}")
                self.camera_metrics[camera_name][
                    "improve_contrast_enabled"
                ].value = True
                motion_settings.improve_contrast = True  # type: ignore[union-attr]
        elif payload == "OFF":
            if self.camera_metrics[camera_name]["improve_contrast_enabled"].value:
                logger.info(f"Turning off improve contrast for {camera_name}")
                self.camera_metrics[camera_name][
                    "improve_contrast_enabled"
                ].value = False
                motion_settings.improve_contrast = False  # type: ignore[union-attr]

        self.publish(f"{camera_name}/improve_contrast/state", payload, retain=True)

    def _on_ptz_autotracker_command(self, camera_name: str, payload: str) -> None:
        """Callback for ptz_autotracker topic."""
        ptz_autotracker_settings = self.config.cameras[camera_name].onvif.autotracking

        if payload == "ON":
            if not self.ptz_metrics[camera_name]["ptz_autotracker_enabled"].value:
                logger.info(f"Turning on ptz autotracker for {camera_name}")
                self.ptz_metrics[camera_name]["ptz_autotracker_enabled"].value = True
                self.ptz_metrics[camera_name]["ptz_start_time"].value = 0
                ptz_autotracker_settings.enabled = True
        elif payload == "OFF":
            if self.ptz_metrics[camera_name]["ptz_autotracker_enabled"].value:
                logger.info(f"Turning off ptz autotracker for {camera_name}")
                self.ptz_metrics[camera_name]["ptz_autotracker_enabled"].value = False
                self.ptz_metrics[camera_name]["ptz_start_time"].value = 0
                ptz_autotracker_settings.enabled = False

        self.publish(f"{camera_name}/ptz_autotracker/state", payload, retain=True)

    def _on_motion_contour_area_command(self, camera_name: str, payload: int) -> None:
        """Callback for motion contour topic."""
        try:
            payload = int(payload)
        except ValueError:
            f"Received unsupported value for motion contour area: {payload}"
            return

        motion_settings = self.config.cameras[camera_name].motion
        logger.info(f"Setting motion contour area for {camera_name}: {payload}")
        self.camera_metrics[camera_name]["motion_contour_area"].value = payload
        motion_settings.contour_area = payload  # type: ignore[union-attr]
        self.publish(f"{camera_name}/motion_contour_area/state", payload, retain=True)

    def _on_motion_threshold_command(self, camera_name: str, payload: int) -> None:
        """Callback for motion threshold topic."""
        try:
            payload = int(payload)
        except ValueError:
            f"Received unsupported value for motion threshold: {payload}"
            return

        motion_settings = self.config.cameras[camera_name].motion
        logger.info(f"Setting motion threshold for {camera_name}: {payload}")
        self.camera_metrics[camera_name]["motion_threshold"].value = payload
        motion_settings.threshold = payload  # type: ignore[union-attr]
        self.publish(f"{camera_name}/motion_threshold/state", payload, retain=True)

    def _on_audio_command(self, camera_name: str, payload: str) -> None:
        """Callback for audio topic."""
        audio_settings = self.config.cameras[camera_name].audio

        if payload == "ON":
            if not self.config.cameras[camera_name].audio.enabled_in_config:
                logger.error(
                    "Audio detection must be enabled in the config to be turned on via MQTT."
                )
                return

            if not audio_settings.enabled:
                logger.info(f"Turning on audio detection for {camera_name}")
                audio_settings.enabled = True
                self.feature_metrics[camera_name]["audio_enabled"].value = True
        elif payload == "OFF":
            if self.feature_metrics[camera_name]["audio_enabled"].value:
                logger.info(f"Turning off audio detection for {camera_name}")
                audio_settings.enabled = False
                self.feature_metrics[camera_name]["audio_enabled"].value = False

        self.publish(f"{camera_name}/audio/state", payload, retain=True)

    def _on_recordings_command(self, camera_name: str, payload: str) -> None:
        """Callback for recordings topic."""
        record_settings = self.config.cameras[camera_name].record

        if payload == "ON":
            if not self.config.cameras[camera_name].record.enabled_in_config:
                logger.error(
                    "Recordings must be enabled in the config to be turned on via MQTT."
                )
                return

            if not record_settings.enabled:
                logger.info(f"Turning on recordings for {camera_name}")
                record_settings.enabled = True
                self.feature_metrics[camera_name]["record_enabled"].value = True
        elif payload == "OFF":
            if self.feature_metrics[camera_name]["record_enabled"].value:
                logger.info(f"Turning off recordings for {camera_name}")
                record_settings.enabled = False
                self.feature_metrics[camera_name]["record_enabled"].value = False

        self.publish(f"{camera_name}/recordings/state", payload, retain=True)

    def _on_snapshots_command(self, camera_name: str, payload: str) -> None:
        """Callback for snapshots topic."""
        snapshots_settings = self.config.cameras[camera_name].snapshots

        if payload == "ON":
            if not snapshots_settings.enabled:
                logger.info(f"Turning on snapshots for {camera_name}")
                snapshots_settings.enabled = True
        elif payload == "OFF":
            if snapshots_settings.enabled:
                logger.info(f"Turning off snapshots for {camera_name}")
                snapshots_settings.enabled = False

        self.publish(f"{camera_name}/snapshots/state", payload, retain=True)

    def _on_ptz_command(self, camera_name: str, payload: str) -> None:
        """Callback for ptz topic."""
        try:
            if "preset" in payload.lower():
                command = OnvifCommandEnum.preset
                param = payload.lower()[payload.index("_") + 1 :]
            else:
                command = OnvifCommandEnum[payload.lower()]
                param = ""

            self.onvif.handle_command(camera_name, command, param)
            logger.info(f"Setting ptz command to {command} for {camera_name}")
        except KeyError as k:
            logger.error(f"Invalid PTZ command {payload}: {k}")

    def _on_birdseye_command(self, camera_name: str, payload: str) -> None:
        """Callback for birdseye topic."""
        birdseye_settings = self.config.cameras[camera_name].birdseye

        if payload == "ON":
            if not self.camera_metrics[camera_name]["birdseye_enabled"].value:
                logger.info(f"Turning on birdseye for {camera_name}")
                self.camera_metrics[camera_name]["birdseye_enabled"].value = True
                birdseye_settings.enabled = True

        elif payload == "OFF":
            if self.camera_metrics[camera_name]["birdseye_enabled"].value:
                logger.info(f"Turning off birdseye for {camera_name}")
                self.camera_metrics[camera_name]["birdseye_enabled"].value = False
                birdseye_settings.enabled = False

        self.publish(f"{camera_name}/birdseye/state", payload, retain=True)

    def _on_birdseye_mode_command(self, camera_name: str, payload: str) -> None:
        """Callback for birdseye mode topic."""

        if payload not in ["CONTINUOUS", "MOTION", "OBJECTS"]:
            logger.info(f"Invalid birdseye_mode command: {payload}")
            return

        birdseye_config = self.config.cameras[camera_name].birdseye
        if not birdseye_config.enabled:
            logger.info(f"Birdseye mode not enabled for {camera_name}")
            return

        new_birdseye_mode = BirdseyeModeEnum(payload.lower())
        logger.info(f"Setting birdseye mode for {camera_name} to {new_birdseye_mode}")

        # update the metric (need the mode converted to an int)
        self.camera_metrics[camera_name][
            "birdseye_mode"
        ].value = BirdseyeModeEnum.get_index(new_birdseye_mode)

        self.publish(f"{camera_name}/birdseye_mode/state", payload, retain=True)
