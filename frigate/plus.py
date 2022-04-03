import datetime
import logging
import requests
import cv2

logger = logging.getLogger(__name__)


def get_jpg_bytes(image, max_dim, quality):
    if image.shape[1] >= image.shape[0]:
        width = min(max_dim, image.shape[1])
        height = int(width * image.shape[0] / image.shape[1])
    else:
        height = min(max_dim, image.shape[0])
        width = int(height * image.shape[1] / image.shape[0])

    original = cv2.resize(image, dsize=(width, height), interpolation=cv2.INTER_AREA)

    ret, jpg = cv2.imencode(".jpg", original, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    return jpg.tobytes()


class PlusApi:
    def __init__(self, host, key: str):
        self.host = host
        self.key = key
        self._token_data = None

    def _refresh_token_if_needed(self):
        if (
            self._token_data is None
            or self._token_data["expires"] - datetime.datetime.now().timestamp() < 60
        ):
            parts = self.key.split(":")
            r = requests.get(f"{self.host}/v1/auth/token", auth=(parts[0], parts[1]))
            self._token_data = r.json()

    def _get_authorization_header(self):
        self._refresh_token_if_needed()
        return {"authorization": f"Bearer {self._token_data['accessToken']}"}

    def _get(self, path):
        return requests.get(
            f"{self.host}/v1/{path}", headers=self._get_authorization_header()
        )

    def _post(self, path, data):
        return requests.post(
            f"{self.host}/v1/{path}",
            headers=self._get_authorization_header(),
            json=data,
        )

    def upload_image(self, image, camera: str):
        r = self._get("image/signed_urls")
        presigned_urls = r.json()
        if not r.ok:
            logger.exception(ex)
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
        return presigned_urls["imageId"]
