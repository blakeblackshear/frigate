from enum import Enum

from pydantic import BaseModel


class Extension(str, Enum):
    webp = "webp"
    png = "png"
    jpg = "jpg"
    jpeg = "jpeg"

    def get_mime_type(self) -> str:
        if self in (Extension.jpg, Extension.jpeg):
            return "image/jpeg"
        return f"image/{self.value}"


class MediaLatestFrameQueryParams(BaseModel):
    bbox: int | None = None
    timestamp: int | None = None
    zones: int | None = None
    mask: int | None = None
    motion: int | None = None
    paths: int | None = None
    regions: int | None = None
    quality: int | None = 70
    height: int | None = None
    store: int | None = None


class MediaEventsSnapshotQueryParams(BaseModel):
    download: bool | None = False
    timestamp: int | None = None
    bbox: int | None = None
    crop: int | None = None
    height: int | None = None
    quality: int | None = None


class MediaMjpegFeedQueryParams(BaseModel):
    fps: int = 3
    height: int = 360
    bbox: int | None = None
    timestamp: int | None = None
    zones: int | None = None
    mask: int | None = None
    motion: int | None = None
    regions: int | None = None
