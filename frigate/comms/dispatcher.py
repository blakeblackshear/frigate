"""Handle communication between Frigate and other applications."""

import datetime
import json
import logging
from typing import Any, Callable, Optional, cast

from frigate.camera import PTZMetrics
from frigate.camera.activity_manager import AudioActivityManager, CameraActivityManager
from frigate.comms.base_communicator import Communicator
from frigate.comms.webpush import WebPushClient
from frigate.config import BirdseyeModeEnum, FrigateConfig
from frigate.config.camera.updater import (
    CameraConfigUpdateEnum,
    CameraConfigUpdatePublisher,
    CameraConfigUpdateTopic,
)
from frigate.const import (
    CLEAR_ONGOING_REVIEW_SEGMENTS,
    EXPIRE_AUDIO_ACTIVITY,
    INSERT_MANY_RECORDINGS,
    INSERT_PREVIEW,
    NOTIFICATION_TEST,
    REQUEST_REGION_GRID,
    UPDATE_AUDIO_ACTIVITY,
    UPDATE_AUDIO_TRANSCRIPTION_STATE,
    UPDATE_BIRDSEYE_LAYOUT,
    UPDATE_CAMERA_ACTIVITY,
    UPDATE_EMBEDDINGS_REINDEX_PROGRESS,
    UPDATE_EVENT_DESCRIPTION,
    UPDATE_MODEL_STATE,
    UPDATE_REVIEW_DESCRIPTION,
    UPSERT_REVIEW_SEGMENT,
)
from frigate.models import Event, Previews, Recordings, ReviewSegment
from frigate.ptz.onvif import OnvifCommandEnum, OnvifController
from frigate.types import ModelStatusTypesEnum, TrackedObjectUpdateTypesEnum
from frigate.util.object import get_camera_regions_grid
from frigate.util.services import restart_frigate

logger = logging.getLogger(__name__)


class Dispatcher:
    """Handle communication between Frigate and communicators."""

    def __init__(
        self,
        config: FrigateConfig,
        config_updater: CameraConfigUpdatePublisher,
        onvif: OnvifController,
        ptz_metrics: dict[str, PTZMetrics],
        communicators: list[Communicator],
    ) -> None:
        self.config = config
        self.config_updater = config_updater
        self.onvif = onvif
        self.ptz_metrics = ptz_metrics
        self.comms = communicators
        self.camera_activity = CameraActivityManager(config, self.publish)
        self.audio_activity = AudioActivityManager(config, self.publish)
        self.model_state: dict[str, ModelStatusTypesEnum] = {}
        self.embeddings_reindex: dict[str, Any] = {}
        self.birdseye_layout: dict[str, Any] = {}
        self.audio_transcription_state: str = "idle"
        self._camera_settings_handlers: dict[str, Callable] = {
            "audio": self._on_audio_command,
            "audio_transcription": self._on_audio_transcription_command,
            "detect": self._on_detect_command,
            "enabled": self._on_enabled_command,
            "improve_contrast": self._on_motion_improve_contrast_command,
            "ptz_autotracker": self._on_ptz_autotracker_command,
            "motion": self._on_motion_command,
            "motion_contour_area": self._on_motion_contour_area_command,
            "motion_threshold": self._on_motion_threshold_command,
            "notifications": self._on_camera_notification_command,
            "recordings": self._on_recordings_command,
            "snapshots": self._on_snapshots_command,
            "birdseye": self._on_birdseye_command,
            "birdseye_mode": self._on_birdseye_mode_command,
            "review_alerts": self._on_alerts_command,
            "review_detections": self._on_detections_command,
            "object_descriptions": self._on_object_description_command,
            "review_descriptions": self._on_review_description_command,
        }
        self._global_settings_handlers: dict[str, Callable] = {
            "notifications": self._on_global_notification_command,
        }

        for comm in self.comms:
            comm.subscribe(self._receive)

        self.web_push_client = next(
            (comm for comm in communicators if isinstance(comm, WebPushClient)), None
        )

    def _receive(self, topic: str, payload: Any) -> Optional[Any]:
        """Handle receiving of payload from communicators."""

        def handle_camera_command(
            command_type: str, camera_name: str, command: str, payload: str
        ) -> None:
            try:
                if command_type == "set":
                    self._camera_settings_handlers[command](camera_name, payload)
                elif command_type == "ptz":
                    self._on_ptz_command(camera_name, payload)
            except KeyError:
                logger.error(f"Invalid command type or handler: {command_type}")

        def handle_restart() -> None:
            restart_frigate()

        def handle_insert_many_recordings() -> None:
            Recordings.insert_many(payload).execute()

        def handle_request_region_grid() -> Any:
            camera = payload
            grid = get_camera_regions_grid(
                camera,
                self.config.cameras[camera].detect,
                max(self.config.model.width, self.config.model.height),
            )
            return grid

        def handle_insert_preview() -> None:
            Previews.insert(payload).execute()

        def handle_upsert_review_segment() -> None:
            ReviewSegment.insert(payload).on_conflict(
                conflict_target=[ReviewSegment.id],
                update=payload,
            ).execute()

        def handle_clear_ongoing_review_segments() -> None:
            ReviewSegment.update(end_time=datetime.datetime.now().timestamp()).where(
                ReviewSegment.end_time.is_null(True)
            ).execute()

        def handle_update_camera_activity() -> None:
            self.camera_activity.update_activity(payload)

        def handle_update_audio_activity() -> None:
            self.audio_activity.update_activity(payload)

        def handle_expire_audio_activity() -> None:
            self.audio_activity.expire_all(payload)

        def handle_update_event_description() -> None:
            event: Event = Event.get(Event.id == payload["id"])
            cast(dict, event.data)["description"] = payload["description"]
            event.save()
            self.publish(
                "tracked_object_update",
                json.dumps(
                    {
                        "type": TrackedObjectUpdateTypesEnum.description,
                        "id": event.id,
                        "description": event.data["description"],
                        "camera": event.camera,
                    }
                ),
            )

        def handle_update_review_description() -> None:
            final_data = payload["after"]
            ReviewSegment.insert(final_data).on_conflict(
                conflict_target=[ReviewSegment.id],
                update=final_data,
            ).execute()
            self.publish("reviews", json.dumps(payload))

        def handle_update_model_state() -> None:
            if payload:
                model = payload["model"]
                state = payload["state"]
                self.model_state[model] = ModelStatusTypesEnum[state]
                self.publish("model_state", json.dumps(self.model_state))

        def handle_model_state() -> None:
            self.publish("model_state", json.dumps(self.model_state.copy()))

        def handle_update_audio_transcription_state() -> None:
            if payload:
                self.audio_transcription_state = payload
                self.publish(
                    "audio_transcription_state",
                    json.dumps(self.audio_transcription_state),
                )

        def handle_audio_transcription_state() -> None:
            self.publish(
                "audio_transcription_state", json.dumps(self.audio_transcription_state)
            )

        def handle_update_embeddings_reindex_progress() -> None:
            self.embeddings_reindex = payload
            self.publish(
                "embeddings_reindex_progress",
                json.dumps(payload),
            )

        def handle_embeddings_reindex_progress() -> None:
            self.publish(
                "embeddings_reindex_progress",
                json.dumps(self.embeddings_reindex.copy()),
            )

        def handle_update_birdseye_layout() -> None:
            if payload:
                self.birdseye_layout = payload
                self.publish("birdseye_layout", json.dumps(self.birdseye_layout))

        def handle_birdseye_layout() -> None:
            self.publish("birdseye_layout", json.dumps(self.birdseye_layout.copy()))

        def handle_on_connect() -> None:
            camera_status = self.camera_activity.last_camera_activity.copy()
            audio_detections = self.audio_activity.current_audio_detections.copy()
            cameras_with_status = camera_status.keys()

            for camera in self.config.cameras.keys():
                if camera not in cameras_with_status:
                    camera_status[camera] = {}

                camera_status[camera]["config"] = {
                    "detect": self.config.cameras[camera].detect.enabled,
                    "enabled": self.config.cameras[camera].enabled,
                    "snapshots": self.config.cameras[camera].snapshots.enabled,
                    "record": self.config.cameras[camera].record.enabled,
                    "audio": self.config.cameras[camera].audio.enabled,
                    "audio_transcription": self.config.cameras[
                        camera
                    ].audio_transcription.live_enabled,
                    "notifications": self.config.cameras[camera].notifications.enabled,
                    "notifications_suspended": int(
                        self.web_push_client.suspended_cameras.get(camera, 0)
                    )
                    if self.web_push_client
                    and camera in self.web_push_client.suspended_cameras
                    else 0,
                    "autotracking": self.config.cameras[
                        camera
                    ].onvif.autotracking.enabled,
                    "alerts": self.config.cameras[camera].review.alerts.enabled,
                    "detections": self.config.cameras[camera].review.detections.enabled,
                    "object_descriptions": self.config.cameras[
                        camera
                    ].objects.genai.enabled,
                    "review_descriptions": self.config.cameras[
                        camera
                    ].review.genai.enabled,
                }

            self.publish("camera_activity", json.dumps(camera_status))
            self.publish("model_state", json.dumps(self.model_state.copy()))
            self.publish(
                "embeddings_reindex_progress",
                json.dumps(self.embeddings_reindex.copy()),
            )
            self.publish("birdseye_layout", json.dumps(self.birdseye_layout.copy()))
            self.publish("audio_detections", json.dumps(audio_detections))

        def handle_notification_test() -> None:
            self.publish("notification_test", "Test notification")

        # Dictionary mapping topic to handlers
        topic_handlers = {
            INSERT_MANY_RECORDINGS: handle_insert_many_recordings,
            REQUEST_REGION_GRID: handle_request_region_grid,
            INSERT_PREVIEW: handle_insert_preview,
            UPSERT_REVIEW_SEGMENT: handle_upsert_review_segment,
            CLEAR_ONGOING_REVIEW_SEGMENTS: handle_clear_ongoing_review_segments,
            UPDATE_CAMERA_ACTIVITY: handle_update_camera_activity,
            UPDATE_AUDIO_ACTIVITY: handle_update_audio_activity,
            EXPIRE_AUDIO_ACTIVITY: handle_expire_audio_activity,
            UPDATE_EVENT_DESCRIPTION: handle_update_event_description,
            UPDATE_REVIEW_DESCRIPTION: handle_update_review_description,
            UPDATE_MODEL_STATE: handle_update_model_state,
            UPDATE_EMBEDDINGS_REINDEX_PROGRESS: handle_update_embeddings_reindex_progress,
            UPDATE_BIRDSEYE_LAYOUT: handle_update_birdseye_layout,
            UPDATE_AUDIO_TRANSCRIPTION_STATE: handle_update_audio_transcription_state,
            NOTIFICATION_TEST: handle_notification_test,
            "restart": handle_restart,
            "embeddingsReindexProgress": handle_embeddings_reindex_progress,
            "modelState": handle_model_state,
            "audioTranscriptionState": handle_audio_transcription_state,
            "birdseyeLayout": handle_birdseye_layout,
            "onConnect": handle_on_connect,
        }

        if topic.endswith("set") or topic.endswith("ptz") or topic.endswith("suspend"):
            try:
                parts = topic.split("/")
                if len(parts) == 3 and topic.endswith("set"):
                    # example /cam_name/detect/set payload=ON|OFF
                    camera_name = parts[-3]
                    command = parts[-2]
                    handle_camera_command("set", camera_name, command, payload)
                elif len(parts) == 2 and topic.endswith("set"):
                    command = parts[-2]
                    self._global_settings_handlers[command](payload)
                elif len(parts) == 2 and topic.endswith("ptz"):
                    # example /cam_name/ptz payload=MOVE_UP|MOVE_DOWN|STOP...
                    camera_name = parts[-2]
                    handle_camera_command("ptz", camera_name, "", payload)
                elif len(parts) == 3 and topic.endswith("suspend"):
                    # example /cam_name/notifications/suspend payload=duration
                    camera_name = parts[-3]
                    command = parts[-2]
                    self._on_camera_notification_suspend(camera_name, payload)
            except IndexError:
                logger.error(
                    f"Received invalid {topic.split('/')[-1]} command: {topic}"
                )
            return None
        elif topic in topic_handlers:
            return topic_handlers[topic]()
        else:
            self.publish(topic, payload, retain=False)
            return None

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
        motion_settings = self.config.cameras[camera_name].motion

        if payload == "ON":
            if not detect_settings.enabled:
                logger.info(f"Turning on detection for {camera_name}")
                detect_settings.enabled = True

                if not motion_settings.enabled:
                    logger.info(
                        f"Turning on motion for {camera_name} due to detection being enabled."
                    )
                    motion_settings.enabled = True
                    self.config_updater.publish_update(
                        CameraConfigUpdateTopic(
                            CameraConfigUpdateEnum.motion, camera_name
                        ),
                        motion_settings,
                    )
                    self.publish(f"{camera_name}/motion/state", payload, retain=True)
        elif payload == "OFF":
            if detect_settings.enabled:
                logger.info(f"Turning off detection for {camera_name}")
                detect_settings.enabled = False

        self.config_updater.publish_update(
            CameraConfigUpdateTopic(CameraConfigUpdateEnum.detect, camera_name),
            detect_settings,
        )
        self.publish(f"{camera_name}/detect/state", payload, retain=True)

    def _on_enabled_command(self, camera_name: str, payload: str) -> None:
        """Callback for camera topic."""
        camera_settings = self.config.cameras[camera_name]

        if payload == "ON":
            if not self.config.cameras[camera_name].enabled_in_config:
                logger.error(
                    "Camera must be enabled in the config to be turned on via MQTT."
                )
                return
            if not camera_settings.enabled:
                logger.info(f"Turning on camera {camera_name}")
                camera_settings.enabled = True
        elif payload == "OFF":
            if camera_settings.enabled:
                logger.info(f"Turning off camera {camera_name}")
                camera_settings.enabled = False

        self.config_updater.publish_update(
            CameraConfigUpdateTopic(CameraConfigUpdateEnum.enabled, camera_name),
            camera_settings.enabled,
        )
        self.publish(f"{camera_name}/enabled/state", payload, retain=True)

    def _on_motion_command(self, camera_name: str, payload: str) -> None:
        """Callback for motion topic."""
        detect_settings = self.config.cameras[camera_name].detect
        motion_settings = self.config.cameras[camera_name].motion

        if payload == "ON":
            if not motion_settings.enabled:
                logger.info(f"Turning on motion for {camera_name}")
                motion_settings.enabled = True
        elif payload == "OFF":
            if detect_settings.enabled:
                logger.error(
                    "Turning off motion is not allowed when detection is enabled."
                )
                return

            if motion_settings.enabled:
                logger.info(f"Turning off motion for {camera_name}")
                motion_settings.enabled = False

        self.config_updater.publish_update(
            CameraConfigUpdateTopic(CameraConfigUpdateEnum.motion, camera_name),
            motion_settings,
        )
        self.publish(f"{camera_name}/motion/state", payload, retain=True)

    def _on_motion_improve_contrast_command(
        self, camera_name: str, payload: str
    ) -> None:
        """Callback for improve_contrast topic."""
        motion_settings = self.config.cameras[camera_name].motion

        if payload == "ON":
            if not motion_settings.improve_contrast:
                logger.info(f"Turning on improve contrast for {camera_name}")
                motion_settings.improve_contrast = True
        elif payload == "OFF":
            if motion_settings.improve_contrast:
                logger.info(f"Turning off improve contrast for {camera_name}")
                motion_settings.improve_contrast = False

        self.config_updater.publish_update(
            CameraConfigUpdateTopic(CameraConfigUpdateEnum.motion, camera_name),
            motion_settings,
        )
        self.publish(f"{camera_name}/improve_contrast/state", payload, retain=True)

    def _on_ptz_autotracker_command(self, camera_name: str, payload: str) -> None:
        """Callback for ptz_autotracker topic."""
        ptz_autotracker_settings = self.config.cameras[camera_name].onvif.autotracking

        if payload == "ON":
            if not self.config.cameras[
                camera_name
            ].onvif.autotracking.enabled_in_config:
                logger.error(
                    "Autotracking must be enabled in the config to be turned on via MQTT."
                )
                return
            if not self.ptz_metrics[camera_name].autotracker_enabled.value:
                logger.info(f"Turning on ptz autotracker for {camera_name}")
                self.ptz_metrics[camera_name].autotracker_enabled.value = True
                self.ptz_metrics[camera_name].start_time.value = 0
                ptz_autotracker_settings.enabled = True
        elif payload == "OFF":
            if self.ptz_metrics[camera_name].autotracker_enabled.value:
                logger.info(f"Turning off ptz autotracker for {camera_name}")
                self.ptz_metrics[camera_name].autotracker_enabled.value = False
                self.ptz_metrics[camera_name].start_time.value = 0
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
        motion_settings.contour_area = payload
        self.config_updater.publish_update(
            CameraConfigUpdateTopic(CameraConfigUpdateEnum.motion, camera_name),
            motion_settings,
        )
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
        motion_settings.threshold = payload
        self.config_updater.publish_update(
            CameraConfigUpdateTopic(CameraConfigUpdateEnum.motion, camera_name),
            motion_settings,
        )
        self.publish(f"{camera_name}/motion_threshold/state", payload, retain=True)

    def _on_global_notification_command(self, payload: str) -> None:
        """Callback for global notification topic."""
        if payload != "ON" and payload != "OFF":
            f"Received unsupported value for all notification: {payload}"
            return

        notification_settings = self.config.notifications
        logger.info(f"Setting all notifications: {payload}")
        notification_settings.enabled = payload == "ON"
        self.config_updater.publisher.publish(
            "config/notifications", notification_settings
        )
        self.publish("notifications/state", payload, retain=True)

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
        elif payload == "OFF":
            if audio_settings.enabled:
                logger.info(f"Turning off audio detection for {camera_name}")
                audio_settings.enabled = False

        self.config_updater.publish_update(
            CameraConfigUpdateTopic(CameraConfigUpdateEnum.audio, camera_name),
            audio_settings,
        )
        self.publish(f"{camera_name}/audio/state", payload, retain=True)

    def _on_audio_transcription_command(self, camera_name: str, payload: str) -> None:
        """Callback for live audio transcription topic."""
        audio_transcription_settings = self.config.cameras[
            camera_name
        ].audio_transcription

        if payload == "ON":
            if not self.config.cameras[
                camera_name
            ].audio_transcription.enabled_in_config:
                logger.error(
                    "Audio transcription must be enabled in the config to be turned on via MQTT."
                )
                return

            if not audio_transcription_settings.live_enabled:
                logger.info(f"Turning on live audio transcription for {camera_name}")
                audio_transcription_settings.live_enabled = True
        elif payload == "OFF":
            if audio_transcription_settings.live_enabled:
                logger.info(f"Turning off live audio transcription for {camera_name}")
                audio_transcription_settings.live_enabled = False

        self.config_updater.publish_update(
            CameraConfigUpdateTopic(
                CameraConfigUpdateEnum.audio_transcription, camera_name
            ),
            audio_transcription_settings,
        )
        self.publish(f"{camera_name}/audio_transcription/state", payload, retain=True)

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
        elif payload == "OFF":
            if record_settings.enabled:
                logger.info(f"Turning off recordings for {camera_name}")
                record_settings.enabled = False

        self.config_updater.publish_update(
            CameraConfigUpdateTopic(CameraConfigUpdateEnum.record, camera_name),
            record_settings,
        )
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

        self.config_updater.publish_update(
            CameraConfigUpdateTopic(CameraConfigUpdateEnum.snapshots, camera_name),
            snapshots_settings,
        )
        self.publish(f"{camera_name}/snapshots/state", payload, retain=True)

    def _on_ptz_command(self, camera_name: str, payload: str | bytes) -> None:
        """Callback for ptz topic."""
        try:
            preset: str = (
                payload.decode("utf-8") if isinstance(payload, bytes) else payload
            ).lower()

            if "preset" in preset:
                command = OnvifCommandEnum.preset
                param = preset[preset.index("_") + 1 :]
            elif "move_relative" in preset:
                command = OnvifCommandEnum.move_relative
                param = preset[preset.index("_") + 1 :]
            else:
                command = OnvifCommandEnum[preset]
                param = ""

            self.onvif.handle_command(camera_name, command, param)
            logger.info(f"Setting ptz command to {command} for {camera_name}")
        except KeyError as k:
            logger.error(f"Invalid PTZ command {preset}: {k}")

    def _on_birdseye_command(self, camera_name: str, payload: str) -> None:
        """Callback for birdseye topic."""
        birdseye_settings = self.config.cameras[camera_name].birdseye

        if payload == "ON":
            if not birdseye_settings.enabled:
                logger.info(f"Turning on birdseye for {camera_name}")
                birdseye_settings.enabled = True

        elif payload == "OFF":
            if birdseye_settings.enabled:
                logger.info(f"Turning off birdseye for {camera_name}")
                birdseye_settings.enabled = False

        self.config_updater.publish_update(
            CameraConfigUpdateTopic(CameraConfigUpdateEnum.birdseye, camera_name),
            birdseye_settings,
        )
        self.publish(f"{camera_name}/birdseye/state", payload, retain=True)

    def _on_birdseye_mode_command(self, camera_name: str, payload: str) -> None:
        """Callback for birdseye mode topic."""

        if payload not in ["CONTINUOUS", "MOTION", "OBJECTS"]:
            logger.info(f"Invalid birdseye_mode command: {payload}")
            return

        birdseye_settings = self.config.cameras[camera_name].birdseye

        if not birdseye_settings.enabled:
            logger.info(f"Birdseye mode not enabled for {camera_name}")
            return

        birdseye_settings.mode = BirdseyeModeEnum(payload.lower())
        logger.info(
            f"Setting birdseye mode for {camera_name} to {birdseye_settings.mode}"
        )

        self.config_updater.publish_update(
            CameraConfigUpdateTopic(CameraConfigUpdateEnum.birdseye, camera_name),
            birdseye_settings,
        )
        self.publish(f"{camera_name}/birdseye_mode/state", payload, retain=True)

    def _on_camera_notification_command(self, camera_name: str, payload: str) -> None:
        """Callback for camera level notifications topic."""
        notification_settings = self.config.cameras[camera_name].notifications

        if payload == "ON":
            if not self.config.cameras[camera_name].notifications.enabled_in_config:
                logger.error(
                    "Notifications must be enabled in the config to be turned on via MQTT."
                )
                return

            if not notification_settings.enabled:
                logger.info(f"Turning on notifications for {camera_name}")
                notification_settings.enabled = True
            if (
                self.web_push_client
                and camera_name in self.web_push_client.suspended_cameras
            ):
                self.web_push_client.suspended_cameras[camera_name] = 0
        elif payload == "OFF":
            if notification_settings.enabled:
                logger.info(f"Turning off notifications for {camera_name}")
                notification_settings.enabled = False
            if (
                self.web_push_client
                and camera_name in self.web_push_client.suspended_cameras
            ):
                self.web_push_client.suspended_cameras[camera_name] = 0

        self.config_updater.publish_update(
            CameraConfigUpdateTopic(CameraConfigUpdateEnum.notifications, camera_name),
            notification_settings,
        )
        self.publish(f"{camera_name}/notifications/state", payload, retain=True)
        self.publish(f"{camera_name}/notifications/suspended", "0", retain=True)

    def _on_camera_notification_suspend(self, camera_name: str, payload: str) -> None:
        """Callback for camera level notifications suspend topic."""
        try:
            duration = int(payload)
        except ValueError:
            logger.error(f"Invalid suspension duration: {payload}")
            return

        if self.web_push_client is None:
            logger.error("WebPushClient not available for suspension")
            return

        notification_settings = self.config.cameras[camera_name].notifications

        if not notification_settings.enabled:
            logger.error(f"Notifications are not enabled for {camera_name}")
            return

        if duration != 0:
            self.web_push_client.suspend_notifications(camera_name, duration)
        else:
            self.web_push_client.unsuspend_notifications(camera_name)

        self.publish(
            f"{camera_name}/notifications/suspended",
            str(
                int(self.web_push_client.suspended_cameras.get(camera_name, 0))
                if camera_name in self.web_push_client.suspended_cameras
                else 0
            ),
            retain=True,
        )

    def _on_alerts_command(self, camera_name: str, payload: str) -> None:
        """Callback for alerts topic."""
        review_settings = self.config.cameras[camera_name].review

        if payload == "ON":
            if not self.config.cameras[camera_name].review.alerts.enabled_in_config:
                logger.error(
                    "Alerts must be enabled in the config to be turned on via MQTT."
                )
                return

            if not review_settings.alerts.enabled:
                logger.info(f"Turning on alerts for {camera_name}")
                review_settings.alerts.enabled = True
        elif payload == "OFF":
            if review_settings.alerts.enabled:
                logger.info(f"Turning off alerts for {camera_name}")
                review_settings.alerts.enabled = False

        self.config_updater.publish_update(
            CameraConfigUpdateTopic(CameraConfigUpdateEnum.review, camera_name),
            review_settings,
        )
        self.publish(f"{camera_name}/review_alerts/state", payload, retain=True)

    def _on_detections_command(self, camera_name: str, payload: str) -> None:
        """Callback for detections topic."""
        review_settings = self.config.cameras[camera_name].review

        if payload == "ON":
            if not self.config.cameras[camera_name].review.detections.enabled_in_config:
                logger.error(
                    "Detections must be enabled in the config to be turned on via MQTT."
                )
                return

            if not review_settings.detections.enabled:
                logger.info(f"Turning on detections for {camera_name}")
                review_settings.detections.enabled = True
        elif payload == "OFF":
            if review_settings.detections.enabled:
                logger.info(f"Turning off detections for {camera_name}")
                review_settings.detections.enabled = False

        self.config_updater.publish_update(
            CameraConfigUpdateTopic(CameraConfigUpdateEnum.review, camera_name),
            review_settings,
        )
        self.publish(f"{camera_name}/review_detections/state", payload, retain=True)

    def _on_object_description_command(self, camera_name: str, payload: str) -> None:
        """Callback for object description topic."""
        genai_settings = self.config.cameras[camera_name].objects.genai

        if payload == "ON":
            if not self.config.cameras[camera_name].objects.genai.enabled_in_config:
                logger.error(
                    "GenAI must be enabled in the config to be turned on via MQTT."
                )
                return

            if not genai_settings.enabled:
                logger.info(f"Turning on object descriptions for {camera_name}")
                genai_settings.enabled = True
        elif payload == "OFF":
            if genai_settings.enabled:
                logger.info(f"Turning off object descriptions for {camera_name}")
                genai_settings.enabled = False

        self.config_updater.publish_update(
            CameraConfigUpdateTopic(CameraConfigUpdateEnum.object_genai, camera_name),
            genai_settings,
        )
        self.publish(f"{camera_name}/object_descriptions/state", payload, retain=True)

    def _on_review_description_command(self, camera_name: str, payload: str) -> None:
        """Callback for review description topic."""
        genai_settings = self.config.cameras[camera_name].review.genai

        if payload == "ON":
            if not self.config.cameras[camera_name].review.genai.enabled_in_config:
                logger.error(
                    "GenAI Alerts or Detections must be enabled in the config to be turned on via MQTT."
                )
                return

            if not genai_settings.enabled:
                logger.info(f"Turning on review descriptions for {camera_name}")
                genai_settings.enabled = True
        elif payload == "OFF":
            if genai_settings.enabled:
                logger.info(f"Turning off review descriptions for {camera_name}")
                genai_settings.enabled = False

        self.config_updater.publish_update(
            CameraConfigUpdateTopic(CameraConfigUpdateEnum.review_genai, camera_name),
            genai_settings,
        )
        self.publish(f"{camera_name}/review_descriptions/state", payload, retain=True)
