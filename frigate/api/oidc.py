"""OpenID Connect helpers for Frigate authentication.

Implements the pieces of the OIDC authorization code flow (with PKCE) that
Frigate needs to accept SSO logins from an external identity provider:

    * discovery document fetch + short-lived in-memory cache
    * JWKS fetch + cache
    * PKCE / state / nonce generation and short-lived signed cookies
    * ID token verification via joserfc against the provider's JWKS
    * group claim -> Frigate role resolution mirroring resolve_role semantics

The endpoints in frigate/api/auth.py compose these helpers.
"""

from __future__ import annotations

import base64
import hashlib
import logging
import secrets
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode

import aiohttp
from joserfc import jwt
from joserfc.errors import JoseError
from joserfc.jwk import KeySet

from frigate.config.auth import OidcConfig

logger = logging.getLogger(__name__)


DISCOVERY_TTL_SECONDS = 60 * 60
JWKS_TTL_SECONDS = 60 * 60
STATE_COOKIE_NAME = "frigate_oidc_state"
STATE_TTL_SECONDS = 600
STATE_JWT_TYPE = "frigate-oidc-state"
SUPPORTED_ID_TOKEN_ALGS = (
    "RS256",
    "RS384",
    "RS512",
    "PS256",
    "PS384",
    "PS512",
    "ES256",
    "ES384",
    "ES512",
    "EdDSA",
)


class OidcError(Exception):
    """Raised when the OIDC flow fails in a user-visible way."""


@dataclass
class _CacheEntry:
    value: Any
    expires_at: float


_cache: dict[str, _CacheEntry] = {}


def _cache_get(key: str) -> Any | None:
    entry = _cache.get(key)
    if entry is None:
        return None
    if entry.expires_at <= time.time():
        _cache.pop(key, None)
        return None
    return entry.value


def _cache_set(key: str, value: Any, ttl: int) -> None:
    _cache[key] = _CacheEntry(value=value, expires_at=time.time() + ttl)


def _clear_cache_for(prefix: str) -> None:
    for key in list(_cache):
        if key.startswith(prefix):
            _cache.pop(key, None)


async def _http_get_json(url: str) -> dict:
    timeout = aiohttp.ClientTimeout(total=10)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.get(url) as response:
            response.raise_for_status()
            return await response.json(content_type=None)


async def _http_post_form(url: str, data: dict, auth: aiohttp.BasicAuth) -> dict:
    timeout = aiohttp.ClientTimeout(total=10)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(url, data=data, auth=auth) as response:
            if response.status >= 400:
                body = await response.text()
                logger.debug(
                    "OIDC token endpoint responded %s: %s", response.status, body
                )
                raise OidcError(f"Token endpoint returned status {response.status}")
            return await response.json(content_type=None)


async def get_discovery(config: OidcConfig) -> dict:
    """Fetch and cache the OpenID Connect discovery document."""
    if not config.issuer:
        raise OidcError("OIDC issuer is not configured")
    cache_key = f"discovery:{config.issuer}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = config.issuer.rstrip("/") + "/.well-known/openid-configuration"
    try:
        doc = await _http_get_json(url)
    except Exception as err:
        raise OidcError(f"Failed to fetch OIDC discovery document: {err}") from err
    _cache_set(cache_key, doc, DISCOVERY_TTL_SECONDS)
    return doc


async def get_jwks(config: OidcConfig) -> KeySet:
    """Fetch and cache the provider's JWKS as a joserfc KeySet."""
    discovery = await get_discovery(config)
    jwks_uri = discovery.get("jwks_uri")
    if not jwks_uri:
        raise OidcError("OIDC discovery document is missing jwks_uri")
    cache_key = f"jwks:{jwks_uri}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        raw = await _http_get_json(jwks_uri)
    except Exception as err:
        raise OidcError(f"Failed to fetch OIDC JWKS: {err}") from err
    try:
        key_set = KeySet.import_key_set(raw)
    except Exception as err:
        raise OidcError(f"Failed to parse OIDC JWKS: {err}") from err
    _cache_set(cache_key, key_set, JWKS_TTL_SECONDS)
    return key_set


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def generate_pkce_pair() -> tuple[str, str]:
    """Return (code_verifier, code_challenge) for PKCE S256."""
    verifier = _b64url(secrets.token_bytes(64))
    challenge = _b64url(hashlib.sha256(verifier.encode("ascii")).digest())
    return verifier, challenge


def generate_state() -> str:
    return _b64url(secrets.token_bytes(32))


def generate_nonce() -> str:
    return _b64url(secrets.token_bytes(32))


def encode_state_cookie(
    jwt_key,
    state: str,
    nonce: str,
    code_verifier: str,
    return_to: str,
    ttl: int = STATE_TTL_SECONDS,
) -> str:
    """Sign the transient OIDC state into a short-lived cookie value."""
    claims = {
        "typ": STATE_JWT_TYPE,
        "state": state,
        "nonce": nonce,
        "cv": code_verifier,
        "rt": return_to,
        "exp": int(time.time()) + ttl,
        "iat": int(time.time()),
    }
    return jwt.encode({"alg": "HS256"}, claims, jwt_key)


def decode_state_cookie(jwt_key, encoded: str) -> dict:
    """Verify and decode the state cookie; raises OidcError on failure."""
    try:
        token = jwt.decode(encoded, jwt_key)
    except JoseError as err:
        raise OidcError(f"Invalid OIDC state cookie: {err}") from err
    claims = token.claims
    if claims.get("typ") != STATE_JWT_TYPE:
        raise OidcError("OIDC state cookie has an unexpected type")
    if int(claims.get("exp", 0)) <= int(time.time()):
        raise OidcError("OIDC state cookie has expired")
    return claims


def build_authorization_url(
    discovery: dict,
    config: OidcConfig,
    redirect_uri: str,
    state: str,
    nonce: str,
    code_challenge: str,
) -> str:
    authorization_endpoint = discovery.get("authorization_endpoint")
    if not authorization_endpoint:
        raise OidcError("OIDC discovery document is missing authorization_endpoint")
    params = {
        "response_type": "code",
        "client_id": config.client_id,
        "redirect_uri": redirect_uri,
        "scope": " ".join(config.scopes),
        "state": state,
        "nonce": nonce,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    separator = "&" if "?" in authorization_endpoint else "?"
    return f"{authorization_endpoint}{separator}{urlencode(params)}"


async def exchange_code_for_tokens(
    discovery: dict,
    config: OidcConfig,
    code: str,
    redirect_uri: str,
    code_verifier: str,
) -> dict:
    token_endpoint = discovery.get("token_endpoint")
    if not token_endpoint:
        raise OidcError("OIDC discovery document is missing token_endpoint")

    form = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "code_verifier": code_verifier,
        "client_id": config.client_id,
    }
    # basic auth is the more compatible client authentication method
    auth = aiohttp.BasicAuth(login=config.client_id, password=config.client_secret)
    try:
        payload = await _http_post_form(token_endpoint, form, auth)
    except OidcError:
        raise
    except Exception as err:
        raise OidcError(f"Failed to reach OIDC token endpoint: {err}") from err

    if "id_token" not in payload:
        raise OidcError("Token response did not include an id_token")
    return payload


async def verify_id_token(
    id_token: str,
    config: OidcConfig,
    expected_nonce: str,
) -> dict:
    """Verify signature and standard claims of the id_token; return claims dict."""
    key_set = await get_jwks(config)
    try:
        token = jwt.decode(id_token, key_set, algorithms=list(SUPPORTED_ID_TOKEN_ALGS))
    except JoseError as err:
        raise OidcError(f"Failed to verify id_token signature: {err}") from err

    claims = dict(token.claims)
    now = int(time.time())

    issuer = (config.issuer or "").rstrip("/")
    token_iss = str(claims.get("iss", "")).rstrip("/")
    if not token_iss or token_iss != issuer:
        raise OidcError("id_token issuer does not match configured issuer")

    aud = claims.get("aud")
    audiences = aud if isinstance(aud, list) else [aud]
    if config.client_id not in audiences:
        raise OidcError("id_token audience does not include the configured client_id")

    exp = int(claims.get("exp", 0))
    if exp <= now:
        raise OidcError("id_token has expired")

    iat = int(claims.get("iat", 0))
    # allow small clock skew
    if iat and iat > now + 60:
        raise OidcError("id_token was issued in the future")

    if expected_nonce and claims.get("nonce") != expected_nonce:
        raise OidcError("id_token nonce does not match")

    return claims


def _coerce_groups(raw: Any, separators: str) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(item).strip() for item in raw if str(item).strip()]
    text = str(raw)
    if not separators:
        return [text.strip()] if text.strip() else []
    result: list[str] = [text]
    for sep in separators:
        expanded: list[str] = []
        for item in result:
            expanded.extend(item.split(sep))
        result = expanded
    return [item.strip() for item in result if item.strip()]


def resolve_oidc_role(
    claims: dict,
    oidc: OidcConfig,
    config_roles: set[str],
) -> str:
    """Map an id_token's groups claim onto a configured Frigate role.

    Mirrors the semantics of frigate.api.auth.resolve_role:
    admin membership short-circuits to admin; otherwise the first matching
    role is used; otherwise falls back to oidc.default_role (or 'viewer').
    """
    default_role = oidc.default_role if oidc.default_role in config_roles else "viewer"
    if not config_roles:
        default_role = "viewer"

    groups = _coerce_groups(
        claims.get(oidc.groups_claim), oidc.allowed_group_separators
    )
    if not groups or not oidc.group_map:
        return default_role

    matched = {
        role
        for role, required_groups in oidc.group_map.items()
        if any(group in groups for group in required_groups)
    }

    if "admin" in matched and "admin" in config_roles:
        return "admin"

    if matched:
        return next((r for r in config_roles if r in matched), default_role)

    return default_role


def resolve_username(claims: dict, oidc: OidcConfig) -> str:
    """Pick a username from the id_token claims with sensible fallbacks."""
    for key in (oidc.username_claim, "preferred_username", "email", "sub"):
        if not key:
            continue
        value = claims.get(key)
        if value:
            return str(value)
    raise OidcError("id_token does not contain a username claim")


def sanitize_username(username: str) -> str:
    """Reduce an arbitrary claim value to a database-safe username.

    The user table's username field is a 30-character primary key restricted to
    ``[A-Za-z0-9._]`` by the create endpoint. OIDC usernames often carry other
    characters (``@``, ``-``, ``+``) that we accept but rewrite to ``.``.
    """
    safe = "".join(ch if ch.isalnum() or ch in "._" else "." for ch in username)
    safe = safe.strip(".")
    if not safe:
        raise OidcError("id_token username claim is empty after sanitization")
    return safe[:30]
