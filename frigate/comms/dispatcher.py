"""Handle communication between Frigate and other applications."""

import logging
from abc import ABC, abstractmethod
from typing import Any, Callable

from frigate.config import FrigateConfig
from frigate.ptz import OnvifCommandEnum, OnvifController
from frigate.types import CameraMetricsTypes, RecordMetricsTypes
from frigate.util import restart_frigate

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
        record_metrics: dict[str, RecordMetricsTypes],
        communicators: list[Communicator],
    ) -> None:
        self.config = config
        self.onvif = onvif
        self.camera_metrics = camera_metrics
        self.record_metrics = record_metrics
        self.comms = communicators

        for comm in self.comms:
            comm.subscribe(self._receive)

        self._camera_settings_handlers: dict[str, Callable] = {
            "detect": self._on_detect_command,
            "improve_contrast": self._on_motion_improve_contrast_command,
            "motion": self._on_motion_command,
            "motion_contour_area": self._on_motion_contour_area_command,
            "motion_threshold": self._on_motion_threshold_command,
            "recordings": self._on_recordings_command,
            "snapshots": self._on_snapshots_command,
        }

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
                self.record_metrics[camera_name]["record_enabled"].value = True
        elif payload == "OFF":
            if self.record_metrics[camera_name]["record_enabled"].value:
                logger.info(f"Turning off recordings for {camera_name}")
                record_settings.enabled = False
                self.record_metrics[camera_name]["record_enabled"].value = False

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
                param = payload.lower().split("-")[1]
            else:
                command = OnvifCommandEnum[payload.lower()]
                param = ""

            self.onvif.handle_command(camera_name, command, param)
            logger.info(f"Setting ptz command to {command} for {camera_name}")
        except KeyError as k:
            logger.error(f"Invalid PTZ command {payload}: {k}")
