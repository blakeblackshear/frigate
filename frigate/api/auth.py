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

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse
from joserfc import jwt
from peewee import DoesNotExist
from slowapi import Limiter

from frigate.api.defs.app_body import (
    AppPostLoginBody,
    AppPostUsersBody,
    AppPutPasswordBody,
)
from frigate.api.defs.tags import Tags
from frigate.config import AuthConfig, ProxyConfig
from frigate.const import CONFIG_DIR, JWT_SECRET_ENV_VAR, PASSWORD_HASH_ALGORITHM
from frigate.models import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.auth])


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
                if ipv4 in trusted_proxy:
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
    return request.remote_addr or "127.0.0.1"


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
    # check for the addon options file
    elif os.path.isfile("/data/options.json"):
        with open("/data/options.json") as f:
            raw_options = f.read()
        logger.debug("Using jwt secret from Home Assistant addon options file.")
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
                with open(jwt_secret_file, "w") as f:
                    f.write(str(jwt_secret))
            except Exception:
                logger.warning(
                    "Unable to write jwt token file to config directory. A new jwt token will be created at each startup."
                )
        else:
            logger.debug("Using jwt secret from .jwt_secret file in config directory.")
            with open(jwt_secret_file) as f:
                try:
                    jwt_secret = f.readline()
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


def create_encoded_jwt(user, expiration, secret):
    return jwt.encode({"alg": "HS256"}, {"sub": user, "exp": expiration}, secret)


def set_jwt_cookie(response: Response, cookie_name, encoded_jwt, expiration, secure):
    # TODO: ideally this would set secure as well, but that requires TLS
    response.set_cookie(
        key=cookie_name,
        value=encoded_jwt,
        httponly=True,
        expires=expiration,
        secure=secure,
    )


# Endpoint for use with nginx auth_request
@router.get("/auth")
def auth(request: Request):
    auth_config: AuthConfig = request.app.frigate_config.auth
    proxy_config: ProxyConfig = request.app.frigate_config.proxy

    success_response = Response("", status_code=202)

    # dont require auth if the request is on the internal port
    # this header is set by Frigate's nginx proxy, so it cant be spoofed
    if int(request.headers.get("x-server-port", default=0)) == 5000:
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
        if proxy_config.header_map.user is not None:
            upstream_user_header_value = request.headers.get(
                proxy_config.header_map.user,
                default="anonymous",
            )
            success_response.headers["remote-user"] = upstream_user_header_value
        else:
            success_response.headers["remote-user"] = "anonymous"
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
        if "exp" not in token.claims:
            logger.debug("exp not set in jwt token")
            return fail_response

        user = token.claims.get("sub")
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
        elif jwt_source == "cookie" and expiration - JWT_REFRESH <= current_time:
            logger.debug("jwt token expiring soon, refreshing cookie")
            # ensure the user hasn't been deleted
            try:
                User.get_by_id(user)
            except DoesNotExist:
                return fail_response
            new_expiration = current_time + JWT_SESSION_LENGTH
            new_encoded_jwt = create_encoded_jwt(
                user, new_expiration, request.app.jwt_token
            )
            set_jwt_cookie(
                success_response,
                JWT_COOKIE_NAME,
                new_encoded_jwt,
                new_expiration,
                JWT_COOKIE_SECURE,
            )

        success_response.headers["remote-user"] = user
        return success_response
    except Exception as e:
        logger.error(f"Error parsing jwt: {e}")
        return fail_response


@router.get("/profile")
def profile(request: Request):
    username = request.headers.get("remote-user")
    return JSONResponse(content={"username": username})


@router.get("/logout")
def logout(request: Request):
    auth_config: AuthConfig = request.app.frigate_config.auth
    response = RedirectResponse("/login", status_code=303)
    response.delete_cookie(auth_config.cookie_name)
    return response


limiter = Limiter(key_func=get_remote_addr)


@router.post("/login")
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
        return JSONResponse(content={"message": "Login failed"}, status_code=400)

    password_hash = db_user.password_hash
    if verify_password(password, password_hash):
        expiration = int(time.time()) + JWT_SESSION_LENGTH
        encoded_jwt = create_encoded_jwt(user, expiration, request.app.jwt_token)
        response = Response("", 200)
        set_jwt_cookie(
            response, JWT_COOKIE_NAME, encoded_jwt, expiration, JWT_COOKIE_SECURE
        )
        return response
    return JSONResponse(content={"message": "Login failed"}, status_code=400)


@router.get("/users")
def get_users():
    exports = User.select(User.username).order_by(User.username).dicts().iterator()
    return JSONResponse([e for e in exports])


@router.post("/users")
def create_user(request: Request, body: AppPostUsersBody):
    HASH_ITERATIONS = request.app.frigate_config.auth.hash_iterations

    if not re.match("^[A-Za-z0-9._]+$", body.username):
        JSONResponse(content={"message": "Invalid username"}, status_code=400)

    password_hash = hash_password(body.password, iterations=HASH_ITERATIONS)

    User.insert(
        {
            User.username: body.username,
            User.password_hash: password_hash,
            User.notification_tokens: [],
        }
    ).execute()
    return JSONResponse(content={"username": body.username})


@router.delete("/users/{username}")
def delete_user(username: str):
    User.delete_by_id(username)
    return JSONResponse(content={"success": True})


@router.put("/users/{username}/password")
def update_password(request: Request, username: str, body: AppPutPasswordBody):
    HASH_ITERATIONS = request.app.frigate_config.auth.hash_iterations

    password_hash = hash_password(body.password, iterations=HASH_ITERATIONS)

    User.set_by_id(
        username,
        {
            User.password_hash: password_hash,
        },
    )
    return JSONResponse(content={"success": True})
