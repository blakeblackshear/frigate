import unittest

from frigate.api.auth import resolve_role
from frigate.config import HeaderMappingConfig, ProxyConfig
from frigate.config.env import FRIGATE_ENV_VARS


class TestProxyRoleResolution(unittest.TestCase):
    def setUp(self):
        self.proxy_config = ProxyConfig(
            auth_secret=None,
            default_role="viewer",
            separator="|",
            header_map=HeaderMappingConfig(
                user="x-remote-user",
                role="x-remote-role",
                role_map={
                    "admin": ["group_admin"],
                    "viewer": ["group_viewer"],
                },
            ),
        )
        self.config_roles = list(["admin", "viewer"])

    def test_role_map_single_group_match(self):
        headers = {"x-remote-role": "group_admin"}
        role = resolve_role(headers, self.proxy_config, self.config_roles)
        self.assertEqual(role, "admin")

    def test_role_map_multiple_groups(self):
        headers = {"x-remote-role": "group_admin|group_viewer"}
        role = resolve_role(headers, self.proxy_config, self.config_roles)
        self.assertEqual(role, "admin")

    def test_role_map_or_matching(self):
        config = self.proxy_config
        config.header_map.role_map = {
            "admin": ["group_admin", "group_privileged"],
        }

        # OR semantics: a single matching group should map to the role
        headers = {"x-remote-role": "group_admin"}
        role = resolve_role(headers, config, self.config_roles)
        self.assertEqual(role, "admin")

        headers = {"x-remote-role": "group_admin|group_privileged"}
        role = resolve_role(headers, config, self.config_roles)
        self.assertEqual(role, "admin")

    def test_direct_role_header_with_separator(self):
        config = self.proxy_config
        config.header_map.role_map = None  # disable role_map
        headers = {"x-remote-role": "admin|viewer"}
        role = resolve_role(headers, config, self.config_roles)
        self.assertEqual(role, "admin")

    def test_invalid_role_header(self):
        config = self.proxy_config
        config.header_map.role_map = None
        headers = {"x-remote-role": "notarole"}
        role = resolve_role(headers, config, self.config_roles)
        self.assertEqual(role, config.default_role)

    def test_missing_role_header(self):
        headers = {}
        role = resolve_role(headers, self.proxy_config, self.config_roles)
        self.assertEqual(role, self.proxy_config.default_role)

    def test_empty_role_header(self):
        headers = {"x-remote-role": ""}
        role = resolve_role(headers, self.proxy_config, self.config_roles)
        self.assertEqual(role, self.proxy_config.default_role)

    def test_whitespace_groups(self):
        headers = {"x-remote-role": "   | group_admin |   "}
        role = resolve_role(headers, self.proxy_config, self.config_roles)
        self.assertEqual(role, "admin")

    def test_mixed_valid_and_invalid_groups(self):
        headers = {"x-remote-role": "bogus|group_viewer"}
        role = resolve_role(headers, self.proxy_config, self.config_roles)
        self.assertEqual(role, "viewer")

    def test_case_insensitive_role_direct(self):
        config = self.proxy_config
        config.header_map.role_map = None
        headers = {"x-remote-role": "AdMiN"}
        role = resolve_role(headers, config, self.config_roles)
        self.assertEqual(role, "admin")

    def test_role_map_no_match_falls_back(self):
        headers = {"x-remote-role": "group_unknown"}
        role = resolve_role(headers, self.proxy_config, self.config_roles)
        self.assertEqual(role, self.proxy_config.default_role)


class TestProxyAuthSecretEnvString(unittest.TestCase):
    def setUp(self):
        self._original_env_vars = dict(FRIGATE_ENV_VARS)

    def tearDown(self):
        FRIGATE_ENV_VARS.clear()
        FRIGATE_ENV_VARS.update(self._original_env_vars)

    def test_auth_secret_env_substitution(self):
        """auth_secret resolves FRIGATE_ env vars via EnvString."""
        FRIGATE_ENV_VARS["FRIGATE_PROXY_SECRET"] = "my_secret_value"
        config = ProxyConfig(auth_secret="{FRIGATE_PROXY_SECRET}")
        self.assertEqual(config.auth_secret, "my_secret_value")

    def test_auth_secret_env_embedded_in_string(self):
        """auth_secret resolves env vars embedded in a larger string."""
        FRIGATE_ENV_VARS["FRIGATE_SECRET_PART"] = "abc123"
        config = ProxyConfig(auth_secret="prefix-{FRIGATE_SECRET_PART}-suffix")
        self.assertEqual(config.auth_secret, "prefix-abc123-suffix")

    def test_auth_secret_plain_string(self):
        """auth_secret accepts a plain string without substitution."""
        config = ProxyConfig(auth_secret="literal_secret")
        self.assertEqual(config.auth_secret, "literal_secret")

    def test_auth_secret_none(self):
        """auth_secret defaults to None."""
        config = ProxyConfig()
        self.assertIsNone(config.auth_secret)

    def test_auth_secret_unknown_var_raises(self):
        """auth_secret raises KeyError for unknown env var references."""
        with self.assertRaises(Exception):
            ProxyConfig(auth_secret="{FRIGATE_NONEXISTENT_VAR}")
