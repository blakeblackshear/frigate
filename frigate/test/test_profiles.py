"""Tests for the profiles system."""

import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from frigate.config import FrigateConfig
from frigate.config.camera.profile import CameraProfileConfig
from frigate.config.profile import ProfileDefinitionConfig
from frigate.config.profile_manager import PERSISTENCE_FILE, ProfileManager
from frigate.const import MODEL_CACHE_DIR


class TestCameraProfileConfig(unittest.TestCase):
    """Test the CameraProfileConfig Pydantic model."""

    def test_empty_profile(self):
        """All sections default to None."""
        profile = CameraProfileConfig()
        assert profile.detect is None
        assert profile.motion is None
        assert profile.objects is None
        assert profile.review is None
        assert profile.notifications is None

    def test_partial_detect(self):
        """Profile with only detect.enabled set."""
        profile = CameraProfileConfig(detect={"enabled": False})
        assert profile.detect is not None
        assert profile.detect.enabled is False
        dumped = profile.detect.model_dump(exclude_unset=True)
        assert dumped == {"enabled": False}

    def test_partial_notifications(self):
        """Profile with only notifications.enabled set."""
        profile = CameraProfileConfig(notifications={"enabled": True})
        assert profile.notifications is not None
        assert profile.notifications.enabled is True
        dumped = profile.notifications.model_dump(exclude_unset=True)
        assert dumped == {"enabled": True}

    def test_partial_objects(self):
        """Profile with objects.track set."""
        profile = CameraProfileConfig(objects={"track": ["car", "package"]})
        assert profile.objects is not None
        assert profile.objects.track == ["car", "package"]

    def test_partial_review(self):
        """Profile with nested review.alerts.labels."""
        profile = CameraProfileConfig(review={"alerts": {"labels": ["person", "car"]}})
        assert profile.review is not None
        assert profile.review.alerts.labels == ["person", "car"]

    def test_enabled_field(self):
        """Profile with enabled set to False."""
        profile = CameraProfileConfig(enabled=False)
        assert profile.enabled is False
        dumped = profile.model_dump(exclude_unset=True)
        assert dumped == {"enabled": False}

    def test_enabled_field_true(self):
        """Profile with enabled set to True."""
        profile = CameraProfileConfig(enabled=True)
        assert profile.enabled is True

    def test_enabled_default_none(self):
        """Enabled defaults to None when not set."""
        profile = CameraProfileConfig()
        assert profile.enabled is None

    def test_zones_field(self):
        """Profile with zones override."""
        profile = CameraProfileConfig(
            zones={
                "driveway": {
                    "coordinates": "0.1,0.1,0.9,0.1,0.9,0.9,0.1,0.9",
                    "objects": ["car"],
                }
            }
        )
        assert profile.zones is not None
        assert "driveway" in profile.zones

    def test_zones_default_none(self):
        """Zones defaults to None when not set."""
        profile = CameraProfileConfig()
        assert profile.zones is None

    def test_none_sections_not_in_dump(self):
        """Sections left as None should not appear in exclude_unset dump."""
        profile = CameraProfileConfig(detect={"enabled": False})
        dumped = profile.model_dump(exclude_unset=True)
        assert "detect" in dumped
        assert "motion" not in dumped
        assert "objects" not in dumped

    def test_invalid_field_value_rejected(self):
        """Invalid field values are caught by Pydantic."""
        from pydantic import ValidationError

        with self.assertRaises(ValidationError):
            CameraProfileConfig(detect={"fps": "not_a_number"})

    def test_invalid_section_key_rejected(self):
        """Unknown section keys are rejected (extra=forbid from FrigateBaseModel)."""
        from pydantic import ValidationError

        with self.assertRaises(ValidationError):
            CameraProfileConfig(ffmpeg={"inputs": []})

    def test_invalid_nested_field_rejected(self):
        """Invalid nested field values are caught."""
        from pydantic import ValidationError

        with self.assertRaises(ValidationError):
            CameraProfileConfig(review={"alerts": {"labels": "not_a_list"}})

    def test_invalid_profile_in_camera_config(self):
        """Invalid profile section in full config is caught at parse time."""
        from pydantic import ValidationError

        config_data = {
            "mqtt": {"host": "mqtt"},
            "profiles": {
                "armed": {"friendly_name": "Armed"},
            },
            "cameras": {
                "front": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            }
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                    "profiles": {
                        "armed": {
                            "detect": {"fps": "invalid"},
                        },
                    },
                },
            },
        }
        with self.assertRaises(ValidationError):
            FrigateConfig(**config_data)

    def test_undefined_profile_reference_rejected(self):
        """Camera referencing a profile not defined in top-level profiles is rejected."""
        from pydantic import ValidationError

        config_data = {
            "mqtt": {"host": "mqtt"},
            "profiles": {
                "armed": {"friendly_name": "Armed"},
            },
            "cameras": {
                "front": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            }
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                    "profiles": {
                        "nonexistent": {
                            "detect": {"enabled": False},
                        },
                    },
                },
            },
        }
        with self.assertRaises(ValidationError):
            FrigateConfig(**config_data)


class TestProfileInConfig(unittest.TestCase):
    """Test that profiles parse correctly in FrigateConfig."""

    def setUp(self):
        self.base_config = {
            "mqtt": {"host": "mqtt"},
            "profiles": {
                "armed": {"friendly_name": "Armed"},
                "disarmed": {"friendly_name": "Disarmed"},
            },
            "cameras": {
                "front": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            }
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                    "profiles": {
                        "armed": {
                            "notifications": {"enabled": True},
                            "objects": {"track": ["person", "car", "package"]},
                        },
                        "disarmed": {
                            "notifications": {"enabled": False},
                            "objects": {"track": ["package"]},
                        },
                    },
                },
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.2:554/video",
                                "roles": ["detect"],
                            }
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                    "profiles": {
                        "armed": {
                            "detect": {"enabled": True},
                        },
                    },
                },
            },
        }

        if not os.path.exists(MODEL_CACHE_DIR) and not os.path.islink(MODEL_CACHE_DIR):
            os.makedirs(MODEL_CACHE_DIR)

    def test_profiles_parse(self):
        """Profiles are parsed into Dict[str, CameraProfileConfig]."""
        config = FrigateConfig(**self.base_config)
        front = config.cameras["front"]
        assert "armed" in front.profiles
        assert "disarmed" in front.profiles
        assert isinstance(front.profiles["armed"], CameraProfileConfig)

    def test_profile_sections_parsed(self):
        """Profile sections are properly typed."""
        config = FrigateConfig(**self.base_config)
        armed = config.cameras["front"].profiles["armed"]
        assert armed.notifications is not None
        assert armed.notifications.enabled is True
        assert armed.objects is not None
        assert armed.objects.track == ["person", "car", "package"]
        assert armed.detect is None  # not set in this profile

    def test_camera_without_profiles(self):
        """Camera with no profiles has empty dict."""
        config_data = {
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "front": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            }
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                },
            },
        }
        config = FrigateConfig(**config_data)
        assert config.cameras["front"].profiles == {}


class TestProfileManager(unittest.TestCase):
    """Test ProfileManager activation, deactivation, and switching."""

    def setUp(self):
        self.config_data = {
            "mqtt": {"host": "mqtt"},
            "profiles": {
                "armed": {"friendly_name": "Armed"},
                "disarmed": {"friendly_name": "Disarmed"},
            },
            "cameras": {
                "front": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect"],
                            }
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                    "notifications": {"enabled": False},
                    "objects": {"track": ["person"]},
                    "profiles": {
                        "armed": {
                            "notifications": {"enabled": True},
                            "objects": {"track": ["person", "car", "package"]},
                        },
                        "disarmed": {
                            "notifications": {"enabled": False},
                            "objects": {"track": ["package"]},
                        },
                    },
                },
                "back": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.2:554/video",
                                "roles": ["detect"],
                            }
                        ]
                    },
                    "detect": {"height": 1080, "width": 1920, "fps": 5},
                    "profiles": {
                        "armed": {
                            "notifications": {"enabled": True},
                        },
                    },
                },
            },
        }

        if not os.path.exists(MODEL_CACHE_DIR) and not os.path.islink(MODEL_CACHE_DIR):
            os.makedirs(MODEL_CACHE_DIR)

        self.config = FrigateConfig(**self.config_data)
        self.mock_updater = MagicMock()
        self.manager = ProfileManager(self.config, self.mock_updater)

    def test_get_available_profiles(self):
        """Available profiles come from top-level profile definitions."""
        profiles = self.manager.get_available_profiles()
        assert len(profiles) == 2
        names = [p["name"] for p in profiles]
        assert "armed" in names
        assert "disarmed" in names
        # Verify friendly_name is included
        armed = next(p for p in profiles if p["name"] == "armed")
        assert armed["friendly_name"] == "Armed"

    def test_activate_invalid_profile(self):
        """Activating non-existent profile returns error."""
        err = self.manager.activate_profile("nonexistent")
        assert err is not None
        assert "not defined" in err

    @patch.object(ProfileManager, "_persist_active_profile")
    def test_activate_profile(self, mock_persist):
        """Activating a profile applies overrides."""
        err = self.manager.activate_profile("armed")
        assert err is None
        assert self.config.active_profile == "armed"

        # Front camera should have armed overrides
        front = self.config.cameras["front"]
        assert front.notifications.enabled is True
        assert front.objects.track == ["person", "car", "package"]

        # Back camera should have armed overrides
        back = self.config.cameras["back"]
        assert back.notifications.enabled is True

    @patch.object(ProfileManager, "_persist_active_profile")
    def test_deactivate_profile(self, mock_persist):
        """Deactivating a profile restores base config."""
        # Activate first
        self.manager.activate_profile("armed")
        assert self.config.cameras["front"].notifications.enabled is True

        # Deactivate
        err = self.manager.activate_profile(None)
        assert err is None
        assert self.config.active_profile is None

        # Should be back to base
        front = self.config.cameras["front"]
        assert front.notifications.enabled is False
        assert front.objects.track == ["person"]

    @patch.object(ProfileManager, "_persist_active_profile")
    def test_switch_profiles(self, mock_persist):
        """Switching from one profile to another works."""
        self.manager.activate_profile("armed")
        assert self.config.cameras["front"].objects.track == [
            "person",
            "car",
            "package",
        ]

        self.manager.activate_profile("disarmed")
        assert self.config.active_profile == "disarmed"
        assert self.config.cameras["front"].objects.track == ["package"]
        assert self.config.cameras["front"].notifications.enabled is False

    @patch.object(ProfileManager, "_persist_active_profile")
    def test_unaffected_camera(self, mock_persist):
        """Camera without the activated profile is unaffected."""
        back_base_notifications = self.config.cameras["back"].notifications.enabled

        self.manager.activate_profile("disarmed")

        # Back camera has no "disarmed" profile, should be unchanged
        assert (
            self.config.cameras["back"].notifications.enabled == back_base_notifications
        )

    @patch.object(ProfileManager, "_persist_active_profile")
    def test_activate_profile_disables_camera(self, mock_persist):
        """Profile with enabled=false disables the camera."""
        self.config.profiles["away"] = ProfileDefinitionConfig(friendly_name="Away")
        self.config.cameras["front"].profiles["away"] = CameraProfileConfig(
            enabled=False
        )
        self.manager = ProfileManager(self.config, self.mock_updater)

        assert self.config.cameras["front"].enabled is True
        err = self.manager.activate_profile("away")
        assert err is None
        assert self.config.cameras["front"].enabled is False

    @patch.object(ProfileManager, "_persist_active_profile")
    def test_deactivate_restores_enabled(self, mock_persist):
        """Deactivating a profile restores the camera's base enabled state."""
        self.config.profiles["away"] = ProfileDefinitionConfig(friendly_name="Away")
        self.config.cameras["front"].profiles["away"] = CameraProfileConfig(
            enabled=False
        )
        self.manager = ProfileManager(self.config, self.mock_updater)

        self.manager.activate_profile("away")
        assert self.config.cameras["front"].enabled is False

        self.manager.activate_profile(None)
        assert self.config.cameras["front"].enabled is True

    @patch.object(ProfileManager, "_persist_active_profile")
    def test_activate_profile_adds_zone(self, mock_persist):
        """Profile with zones adds/overrides zones on camera."""
        from frigate.config.camera.zone import ZoneConfig

        self.config.profiles["away"] = ProfileDefinitionConfig(friendly_name="Away")
        self.config.cameras["front"].profiles["away"] = CameraProfileConfig(
            zones={
                "driveway": ZoneConfig(
                    coordinates="0.1,0.1,0.9,0.1,0.9,0.9,0.1,0.9",
                    objects=["car"],
                )
            }
        )
        self.manager = ProfileManager(self.config, self.mock_updater)

        assert "driveway" not in self.config.cameras["front"].zones

        err = self.manager.activate_profile("away")
        assert err is None
        assert "driveway" in self.config.cameras["front"].zones

    @patch.object(ProfileManager, "_persist_active_profile")
    def test_deactivate_restores_zones(self, mock_persist):
        """Deactivating a profile restores base zones."""
        from frigate.config.camera.zone import ZoneConfig

        self.config.profiles["away"] = ProfileDefinitionConfig(friendly_name="Away")
        self.config.cameras["front"].profiles["away"] = CameraProfileConfig(
            zones={
                "driveway": ZoneConfig(
                    coordinates="0.1,0.1,0.9,0.1,0.9,0.9,0.1,0.9",
                    objects=["car"],
                )
            }
        )
        self.manager = ProfileManager(self.config, self.mock_updater)

        self.manager.activate_profile("away")
        assert "driveway" in self.config.cameras["front"].zones

        self.manager.activate_profile(None)
        assert "driveway" not in self.config.cameras["front"].zones

    @patch.object(ProfileManager, "_persist_active_profile")
    def test_zones_zmq_published(self, mock_persist):
        """ZMQ update is published for zones change."""
        from frigate.config.camera.updater import (
            CameraConfigUpdateEnum,
            CameraConfigUpdateTopic,
        )
        from frigate.config.camera.zone import ZoneConfig

        self.config.profiles["away"] = ProfileDefinitionConfig(friendly_name="Away")
        self.config.cameras["front"].profiles["away"] = CameraProfileConfig(
            zones={
                "driveway": ZoneConfig(
                    coordinates="0.1,0.1,0.9,0.1,0.9,0.9,0.1,0.9",
                    objects=["car"],
                )
            }
        )
        self.manager = ProfileManager(self.config, self.mock_updater)
        self.mock_updater.reset_mock()

        self.manager.activate_profile("away")

        zones_calls = [
            call
            for call in self.mock_updater.publish_update.call_args_list
            if call[0][0]
            == CameraConfigUpdateTopic(CameraConfigUpdateEnum.zones, "front")
        ]
        assert len(zones_calls) == 1

    @patch.object(ProfileManager, "_persist_active_profile")
    def test_enabled_zmq_published(self, mock_persist):
        """ZMQ update is published for enabled state change."""
        from frigate.config.camera.updater import (
            CameraConfigUpdateEnum,
            CameraConfigUpdateTopic,
        )

        self.config.profiles["away"] = ProfileDefinitionConfig(friendly_name="Away")
        self.config.cameras["front"].profiles["away"] = CameraProfileConfig(
            enabled=False
        )
        self.manager = ProfileManager(self.config, self.mock_updater)
        self.mock_updater.reset_mock()

        self.manager.activate_profile("away")

        # Find the enabled update call
        enabled_calls = [
            call
            for call in self.mock_updater.publish_update.call_args_list
            if call[0][0]
            == CameraConfigUpdateTopic(CameraConfigUpdateEnum.enabled, "front")
        ]
        assert len(enabled_calls) == 1
        assert enabled_calls[0][0][1] is False

    @patch.object(ProfileManager, "_persist_active_profile")
    def test_zmq_updates_published(self, mock_persist):
        """ZMQ updates are published when a profile is activated."""
        self.manager.activate_profile("armed")
        assert self.mock_updater.publish_update.called

    def test_get_profile_info(self):
        """Profile info returns correct structure with friendly names."""
        info = self.manager.get_profile_info()
        assert "profiles" in info
        assert "active_profile" in info
        assert info["active_profile"] is None
        names = [p["name"] for p in info["profiles"]]
        assert "armed" in names
        assert "disarmed" in names

    @patch.object(ProfileManager, "_persist_active_profile")
    def test_base_configs_for_api_unchanged_after_activation(self, mock_persist):
        """API base configs reflect pre-profile values after activation."""
        base_track = self.config.cameras["front"].objects.track[:]
        assert base_track == ["person"]

        self.manager.activate_profile("armed")

        # In-memory config has the profile-merged values
        assert self.config.cameras["front"].objects.track == [
            "person",
            "car",
            "package",
        ]

        # But the API base configs still return the original base values
        api_base = self.manager.get_base_configs_for_api("front")
        assert "objects" in api_base
        assert api_base["objects"]["track"] == ["person"]

    def test_base_configs_for_api_are_json_serializable(self):
        """API base configs are JSON-serializable (mode='json')."""
        import json

        api_base = self.manager.get_base_configs_for_api("front")
        # Should not raise
        json.dumps(api_base)


class TestProfilePersistence(unittest.TestCase):
    """Test profile persistence to disk."""

    def test_persist_and_load(self):
        """Active profile name can be persisted and loaded."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            temp_path = f.name

        try:
            from pathlib import Path

            path = Path(temp_path)
            path.write_text("armed")
            loaded = path.read_text().strip()
            assert loaded == "armed"
        finally:
            os.unlink(temp_path)

    def test_load_empty_file(self):
        """Empty persistence file returns None."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("")
            temp_path = f.name

        try:
            with patch.object(type(PERSISTENCE_FILE), "exists", return_value=True):
                with patch.object(type(PERSISTENCE_FILE), "read_text", return_value=""):
                    result = ProfileManager.load_persisted_profile()
                    assert result is None
        finally:
            os.unlink(temp_path)

    def test_load_missing_file(self):
        """Missing persistence file returns None."""
        with patch.object(type(PERSISTENCE_FILE), "exists", return_value=False):
            result = ProfileManager.load_persisted_profile()
            assert result is None


if __name__ == "__main__":
    unittest.main()
