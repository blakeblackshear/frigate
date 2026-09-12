"""Tests for environment variable handling."""

import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from pydantic import ValidationError

from frigate.config import FrigateConfig, env
from frigate.config.env import (
    FRIGATE_ENV_VARS,
    validate_env_string,
    validate_env_vars,
)


class TestGo2RtcAddStreamSubstitution(unittest.TestCase):
    """Covers the API path: PUT /go2rtc/streams/{stream_name}.

    The route shells out to go2rtc via `requests.put`; we mock the HTTP call
    and assert that the substituted `src` parameter handles the same mixed
    {FRIGATE_*} + literal-brace strings as the config-loading path.
    """

    def setUp(self):
        self._original_env_vars = dict(FRIGATE_ENV_VARS)

    def tearDown(self):
        FRIGATE_ENV_VARS.clear()
        FRIGATE_ENV_VARS.update(self._original_env_vars)

    def _call_route(self, src: str) -> str:
        """Invoke go2rtc_add_stream and return the substituted src param."""
        from frigate.api import camera as camera_api

        captured = {}

        def fake_put(url, params=None, timeout=None):
            captured["params"] = params
            resp = MagicMock()
            resp.ok = True
            resp.text = ""
            resp.status_code = 200
            return resp

        with patch.object(camera_api.requests, "put", side_effect=fake_put):
            camera_api.go2rtc_add_stream(
                request=MagicMock(), stream_name="cam1", src=src
            )
        return captured["params"]["src"]

    def test_mixed_localtime_and_frigate_var(self):
        """%{localtime\\:...} alongside {FRIGATE_USER} substitutes only the var."""
        FRIGATE_ENV_VARS["FRIGATE_USER"] = "admin"
        src = (
            "ffmpeg:rtsp://host/s#raw=-vf "
            "drawtext=text=%{localtime\\:%Y-%m-%d}:user={FRIGATE_USER}"
        )
        self.assertEqual(
            self._call_route(src),
            "ffmpeg:rtsp://host/s#raw=-vf "
            "drawtext=text=%{localtime\\:%Y-%m-%d}:user=admin",
        )

    def test_unknown_var_falls_back_to_raw_src(self):
        """Existing route behavior: unknown {FRIGATE_*} keeps raw src."""
        src = "rtsp://host/{FRIGATE_NONEXISTENT}/stream"
        self.assertEqual(self._call_route(src), src)

    def test_malformed_placeholder_rejected_via_api(self):
        """Malformed FRIGATE placeholders raise (not silently passed through).

        Regression: previously camera.py caught any KeyError and fell back
        to the raw src, so `{FRIGATE_FOO:>5}` was silently accepted via the
        API while config loading rejected it. The helper now raises
        ValueError for malformed syntax to keep the two paths consistent.
        """
        with self.assertRaises(ValueError):
            self._call_route("rtsp://host/{FRIGATE_FOO:>5}/stream")


class TestEnvString(unittest.TestCase):
    def setUp(self):
        self._original_env_vars = dict(FRIGATE_ENV_VARS)

    def tearDown(self):
        FRIGATE_ENV_VARS.clear()
        FRIGATE_ENV_VARS.update(self._original_env_vars)

    def test_substitution(self):
        """EnvString substitutes FRIGATE_ env vars."""
        FRIGATE_ENV_VARS["FRIGATE_TEST_HOST"] = "192.168.1.100"
        result = validate_env_string("{FRIGATE_TEST_HOST}")
        self.assertEqual(result, "192.168.1.100")

    def test_substitution_in_url(self):
        """EnvString substitutes vars embedded in a URL."""
        FRIGATE_ENV_VARS["FRIGATE_CAM_USER"] = "admin"
        FRIGATE_ENV_VARS["FRIGATE_CAM_PASS"] = "secret"
        result = validate_env_string(
            "rtsp://{FRIGATE_CAM_USER}:{FRIGATE_CAM_PASS}@10.0.0.1/stream"
        )
        self.assertEqual(result, "rtsp://admin:secret@10.0.0.1/stream")

    def test_no_placeholder(self):
        """Plain strings pass through unchanged."""
        result = validate_env_string("192.168.1.1")
        self.assertEqual(result, "192.168.1.1")

    def test_unknown_var_raises(self):
        """Referencing an unknown var raises UnknownVariableError."""
        with self.assertRaises(env.UnknownVariableError) as ctx:
            validate_env_string("{FRIGATE_NONEXISTENT_VAR}")
        self.assertIn("FRIGATE_NONEXISTENT_VAR", str(ctx.exception))

    def test_non_frigate_braces_passthrough(self):
        """Braces that are not {FRIGATE_*} placeholders pass through untouched.

        Regression test for ffmpeg drawtext expressions like
        "%{localtime\\:%Y-%m-%d}" being mangled by str.format().
        """
        expr = (
            "ffmpeg:rtsp://127.0.0.1/src#raw=-vf "
            "drawtext=text=%{localtime\\:%Y-%m-%d_%H\\:%M\\:%S}"
            ":x=5:fontcolor=white"
        )
        self.assertEqual(validate_env_string(expr), expr)

    def test_double_brace_escape_preserved(self):
        """`{{output}}` collapses to `{output}` (documented go2rtc escape)."""
        result = validate_env_string(
            "exec:ffmpeg -i /media/file.mp4 -f rtsp {{output}}"
        )
        self.assertEqual(result, "exec:ffmpeg -i /media/file.mp4 -f rtsp {output}")

    def test_double_brace_around_frigate_var(self):
        """`{{FRIGATE_FOO}}` stays literal — escape takes precedence."""
        FRIGATE_ENV_VARS["FRIGATE_FOO"] = "bar"
        self.assertEqual(validate_env_string("{{FRIGATE_FOO}}"), "{FRIGATE_FOO}")

    def test_mixed_frigate_var_and_braces(self):
        """A FRIGATE_ var alongside literal single braces substitutes only the var."""
        FRIGATE_ENV_VARS["FRIGATE_USER"] = "admin"
        result = validate_env_string(
            "drawtext=text=%{localtime}:user={FRIGATE_USER}:x=5"
        )
        self.assertEqual(result, "drawtext=text=%{localtime}:user=admin:x=5")

    def test_triple_braces_around_frigate_var(self):
        """`{{{FRIGATE_FOO}}}` collapses like str.format(): `{bar}`."""
        FRIGATE_ENV_VARS["FRIGATE_FOO"] = "bar"
        self.assertEqual(validate_env_string("{{{FRIGATE_FOO}}}"), "{bar}")

    def test_trailing_double_brace_after_var(self):
        """`{FRIGATE_FOO}}}` collapses like str.format(): `bar}`."""
        FRIGATE_ENV_VARS["FRIGATE_FOO"] = "bar"
        self.assertEqual(validate_env_string("{FRIGATE_FOO}}}"), "bar}")

    def test_leading_double_brace_then_var(self):
        """`{{{FRIGATE_FOO}` collapses like str.format(): `{bar`."""
        FRIGATE_ENV_VARS["FRIGATE_FOO"] = "bar"
        self.assertEqual(validate_env_string("{{{FRIGATE_FOO}"), "{bar")

    def test_malformed_unterminated_placeholder_raises(self):
        """`{FRIGATE_FOO` (no closing brace) raises like str.format() did."""
        FRIGATE_ENV_VARS["FRIGATE_FOO"] = "bar"
        with self.assertRaises(ValueError):
            validate_env_string("prefix-{FRIGATE_FOO")

    def test_malformed_format_spec_raises(self):
        """`{FRIGATE_FOO:>5}` (format spec) raises like str.format() did."""
        FRIGATE_ENV_VARS["FRIGATE_FOO"] = "bar"
        with self.assertRaises(ValueError):
            validate_env_string("{FRIGATE_FOO:>5}")

    def test_malformed_conversion_raises(self):
        """`{FRIGATE_FOO!r}` (conversion) raises like str.format() did."""
        FRIGATE_ENV_VARS["FRIGATE_FOO"] = "bar"
        with self.assertRaises(ValueError):
            validate_env_string("{FRIGATE_FOO!r}")


class TestUnknownVariableSurfacing(unittest.TestCase):
    """An undefined variable must reach the user as a config validation error."""

    def test_unknown_var_is_a_validation_error(self):
        """Pydantic reports the field path instead of raising KeyError."""
        with self.assertRaises(ValidationError) as ctx:
            FrigateConfig.parse_object(
                {"mqtt": {"host": "{FRIGATE_NOT_SET_ANYWHERE}"}, "cameras": {}}
            )
        self.assertIn("FRIGATE_NOT_SET_ANYWHERE", str(ctx.exception))


class TestEnvVars(unittest.TestCase):
    def setUp(self):
        self._original_env_vars = dict(FRIGATE_ENV_VARS)
        self._original_environ = os.environ.copy()

    def tearDown(self):
        FRIGATE_ENV_VARS.clear()
        FRIGATE_ENV_VARS.update(self._original_env_vars)
        env._CONFIG_ENV_VARS.clear()
        # Clean up any env vars we set
        for key in list(os.environ.keys()):
            if key not in self._original_environ:
                del os.environ[key]

    def _make_context(self, install: bool):
        """Create a mock ValidationInfo with the given install flag."""

        class MockContext:
            def __init__(self, ctx):
                self.context = ctx

        mock = MockContext({"install": install})
        return mock

    def test_install_sets_os_environ(self):
        """validate_env_vars with install=True sets os.environ."""
        ctx = self._make_context(install=True)
        validate_env_vars({"MY_CUSTOM_VAR": "value123"}, ctx)
        self.assertEqual(os.environ.get("MY_CUSTOM_VAR"), "value123")

    def test_install_updates_frigate_env_vars(self):
        """validate_env_vars with install=True updates FRIGATE_ENV_VARS for FRIGATE_ keys."""
        ctx = self._make_context(install=True)
        validate_env_vars({"FRIGATE_MQTT_PASS": "secret"}, ctx)
        self.assertEqual(FRIGATE_ENV_VARS["FRIGATE_MQTT_PASS"], "secret")

    def test_install_skips_non_frigate_in_env_vars_dict(self):
        """Non-FRIGATE_ keys are set in os.environ but not in FRIGATE_ENV_VARS."""
        ctx = self._make_context(install=True)
        validate_env_vars({"OTHER_VAR": "value"}, ctx)
        self.assertEqual(os.environ.get("OTHER_VAR"), "value")
        self.assertNotIn("OTHER_VAR", FRIGATE_ENV_VARS)

    def test_no_install_does_not_set(self):
        """validate_env_vars without install=True does not modify state."""
        ctx = self._make_context(install=False)
        validate_env_vars({"FRIGATE_SKIP": "nope"}, ctx)
        self.assertNotIn("FRIGATE_SKIP", FRIGATE_ENV_VARS)
        self.assertNotIn("FRIGATE_SKIP", os.environ)

    def test_env_vars_available_for_env_string(self):
        """Vars set via validate_env_vars are usable in validate_env_string."""
        ctx = self._make_context(install=True)
        validate_env_vars({"FRIGATE_BROKER": "mqtt.local"}, ctx)
        result = validate_env_string("{FRIGATE_BROKER}")
        self.assertEqual(result, "mqtt.local")


class TestVariableSources(unittest.TestCase):
    """Precedence between the sources that feed FRIGATE_ENV_VARS."""

    def setUp(self):
        self._original_env_vars = dict(env.FRIGATE_ENV_VARS)
        self._original_os_environ = dict(os.environ)

    def tearDown(self):
        env.FRIGATE_ENV_VARS.clear()
        env.FRIGATE_ENV_VARS.update(self._original_env_vars)
        env._CONFIG_ENV_VARS.clear()
        env._WARNED_COLLISIONS.clear()
        os.environ.clear()
        os.environ.update(self._original_os_environ)

    def test_container_env_beats_config_env_vars(self):
        """A container env var wins over the same key in environment_vars."""
        with patch.dict(env._CONTAINER_ENV, {"FRIGATE_MQTT_HOST": "from_env"}):
            env.apply_config_env_vars({"FRIGATE_MQTT_HOST": "from_config"})
            self.assertEqual(env.FRIGATE_ENV_VARS["FRIGATE_MQTT_HOST"], "from_env")

    def test_credentials_dir_beats_container_env(self):
        """A credentials directory file wins over a container env var."""
        with (
            patch.dict(env._CONTAINER_ENV, {"FRIGATE_MQTT_HOST": "from_env"}),
            patch.dict(env._CREDENTIALS_DIR, {"FRIGATE_MQTT_HOST": "from_creds"}),
        ):
            env._rebuild()
            self.assertEqual(env.FRIGATE_ENV_VARS["FRIGATE_MQTT_HOST"], "from_creds")

    def test_config_env_vars_used_when_no_other_source(self):
        """environment_vars still resolves when nothing else defines the key."""
        env.apply_config_env_vars({"FRIGATE_CAM_PASS": "hunter2"})
        self.assertEqual(env.FRIGATE_ENV_VARS["FRIGATE_CAM_PASS"], "hunter2")

    def test_config_env_vars_do_not_become_container_env(self):
        """environment_vars writes os.environ but must not gain env precedence."""
        env.apply_config_env_vars({"FRIGATE_CAM_PASS": "from_config"})
        self.assertEqual(os.environ["FRIGATE_CAM_PASS"], "from_config")
        self.assertNotIn("FRIGATE_CAM_PASS", env._CONTAINER_ENV)

    def test_non_frigate_config_env_vars_only_set_os_environ(self):
        """Unprefixed environment_vars keys reach os.environ but not substitution."""
        env.apply_config_env_vars({"LIBVA_DRIVER_NAME": "i965"})
        self.assertEqual(os.environ["LIBVA_DRIVER_NAME"], "i965")
        self.assertNotIn("LIBVA_DRIVER_NAME", env.FRIGATE_ENV_VARS)

    def test_collision_warns_once_naming_the_winner(self):
        """A key from two sources logs one warning naming the source that won."""
        with patch.dict(env._CONTAINER_ENV, {"FRIGATE_MQTT_HOST": "from_env"}):
            with self.assertLogs("frigate.config.env", level="WARNING") as logs:
                env.apply_config_env_vars({"FRIGATE_MQTT_HOST": "from_config"})
            self.assertEqual(len(logs.output), 1)
            self.assertIn("FRIGATE_MQTT_HOST", logs.output[0])
            self.assertIn("using the value from container environment", logs.output[0])
            self.assertNotIn("environment_vars", logs.output[0])

            with self.assertNoLogs("frigate.config.env", level="WARNING"):
                env._rebuild()


class TestSecretsFile(unittest.TestCase):
    """Reading <config dir>/secrets.yaml."""

    def setUp(self):
        self._original_env_vars = dict(env.FRIGATE_ENV_VARS)
        self._original_os_environ = dict(os.environ)
        self._dir = tempfile.TemporaryDirectory()
        self.addCleanup(self._dir.cleanup)
        os.environ["CONFIG_FILE"] = os.path.join(self._dir.name, "config.yml")

    def tearDown(self):
        env.FRIGATE_ENV_VARS.clear()
        env.FRIGATE_ENV_VARS.update(self._original_env_vars)
        env._SECRETS_FILE.clear()
        env._CONFIG_ENV_VARS.clear()
        env._WARNED_COLLISIONS.clear()
        os.environ.clear()
        os.environ.update(self._original_os_environ)

    def _write(self, contents: str, name: str = "secrets.yaml") -> None:
        with open(os.path.join(self._dir.name, name), "w") as f:
            f.write(contents)

    def test_missing_file_is_not_an_error(self):
        """No secrets.yaml means no values and no exception."""
        self.assertEqual(env._load_secrets_file(), {})

    def test_flat_map_is_read(self):
        """A flat FRIGATE_* map loads."""
        self._write("FRIGATE_CAM_USER: viewer\nFRIGATE_CAM_PASS: 'p@ss w0rd'\n")
        self.assertEqual(
            env._load_secrets_file(),
            {"FRIGATE_CAM_USER": "viewer", "FRIGATE_CAM_PASS": "p@ss w0rd"},
        )

    def test_yml_extension_is_read(self):
        """secrets.yml works the same as secrets.yaml."""
        self._write("FRIGATE_CAM_USER: viewer\n", name="secrets.yml")
        self.assertEqual(env._load_secrets_file(), {"FRIGATE_CAM_USER": "viewer"})

    def test_numeric_value_is_coerced_to_string(self):
        """Unquoted numbers become strings so they can be substituted."""
        self._write("FRIGATE_MQTT_PORT: 1883\n")
        self.assertEqual(env._load_secrets_file(), {"FRIGATE_MQTT_PORT": "1883"})

    def test_unprefixed_key_is_ignored_with_a_warning(self):
        """Names must start with FRIGATE_, matching the credentials directory."""
        self._write("cam_pass: hunter2\nFRIGATE_CAM_PASS: hunter2\n")
        with self.assertLogs("frigate.config.env", level="WARNING") as logs:
            values = env._load_secrets_file()
        self.assertEqual(values, {"FRIGATE_CAM_PASS": "hunter2"})
        self.assertIn("cam_pass", logs.output[0])

    def test_non_mapping_document_raises(self):
        """A list or scalar document is a config error."""
        self._write("- FRIGATE_CAM_PASS\n")
        with self.assertRaises(ValueError):
            env._load_secrets_file()

    def test_nested_value_raises_naming_the_key(self):
        """Nesting is not supported and the error names the key."""
        self._write("FRIGATE_CAMS:\n  alley: hunter2\n")
        with self.assertRaises(ValueError) as ctx:
            env._load_secrets_file()
        self.assertIn("FRIGATE_CAMS", str(ctx.exception))

    def test_secrets_file_beats_config_env_vars(self):
        """secrets.yaml outranks the environment_vars block."""
        self._write("FRIGATE_CAM_PASS: from_secrets\n")
        env.apply_config_env_vars({"FRIGATE_CAM_PASS": "from_config"})
        env._SECRETS_FILE.update(env._load_secrets_file())
        env._rebuild()
        self.assertEqual(env.FRIGATE_ENV_VARS["FRIGATE_CAM_PASS"], "from_secrets")

    def test_container_env_beats_secrets_file(self):
        """The container environment outranks secrets.yaml."""
        self._write("FRIGATE_CAM_PASS: from_secrets\n")
        env._SECRETS_FILE.update(env._load_secrets_file())
        with patch.dict(env._CONTAINER_ENV, {"FRIGATE_CAM_PASS": "from_env"}):
            env._rebuild()
            self.assertEqual(env.FRIGATE_ENV_VARS["FRIGATE_CAM_PASS"], "from_env")


class TestSecretsReload(unittest.TestCase):
    """secrets.yaml is re-read when a config is parsed."""

    def setUp(self):
        self._original_env_vars = dict(env.FRIGATE_ENV_VARS)
        self._original_os_environ = dict(os.environ)
        self._dir = tempfile.TemporaryDirectory()
        self.addCleanup(self._dir.cleanup)
        os.environ["CONFIG_FILE"] = os.path.join(self._dir.name, "config.yml")

    def tearDown(self):
        env.FRIGATE_ENV_VARS.clear()
        env.FRIGATE_ENV_VARS.update(self._original_env_vars)
        env._SECRETS_FILE.clear()
        env._CONFIG_ENV_VARS.clear()
        env._WARNED_COLLISIONS.clear()
        os.environ.clear()
        os.environ.update(self._original_os_environ)
        env.reload_sources()

    def test_new_secret_resolves_without_restart(self):
        """A key written after import is picked up by the next parse."""
        with open(os.path.join(self._dir.name, "secrets.yaml"), "w") as f:
            f.write("FRIGATE_MQTT_HOST: mqtt.internal\n")

        config = FrigateConfig.parse_yaml(
            'mqtt:\n  host: "{FRIGATE_MQTT_HOST}"\ncameras: {}\n'
        )
        self.assertEqual(config.mqtt.host, "mqtt.internal")

    def test_config_env_vars_survive_the_reload(self):
        """environment_vars is only installed when install=True, so it has to
        outlive the reload that a later non-install parse triggers. This is
        the /config/save path: a config that starts fine must still validate.
        """
        env.apply_config_env_vars({"FRIGATE_MQTT_HOST": "from_config"})
        config = FrigateConfig.parse_yaml(
            'mqtt:\n  host: "{FRIGATE_MQTT_HOST}"\ncameras: {}\n'
        )
        self.assertEqual(config.mqtt.host, "from_config")
        self.assertEqual(env._CONFIG_ENV_VARS["FRIGATE_MQTT_HOST"], "from_config")


class TestSourceRobustness(unittest.TestCase):
    """Reload behavior, bad input, and the os.environ export."""

    def setUp(self):
        self._original_env_vars = dict(env.FRIGATE_ENV_VARS)
        self._original_os_environ = dict(os.environ)
        self._dir = tempfile.TemporaryDirectory()
        self._creds = tempfile.TemporaryDirectory()
        self.addCleanup(self._dir.cleanup)
        self.addCleanup(self._creds.cleanup)
        os.environ["CONFIG_FILE"] = os.path.join(self._dir.name, "config.yml")
        os.environ["CREDENTIALS_DIRECTORY"] = self._creds.name

    def tearDown(self):
        env.FRIGATE_ENV_VARS.clear()
        env.FRIGATE_ENV_VARS.update(self._original_env_vars)
        env._SECRETS_FILE.clear()
        env._CONFIG_ENV_VARS.clear()
        env._CREDENTIALS_DIR.clear()
        env._WARNED_COLLISIONS.clear()
        os.environ.clear()
        os.environ.update(self._original_os_environ)
        env.reload_sources()

    def _write_secrets(self, contents: str) -> None:
        with open(os.path.join(self._dir.name, "secrets.yaml"), "w") as f:
            f.write(contents)

    def test_os_environ_gets_the_winning_value(self):
        """FRIGATE_JWT_SECRET and friends are read straight from os.environ."""
        self._write_secrets("FRIGATE_JWT_SECRET: from_secrets\n")
        env.reload_sources()
        env.apply_config_env_vars({"FRIGATE_JWT_SECRET": "from_config"})
        self.assertEqual(os.environ["FRIGATE_JWT_SECRET"], "from_secrets")
        self.assertEqual(
            os.environ["FRIGATE_JWT_SECRET"],
            env.FRIGATE_ENV_VARS["FRIGATE_JWT_SECRET"],
        )

    def test_rebuild_without_warn_stays_quiet_then_warns_later(self):
        """The import-time rebuild must not consume the one-shot warning."""
        self._write_secrets("FRIGATE_DUPE: from_secrets\n")
        env.reload_sources()
        env._CONFIG_ENV_VARS["FRIGATE_DUPE"] = "from_config"

        with self.assertNoLogs("frigate.config.env", level="WARNING"):
            env._rebuild(warn=False)

        with self.assertLogs("frigate.config.env", level="WARNING") as logs:
            env._rebuild()
        self.assertIn("FRIGATE_DUPE", logs.output[0])

    def test_malformed_secrets_file_keeps_last_good_values(self):
        """A typo must not raise, since this runs at import and on every parse."""
        self._write_secrets("FRIGATE_CAM_PASS: hunter2\n")
        env.reload_sources()

        self._write_secrets("FRIGATE_CAMS:\n  alley: hunter2\n")
        with self.assertLogs("frigate.config.env", level="ERROR") as logs:
            env.reload_sources()

        self.assertIn("FRIGATE_CAMS", logs.output[0])
        self.assertEqual(env.FRIGATE_ENV_VARS["FRIGATE_CAM_PASS"], "hunter2")

    def test_duplicate_key_error_does_not_log_the_values(self):
        """ruamel's duplicate key message quotes both values; the log must not."""
        self._write_secrets("FRIGATE_CAM_PASS: hunter2\nFRIGATE_CAM_PASS: hunter3\n")
        with self.assertLogs("frigate.config.env", level="ERROR") as logs:
            env.reload_sources()

        self.assertNotIn("hunter2", logs.output[0])
        self.assertNotIn("hunter3", logs.output[0])
        self.assertIn("secrets.yaml", logs.output[0])

    def test_deleted_secret_stops_resolving(self):
        """Removing a name takes effect on the next parse, not on restart."""
        self._write_secrets("FRIGATE_GONE: hunter2\n")
        env.reload_sources()
        self.assertEqual(env.FRIGATE_ENV_VARS["FRIGATE_GONE"], "hunter2")

        os.remove(os.path.join(self._dir.name, "secrets.yaml"))
        env.reload_sources()
        self.assertNotIn("FRIGATE_GONE", env.FRIGATE_ENV_VARS)

    def test_reload_rereads_the_credentials_directory(self):
        """The credentials directory is refreshed, not just secrets.yaml."""
        with open(os.path.join(self._creds.name, "FRIGATE_CRED"), "w") as f:
            f.write("from_creds\n")
        env.reload_sources()
        self.assertEqual(env.FRIGATE_ENV_VARS["FRIGATE_CRED"], "from_creds")

    def test_unreadable_credentials_entry_is_skipped(self):
        """A subdirectory must not take down validation on every parse."""
        os.mkdir(os.path.join(self._creds.name, "FRIGATE_NOT_A_FILE"))
        with open(os.path.join(self._creds.name, "FRIGATE_CRED"), "w") as f:
            f.write("from_creds\n")

        with self.assertLogs("frigate.config.env", level="WARNING") as logs:
            env.reload_sources()

        self.assertIn("FRIGATE_NOT_A_FILE", logs.output[0])
        self.assertEqual(env.FRIGATE_ENV_VARS["FRIGATE_CRED"], "from_creds")


if __name__ == "__main__":
    unittest.main()
