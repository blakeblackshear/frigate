"""Profile manager for activating/deactivating named config profiles."""

import copy
import logging
from pathlib import Path
from typing import Optional

from frigate.config.camera.updater import (
    CameraConfigUpdateEnum,
    CameraConfigUpdatePublisher,
    CameraConfigUpdateTopic,
)
from frigate.config.camera.zone import ZoneConfig
from frigate.const import CONFIG_DIR
from frigate.util.builtin import deep_merge
from frigate.util.config import apply_section_update

logger = logging.getLogger(__name__)

PROFILE_SECTION_UPDATES: dict[str, CameraConfigUpdateEnum] = {
    "audio": CameraConfigUpdateEnum.audio,
    "birdseye": CameraConfigUpdateEnum.birdseye,
    "detect": CameraConfigUpdateEnum.detect,
    "face_recognition": CameraConfigUpdateEnum.face_recognition,
    "lpr": CameraConfigUpdateEnum.lpr,
    "motion": CameraConfigUpdateEnum.motion,
    "notifications": CameraConfigUpdateEnum.notifications,
    "objects": CameraConfigUpdateEnum.objects,
    "record": CameraConfigUpdateEnum.record,
    "review": CameraConfigUpdateEnum.review,
    "snapshots": CameraConfigUpdateEnum.snapshots,
}

PERSISTENCE_FILE = Path(CONFIG_DIR) / ".active_profile"


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
        self._base_enabled: dict[str, bool] = {}
        self._base_zones: dict[str, dict[str, ZoneConfig]] = {}
        self._snapshot_base_configs()

    def _snapshot_base_configs(self) -> None:
        """Snapshot each camera's current section configs, enabled, and zones."""
        for cam_name, cam_config in self.config.cameras.items():
            self._base_configs[cam_name] = {}
            self._base_enabled[cam_name] = cam_config.enabled
            self._base_zones[cam_name] = copy.deepcopy(cam_config.zones)
            for section in PROFILE_SECTION_UPDATES:
                section_config = getattr(cam_config, section, None)
                if section_config is not None:
                    self._base_configs[cam_name][section] = section_config.model_dump()

    def update_config(self, new_config) -> None:
        """Update config reference after config/set replaces the in-memory config.

        Preserves active profile state: re-snapshots base configs from the new
        (freshly parsed) config, then re-applies profile overrides if a profile
        was active.
        """
        current_active = self.config.active_profile
        self.config = new_config

        # Re-snapshot base configs from the new config (which has base values)
        self._base_configs.clear()
        self._base_enabled.clear()
        self._base_zones.clear()
        self._snapshot_base_configs()

        # Re-apply profile overrides without publishing ZMQ updates
        # (the config/set caller handles its own ZMQ publishing)
        if current_active is not None:
            if current_active in self.config.profiles:
                changed: dict[str, set[str]] = {}
                self._apply_profile_overrides(current_active, changed)
                self.config.active_profile = current_active
            else:
                # Profile was deleted — deactivate
                self.config.active_profile = None
                self._persist_active_profile(None)

    def activate_profile(self, profile_name: Optional[str]) -> Optional[str]:
        """Activate a profile by name, or deactivate if None.

        Args:
            profile_name: Profile name to activate, or None to deactivate.

        Returns:
            None on success, or an error message string on failure.
        """
        if profile_name is not None:
            if profile_name not in self.config.profiles:
                return f"Profile '{profile_name}' is not defined in the profiles section"

        # Track which camera/section pairs get changed for ZMQ publishing
        changed: dict[str, set[str]] = {}

        # Reset all cameras to base config
        self._reset_to_base(changed)

        # Apply new profile overrides if activating
        if profile_name is not None:
            err = self._apply_profile_overrides(profile_name, changed)
            if err:
                return err

        # Publish ZMQ updates only for sections that actually changed
        self._publish_updates(changed)

        self.config.active_profile = profile_name
        self._persist_active_profile(profile_name)
        logger.info(
            "Profile %s",
            f"'{profile_name}' activated" if profile_name else "deactivated",
        )
        return None

    def _reset_to_base(self, changed: dict[str, set[str]]) -> None:
        """Reset all cameras to their base (no-profile) config."""
        for cam_name, cam_config in self.config.cameras.items():
            # Restore enabled state
            base_enabled = self._base_enabled.get(cam_name)
            if base_enabled is not None and cam_config.enabled != base_enabled:
                cam_config.enabled = base_enabled
                changed.setdefault(cam_name, set()).add("enabled")

            # Restore zones (always restore from snapshot; direct Pydantic
            # comparison fails when ZoneConfig contains numpy arrays)
            base_zones = self._base_zones.get(cam_name)
            if base_zones is not None:
                cam_config.zones = copy.deepcopy(base_zones)
                changed.setdefault(cam_name, set()).add("zones")

            # Restore section configs
            base = self._base_configs.get(cam_name, {})
            for section in PROFILE_SECTION_UPDATES:
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
                else:
                    changed.setdefault(cam_name, set()).add(section)

    def _apply_profile_overrides(
        self, profile_name: str, changed: dict[str, set[str]]
    ) -> Optional[str]:
        """Apply profile overrides for all cameras that have the named profile."""
        for cam_name, cam_config in self.config.cameras.items():
            profile = cam_config.profiles.get(profile_name)
            if profile is None:
                continue

            # Apply enabled override
            if profile.enabled is not None and cam_config.enabled != profile.enabled:
                cam_config.enabled = profile.enabled
                changed.setdefault(cam_name, set()).add("enabled")

            # Apply zones override — merge profile zones into base zones
            if profile.zones is not None:
                base_zones = self._base_zones.get(cam_name, {})
                merged_zones = copy.deepcopy(base_zones)
                merged_zones.update(profile.zones)
                cam_config.zones = merged_zones
                changed.setdefault(cam_name, set()).add("zones")

            base = self._base_configs.get(cam_name, {})

            for section in PROFILE_SECTION_UPDATES:
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

                changed.setdefault(cam_name, set()).add(section)

        return None

    def _publish_updates(self, changed: dict[str, set[str]]) -> None:
        """Publish ZMQ config updates only for sections that changed."""
        for cam_name, sections in changed.items():
            cam_config = self.config.cameras.get(cam_name)
            if cam_config is None:
                continue

            for section in sections:
                if section == "enabled":
                    self.config_updater.publish_update(
                        CameraConfigUpdateTopic(
                            CameraConfigUpdateEnum.enabled, cam_name
                        ),
                        cam_config.enabled,
                    )
                    continue

                if section == "zones":
                    self.config_updater.publish_update(
                        CameraConfigUpdateTopic(CameraConfigUpdateEnum.zones, cam_name),
                        cam_config.zones,
                    )
                    continue

                update_enum = PROFILE_SECTION_UPDATES.get(section)
                if update_enum is None:
                    continue
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

    def get_available_profiles(self) -> list[dict[str, str]]:
        """Get list of all profile definitions from the top-level config."""
        return [
            {"name": name, "friendly_name": defn.friendly_name}
            for name, defn in sorted(self.config.profiles.items())
        ]

    def get_profile_info(self) -> dict:
        """Get profile state info for API responses."""
        return {
            "profiles": self.get_available_profiles(),
            "active_profile": self.config.active_profile,
        }
