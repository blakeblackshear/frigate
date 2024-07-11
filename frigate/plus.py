import datetime
import json
import logging
import os
import re
from pathlib import Path
from typing import Any, List

import cv2
import requests
from numpy import ndarray
from requests.models import Response

from frigate.const import PLUS_API_HOST, PLUS_ENV_VAR

logger = logging.getLogger(__name__)


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
        # check for the addon options file
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

    def _refresh_token_if_needed(self) -> None:
        if (
            self._token_data.get("expires") is None
            or self._token_data["expires"] - datetime.datetime.now().timestamp() < 60
        ):
            if self.key is None:
                raise Exception("Plus API not activated")
            parts = self.key.split(":")
            r = requests.get(f"{self.host}/v1/auth/token", auth=(parts[0], parts[1]))
            if not r.ok:
                raise Exception("Unable to refresh API token")
            self._token_data = r.json()

    def _get_authorization_header(self) -> dict:
        self._refresh_token_if_needed()
        return {"authorization": f"Bearer {self._token_data.get('accessToken')}"}

    def _get(self, path: str) -> Response:
        return requests.get(
            f"{self.host}/v1/{path}", headers=self._get_authorization_header()
        )

    def _post(self, path: str, data: dict) -> Response:
        return requests.post(
            f"{self.host}/v1/{path}",
            headers=self._get_authorization_header(),
            json=data,
        )

    def _put(self, path: str, data: dict) -> Response:
        return requests.put(
            f"{self.host}/v1/{path}",
            headers=self._get_authorization_header(),
            json=data,
        )

    def is_active(self) -> bool:
        return self._is_active

    def upload_image(self, image: ndarray, camera: str) -> str:
        r = self._get("image/signed_urls")
        presigned_urls = r.json()
        if not r.ok:
            raise Exception("Unable to get signed urls")

        # resize and submit original
        files = {"file": get_jpg_bytes(image, 1920, 85)}
        data = presigned_urls["original"]["fields"]
        data["content-type"] = "image/jpeg"
        r = requests.post(presigned_urls["original"]["url"], files=files, data=data)
        if not r.ok:
            logger.error(f"Failed to upload original: {r.status_code} {r.text}")
            raise Exception(r.text)

        # resize and submit annotate
        files = {"file": get_jpg_bytes(image, 640, 70)}
        data = presigned_urls["annotate"]["fields"]
        data["content-type"] = "image/jpeg"
        r = requests.post(presigned_urls["annotate"]["url"], files=files, data=data)
        if not r.ok:
            logger.error(f"Failed to upload annotate: {r.status_code} {r.text}")
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
        region: List[float],
        bbox: List[float],
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
        bbox: List[float],
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
