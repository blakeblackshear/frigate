"""Tests for custom ffmpeg path resolution and the root-mode guard."""

import unittest
from unittest.mock import patch

from frigate.const import DEFAULT_FFMPEG_VERSION
from frigate.util.config import (
    _warn_ignored_ffmpeg_path,
    frigate_service_is_granular_root,
    resolve_ffmpeg_path,
)

BUNDLED = f"/usr/lib/ffmpeg/{DEFAULT_FFMPEG_VERSION}/bin/ffmpeg"
CUSTOM = "/config/custom-ffmpeg"


class TestConfigFfmpegRootGuard(unittest.TestCase):
    """A user-writable ffmpeg must not run as root under FRIGATE_ROOT_SERVICES."""

    def setUp(self) -> None:
        # the warning is memoized so it fires once per path, not per camera
        _warn_ignored_ffmpeg_path.cache_clear()

    def _resolve(self, path: str, *, euid: int, env: dict, binary: str = "ffmpeg"):
        with (
            patch("os.geteuid", return_value=euid),
            patch.dict("os.environ", env, clear=True),
        ):
            return resolve_ffmpeg_path(path, binary)

    def test_custom_path_used_when_service_is_unprivileged(self) -> None:
        self.assertEqual(
            self._resolve(CUSTOM, euid=1000, env={}), f"{CUSTOM}/bin/ffmpeg"
        )

    def test_escape_hatch_keeps_working_exactly_as_before(self) -> None:
        # FRIGATE_RUN_AS_ROOT never sweeps /config and leaves no unprivileged
        # service, so a custom build there is as safe as it was pre-drop
        self.assertEqual(
            self._resolve(CUSTOM, euid=0, env={"FRIGATE_RUN_AS_ROOT": "true"}),
            f"{CUSTOM}/bin/ffmpeg",
        )

    def test_custom_path_ignored_when_frigate_is_a_root_service(self) -> None:
        self.assertEqual(
            self._resolve(CUSTOM, euid=0, env={"FRIGATE_ROOT_SERVICES": "frigate"}),
            BUNDLED,
        )

    def test_ffprobe_is_guarded_too(self) -> None:
        self.assertEqual(
            self._resolve(
                CUSTOM,
                euid=0,
                env={"FRIGATE_ROOT_SERVICES": "frigate"},
                binary="ffprobe",
            ),
            f"/usr/lib/ffmpeg/{DEFAULT_FFMPEG_VERSION}/bin/ffprobe",
        )

    def test_another_root_service_does_not_trigger_the_guard(self) -> None:
        # go2rtc running as root says nothing about who spawns ffmpeg
        self.assertEqual(
            self._resolve(CUSTOM, euid=0, env={"FRIGATE_ROOT_SERVICES": "go2rtc"}),
            f"{CUSTOM}/bin/ffmpeg",
        )

    def test_root_services_has_no_effect_under_docker_user(self) -> None:
        # docker's own user: means the service never had root to keep, which is
        # also the case for get_ffmpeg_path.py in a --user container
        self.assertEqual(
            self._resolve(CUSTOM, euid=1000, env={"FRIGATE_ROOT_SERVICES": "frigate"}),
            f"{CUSTOM}/bin/ffmpeg",
        )

    def test_path_outside_config_is_left_alone(self) -> None:
        # only /config is runtime-user-owned; a root-owned tree stays usable
        self.assertEqual(
            self._resolve(
                "/opt/custom-ffmpeg", euid=0, env={"FRIGATE_ROOT_SERVICES": "frigate"}
            ),
            "/opt/custom-ffmpeg/bin/ffmpeg",
        )

    def test_traversal_out_of_config_does_not_evade_the_guard(self) -> None:
        self.assertEqual(
            self._resolve(
                "/config/../config/custom-ffmpeg",
                euid=0,
                env={"FRIGATE_ROOT_SERVICES": "frigate"},
            ),
            BUNDLED,
        )

    def test_media_tree_is_guarded_too(self) -> None:
        # config.yml is uid-1000-writable, so ffmpeg.path can be pointed at any
        # writable tree; /config alone would be an evasion, not a guard
        self.assertEqual(
            self._resolve(
                "/media/frigate/evil", euid=0, env={"FRIGATE_ROOT_SERVICES": "frigate"}
            ),
            BUNDLED,
        )

    def test_config_dir_itself_is_guarded(self) -> None:
        self.assertEqual(
            self._resolve("/config", euid=0, env={"FRIGATE_ROOT_SERVICES": "frigate"}),
            BUNDLED,
        )

    def test_default_alias_is_unaffected(self) -> None:
        self.assertEqual(
            self._resolve("default", euid=0, env={"FRIGATE_ROOT_SERVICES": "frigate"}),
            BUNDLED,
        )


class TestFrigateServiceIsGranularRoot(unittest.TestCase):
    """Root via FRIGATE_ROOT_SERVICES only, never via the escape hatch."""

    def _check(self, *, euid: int, env: dict) -> bool:
        with (
            patch("os.geteuid", return_value=euid),
            patch.dict("os.environ", env, clear=True),
        ):
            return frigate_service_is_granular_root()

    def test_false_without_any_root_signal(self) -> None:
        self.assertFalse(self._check(euid=0, env={}))

    def test_escape_hatch_is_not_granular_root(self) -> None:
        # the escape hatch restores old behavior wholesale, sweep included
        self.assertFalse(self._check(euid=0, env={"FRIGATE_RUN_AS_ROOT": "true"}))
        self.assertFalse(
            self._check(
                euid=0,
                env={"FRIGATE_RUN_AS_ROOT": "true", "FRIGATE_ROOT_SERVICES": "frigate"},
            )
        )

    def test_membership_ignores_whitespace_and_other_entries(self) -> None:
        self.assertTrue(
            self._check(euid=0, env={"FRIGATE_ROOT_SERVICES": "go2rtc, frigate"})
        )
        self.assertFalse(
            self._check(euid=0, env={"FRIGATE_ROOT_SERVICES": "go2rtc,nginx"})
        )

    def test_substring_of_a_service_name_does_not_match(self) -> None:
        self.assertFalse(self._check(euid=0, env={"FRIGATE_ROOT_SERVICES": "frigatee"}))


if __name__ == "__main__":
    unittest.main()
