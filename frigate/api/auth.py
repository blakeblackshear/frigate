"""Auth apis."""

import base64
import hashlib
import logging
import secrets
import time
from datetime import datetime

from flask import Blueprint, current_app, make_response, request
from joserfc import jwt

logger = logging.getLogger(__name__)

AuthBp = Blueprint("auth", __name__)


ALGORITHM = "pbkdf2_sha256"
JWT_SECRET = "secret"


def hash_password(password, salt=None, iterations=260000):
    if salt is None:
        salt = secrets.token_hex(16)
    assert salt and isinstance(salt, str) and "$" not in salt
    assert isinstance(password, str)
    pw_hash = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations
    )
    b64_hash = base64.b64encode(pw_hash).decode("ascii").strip()
    return "{}${}${}${}".format(ALGORITHM, iterations, salt, b64_hash)


def verify_password(password, password_hash):
    if (password_hash or "").count("$") != 3:
        return False
    algorithm, iterations, salt, b64_hash = password_hash.split("$", 3)
    iterations = int(iterations)
    assert algorithm == ALGORITHM
    compare_hash = hash_password(password, salt, iterations)
    return secrets.compare_digest(password_hash, compare_hash)


def create_encoded_jwt(user, expiration, secret):
    return jwt.encode({"alg": "HS256"}, {"sub": user, "exp": expiration}, secret)


def set_jwt_cookie(response, cookie_name, encoded_jwt, expiration):
    # TODO: ideally this would set secure as well, but that requires TLS
    response.set_cookie(cookie_name, encoded_jwt, httponly=True, expires=expiration)


# TODO:
# - on startup, generate a signing secret for jwt if it doesn't exist and save as ".auth-token" in the config folder
# -


@AuthBp.route("/auth")
def auth():
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

        token = jwt.decode(encoded_token, JWT_SECRET)
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
            new_encoded_jwt = create_encoded_jwt(user, new_expiration, JWT_SECRET)
            set_jwt_cookie(response, JWT_COOKIE_NAME, new_encoded_jwt, new_expiration)

        response.headers["remote-user"] = user
        return response
    except Exception as e:
        logger.error(f"Error parsing jwt: {e}")
        return make_response({}, 401)

    # grab the jwt token from the authorization header or a cookie


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
        encoded_jwt = create_encoded_jwt(user, expiration, JWT_SECRET)
        response = make_response({}, 200)
        set_jwt_cookie(response, JWT_COOKIE_NAME, encoded_jwt, expiration)
        return response
    return make_response({"message": "Login failed"}, 400)
