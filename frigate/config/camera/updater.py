"""Convenience classes for updating configurations dynamically."""

import logging
import os
import subprocess
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict

import requests

from frigate.comms.config_updater import ConfigPublisher, ConfigSubscriber
from frigate.config import CameraConfig, FrigateConfig
from frigate.util.builtin import update_yaml_file_bulk
from frigate.util.config import find_config_file

logger = logging.getLogger(__name__)


class CameraConfigUpdateEnum(str, Enum):
    """Supported camera config update types."""

    add = "add"  # for adding a camera
    audio = "audio"
    audio_transcription = "audio_transcription"
    birdseye = "birdseye"
    detect = "detect"
    edit = "edit"  # for editing an existing camera
    enabled = "enabled"
    motion = "motion"  # includes motion and motion masks
    notifications = "notifications"
    objects = "objects"
    object_genai = "object_genai"
    record = "record"
    remove = "remove"  # for removing a camera
    review = "review"
    review_genai = "review_genai"
    semantic_search = "semantic_search"  # for semantic search triggers
    snapshots = "snapshots"
    zones = "zones"


@dataclass
class CameraConfigUpdateTopic:
    update_type: CameraConfigUpdateEnum
    camera: str

    @property
    def topic(self) -> str:
        return f"config/cameras/{self.camera}/{self.update_type.name}"


class CameraConfigUpdatePublisher:
    def __init__(self):
        self.publisher = ConfigPublisher()

    def publish_update(self, topic: CameraConfigUpdateTopic, config: Any) -> None:
        self.publisher.publish(topic.topic, config)

    def stop(self) -> None:
        self.publisher.stop()


class CameraConfigUpdateSubscriber:
    def __init__(
        self,
        config: FrigateConfig | None,
        camera_configs: dict[str, CameraConfig],
        topics: list[CameraConfigUpdateEnum],
    ):
        self.config = config
        self.camera_configs = camera_configs
        self.topics = topics

        base_topic = "config/cameras"

        if len(self.camera_configs) == 1:
            base_topic += f"/{list(self.camera_configs.keys())[0]}"

        self.subscriber = ConfigSubscriber(
            base_topic,
            exact=False,
        )

    def __update_config(
        self, camera: str, update_type: CameraConfigUpdateEnum, updated_config: Any
    ) -> None:
        if update_type == CameraConfigUpdateEnum.add:
            """Add a new camera and handle go2rtc streams if needed"""
            self.config.cameras[camera] = updated_config
            self.camera_configs[camera] = updated_config

            # Handle potential go2rtc streams for new camera
            if hasattr(updated_config, "ffmpeg") and hasattr(
                updated_config.ffmpeg, "inputs"
            ):
                streams = self._extract_stream_names(updated_config)
                if (
                    streams
                    and hasattr(self.config, "go2rtc")
                    and hasattr(self.config.go2rtc, "streams")
                ):
                    go2rtc_updated = False
                    for stream_name in streams:
                        logger.info(
                            f"New go2rtc stream detected for camera {camera}: {stream_name}"
                        )
                        go2rtc_updated = True

                    if go2rtc_updated:
                        self.reload_go2rtc()

            return
        elif update_type == CameraConfigUpdateEnum.edit:
            """Update camera configuration without stopping processes"""
            old_config = self.camera_configs.get(camera)

            self._handle_go2rtc_stream_updates(camera, old_config, updated_config)

            self.config.cameras[camera] = updated_config
            self.camera_configs[camera] = updated_config

            return
        elif update_type == CameraConfigUpdateEnum.remove:
            """Remove go2rtc streams with camera"""
            camera_config = self.camera_configs.get(camera)
            go2rtc_updated = False

            # Use helper methods to handle go2rtc streams
            if camera_config:
                streams = self._extract_stream_names(camera_config)
                for stream_name in streams:
                    if not self._is_stream_in_use(stream_name, camera):
                        if self._remove_unused_stream(stream_name):
                            go2rtc_updated = True

                if go2rtc_updated:
                    self.reload_go2rtc()

            self.camera_configs.pop(camera, None)
            if camera in self.config.cameras:
                self.config.cameras.pop(camera)

            return

        config = self.camera_configs.get(camera)

        if not config:
            return

        if update_type == CameraConfigUpdateEnum.audio:
            config.audio = updated_config
        elif update_type == CameraConfigUpdateEnum.audio_transcription:
            config.audio_transcription = updated_config
        elif update_type == CameraConfigUpdateEnum.birdseye:
            config.birdseye = updated_config
        elif update_type == CameraConfigUpdateEnum.detect:
            config.detect = updated_config
        elif update_type == CameraConfigUpdateEnum.enabled:
            config.enabled = updated_config
        elif update_type == CameraConfigUpdateEnum.object_genai:
            config.objects.genai = updated_config
        elif update_type == CameraConfigUpdateEnum.motion:
            config.motion = updated_config
        elif update_type == CameraConfigUpdateEnum.notifications:
            config.notifications = updated_config
        elif update_type == CameraConfigUpdateEnum.objects:
            config.objects = updated_config
        elif update_type == CameraConfigUpdateEnum.record:
            config.record = updated_config
        elif update_type == CameraConfigUpdateEnum.review:
            config.review = updated_config
        elif update_type == CameraConfigUpdateEnum.review_genai:
            config.review.genai = updated_config
        elif update_type == CameraConfigUpdateEnum.semantic_search:
            config.semantic_search = updated_config
        elif update_type == CameraConfigUpdateEnum.snapshots:
            config.snapshots = updated_config
        elif update_type == CameraConfigUpdateEnum.zones:
            config.zones = updated_config

    def check_for_updates(self) -> dict[str, list[str]]:
        updated_topics: dict[str, list[str]] = {}

        # get all updates available
        while True:
            update_topic, update_config = self.subscriber.check_for_update()

            if update_topic is None or update_config is None:
                break

            _, _, camera, raw_type = update_topic.split("/")
            update_type = CameraConfigUpdateEnum[raw_type]

            if update_type in self.topics:
                if update_type.name in updated_topics:
                    updated_topics[update_type.name].append(camera)
                else:
                    updated_topics[update_type.name] = [camera]

                self.__update_config(camera, update_type, update_config)

        return updated_topics

    def stop(self) -> None:
        self.subscriber.stop()

    def _extract_stream_names(self, config):
        """Extract go2rtc stream names from configuration"""
        streams = []

        if not (hasattr(config, "ffmpeg") and hasattr(config.ffmpeg, "inputs")):
            return streams

        for input_item in config.ffmpeg.inputs:
            if not (hasattr(input_item, "path") and isinstance(input_item.path, str)):
                continue

            path = input_item.path
            if "rtsp://" in path and "127.0.0.1:8554/" in path:
                stream_name = (
                    path.split("127.0.0.1:8554/")[-1].split("&")[0].split("?")[0]
                )
                streams.append(stream_name)

        return streams

    def _is_stream_in_use(self, stream_name, current_camera):
        """Check if stream is used by other cameras"""
        for cam_name, cam_config in self.camera_configs.items():
            if cam_name == current_camera:
                continue

            if not (
                hasattr(cam_config, "ffmpeg") and hasattr(cam_config.ffmpeg, "inputs")
            ):
                continue

            for input_item in cam_config.ffmpeg.inputs:
                if (
                    hasattr(input_item, "path")
                    and isinstance(input_item.path, str)
                    and "127.0.0.1:8554/" + stream_name in input_item.path
                ):
                    return True

        return False

    def _remove_unused_stream(self, stream_name):
        """Remove unused go2rtc stream"""
        if not (
            hasattr(self.config, "go2rtc")
            and hasattr(self.config.go2rtc, "streams")
            and stream_name in self.config.go2rtc.streams
        ):
            return False

        logger.info(f"Removing unused go2rtc stream: {stream_name}")
        self.config.go2rtc.streams.pop(stream_name)
        config_file = find_config_file()
        updates: Dict[str, Any] = {f"go2rtc.streams.{stream_name}": ""}
        update_yaml_file_bulk(config_file, updates)
        return True

    def _handle_go2rtc_stream_updates(self, camera, old_config, updated_config):
        """Handle go2rtc stream configuration updates"""
        if not (
            old_config
            and hasattr(self.config, "go2rtc")
            and hasattr(self.config.go2rtc, "streams")
        ):
            return

        old_streams = self._extract_stream_names(old_config)
        new_streams = self._extract_stream_names(updated_config)

        if not (old_streams or new_streams):
            return

        removed_streams = [s for s in old_streams if s not in new_streams]
        added_streams = [s for s in new_streams if s not in old_streams]
        common_streams = [s for s in old_streams if s in new_streams]

        go2rtc_updated = False

        for stream_name in added_streams:
            logger.info(f"New go2rtc stream detected: {stream_name}")
            go2rtc_updated = True

        for stream_name in removed_streams:
            if not self._is_stream_in_use(stream_name, camera):
                if self._remove_unused_stream(stream_name):
                    go2rtc_updated = True

        for stream_name in common_streams:
            if stream_name in self.config.go2rtc.streams:
                for input_item in (
                    updated_config.ffmpeg.inputs
                    if (
                        hasattr(updated_config, "ffmpeg")
                        and hasattr(updated_config.ffmpeg, "inputs")
                    )
                    else []
                ):
                    if (
                        hasattr(input_item, "path")
                        and isinstance(input_item.path, str)
                        and "127.0.0.1:8554/" + stream_name in input_item.path
                    ):
                        logger.info(
                            f"Checking for changes in go2rtc stream: {stream_name}"
                        )
                        go2rtc_updated = True
                        break

        if go2rtc_updated:
            self.reload_go2rtc()

    def reload_go2rtc(self):
        """Regenerate go2rtc config and restart the service."""
        try:
            create_config_path = "/usr/local/go2rtc/create_config.py"
            if os.path.exists(create_config_path):
                subprocess.run(["python3", create_config_path], check=True)
                logger.info("Successfully regenerated go2rtc config")
            else:
                logger.warning(f"Could not find {create_config_path}")

            # Restart go2rtc service
            try:
                response = requests.post("http://127.0.0.1:1984/api/restart", timeout=5)
                if response.status_code == 200:
                    logger.info("Successfully restarted go2rtc service")
                else:
                    logger.warning(
                        f"Failed to restart go2rtc service: {response.status_code}"
                    )
            except requests.RequestException as e:
                logger.error(f"Error restarting go2rtc service: {e}")
        except Exception as e:
            logger.error(f"Error reloading go2rtc: {e}")
