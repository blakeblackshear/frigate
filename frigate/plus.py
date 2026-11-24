import datetime
import email.utils
import json
import logging
import math
import os
import re
import threading
import time
from enum import Enum
from pathlib import Path
from typing import Any, TypeGuard

import aiohttp
import cv2
import requests
from numpy import ndarray
from requests.adapters import HTTPAdapter
from requests.models import Response
from urllib3.util.retry import Retry

from frigate.const import MODEL_CACHE_DIR, PLUS_API_HOST, PLUS_ENV_VAR

logger = logging.getLogger(__name__)

PLUS_VALIDATE_TIMEOUT = 10

# Requests run on several threads, and a reply that arrives late must not
# shorten a wait recorded from another one. The lock is kept out of PlusApi
# because the client is pickled with the config to start worker processes.
_rate_limit_lock = threading.Lock()


class PlusKeyStatus(str, Enum):
    """Result of validating a Frigate+ API key with the server."""

    valid = "valid"
    invalid = "invalid"
    unreachable = "unreachable"
    rate_limited = "rate_limited"
    not_set = "not_set"


def add_hailo_alias(model_info: dict[str, Any]) -> dict[str, Any]:
    """Name the hailo detector by its current key as well as its old one.

    Frigate+ reports every Hailo model as supporting hailo8l, which this
    detector was called before it was renamed to cover every Hailo device.
    The old key is kept so an older Frigate still matches the model.

    Args:
        model_info: A Frigate+ model's metadata, edited in place

    Returns:
        The same metadata
    """
    supported = model_info.get("supportedDetectors")

    if supported and "hailo8l" in supported and "hailo" not in supported:
        supported.append("hailo")

    return model_info


def load_plus_model_info(model_id: str) -> dict[str, Any] | None:
    """Read a Frigate+ model's cached info file.

    Args:
        model_id: The Frigate+ model id

    Returns:
        The model info, or None when it has not been cached or cannot be read
    """
    try:
        with open(os.path.join(MODEL_CACHE_DIR, f"{model_id}.json")) as f:
            model_info: dict[str, Any] = json.load(f)
    except (OSError, ValueError):
        return None

    return add_hailo_alias(model_info)


class PlusRateLimitError(Exception):
    """Frigate+ rejected a request because too many requests were made."""

    def __init__(self, retry_after: int | None) -> None:
        self.retry_after = retry_after
        super().__init__(
            f"Rate limited by Frigate+, retry in {retry_after} seconds"
            if retry_after is not None
            else "Rate limited by Frigate+"
        )


def parse_retry_after(value: str | None) -> int | None:
    """Read the number of seconds to wait from a Retry-After header.

    The header (RFC 9110 section 10.2.3) is either a number of seconds or an
    HTTP date to retry after.

    Args:
        value: The raw header value

    Returns:
        Whole seconds to wait, or None when the header is missing or invalid
    """
    if not value:
        return None

    value = value.strip()

    if value.isdigit():
        return int(value)

    try:
        retry_at = email.utils.parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return None

    # HTTP dates are always GMT, but "-0000" parses as a naive datetime
    if retry_at.tzinfo is None:
        retry_at = retry_at.replace(tzinfo=datetime.UTC)

    remaining = (retry_at - datetime.datetime.now(datetime.UTC)).total_seconds()
    return max(0, math.ceil(remaining))


def get_jpg_bytes(image: ndarray, max_dim: int, quality: int) -> bytes:
    if image.shape[1] >= image.shape[0]:
        width = min(max_dim, image.shape[1])
        height = int(width * image.shape[0] / image.shape[1])
    else:
        height = min(max_dim, image.shape[0])
        width = int(height * image.shape[1] / image.shape[0])

    original = cv2.resize(image, dsize=(width, height), interpolation=cv2.INTER_AREA)

    ret, jpg = cv2.imencode(".jpg", original, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    jpg_bytes = jpg.tobytes()
    return jpg_bytes if isinstance(jpg_bytes, bytes) else b""


def _is_usable_token(token_data: Any) -> TypeGuard[dict[str, Any]]:
    """Whether a Frigate+ token response has a usable token and expiry."""
    if not isinstance(token_data, dict):
        return False

    expires = token_data.get("expires")
    return (
        isinstance(token_data.get("accessToken"), str)
        and isinstance(expires, (int, float))
        and not isinstance(expires, bool)
    )


class PlusApi:
    def __init__(self) -> None:
        self.host = PLUS_API_HOST
        self.key = None
        if PLUS_ENV_VAR in os.environ:
            self.key = os.environ.get(PLUS_ENV_VAR)
        elif (
            os.path.isdir("/run/secrets")
            and os.access("/run/secrets", os.R_OK)
            and PLUS_ENV_VAR in os.listdir("/run/secrets")
        ):
            self.key = (
                Path(os.path.join("/run/secrets", PLUS_ENV_VAR)).read_text().strip()
            )
        # check for the add-on options file
        elif os.path.isfile("/data/options.json"):
            with open("/data/options.json") as f:
                raw_options = f.read()
            options = json.loads(raw_options)
            self.key = options.get("plus_api_key")

        if self.key is not None and not re.match(
            r"[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}:[a-z0-9]{40}",
            self.key,
        ):
            logger.error("Plus API Key is not formatted correctly.")
            self.key = None

        self._is_active: bool = self.key is not None
        self._token_data: dict = {}
        # when Frigate+ last asked us to back off, requests are refused locally
        # until this time instead of being sent to the server again
        self._rate_limited_until: float | None = None

        # Retry connection failures so a network that comes up late at startup
        # doesn't fail the Frigate+ model download. Retry-After is not honored
        # here, since urllib3 would block the calling thread for as long as the
        # server asks; a 429 is raised to the caller as PlusRateLimitError.
        self._session = requests.Session()
        self._session.mount(
            self.host,
            HTTPAdapter(
                max_retries=Retry(
                    connect=5, backoff_factor=1, respect_retry_after_header=False
                )
            ),
        )

    def rate_limit_remaining(self) -> int | None:
        """Seconds until Frigate+ accepts requests again, or None if not limited."""
        rate_limited_until = self._rate_limited_until

        if rate_limited_until is None:
            return None

        remaining = math.ceil(rate_limited_until - time.time())
        return remaining if remaining > 0 else None

    def _note_rate_limit(self, retry_after: int | None) -> None:
        """Remember how long Frigate+ asked us to wait."""
        logger.warning(
            "Frigate+ rate limit reached, retry after %s seconds",
            retry_after if retry_after is not None else "unknown",
        )

        if retry_after is None:
            return

        until = time.time() + retry_after

        with _rate_limit_lock:
            if self._rate_limited_until is None or until > self._rate_limited_until:
                self._rate_limited_until = until

    def _raise_if_rate_limited(self) -> None:
        remaining = self.rate_limit_remaining()

        if remaining is not None:
            raise PlusRateLimitError(remaining)

    def _check_rate_limit(self, r: Response) -> None:
        if r.status_code == 429:
            retry_after = parse_retry_after(r.headers.get("Retry-After"))
            self._note_rate_limit(retry_after)
            raise PlusRateLimitError(retry_after)

    def _refresh_token_if_needed(self) -> None:
        if (
            self._token_data.get("expires") is None
            or self._token_data["expires"] - datetime.datetime.now().timestamp() < 60
        ):
            if self.key is None:
                raise Exception(
                    "Plus API key not set. See https://docs.frigate.video/integrations/plus#set-your-api-key"
                )
            self._raise_if_rate_limited()
            parts = self.key.split(":")
            r = self._session.get(
                f"{self.host}/v1/auth/token", auth=(parts[0], parts[1])
            )
            self._check_rate_limit(r)
            if not r.ok:
                raise Exception(f"Unable to refresh API token: {r.text}")
            self._token_data = r.json()

    def _get_authorization_header(self) -> dict:
        self._refresh_token_if_needed()
        return {"authorization": f"Bearer {self._token_data.get('accessToken')}"}

    def _request(self, method: str, path: str, data: dict | None = None) -> Response:
        """Make an authenticated Frigate+ request.

        Raises:
            PlusRateLimitError: Frigate+ is rate limiting requests
        """
        self._raise_if_rate_limited()
        r = self._session.request(
            method,
            f"{self.host}/v1/{path}",
            headers=self._get_authorization_header(),
            json=data,
        )
        self._check_rate_limit(r)
        return r

    def _get(self, path: str) -> Response:
        return self._request("GET", path)

    def _post(self, path: str, data: dict) -> Response:
        return self._request("POST", path, data)

    def _put(self, path: str, data: dict) -> Response:
        return self._request("PUT", path, data)

    def is_active(self) -> bool:
        return self._is_active

    async def validate_key(self) -> PlusKeyStatus:
        """Check the configured API key against the Frigate+ server.

        The key format is checked at startup, but only the server can tell
        whether the key is actually valid. This requests a fresh token so the
        result reflects the key's current state rather than a cached token.

        Returns:
            The key's status as reported by the Frigate+ server. When it is
            rate_limited, rate_limit_remaining() gives the wait if known.
        """
        if self.key is None:
            return PlusKeyStatus.not_set

        # asking again before the wait is over would only be refused again
        if self.rate_limit_remaining() is not None:
            return PlusKeyStatus.rate_limited

        key_id, _, secret = self.key.partition(":")

        # Use a single request with a timeout instead of the retrying session,
        # since this is user initiated and should fail fast when unreachable.
        # trust_env honors proxy settings, matching the other Frigate+ requests.
        try:
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=PLUS_VALIDATE_TIMEOUT),
                trust_env=True,
            ) as session:
                async with session.get(
                    f"{self.host}/v1/auth/token",
                    auth=aiohttp.BasicAuth(key_id, secret),
                ) as r:
                    status = r.status
                    retry_after = parse_retry_after(r.headers.get("Retry-After"))
                    token_data = await r.json(content_type=None) if r.ok else None
        except (aiohttp.ClientError, TimeoutError) as err:
            logger.warning("Unable to reach Frigate+ to validate API key: %s", err)
            return PlusKeyStatus.unreachable
        except ValueError:
            logger.warning("Invalid response validating Frigate+ API key")
            return PlusKeyStatus.unreachable

        if status in (401, 403):
            return PlusKeyStatus.invalid

        if status == 429:
            self._note_rate_limit(retry_after)
            return PlusKeyStatus.rate_limited

        if status >= 400:
            logger.warning(
                "Unexpected response validating Frigate+ API key: %s", status
            )
            return PlusKeyStatus.unreachable

        # Keep the cached token unless the reply is a usable one, so an
        # unexpected response can't break later Frigate+ requests
        if not _is_usable_token(token_data):
            logger.warning("Invalid response validating Frigate+ API key")
            return PlusKeyStatus.unreachable

        self._token_data = token_data
        return PlusKeyStatus.valid

    def upload_image(self, image: ndarray, camera: str) -> str:
        r = self._get("image/signed_urls")
        if not r.ok:
            raise Exception("Unable to get signed urls")
        presigned_urls = r.json()

        # resize and submit original
        files = {"file": get_jpg_bytes(image, 1920, 85)}
        data = presigned_urls["original"]["fields"]
        data["content-type"] = "image/jpeg"
        r = requests.post(presigned_urls["original"]["url"], files=files, data=data)
        if not r.ok:
            logger.error(f"Failed to upload original: {r.status_code} {r.text}")
            raise Exception(r.text)

        # resize and submit thumbnail
        files = {"file": get_jpg_bytes(image, 200, 70)}
        data = presigned_urls["thumbnail"]["fields"]
        data["content-type"] = "image/jpeg"
        r = requests.post(presigned_urls["thumbnail"]["url"], files=files, data=data)
        if not r.ok:
            logger.error(f"Failed to upload thumbnail: {r.status_code} {r.text}")
            raise Exception(r.text)

        # create image
        r = self._post(
            "image/create", {"id": presigned_urls["imageId"], "camera": camera}
        )
        if not r.ok:
            raise Exception(r.text)

        # return image id
        return str(presigned_urls.get("imageId"))

    def add_false_positive(
        self,
        plus_id: str,
        region: list[float],
        bbox: list[float],
        score: float,
        label: str,
        model_hash: str,
        model_type: str,
        detector_type: str,
    ) -> None:
        r = self._put(
            f"image/{plus_id}/false_positive",
            {
                "label": label,
                "x": bbox[0],
                "y": bbox[1],
                "w": bbox[2],
                "h": bbox[3],
                "regionX": region[0],
                "regionY": region[1],
                "regionW": region[2],
                "regionH": region[3],
                "score": score,
                "model_hash": model_hash,
                "model_type": model_type,
                "detector_type": detector_type,
            },
        )

        if not r.ok:
            try:
                error_response = r.json()
                errors = error_response.get("errors", [])
                for error in errors:
                    if (
                        error.get("param") == "label"
                        and error.get("type") == "invalid_enum_value"
                    ):
                        raise ValueError(f"Unsupported label value provided: {label}")
            except ValueError as e:
                raise e
            raise Exception(r.text)

    def add_annotation(
        self,
        plus_id: str,
        bbox: list[float],
        label: str,
        difficult: bool = False,
    ) -> None:
        r = self._put(
            f"image/{plus_id}/annotation",
            {
                "label": label,
                "x": bbox[0],
                "y": bbox[1],
                "w": bbox[2],
                "h": bbox[3],
                "difficult": difficult,
            },
        )

        if not r.ok:
            try:
                error_response = r.json()
                errors = error_response.get("errors", [])
                for error in errors:
                    if (
                        error.get("param") == "label"
                        and error.get("type") == "invalid_enum_value"
                    ):
                        raise ValueError(f"Unsupported label value provided: {label}")
            except ValueError as e:
                raise e
            raise Exception(r.text)

    def get_model_download_url(
        self,
        model_id: str,
    ) -> str:
        r = self._get(f"model/{model_id}/signed_url")

        if not r.ok:
            raise Exception(r.text)

        presigned_url = r.json()

        return str(presigned_url.get("url"))

    def get_model_info(self, model_id: str) -> Any:
        r = self._get(f"model/{model_id}")

        if not r.ok:
            raise Exception(r.text)

        return r.json()

    def get_models(self) -> Any:
        r = self._get("model/list")

        if not r.ok:
            raise Exception(r.text)

        models = r.json()

        for model in models.get("list") or []:
            add_hailo_alias(model)

        return models
