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

from flask import Blueprint, current_app, jsonify, make_response, redirect, request
from flask_limiter import Limiter
from joserfc import jwt
from peewee import DoesNotExist

from frigate.config import AuthConfig, AuthModeEnum
from frigate.const import CONFIG_DIR, JWT_SECRET_ENV_VAR, PASSWORD_HASH_ALGORITHM
from frigate.models import User

logger = logging.getLogger(__name__)

AuthBp = Blueprint("auth", __name__)


def get_remote_addr():
    route = list(reversed(request.headers.get("x-forwarded-for").split(",")))
    logger.debug(f"IP Route: {[r for r in route]}")
    trusted_proxies = []
    for proxy in current_app.frigate_config.auth.trusted_proxies:
        try:
            network = ipaddress.ip_network(proxy)
        except ValueError:
            logger.warn(f"Unable to parse trusted network: {proxy}")
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


limiter = Limiter(
    get_remote_addr,
    storage_uri="memory://",
)


def get_rate_limit():
    return current_app.frigate_config.auth.failed_login_rate_limit


def get_jwt_secret() -> str:
    jwt_secret = None
    # check env var
    if JWT_SECRET_ENV_VAR in os.environ:
        logger.debug(
            f"Using jwt secret from {JWT_SECRET_ENV_VAR} environment variable."
        )
        jwt_secret = os.environ.get(JWT_SECRET_ENV_VAR)
    # check docker secrets
    elif (
        os.path.isdir("/run/secrets")
        and os.access("/run/secrets", os.R_OK)
        and JWT_SECRET_ENV_VAR in os.listdir("/run/secrets")
    ):
        logger.debug(f"Using jwt secret from {JWT_SECRET_ENV_VAR} docker secret file.")
        jwt_secret = Path(os.path.join("/run/secrets", JWT_SECRET_ENV_VAR)).read_text()
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
                logger.warn(
                    "Unable to write jwt token file to config directory. A new jwt token will be created at each startup."
                )
        else:
            logger.debug("Using jwt secret from .jwt_secret file in config directory.")
            with open(jwt_secret_file) as f:
                try:
                    jwt_secret = f.readline()
                except Exception:
                    logger.warn(
                        "Unable to read jwt token from .jwt_secret file in config directory. A new jwt token will be created at each startup."
                    )
                    jwt_secret = secrets.token_hex(64)

    if len(jwt_secret) < 64:
        logger.warn("JWT Secret is recommended to be 64 characters or more")

    return jwt_secret


def hash_password(password, salt=None, iterations=600000):
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


def set_jwt_cookie(response, cookie_name, encoded_jwt, expiration):
    # TODO: ideally this would set secure as well, but that requires TLS
    response.set_cookie(
        cookie_name, encoded_jwt, httponly=True, expires=expiration, secure=False
    )


# Endpoint for use with nginx auth_request
@AuthBp.route("/auth")
def auth():
    success_response = make_response({}, 202)

    # dont require auth if the request is on the internal port
    # this header is set by Frigate's nginx proxy, so it cant be spoofed
    if request.headers.get("x-server-port", 0, type=int) == 5000:
        return success_response

    # if proxy auth mode
    if current_app.frigate_config.auth.mode == AuthModeEnum.proxy:
        # pass the user header value from the upstream proxy if a mapping is specified
        # or use anonymous if none are specified
        if current_app.frigate_config.auth.header_map.user is not None:
            upstream_user_header_value = request.headers.get(
                current_app.frigate_config.auth.header_map.user,
                type=str,
                default="anonymous",
            )
            success_response.headers["remote-user"] = upstream_user_header_value
        else:
            success_response.headers["remote-user"] = "anonymous"
        return success_response

    fail_response = make_response({}, 401)
    fail_response.headers["location"] = "/login"

    JWT_COOKIE_NAME = current_app.frigate_config.auth.cookie_name
    JWT_REFRESH = current_app.frigate_config.auth.refresh_time
    JWT_SESSION_LENGTH = current_app.frigate_config.auth.session_length

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
        token = jwt.decode(encoded_token, current_app.jwt_token)
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
                user, new_expiration, current_app.jwt_token
            )
            set_jwt_cookie(
                success_response, JWT_COOKIE_NAME, new_encoded_jwt, new_expiration
            )

        success_response.headers["remote-user"] = user
        return success_response
    except Exception as e:
        logger.error(f"Error parsing jwt: {e}")
        return fail_response


@AuthBp.route("/profile")
def profile():
    username = request.headers.get("remote-user", type=str)
    return jsonify({"username": username})


@AuthBp.route("/logout")
def logout():
    auth_config: AuthConfig = current_app.frigate_config.auth
    response = make_response(redirect("/login", code=303))
    response.delete_cookie(auth_config.cookie_name)
    return response


@AuthBp.route("/login", methods=["POST"])
@limiter.limit(get_rate_limit, deduct_when=lambda response: response.status_code == 400)
def login():
    JWT_COOKIE_NAME = current_app.frigate_config.auth.cookie_name
    JWT_SESSION_LENGTH = current_app.frigate_config.auth.session_length
    content = request.get_json()
    user = content["user"]
    password = content["password"]

    try:
        db_user: User = User.get_by_id(user)
    except DoesNotExist:
        return make_response({"message": "Login failed"}, 400)

    password_hash = db_user.password_hash
    if verify_password(password, password_hash):
        expiration = int(time.time()) + JWT_SESSION_LENGTH
        encoded_jwt = create_encoded_jwt(user, expiration, current_app.jwt_token)
        response = make_response({}, 200)
        set_jwt_cookie(response, JWT_COOKIE_NAME, encoded_jwt, expiration)
        return response
    return make_response({"message": "Login failed"}, 400)


@AuthBp.route("/users")
def get_users():
    exports = User.select(User.username).order_by(User.username).dicts().iterator()
    return jsonify([e for e in exports])


@AuthBp.route("/users", methods=["POST"])
def create_user():
    HASH_ITERATIONS = current_app.frigate_config.auth.hash_iterations

    request_data = request.get_json()

    if not re.match("^[A-Za-z0-9._]+$", request_data.get("username", "")):
        make_response({"message": "Invalid username"}, 400)

    password_hash = hash_password(request_data["password"], iterations=HASH_ITERATIONS)

    User.insert(
        {
            User.username: request_data["username"],
            User.password_hash: password_hash,
        }
    ).execute()
    return jsonify({"username": request_data["username"]})


@AuthBp.route("/users/<username>", methods=["DELETE"])
def delete_user(username: str):
    User.delete_by_id(username)
    return jsonify({"success": True})


@AuthBp.route("/users/<username>/password", methods=["PUT"])
def update_password(username: str):
    HASH_ITERATIONS = current_app.frigate_config.auth.hash_iterations

    request_data = request.get_json()

    password_hash = hash_password(request_data["password"], iterations=HASH_ITERATIONS)

    User.set_by_id(
        username,
        {
            User.password_hash: password_hash,
        },
    )
    return jsonify({"success": True})
