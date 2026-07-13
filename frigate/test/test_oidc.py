"""Unit tests for the OIDC helper module and config validators."""

import time
import unittest
from unittest.mock import AsyncMock, patch

from joserfc import jwt
from joserfc.jwk import OctKey, RSAKey
from pydantic import ValidationError

from frigate.api import oidc as oidc_module
from frigate.api.oidc import (
    OidcError,
    _coerce_groups,
    decode_state_cookie,
    encode_state_cookie,
    resolve_oidc_role,
    resolve_username,
    sanitize_username,
    verify_id_token,
)
from frigate.config.auth import AuthConfig, OidcConfig


class TestOidcConfigValidation(unittest.TestCase):
    def test_disabled_requires_nothing(self):
        AuthConfig(oidc=OidcConfig(enabled=False))

    def test_enabled_requires_client_and_issuer(self):
        with self.assertRaises(ValidationError):
            AuthConfig(oidc=OidcConfig(enabled=True))

    def test_enabled_ok_with_all_fields(self):
        AuthConfig(
            oidc=OidcConfig(
                enabled=True,
                issuer="https://idp.example.com",
                client_id="frigate",
                client_secret="s3cret",
            )
        )

    def test_group_map_role_must_be_configured(self):
        with self.assertRaises(ValidationError):
            AuthConfig(
                oidc=OidcConfig(
                    enabled=True,
                    issuer="https://idp.example.com",
                    client_id="frigate",
                    client_secret="s3cret",
                    group_map={"nonexistent": ["g1"]},
                )
            )

    def test_group_map_accepts_admin_and_custom_role(self):
        AuthConfig(
            oidc=OidcConfig(
                enabled=True,
                issuer="https://idp.example.com",
                client_id="frigate",
                client_secret="s3cret",
                group_map={"admin": ["idp-admins"]},
            ),
            roles={"operator": ["front_door"]},
        )
        AuthConfig(
            oidc=OidcConfig(
                enabled=True,
                issuer="https://idp.example.com",
                client_id="frigate",
                client_secret="s3cret",
                group_map={"operator": ["ops"]},
            ),
            roles={"operator": ["front_door"]},
        )

    def test_default_role_must_be_configured(self):
        with self.assertRaises(ValidationError):
            AuthConfig(
                oidc=OidcConfig(
                    enabled=True,
                    issuer="https://idp.example.com",
                    client_id="frigate",
                    client_secret="s3cret",
                    default_role="unknown",
                )
            )


class TestGroupCoercion(unittest.TestCase):
    def test_list_passthrough(self):
        self.assertEqual(_coerce_groups(["a", "b"], ","), ["a", "b"])

    def test_list_strips_and_drops_empty(self):
        self.assertEqual(_coerce_groups(["a", "  ", " b "], ","), ["a", "b"])

    def test_string_split(self):
        self.assertEqual(_coerce_groups("a,b, c", ","), ["a", "b", "c"])

    def test_string_multiple_separators(self):
        self.assertEqual(_coerce_groups("a|b,c", ",|"), ["a", "b", "c"])

    def test_string_no_separator_returns_single(self):
        self.assertEqual(_coerce_groups("solo", ""), ["solo"])

    def test_none_returns_empty(self):
        self.assertEqual(_coerce_groups(None, ","), [])


class TestResolveOidcRole(unittest.TestCase):
    def _config(self, **overrides):
        base = dict(
            enabled=True,
            issuer="https://idp.example.com",
            client_id="frigate",
            client_secret="s3cret",
            groups_claim="groups",
            group_map={"admin": ["sysadmins"], "viewer": ["watchers"]},
            default_role="viewer",
        )
        base.update(overrides)
        return OidcConfig(**base)

    def test_admin_short_circuit(self):
        oidc = self._config(group_map={"admin": ["sysadmins"], "viewer": ["sysadmins"]})
        role = resolve_oidc_role({"groups": ["sysadmins"]}, oidc, {"admin", "viewer"})
        self.assertEqual(role, "admin")

    def test_no_match_falls_back_to_default(self):
        oidc = self._config()
        role = resolve_oidc_role({"groups": ["random"]}, oidc, {"admin", "viewer"})
        self.assertEqual(role, "viewer")

    def test_missing_groups_claim_returns_default(self):
        oidc = self._config()
        role = resolve_oidc_role({}, oidc, {"admin", "viewer"})
        self.assertEqual(role, "viewer")

    def test_default_role_falls_back_to_viewer_when_invalid(self):
        oidc = self._config(default_role="viewer")
        role = resolve_oidc_role({"groups": []}, oidc, set())
        self.assertEqual(role, "viewer")

    def test_custom_role_match(self):
        oidc = self._config(group_map={"operator": ["ops"]})
        role = resolve_oidc_role(
            {"groups": ["ops"]}, oidc, {"admin", "viewer", "operator"}
        )
        self.assertEqual(role, "operator")

    def test_string_group_claim_split(self):
        oidc = self._config(
            group_map={"admin": ["sysadmins"]}, allowed_group_separators=","
        )
        role = resolve_oidc_role(
            {"groups": "watchers,sysadmins"}, oidc, {"admin", "viewer"}
        )
        self.assertEqual(role, "admin")


class TestResolveUsername(unittest.TestCase):
    def test_prefers_configured_claim(self):
        oidc = OidcConfig(
            enabled=True,
            issuer="https://idp.example.com",
            client_id="frigate",
            client_secret="s3cret",
            username_claim="preferred_username",
        )
        self.assertEqual(
            resolve_username({"preferred_username": "alice", "email": "a@x"}, oidc),
            "alice",
        )

    def test_falls_back_to_email_then_sub(self):
        oidc = OidcConfig(
            enabled=True,
            issuer="https://idp.example.com",
            client_id="frigate",
            client_secret="s3cret",
            username_claim="preferred_username",
        )
        self.assertEqual(
            resolve_username({"email": "a@x", "sub": "123"}, oidc),
            "a@x",
        )
        self.assertEqual(resolve_username({"sub": "123"}, oidc), "123")

    def test_missing_all_claims_raises(self):
        oidc = OidcConfig(
            enabled=True,
            issuer="https://idp.example.com",
            client_id="frigate",
            client_secret="s3cret",
        )
        with self.assertRaises(OidcError):
            resolve_username({}, oidc)


class TestSanitizeUsername(unittest.TestCase):
    def test_replaces_illegal_chars(self):
        self.assertEqual(sanitize_username("alice@example.com"), "alice.example.com")

    def test_strips_trailing_dots(self):
        self.assertEqual(sanitize_username("bob..."), "bob")

    def test_truncates_to_30(self):
        long = "a" * 60
        self.assertEqual(len(sanitize_username(long)), 30)

    def test_empty_after_sanitize_raises(self):
        with self.assertRaises(OidcError):
            sanitize_username("@@@")


class TestStateCookieRoundTrip(unittest.TestCase):
    def setUp(self):
        self.key = OctKey.import_key(b"a" * 64)

    def test_round_trip_ok(self):
        encoded = encode_state_cookie(
            self.key, "state123", "nonce456", "verifier", "/live"
        )
        claims = decode_state_cookie(self.key, encoded)
        self.assertEqual(claims["state"], "state123")
        self.assertEqual(claims["nonce"], "nonce456")
        self.assertEqual(claims["cv"], "verifier")
        self.assertEqual(claims["rt"], "/live")

    def test_expired_cookie_rejected(self):
        encoded = encode_state_cookie(self.key, "s", "n", "v", "/", ttl=1)
        # rewind the clock by patching time inside the module
        with patch.object(oidc_module.time, "time", return_value=time.time() + 3600):
            with self.assertRaises(OidcError):
                decode_state_cookie(self.key, encoded)

    def test_wrong_type_rejected(self):
        bad = jwt.encode(
            {"alg": "HS256"},
            {"typ": "other", "exp": int(time.time()) + 60},
            self.key,
        )
        with self.assertRaises(OidcError):
            decode_state_cookie(self.key, bad)

    def test_tampered_signature_rejected(self):
        encoded = encode_state_cookie(self.key, "s", "n", "v", "/")
        other = OctKey.import_key(b"b" * 64)
        with self.assertRaises(OidcError):
            decode_state_cookie(other, encoded)


class TestVerifyIdToken(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        try:
            self.rsa_key = RSAKey.generate_key(2048, auto_kid=True)
        except TypeError:
            # older joserfc signature
            self.rsa_key = RSAKey.generate_key(2048)
        self.kid = getattr(self.rsa_key, "kid", None) or "test"
        self.public_jwks = {"keys": [self.rsa_key.as_dict(private=False)]}
        self.config = OidcConfig(
            enabled=True,
            issuer="https://idp.example.com",
            client_id="frigate",
            client_secret="s3cret",
        )

    def _make_id_token(self, **claim_overrides):
        now = int(time.time())
        claims = {
            "iss": "https://idp.example.com",
            "aud": "frigate",
            "sub": "user-1",
            "exp": now + 300,
            "iat": now,
            "nonce": "the-nonce",
        }
        claims.update(claim_overrides)
        return jwt.encode({"alg": "RS256", "kid": self.kid}, claims, self.rsa_key)

    async def _verify(self, token, nonce="the-nonce"):
        with patch(
            "frigate.api.oidc.get_jwks",
            new=AsyncMock(
                return_value=oidc_module.KeySet.import_key_set(self.public_jwks)
            ),
        ):
            return await verify_id_token(token, self.config, nonce)

    async def test_valid_token_returns_claims(self):
        token = self._make_id_token()
        claims = await self._verify(token)
        self.assertEqual(claims["sub"], "user-1")
        self.assertEqual(claims["nonce"], "the-nonce")

    async def test_wrong_issuer_rejected(self):
        token = self._make_id_token(iss="https://other.example.com")
        with self.assertRaises(OidcError):
            await self._verify(token)

    async def test_wrong_audience_rejected(self):
        token = self._make_id_token(aud="different-client")
        with self.assertRaises(OidcError):
            await self._verify(token)

    async def test_expired_token_rejected(self):
        token = self._make_id_token(exp=int(time.time()) - 10)
        with self.assertRaises(OidcError):
            await self._verify(token)

    async def test_nonce_mismatch_rejected(self):
        token = self._make_id_token(nonce="not-the-nonce")
        with self.assertRaises(OidcError):
            await self._verify(token)

    async def test_issuer_trailing_slash_normalized(self):
        token = self._make_id_token(iss="https://idp.example.com/")
        claims = await self._verify(token)
        self.assertEqual(claims["sub"], "user-1")

    async def test_audience_as_list(self):
        token = self._make_id_token(aud=["frigate", "another"])
        claims = await self._verify(token)
        self.assertEqual(claims["sub"], "user-1")


if __name__ == "__main__":
    unittest.main()
