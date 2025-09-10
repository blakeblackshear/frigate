import unittest

from frigate.api.auth import resolve_role
from frigate.config import HeaderMappingConfig, ProxyConfig


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
