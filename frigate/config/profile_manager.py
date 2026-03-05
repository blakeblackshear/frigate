"""Profile manager for activating/deactivating named config profiles."""

import json
import logging
from pathlib import Path
from typing import Optional

from frigate.config.camera.updater import (
    CameraConfigUpdateEnum,
    CameraConfigUpdatePublisher,
    CameraConfigUpdateTopic,
)
from frigate.util.builtin import deep_merge
from frigate.util.config import apply_section_update

logger = logging.getLogger(__name__)

PROFILE_SECTIONS = {
    "audio",
    "birdseye",
    "detect",
    "live",
    "motion",
    "notifications",
    "objects",
    "record",
    "review",
    "snapshots",
}

SECTION_TO_UPDATE_ENUM: dict[str, CameraConfigUpdateEnum] = {
    "audio": CameraConfigUpdateEnum.audio,
    "birdseye": CameraConfigUpdateEnum.birdseye,
    "detect": CameraConfigUpdateEnum.detect,
    "live": CameraConfigUpdateEnum.enabled,
    "motion": CameraConfigUpdateEnum.motion,
    "notifications": CameraConfigUpdateEnum.notifications,
    "objects": CameraConfigUpdateEnum.objects,
    "record": CameraConfigUpdateEnum.record,
    "review": CameraConfigUpdateEnum.review,
    "snapshots": CameraConfigUpdateEnum.snapshots,
}

PERSISTENCE_FILE = Path("/config/.active_profile")


class ProfileManager:
    """Manages profile activation, persistence, and config application."""

    def __init__(
        self,
        config,
        config_updater: CameraConfigUpdatePublisher,
    ):
        from frigate.config.config import FrigateConfig

        self.config: FrigateConfig = config
        self.config_updater = config_updater
        self._base_configs: dict[str, dict[str, dict]] = {}
        self._snapshot_base_configs()

    def _snapshot_base_configs(self) -> None:
        """Snapshot each camera's current section configs as the base."""
        for cam_name, cam_config in self.config.cameras.items():
            self._base_configs[cam_name] = {}
            for section in PROFILE_SECTIONS:
                section_config = getattr(cam_config, section, None)
                if section_config is not None:
                    self._base_configs[cam_name][section] = section_config.model_dump()

    def activate_profile(self, profile_name: Optional[str]) -> Optional[str]:
        """Activate a profile by name, or deactivate if None.

        Args:
            profile_name: Profile name to activate, or None to deactivate.

        Returns:
            None on success, or an error message string on failure.
        """
        if profile_name is not None:
            has_profile = any(
                profile_name in cam.profiles
                for cam in self.config.cameras.values()
            )
            if not has_profile:
                return f"Profile '{profile_name}' not found on any camera"

        # Reset all cameras to base config
        self._reset_to_base()

        # Apply new profile overrides if activating
        if profile_name is not None:
            err = self._apply_profile_overrides(profile_name)
            if err:
                return err

        self.config.active_profile = profile_name
        self._persist_active_profile(profile_name)
        logger.info(
            "Profile %s",
            f"'{profile_name}' activated" if profile_name else "deactivated",
        )
        return None

    def _reset_to_base(self) -> None:
        """Reset all cameras to their base (no-profile) config."""
        for cam_name, cam_config in self.config.cameras.items():
            base = self._base_configs.get(cam_name, {})
            for section in PROFILE_SECTIONS:
                base_data = base.get(section)
                if base_data is None:
                    continue
                err = apply_section_update(cam_config, section, base_data)
                if err:
                    logger.error(
                        "Failed to reset section '%s' on camera '%s': %s",
                        section,
                        cam_name,
                        err,
                    )

    def _apply_profile_overrides(self, profile_name: str) -> Optional[str]:
        """Apply profile overrides for all cameras that have the named profile."""
        affected_cameras: set[str] = set()

        for cam_name, cam_config in self.config.cameras.items():
            profile = cam_config.profiles.get(profile_name)
            if profile is None:
                continue

            base = self._base_configs.get(cam_name, {})

            for section in PROFILE_SECTIONS:
                profile_section = getattr(profile, section, None)
                if profile_section is None:
                    continue

                overrides = profile_section.model_dump(exclude_unset=True)
                if not overrides:
                    continue

                base_data = base.get(section, {})
                merged = deep_merge(overrides, base_data)

                err = apply_section_update(cam_config, section, merged)
                if err:
                    return f"Failed to apply profile '{profile_name}' section '{section}' on camera '{cam_name}': {err}"

                affected_cameras.add(cam_name)

        # Publish ZMQ updates for all affected cameras
        self._publish_updates(affected_cameras)
        return None

    def _publish_updates(self, affected_cameras: set[str]) -> None:
        """Publish ZMQ config updates for affected cameras."""
        for cam_name in affected_cameras:
            cam_config = self.config.cameras.get(cam_name)
            if cam_config is None:
                continue

            for section, update_enum in SECTION_TO_UPDATE_ENUM.items():
                settings = getattr(cam_config, section, None)
                if settings is not None:
                    self.config_updater.publish_update(
                        CameraConfigUpdateTopic(update_enum, cam_name),
                        settings,
                    )

    def _persist_active_profile(self, profile_name: Optional[str]) -> None:
        """Persist the active profile name to disk."""
        try:
            if profile_name is None:
                PERSISTENCE_FILE.unlink(missing_ok=True)
            else:
                PERSISTENCE_FILE.write_text(profile_name)
        except OSError:
            logger.exception("Failed to persist active profile")

    @staticmethod
    def load_persisted_profile() -> Optional[str]:
        """Load the persisted active profile name from disk."""
        try:
            if PERSISTENCE_FILE.exists():
                name = PERSISTENCE_FILE.read_text().strip()
                return name if name else None
        except OSError:
            logger.exception("Failed to load persisted profile")
        return None

    def get_available_profiles(self) -> list[str]:
        """Get a deduplicated list of all profile names across cameras."""
        profiles: set[str] = set()
        for cam_config in self.config.cameras.values():
            profiles.update(cam_config.profiles.keys())
        return sorted(profiles)

    def get_profile_info(self) -> dict:
        """Get profile state info for API responses."""
        return {
            "profiles": self.get_available_profiles(),
            "active_profile": self.config.active_profile,
        }
