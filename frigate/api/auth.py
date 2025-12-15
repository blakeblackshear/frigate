"""Auth apis."""

import base64
import hashlib
import ipaddress
import json
import logging
import os
import re
import secrets
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse
from joserfc import jwt
from peewee import DoesNotExist
from slowapi import Limiter

from frigate.api.defs.request.app_body import (
    AppPostLoginBody,
    AppPostUsersBody,
    AppPutPasswordBody,
    AppPutRoleBody,
)
from frigate.api.defs.tags import Tags
from frigate.config import AuthConfig, ProxyConfig
from frigate.const import CONFIG_DIR, JWT_SECRET_ENV_VAR, PASSWORD_HASH_ALGORITHM
from frigate.models import User

logger = logging.getLogger(__name__)


def require_admin_by_default():
    """
    Global admin requirement dependency for all endpoints by default.

    This is set as the default dependency on the FastAPI app to ensure all
    endpoints require admin access unless explicitly overridden with
    allow_public(), allow_any_authenticated(), or require_role().

    Port 5000 (internal) always has admin role set by the /auth endpoint,
    so this check passes automatically for internal requests.

    Certain paths are exempted from the global admin check because they must
    be accessible before authentication (login, auth) or they have their own
    route-level authorization dependencies that handle access control.
    """
    # Paths that have route-level auth dependencies and should bypass global admin check
    # These paths still have authorization - it's handled by their route-level dependencies
    EXEMPT_PATHS = {
        # Public auth endpoints (allow_public)
        "/auth",
        "/auth/first_time_login",
        "/login",
        "/logout",
        # Authenticated user endpoints (allow_any_authenticated)
        "/profile",
        # Public info endpoints (allow_public)
        "/",
        "/version",
        "/config/schema.json",
        # Authenticated user endpoints (allow_any_authenticated)
        "/metrics",
        "/stats",
        "/stats/history",
        "/config",
        "/config/raw",
        "/vainfo",
        "/nvinfo",
        "/labels",
        "/sub_labels",
        "/plus/models",
        "/recognized_license_plates",
        "/timeline",
        "/timeline/hourly",
        "/recordings/storage",
        "/recordings/summary",
        "/recordings/unavailable",
        "/go2rtc/streams",
        "/event_ids",
        "/events",
        "/exports",
    }

    # Path prefixes that should be exempt (for paths with parameters)
    EXEMPT_PREFIXES = (
        "/logs/",  # /logs/{service}
        "/review",  # /review, /review/{id}, /review/summary, /review_ids, etc.
        "/reviews/",  # /reviews/viewed, /reviews/delete
        "/events/",  # /events/{id}/thumbnail, /events/summary, etc. (camera-scoped)
        "/export/",  # /export/{camera}/start/..., /export/{id}/rename, /export/{id}
        "/go2rtc/streams/",  # /go2rtc/streams/{camera}
        "/users/",  # /users/{username}/password (has own auth)
        "/preview/",  # /preview/{file}/thumbnail.jpg
        "/exports/",  # /exports/{export_id}
        "/vod/",  # /vod/{camera_name}/...
        "/notifications/",  # /notifications/pubkey, /notifications/register
    )

    async def admin_checker(request: Request):
        path = request.url.path

        # Check exact path matches
        if path in EXEMPT_PATHS:
            return

        # Check prefix matches for parameterized paths
        if path.startswith(EXEMPT_PREFIXES):
            return

        # Dynamic camera path exemption:
        # Any path whose first segment matches a configured camera name should
        # bypass the global admin requirement. These endpoints enforce access
        # via route-level dependencies (e.g. require_camera_access) to ensure
        # per-camera authorization. This allows non-admin authenticated users
        # (e.g. viewer role) to access camera-specific resources without
        # needing admin privileges.
        try:
            if path.startswith("/"):
                first_segment = path.split("/", 2)[1]
                if (
                    first_segment
                    and first_segment in request.app.frigate_config.cameras
                ):
                    return
        except Exception:
            pass

        # For all other paths, require admin role
        # Port 5000 (internal) requests have admin role set automatically
        role = request.headers.get("remote-role")
        if role == "admin":
            return

        raise HTTPException(
            status_code=403,
            detail="Access denied. A user with the admin role is required.",
        )

    return admin_checker


def _is_authenticated(request: Request) -> bool:
    """
    Helper to determine if a request is from an authenticated user.

    Returns True if the request has a valid authenticated user (not anonymous).
    Port 5000 internal requests are considered anonymous despite having admin role.
    """
    username = request.headers.get("remote-user")
    return username is not None and username != "anonymous"


def allow_public():
    """
    Override dependency to allow unauthenticated access to an endpoint.

    Use this for endpoints that should be publicly accessible without
    authentication, such as login page, health checks, or pre-auth info.

    Example:
        @router.get("/public-endpoint", dependencies=[Depends(allow_public())])
    """

    async def public_checker(request: Request):
        return  # Always allow

    return public_checker


def allow_any_authenticated():
    """
    Override dependency to allow any authenticated user (bypass admin requirement).

    Allows:
    - Port 5000 internal requests (have admin role despite anonymous user)
    - Any authenticated user with a real username (not "anonymous")

    Rejects:
    - Port 8971 requests with anonymous user (auth disabled, no proxy auth)

    Example:
        @router.get("/authenticated-endpoint", dependencies=[Depends(allow_any_authenticated())])
    """

    async def auth_checker(request: Request):
        # Port 5000 requests have admin role and should be allowed
        role = request.headers.get("remote-role")
        if role == "admin":
            return

        # Otherwise require a real authenticated user (not anonymous)
        if not _is_authenticated(request):
            raise HTTPException(status_code=401, detail="Authentication required")
        return

    return auth_checker


router = APIRouter(tags=[Tags.auth])


@router.get("/auth/first_time_login", dependencies=[Depends(allow_public())])
def first_time_login(request: Request):
    """Return whether the admin first-time login help flag is set in config.

    This endpoint is intentionally unauthenticated so the login page can
    query it before a user is authenticated.
    """
    auth_config = request.app.frigate_config.auth

    return JSONResponse(
        content={
            "admin_first_time_login": auth_config.admin_first_time_login
            or auth_config.reset_admin_password
        }
    )


class RateLimiter:
    _limit = ""

    def set_limit(self, limit: str):
        self._limit = limit

    def get_limit(self) -> str:
        return self._limit


rateLimiter = RateLimiter()


def get_remote_addr(request: Request):
    route = list(reversed(request.headers.get("x-forwarded-for").split(",")))
    logger.debug(f"IP Route: {[r for r in route]}")
    trusted_proxies = []
    for proxy in request.app.frigate_config.auth.trusted_proxies:
        try:
            network = ipaddress.ip_network(proxy)
        except ValueError:
            logger.warning(f"Unable to parse trusted network: {proxy}")
        trusted_proxies.append(network)

    # return the first remote address that is not trusted
    for addr in route:
        ip = ipaddress.ip_address(addr.strip())
        logger.debug(f"Checking {ip} (v{ip.version})")
        trusted = False
        for trusted_proxy in trusted_proxies:
            logger.debug(
                f"Checking against trusted proxy: {trusted_proxy} (v{trusted_proxy.version})"
            )
            if trusted_proxy.version == 4:
                ipv4 = ip.ipv4_mapped if ip.version == 6 else ip
                if ipv4 is not None and ipv4 in trusted_proxy:
                    trusted = True
                    logger.debug(f"Trusted: {str(ip)} by {str(trusted_proxy)}")
                    break
            elif trusted_proxy.version == 6 and ip.version == 6:
                if ip in trusted_proxy:
                    trusted = True
                    logger.debug(f"Trusted: {str(ip)} by {str(trusted_proxy)}")
                    break
        if trusted:
            logger.debug(f"{ip} is trusted")
            continue
        else:
            logger.debug(f"First untrusted IP: {str(ip)}")
            return str(ip)

    # if there wasn't anything in the route, just return the default
    remote_addr = None

    if hasattr(request, "remote_addr"):
        remote_addr = request.remote_addr

    return remote_addr or "127.0.0.1"


def get_jwt_secret() -> str:
    jwt_secret = None
    # check env var
    if JWT_SECRET_ENV_VAR in os.environ:
        logger.debug(
            f"Using jwt secret from {JWT_SECRET_ENV_VAR} environment variable."
        )
        jwt_secret = os.environ.get(JWT_SECRET_ENV_VAR)
    # check docker secrets
    elif os.path.isfile(os.path.join("/run/secrets", JWT_SECRET_ENV_VAR)):
        logger.debug(f"Using jwt secret from {JWT_SECRET_ENV_VAR} docker secret file.")
        jwt_secret = (
            Path(os.path.join("/run/secrets", JWT_SECRET_ENV_VAR)).read_text().strip()
        )
    # check for the add-on options file
    elif os.path.isfile("/data/options.json"):
        with open("/data/options.json") as f:
            raw_options = f.read()
        logger.debug("Using jwt secret from Home Assistant Add-on options file.")
        options = json.loads(raw_options)
        jwt_secret = options.get("jwt_secret")

    if jwt_secret is None:
        jwt_secret_file = os.path.join(CONFIG_DIR, ".jwt_secret")
        # check .jwt_secrets file
        if not os.path.isfile(jwt_secret_file):
            logger.debug(
                "No jwt secret found. Generating one and storing in .jwt_secret file in config directory."
            )
            jwt_secret = secrets.token_hex(64)
            try:
                fd = os.open(
                    jwt_secret_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600
                )
                with os.fdopen(fd, "w") as f:
                    f.write(str(jwt_secret))
            except Exception:
                logger.warning(
                    "Unable to write jwt token file to config directory. A new jwt token will be created at each startup."
                )
        else:
            logger.debug("Using jwt secret from .jwt_secret file in config directory.")
            with open(jwt_secret_file) as f:
                try:
                    jwt_secret = f.readline().strip()
                except Exception:
                    logger.warning(
                        "Unable to read jwt token from .jwt_secret file in config directory. A new jwt token will be created at each startup."
                    )
                    jwt_secret = secrets.token_hex(64)

    if len(jwt_secret) < 64:
        logger.warning("JWT Secret is recommended to be 64 characters or more")

    return jwt_secret


def hash_password(password: str, salt=None, iterations=600000):
    if salt is None:
        salt = secrets.token_hex(16)
    assert salt and isinstance(salt, str) and "$" not in salt
    assert isinstance(password, str)
    pw_hash = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations
    )
    b64_hash = base64.b64encode(pw_hash).decode("ascii").strip()
    return "{}${}${}${}".format(PASSWORD_HASH_ALGORITHM, iterations, salt, b64_hash)


def verify_password(password, password_hash):
    if (password_hash or "").count("$") != 3:
        return False
    algorithm, iterations, salt, b64_hash = password_hash.split("$", 3)
    iterations = int(iterations)
    assert algorithm == PASSWORD_HASH_ALGORITHM
    compare_hash = hash_password(password, salt, iterations)
    return secrets.compare_digest(password_hash, compare_hash)


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password strength.

    Returns a tuple of (is_valid, error_message).
    """
    if not password:
        return False, "Password cannot be empty"

    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"

    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"

    if not any(c in '!@#$%^&*(),.?":{}|<>' for c in password):
        return False, "Password must contain at least one special character"

    return True, None


def create_encoded_jwt(user, role, expiration, secret):
    return jwt.encode(
        {"alg": "HS256"},
        {"sub": user, "role": role, "exp": expiration, "iat": int(time.time())},
        secret,
    )


def set_jwt_cookie(response: Response, cookie_name, encoded_jwt, expiration, secure):
    # TODO: ideally this would set secure as well, but that requires TLS
    response.set_cookie(
        key=cookie_name,
        value=encoded_jwt,
        httponly=True,
        expires=expiration,
        secure=secure,
    )


async def get_current_user(request: Request):
    username = request.headers.get("remote-user")
    role = request.headers.get("remote-role")

    if not username or not role:
        return JSONResponse(
            content={"message": "No authorization headers."}, status_code=401
        )

    return {"username": username, "role": role}


def require_role(required_roles: List[str]):
    async def role_checker(request: Request):
        proxy_config: ProxyConfig = request.app.frigate_config.proxy
        config_roles = list(request.app.frigate_config.auth.roles.keys())

        # Get role from header (could be comma-separated)
        role_header = request.headers.get("remote-role")
        roles = (
            [r.strip() for r in role_header.split(proxy_config.separator)]
            if role_header
            else []
        )

        # Check if we have any roles
        if not roles:
            raise HTTPException(status_code=403, detail="Role not provided")

        # enforce config roles
        valid_roles = [r for r in roles if r in config_roles]
        if not valid_roles:
            raise HTTPException(
                status_code=403,
                detail=f"No valid roles found in {roles}. Required: {', '.join(required_roles)}. Available: {', '.join(config_roles)}",
            )

        if not any(role in required_roles for role in valid_roles):
            raise HTTPException(
                status_code=403,
                detail=f"Role {', '.join(valid_roles)} not authorized. Required: {', '.join(required_roles)}",
            )

        return next(
            (role for role in valid_roles if role in required_roles), valid_roles[0]
        )

    return role_checker


def resolve_role(
    headers: dict, proxy_config: ProxyConfig, config_roles: set[str]
) -> str:
    """
    Determine the effective role for a request based on proxy headers and configuration.

    Order of resolution:
      1. If a role header is defined in proxy_config.header_map.role:
         - If a role_map is configured, treat the header as group claims
           (split by proxy_config.separator) and map to roles.
         - If no role_map is configured, treat the header as role names directly.
      2. If no valid role is found, return proxy_config.default_role if it's valid in config_roles, else 'viewer'.

    Args:
        headers (dict): Incoming request headers (case-insensitive).
        proxy_config (ProxyConfig): Proxy configuration.
        config_roles (set[str]): Set of valid roles from config.

    Returns:
        str: Resolved role (one of config_roles or validated default).
    """
    default_role = proxy_config.default_role
    role_header = proxy_config.header_map.role

    # Validate default_role against config; fallback to 'viewer' if invalid
    validated_default = default_role if default_role in config_roles else "viewer"
    if not config_roles:
        validated_default = "viewer"  # Edge case: no roles defined

    if not role_header:
        logger.debug(
            "No role header configured in proxy_config.header_map. Returning validated default role '%s'.",
            validated_default,
        )
        return validated_default

    raw_value = headers.get(role_header, "")
    logger.debug("Raw role header value from '%s': %r", role_header, raw_value)

    if not raw_value:
        logger.debug(
            "Role header missing or empty. Returning validated default role '%s'.",
            validated_default,
        )
        return validated_default

    # role_map configured, treat header as group claims
    if proxy_config.header_map.role_map:
        groups = [
            g.strip() for g in raw_value.split(proxy_config.separator) if g.strip()
        ]
        logger.debug("Parsed groups from role header: %s", groups)

        matched_roles = {
            role_name
            for role_name, required_groups in proxy_config.header_map.role_map.items()
            if any(group in groups for group in required_groups)
        }
        logger.debug("Matched roles from role_map: %s", matched_roles)

        if matched_roles:
            resolved = next(
                (r for r in config_roles if r in matched_roles), validated_default
            )
            logger.debug("Resolved role (with role_map) to '%s'.", resolved)
            return resolved

        logger.debug(
            "No role_map match for groups '%s'. Using validated default role '%s'.",
            raw_value,
            validated_default,
        )
        return validated_default

    # no role_map, treat as role names directly
    roles_from_header = [
        r.strip().lower() for r in raw_value.split(proxy_config.separator) if r.strip()
    ]
    logger.debug("Parsed roles directly from header: %s", roles_from_header)

    resolved = next(
        (r for r in config_roles if r in roles_from_header),
        validated_default,
    )
    if resolved == validated_default and roles_from_header:
        logger.debug(
            "Provided proxy role header values '%s' did not contain a valid role. Using validated default role '%s'.",
            raw_value,
            validated_default,
        )
    else:
        logger.debug("Resolved role (direct header) to '%s'.", resolved)

    return resolved


# Endpoints
@router.get(
    "/auth",
    dependencies=[Depends(allow_public())],
    summary="Authenticate request",
    description=(
        "Authenticates the current request based on proxy headers or JWT token. "
        "This endpoint verifies authentication credentials and manages JWT token refresh. "
        "On success, no JSON body is returned; authentication state is communicated via response headers and cookies."
    ),
    status_code=202,
    responses={
        202: {
            "description": "Authentication Accepted (no response body)",
            "headers": {
                "remote-user": {
                    "description": 'Authenticated username or "anonymous" in proxy-only mode',
                    "schema": {"type": "string"},
                },
                "remote-role": {
                    "description": "Resolved role (e.g., admin, viewer, or custom)",
                    "schema": {"type": "string"},
                },
                "Set-Cookie": {
                    "description": "May include refreshed JWT cookie when applicable",
                    "schema": {"type": "string"},
                },
            },
        },
        401: {"description": "Authentication Failed"},
    },
)
def auth(request: Request):
    auth_config: AuthConfig = request.app.frigate_config.auth
    proxy_config: ProxyConfig = request.app.frigate_config.proxy

    success_response = Response("", status_code=202)

    # dont require auth if the request is on the internal port
    # this header is set by Frigate's nginx proxy, so it cant be spoofed
    if int(request.headers.get("x-server-port", default=0)) == 5000:
        success_response.headers["remote-user"] = "anonymous"
        success_response.headers["remote-role"] = "admin"
        return success_response

    fail_response = Response("", status_code=401)

    # ensure the proxy secret matches if configured
    if (
        proxy_config.auth_secret is not None
        and request.headers.get("x-proxy-secret", "") != proxy_config.auth_secret
    ):
        logger.debug("X-Proxy-Secret header does not match configured secret value")
        return fail_response

    # if auth is disabled, just apply the proxy header map and return success
    if not auth_config.enabled:
        # pass the user header value from the upstream proxy if a mapping is specified
        # or use anonymous if none are specified
        user_header = proxy_config.header_map.user
        success_response.headers["remote-user"] = (
            request.headers.get(user_header, default="anonymous")
            if user_header
            else "anonymous"
        )

        # parse header and resolve a valid role
        config_roles_set = set(auth_config.roles.keys())
        role = resolve_role(request.headers, proxy_config, config_roles_set)

        success_response.headers["remote-role"] = role
        return success_response

    # now apply authentication
    fail_response.headers["location"] = "/login"

    JWT_COOKIE_NAME = request.app.frigate_config.auth.cookie_name
    JWT_COOKIE_SECURE = request.app.frigate_config.auth.cookie_secure
    JWT_REFRESH = request.app.frigate_config.auth.refresh_time
    JWT_SESSION_LENGTH = request.app.frigate_config.auth.session_length

    jwt_source = None
    encoded_token = None
    if "authorization" in request.headers and request.headers[
        "authorization"
    ].startswith("Bearer "):
        jwt_source = "authorization"
        logger.debug("Found authorization header")
        encoded_token = request.headers["authorization"].replace("Bearer ", "")
    elif JWT_COOKIE_NAME in request.cookies:
        jwt_source = "cookie"
        logger.debug("Found jwt cookie")
        encoded_token = request.cookies[JWT_COOKIE_NAME]

    if encoded_token is None:
        logger.debug("No jwt token found")
        return fail_response

    try:
        token = jwt.decode(encoded_token, request.app.jwt_token)
        if "sub" not in token.claims:
            logger.debug("user not set in jwt token")
            return fail_response
        if "role" not in token.claims:
            logger.debug("role not set in jwt token")
            return fail_response
        if "exp" not in token.claims:
            logger.debug("exp not set in jwt token")
            return fail_response

        user = token.claims.get("sub")
        role = token.claims.get("role")
        current_time = int(time.time())

        # if the jwt is expired
        expiration = int(token.claims.get("exp"))
        logger.debug(
            f"current time:   {datetime.fromtimestamp(current_time).strftime('%c')}"
        )
        logger.debug(
            f"jwt expires at: {datetime.fromtimestamp(expiration).strftime('%c')}"
        )
        logger.debug(
            f"jwt refresh at: {datetime.fromtimestamp(expiration - JWT_REFRESH).strftime('%c')}"
        )
        if expiration <= current_time:
            logger.debug("jwt token expired")
            return fail_response

        # if the jwt cookie is expiring soon
        if jwt_source == "cookie" and expiration - JWT_REFRESH <= current_time:
            logger.debug("jwt token expiring soon, refreshing cookie")

            # Check if password has been changed since token was issued
            # If so, force re-login by rejecting the refresh
            try:
                user_obj = User.get_by_id(user)
                if user_obj.password_changed_at is not None:
                    token_iat = int(token.claims.get("iat", 0))
                    password_changed_timestamp = int(
                        user_obj.password_changed_at.timestamp()
                    )
                    if token_iat < password_changed_timestamp:
                        logger.debug(
                            "jwt token issued before password change, rejecting refresh"
                        )
                        return fail_response
            except DoesNotExist:
                logger.debug("user not found")
                return fail_response

            new_expiration = current_time + JWT_SESSION_LENGTH
            new_encoded_jwt = create_encoded_jwt(
                user, role, new_expiration, request.app.jwt_token
            )
            set_jwt_cookie(
                success_response,
                JWT_COOKIE_NAME,
                new_encoded_jwt,
                new_expiration,
                JWT_COOKIE_SECURE,
            )

        success_response.headers["remote-user"] = user
        success_response.headers["remote-role"] = role
        return success_response
    except Exception as e:
        logger.error(f"Error parsing jwt: {e}")
        return fail_response


@router.get(
    "/profile",
    dependencies=[Depends(allow_any_authenticated())],
    summary="Get user profile",
    description="Returns the current authenticated user's profile including username, role, and allowed cameras. This endpoint requires authentication and returns information about the user's permissions.",
)
def profile(request: Request):
    username = request.headers.get("remote-user", "anonymous")
    role = request.headers.get("remote-role", "viewer")

    all_camera_names = set(request.app.frigate_config.cameras.keys())
    roles_dict = request.app.frigate_config.auth.roles
    allowed_cameras = User.get_allowed_cameras(role, roles_dict, all_camera_names)

    return JSONResponse(
        content={"username": username, "role": role, "allowed_cameras": allowed_cameras}
    )


@router.get(
    "/logout",
    dependencies=[Depends(allow_public())],
    summary="Logout user",
    description="Logs out the current user by clearing the session cookie. After logout, subsequent requests will require re-authentication.",
)
def logout(request: Request):
    auth_config: AuthConfig = request.app.frigate_config.auth
    response = RedirectResponse("/login", status_code=303)
    response.delete_cookie(auth_config.cookie_name)
    return response


limiter = Limiter(key_func=get_remote_addr)


@router.post(
    "/login",
    dependencies=[Depends(allow_public())],
    summary="Login with credentials",
    description='Authenticates a user with username and password. Returns a JWT token as a secure HTTP-only cookie that can be used for subsequent API requests. The JWT token can also be retrieved from the response and used as a Bearer token in the Authorization header.\n\nExample using Bearer token:\n```\ncurl -H "Authorization: Bearer <token_value>" https://frigate_ip:8971/api/profile\n```',
)
@limiter.limit(limit_value=rateLimiter.get_limit)
def login(request: Request, body: AppPostLoginBody):
    JWT_COOKIE_NAME = request.app.frigate_config.auth.cookie_name
    JWT_COOKIE_SECURE = request.app.frigate_config.auth.cookie_secure
    JWT_SESSION_LENGTH = request.app.frigate_config.auth.session_length
    user = body.user
    password = body.password

    try:
        db_user: User = User.get_by_id(user)
    except DoesNotExist:
        return JSONResponse(content={"message": "Login failed"}, status_code=401)

    password_hash = db_user.password_hash
    if verify_password(password, password_hash):
        role = getattr(db_user, "role", "viewer")
        config_roles_set = set(request.app.frigate_config.auth.roles.keys())
        if role not in config_roles_set:
            logger.warning(
                f"User {db_user.username} has an invalid role {role}, falling back to 'viewer'."
            )
            role = "viewer"
        expiration = int(time.time()) + JWT_SESSION_LENGTH
        encoded_jwt = create_encoded_jwt(user, role, expiration, request.app.jwt_token)
        response = Response("", 200)
        set_jwt_cookie(
            response, JWT_COOKIE_NAME, encoded_jwt, expiration, JWT_COOKIE_SECURE
        )
        # Clear admin_first_time_login flag after successful admin login so the
        # UI stops showing the first-time login documentation link.
        if role == "admin":
            request.app.frigate_config.auth.admin_first_time_login = False

        return response
    return JSONResponse(content={"message": "Login failed"}, status_code=401)


@router.get(
    "/users",
    dependencies=[Depends(require_role(["admin"]))],
    summary="Get all users",
    description="Returns a list of all users with their usernames and roles. Requires admin role. Each user object contains the username and assigned role.",
)
def get_users():
    exports = (
        User.select(User.username, User.role).order_by(User.username).dicts().iterator()
    )
    return JSONResponse([e for e in exports])


@router.post(
    "/users",
    dependencies=[Depends(require_role(["admin"]))],
    summary="Create new user",
    description='Creates a new user with the specified username, password, and role. Requires admin role. Password must meet strength requirements: minimum 8 characters, at least one uppercase letter, at least one digit, and at least one special character (!@#$%^&*(),.?":{} |<>).',
)
def create_user(
    request: Request,
    body: AppPostUsersBody,
):
    HASH_ITERATIONS = request.app.frigate_config.auth.hash_iterations
    config_roles = list(request.app.frigate_config.auth.roles.keys())

    if not re.match("^[A-Za-z0-9._]+$", body.username):
        return JSONResponse(content={"message": "Invalid username"}, status_code=400)

    if body.role not in config_roles:
        return JSONResponse(
            content={"message": f"Role must be one of: {', '.join(config_roles)}"},
            status_code=400,
        )
    role = body.role or "viewer"
    password_hash = hash_password(body.password, iterations=HASH_ITERATIONS)
    User.insert(
        {
            User.username: body.username,
            User.password_hash: password_hash,
            User.role: role,
            User.notification_tokens: [],
        }
    ).execute()
    return JSONResponse(content={"username": body.username})


@router.delete(
    "/users/{username}",
    dependencies=[Depends(require_role(["admin"]))],
    summary="Delete user",
    description="Deletes a user by username. The built-in admin user cannot be deleted. Requires admin role. Returns success message or error if user not found.",
)
def delete_user(request: Request, username: str):
    # Prevent deletion of the built-in admin user
    if username == "admin":
        return JSONResponse(
            content={"message": "Cannot delete admin user"}, status_code=403
        )

    User.delete_by_id(username)
    return JSONResponse(content={"success": True})


@router.put(
    "/users/{username}/password",
    dependencies=[Depends(allow_any_authenticated())],
    summary="Update user password",
    description="Updates a user's password. Users can only change their own password unless they have admin role. Requires the current password to verify identity for non-admin users. Password must meet strength requirements: minimum 8 characters, at least one uppercase letter, at least one digit, and at least one special character (!@#$%^&*(),.?\":{} |<>). If user changes their own password, a new JWT cookie is automatically issued.",
)
async def update_password(
    request: Request,
    username: str,
    body: AppPutPasswordBody,
):
    current_user = await get_current_user(request)
    if isinstance(current_user, JSONResponse):
        # auth failed
        return current_user

    current_username = current_user.get("username")
    current_role = current_user.get("role")

    # viewers can only change their own password
    if current_role == "viewer" and current_username != username:
        raise HTTPException(
            status_code=403, detail="Viewers can only update their own password"
        )

    HASH_ITERATIONS = request.app.frigate_config.auth.hash_iterations

    try:
        user = User.get_by_id(username)
    except DoesNotExist:
        return JSONResponse(content={"message": "User not found"}, status_code=404)

    # Require old_password when:
    # 1. Non-admin user is changing another user's password (admin only action)
    # 2. Any user is changing their own password
    is_changing_own_password = current_username == username
    is_non_admin = current_role != "admin"

    if is_changing_own_password or is_non_admin:
        if not body.old_password:
            return JSONResponse(
                content={"message": "Current password is required"},
                status_code=400,
            )
        if not verify_password(body.old_password, user.password_hash):
            return JSONResponse(
                content={"message": "Current password is incorrect"},
                status_code=401,
            )

    # Validate new password strength
    is_valid, error_message = validate_password_strength(body.password)
    if not is_valid:
        return JSONResponse(
            content={"message": error_message},
            status_code=400,
        )

    password_hash = hash_password(body.password, iterations=HASH_ITERATIONS)
    User.update(
        {
            User.password_hash: password_hash,
            User.password_changed_at: datetime.now(),
        }
    ).where(User.username == username).execute()

    response = JSONResponse(content={"success": True})

    # If user changed their own password, issue a new JWT to keep them logged in
    if current_username == username:
        JWT_COOKIE_NAME = request.app.frigate_config.auth.cookie_name
        JWT_COOKIE_SECURE = request.app.frigate_config.auth.cookie_secure
        JWT_SESSION_LENGTH = request.app.frigate_config.auth.session_length

        expiration = int(time.time()) + JWT_SESSION_LENGTH
        encoded_jwt = create_encoded_jwt(
            username, current_role, expiration, request.app.jwt_token
        )
        # Set new JWT cookie on response
        set_jwt_cookie(
            response, JWT_COOKIE_NAME, encoded_jwt, expiration, JWT_COOKIE_SECURE
        )

    return response


@router.put(
    "/users/{username}/role",
    dependencies=[Depends(require_role(["admin"]))],
    summary="Update user role",
    description="Updates a user's role. The built-in admin user's role cannot be modified. Requires admin role. Valid roles are defined in the configuration.",
)
async def update_role(
    request: Request,
    username: str,
    body: AppPutRoleBody,
):
    current_user = await get_current_user(request)
    if isinstance(current_user, JSONResponse):
        # auth failed
        return current_user

    current_role = current_user.get("role")
    # viewers can't change anyone's role
    if current_role == "viewer":
        raise HTTPException(
            status_code=403, detail="Admin role is required to change user roles"
        )
    if username == "admin":
        return JSONResponse(
            content={"message": "Cannot modify admin user's role"}, status_code=403
        )
    config_roles = list(request.app.frigate_config.auth.roles.keys())
    if body.role not in config_roles:
        return JSONResponse(
            content={"message": f"Role must be one of: {', '.join(config_roles)}"},
            status_code=400,
        )

    User.set_by_id(username, {User.role: body.role})
    return JSONResponse(content={"success": True})


async def require_camera_access(
    camera_name: Optional[str] = None,
    request: Request = None,
):
    """Dependency to enforce camera access based on user role."""
    if camera_name is None:
        return  # For lists, filter later

    current_user = await get_current_user(request)
    if isinstance(current_user, JSONResponse):
        return current_user

    role = current_user["role"]
    all_camera_names = set(request.app.frigate_config.cameras.keys())
    roles_dict = request.app.frigate_config.auth.roles
    allowed_cameras = User.get_allowed_cameras(role, roles_dict, all_camera_names)

    # Admin or full access bypasses
    if role == "admin" or not roles_dict.get(role):
        return

    if camera_name not in allowed_cameras:
        raise HTTPException(
            status_code=403,
            detail=f"Access denied to camera '{camera_name}'. Allowed: {allowed_cameras}",
        )


async def get_allowed_cameras_for_filter(request: Request):
    """Dependency to get allowed_cameras for filtering lists."""
    current_user = await get_current_user(request)
    if isinstance(current_user, JSONResponse):
        return []  # Unauthorized: no cameras

    role = current_user["role"]
    all_camera_names = set(request.app.frigate_config.cameras.keys())
    roles_dict = request.app.frigate_config.auth.roles
    return User.get_allowed_cameras(role, roles_dict, all_camera_names)
