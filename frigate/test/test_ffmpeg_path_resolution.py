"""Tests for custom ffmpeg path resolution and the root-mode guard."""

import os
import tempfile
import unittest
from unittest.mock import patch

from frigate.const import DEFAULT_FFMPEG_VERSION
from frigate.util.config import (
    _warn_ignored_ffmpeg_path,
    resolve_ffmpeg_path,
    service_is_granular_root,
)

BUNDLED = f"/usr/lib/ffmpeg/{DEFAULT_FFMPEG_VERSION}/bin/ffmpeg"
CUSTOM = "/config/custom-ffmpeg"


class TestConfigFfmpegRootGuard(unittest.TestCase):
    """A user-writable ffmpeg must not run as root under FRIGATE_ROOT_SERVICES."""

    def setUp(self) -> None:
        # the warning is memoized so it fires once per path, not per camera
        _warn_ignored_ffmpeg_path.cache_clear()

    def _resolve(
        self,
        path: str,
        *,
        euid: int,
        env: dict,
        binary: str = "ffmpeg",
        service: str = "frigate",
    ):
        with (
            patch("os.geteuid", return_value=euid),
            patch.dict("os.environ", env, clear=True),
        ):
            return resolve_ffmpeg_path(path, binary, service)

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

    def test_custom_path_ignored_for_go2rtc_when_go2rtc_is_a_root_service(
        self,
    ) -> None:
        self.assertEqual(
            self._resolve(
                CUSTOM,
                euid=0,
                env={"FRIGATE_ROOT_SERVICES": "go2rtc"},
                service="go2rtc",
            ),
            BUNDLED,
        )

    def test_go2rtc_keeps_custom_path_when_only_frigate_is_root(self) -> None:
        self.assertEqual(
            self._resolve(
                CUSTOM,
                euid=0,
                env={"FRIGATE_ROOT_SERVICES": "frigate"},
                service="go2rtc",
            ),
            f"{CUSTOM}/bin/ffmpeg",
        )

    def test_go2rtc_custom_path_used_in_default_drop_mode(self) -> None:
        # the run scripts resolve as root but probe as the service user
        self.assertEqual(
            self._resolve(CUSTOM, euid=0, env={}, service="go2rtc"),
            f"{CUSTOM}/bin/ffmpeg",
        )

    def test_escape_hatch_keeps_go2rtc_custom_path(self) -> None:
        self.assertEqual(
            self._resolve(
                CUSTOM,
                euid=0,
                env={"FRIGATE_RUN_AS_ROOT": "true", "FRIGATE_ROOT_SERVICES": "go2rtc"},
                service="go2rtc",
            ),
            f"{CUSTOM}/bin/ffmpeg",
        )

    def test_go2rtc_root_owned_path_is_left_alone(self) -> None:
        self.assertEqual(
            self._resolve(
                "/opt/custom-ffmpeg",
                euid=0,
                env={"FRIGATE_ROOT_SERVICES": "go2rtc"},
                service="go2rtc",
            ),
            "/opt/custom-ffmpeg/bin/ffmpeg",
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


class TestConfigFfmpegRootGuardSymlinks(unittest.TestCase):
    """A root service gets the resolved path, so a link cannot be retargeted."""

    def setUp(self) -> None:
        _warn_ignored_ffmpeg_path.cache_clear()
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = os.path.realpath(tmp.name)
        self.writable = os.path.join(root, "config")
        self.root_owned = os.path.join(root, "opt", "ffmpeg")
        os.makedirs(self.writable)
        os.makedirs(self.root_owned)
        self.link = os.path.join(self.writable, "link")
        dirs = patch("frigate.util.config.RUNTIME_USER_WRITABLE_DIRS", (self.writable,))
        dirs.start()
        self.addCleanup(dirs.stop)

    def _resolve(self, env: dict, service: str = "frigate") -> str:
        with (
            patch("os.geteuid", return_value=0),
            patch.dict("os.environ", env, clear=True),
        ):
            return resolve_ffmpeg_path(self.link, "ffmpeg", service)

    def test_link_to_a_root_owned_tree_resolves_to_its_target(self) -> None:
        os.symlink(self.root_owned, self.link)
        for service in ("frigate", "go2rtc"):
            self.assertEqual(
                self._resolve({"FRIGATE_ROOT_SERVICES": service}, service),
                f"{self.root_owned}/bin/ffmpeg",
            )

    def test_link_to_a_writable_tree_is_refused(self) -> None:
        evil = os.path.join(self.writable, "evil")
        os.makedirs(evil)
        os.symlink(evil, self.link)
        self.assertEqual(self._resolve({"FRIGATE_ROOT_SERVICES": "frigate"}), BUNDLED)

    def test_unprivileged_service_keeps_the_path_as_written(self) -> None:
        os.symlink(self.root_owned, self.link)
        self.assertEqual(self._resolve({}), f"{self.link}/bin/ffmpeg")


class TestServiceIsGranularRoot(unittest.TestCase):
    """Root via FRIGATE_ROOT_SERVICES only, never via the escape hatch."""

    def _check(self, *, euid: int, env: dict, service: str = "frigate") -> bool:
        with (
            patch("os.geteuid", return_value=euid),
            patch.dict("os.environ", env, clear=True),
        ):
            return service_is_granular_root(service)

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

    def test_matches_the_named_service(self) -> None:
        env = {"FRIGATE_ROOT_SERVICES": "go2rtc"}
        self.assertTrue(self._check(euid=0, env=env, service="go2rtc"))
        self.assertFalse(self._check(euid=0, env=env, service="frigate"))
        self.assertFalse(self._check(euid=1000, env=env, service="go2rtc"))

    def test_substring_of_a_service_name_does_not_match(self) -> None:
        self.assertFalse(self._check(euid=0, env={"FRIGATE_ROOT_SERVICES": "frigatee"}))


if __name__ == "__main__":
    unittest.main()
