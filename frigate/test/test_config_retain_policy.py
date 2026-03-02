import unittest

from pydantic import ValidationError

from frigate.config.camera.record import RecordConfig, RetainPolicyEnum


class TestRetainPolicyConfig(unittest.TestCase):
    """Tests for the retain_policy field on RecordConfig."""

    def test_default_retain_policy_is_time(self):
        config = RecordConfig()
        assert config.retain_policy == RetainPolicyEnum.time

    def test_continuous_rollover_policy(self):
        config = RecordConfig(
            enabled=True,
            retain_policy="continuous_rollover",
        )
        assert config.retain_policy == RetainPolicyEnum.continuous_rollover

    def test_continuous_rollover_ignores_continuous_days(self):
        """continuous.days is preserved even in rollover mode (just unused by cleanup)."""
        config = RecordConfig(
            enabled=True,
            retain_policy="continuous_rollover",
            continuous={"days": 30},
        )
        assert config.retain_policy == RetainPolicyEnum.continuous_rollover
        assert config.continuous.days == 30

    def test_invalid_retain_policy_rejected(self):
        with self.assertRaises(ValidationError):
            RecordConfig(retain_policy="invalid_value")

    def test_retain_policy_enum_values(self):
        """Verify all expected enum values exist."""
        assert RetainPolicyEnum.time.value == "time"
        assert RetainPolicyEnum.continuous_rollover.value == "continuous_rollover"

    def test_retain_policy_roundtrip(self):
        """Config can be serialized and deserialized with retain_policy."""
        config = RecordConfig(retain_policy="continuous_rollover")
        dumped = config.model_dump()
        assert dumped["retain_policy"] == "continuous_rollover"
        restored = RecordConfig(**dumped)
        assert restored.retain_policy == RetainPolicyEnum.continuous_rollover
