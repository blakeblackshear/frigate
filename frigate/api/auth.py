"""Auth apis."""

import base64
import hashlib
import json
import logging
import os
import secrets
import time
from datetime import datetime
from pathlib import Path

from flask import Blueprint, current_app, make_response, request
from joserfc import jwt

from frigate.const import CONFIG_DIR, JWT_SECRET_ENV_VAR, PASSWORD_HASH_ALGORITHM

logger = logging.getLogger(__name__)

AuthBp = Blueprint("auth", __name__)


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


def hash_password(password, salt=None, iterations=260000):
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
    response.set_cookie(cookie_name, encoded_jwt, httponly=True, expires=expiration)


@AuthBp.route("/auth")
def auth():
    if not current_app.frigate_config.auth.enabled:
        return make_response({}, 202)

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
        return make_response({}, 401)

    try:
        response = make_response({}, 202)

        token = jwt.decode(encoded_token, current_app.jwt_token)
        if "sub" not in token.claims:
            logger.debug("user not set in jwt token")
            return make_response({}, 401)
        if "exp" not in token.claims:
            logger.debug("exp not set in jwt token")
            return make_response({}, 401)

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
            return make_response({}, 401)

        # if the jwt cookie is expiring soon
        elif jwt_source == "cookie" and expiration - JWT_REFRESH <= current_time:
            logger.debug("jwt token expiring soon, refreshing cookie")
            new_expiration = current_time + JWT_SESSION_LENGTH
            new_encoded_jwt = create_encoded_jwt(
                user, new_expiration, current_app.jwt_token
            )
            set_jwt_cookie(response, JWT_COOKIE_NAME, new_encoded_jwt, new_expiration)

        response.headers["remote-user"] = user
        return response
    except Exception as e:
        logger.error(f"Error parsing jwt: {e}")
        return make_response({}, 401)


@AuthBp.route("/login", methods=["POST"])
def login():
    JWT_COOKIE_NAME = current_app.frigate_config.auth.cookie_name
    JWT_SESSION_LENGTH = current_app.frigate_config.auth.session_length
    content = request.get_json()
    user = content["user"]
    password = content["password"]
    password_hash = next(
        (
            u.password_hash
            for u in current_app.frigate_config.auth.users
            if u.user == user
        ),
        None,
    )
    # if the user wasn't found in the config
    if password_hash is None:
        make_response({"message": "Login failed"}, 400)
    if verify_password(password, password_hash):
        expiration = int(time.time()) + JWT_SESSION_LENGTH
        encoded_jwt = create_encoded_jwt(user, expiration, current_app.jwt_token)
        response = make_response({}, 200)
        set_jwt_cookie(response, JWT_COOKIE_NAME, encoded_jwt, expiration)
        return response
    return make_response({"message": "Login failed"}, 400)
