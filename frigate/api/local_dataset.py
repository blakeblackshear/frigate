"""Local dataset API for storing and annotating images without Frigate+."""

import asyncio
import datetime
import io
import json
import logging
import os
import uuid
import zipfile
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, Request
from fastapi.params import Depends
from fastapi.responses import FileResponse, JSONResponse, Response
from peewee import DoesNotExist
from pydantic import BaseModel, Field

from frigate.api.auth import require_camera_access, require_role
from frigate.api.defs.tags import Tags
from frigate.config import FrigateConfig
from frigate.const import CLIPS_DIR
from frigate.models import Event
from frigate.util.file import load_event_snapshot_image

logger = logging.getLogger(__name__)

# Local dataset lives alongside other clip data so it's preserved across restarts
LOCAL_DATASET_DIR = os.path.join(CLIPS_DIR, "local_dataset")


# ---------------------------------------------------------------------------
# Config guard dependency
# ---------------------------------------------------------------------------


def require_local_dataset_enabled(request: Request) -> None:
    """Raise 404 when local_dataset is not enabled in config."""
    config: FrigateConfig = request.app.frigate_config
    if not config.local_dataset.enabled:
        raise HTTPException(
            status_code=404,
            detail="Local dataset feature is not enabled. Set local_dataset.enabled: true in config.yml.",
        )


router = APIRouter(
    tags=[Tags.events],
    dependencies=[Depends(require_local_dataset_enabled)],
)


# ---------------------------------------------------------------------------
# Request / response bodies
# ---------------------------------------------------------------------------


class LocalAnnotationBody(BaseModel):
    label: str
    x: float = Field(ge=0.0, le=1.0)
    y: float = Field(ge=0.0, le=1.0)
    w: float = Field(ge=0.0, le=1.0)
    h: float = Field(ge=0.0, le=1.0)


class LocalAnnotationUpdateBody(BaseModel):
    annotations: list[LocalAnnotationBody]


class LocalDatasetSaveBody(BaseModel):
    include_annotation: int = Field(default=1)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _meta_path(image_id: str) -> str:
    return os.path.join(LOCAL_DATASET_DIR, f"{image_id}.json")


def _image_path(image_id: str) -> str:
    return os.path.join(LOCAL_DATASET_DIR, f"{image_id}.jpg")


def _thumb_path(image_id: str) -> str:
    return os.path.join(LOCAL_DATASET_DIR, f"{image_id}_thumb.jpg")


def _ensure_dataset_dir() -> None:
    os.makedirs(LOCAL_DATASET_DIR, exist_ok=True)


def _write_image(image: np.ndarray, image_id: str) -> None:
    """Write full-size and thumbnail JPEG files for the given ndarray."""
    _ensure_dataset_dir()

    # Full size (max 1920px, 85q — matches Frigate+ behaviour)
    h, w = image.shape[:2]
    max_dim = 1920
    if w >= h:
        nw = min(max_dim, w)
        nh = int(nw * h / w)
    else:
        nh = min(max_dim, h)
        nw = int(nh * w / h)
    full = cv2.resize(image, (nw, nh), interpolation=cv2.INTER_AREA)
    cv2.imwrite(_image_path(image_id), full, [int(cv2.IMWRITE_JPEG_QUALITY), 85])

    # Thumbnail (max 200px, 70q)
    if w >= h:
        tw = min(200, w)
        th = int(tw * h / w)
    else:
        th = min(200, h)
        tw = int(th * w / h)
    thumb = cv2.resize(image, (tw, th), interpolation=cv2.INTER_AREA)
    cv2.imwrite(_thumb_path(image_id), thumb, [int(cv2.IMWRITE_JPEG_QUALITY), 70])


def _read_meta(image_id: str) -> dict | None:
    path = _meta_path(image_id)
    if not os.path.exists(path):
        return None
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return None


def _write_meta(image_id: str, meta: dict) -> None:
    with open(_meta_path(image_id), "w") as f:
        json.dump(meta, f, indent=2)


def _list_image_ids() -> list[str]:
    _ensure_dataset_dir()
    ids = []
    for fname in os.listdir(LOCAL_DATASET_DIR):
        if fname.endswith(".json"):
            image_id = fname[: -len(".json")]
            # only include entries that have an actual image file
            if os.path.exists(_image_path(image_id)):
                ids.append(image_id)
    return sorted(ids)


# ---------------------------------------------------------------------------
# Save from event
# ---------------------------------------------------------------------------


@router.post(
    "/events/{event_id}/save_to_local_dataset",
    dependencies=[Depends(require_role(["admin"]))],
    summary="Save event snapshot to local dataset",
    description=(
        "Saves the clean snapshot of a completed event to the local dataset "
        "directory. Optionally includes the detection bounding-box as an "
        "annotation. This is an alternative to Frigate+ for users who want to "
        "store training data locally."
    ),
)
async def save_event_to_local_dataset(
    request: Request,
    event_id: str,
    body: LocalDatasetSaveBody = None,
):
    include_annotation = body.include_annotation if body is not None else 1

    try:
        event = Event.get(Event.id == event_id)
        await require_camera_access(event.camera, request=request)
    except DoesNotExist:
        return JSONResponse(
            content={"success": False, "message": f"Event {event_id} not found"},
            status_code=404,
        )

    if event.end_time is None:
        return JSONResponse(
            content={
                "success": False,
                "message": "Cannot save snapshot for in-progress event",
            },
            status_code=400,
        )

    try:
        image, _ = await asyncio.to_thread(
            load_event_snapshot_image, event, clean_only=True
        )
    except Exception:
        logger.exception("Unable to load snapshot for event %s", event_id)
        return JSONResponse(
            content={"success": False, "message": "Unable to load event snapshot"},
            status_code=400,
        )

    if image is None or image.size == 0:
        return JSONResponse(
            content={
                "success": False,
                "message": "No clean snapshot available for this event",
            },
            status_code=400,
        )

    image_id = str(uuid.uuid4())

    try:
        await asyncio.to_thread(_write_image, image, image_id)
    except Exception:
        logger.exception("Failed to write local dataset image %s", image_id)
        return JSONResponse(
            content={"success": False, "message": "Failed to write image to disk"},
            status_code=500,
        )

    annotations: list[dict] = []
    if include_annotation and event.data and event.data.get("box"):
        box = event.data["box"]
        annotations.append(
            {
                "label": event.label,
                "x": box[0],
                "y": box[1],
                "w": box[2],
                "h": box[3],
            }
        )

    meta = {
        "id": image_id,
        "event_id": event_id,
        "camera": event.camera,
        "label": event.label,
        "annotations": annotations,
    }
    await asyncio.to_thread(_write_meta, image_id, meta)

    return JSONResponse(
        content={"success": True, "local_id": image_id},
        status_code=200,
    )


# ---------------------------------------------------------------------------
# Save from recording frame
# ---------------------------------------------------------------------------


@router.post(
    "/{camera_name}/save_to_local_dataset/{frame_time}",
    dependencies=[Depends(require_camera_access)],
    summary="Save recording frame to local dataset",
    description="Extracts a frame from a recording at the given timestamp and saves it to the local dataset.",
)
async def save_recording_frame_to_local_dataset(
    request: Request,
    camera_name: str,
    frame_time: str,
):
    from frigate.models import Recordings
    from frigate.util.image import get_image_from_recording

    if camera_name not in request.app.frigate_config.cameras:
        return JSONResponse(
            content={"success": False, "message": "Camera not found"},
            status_code=404,
        )

    frame_time_f = float(frame_time)
    recording_query = (
        Recordings.select(Recordings.path, Recordings.start_time)
        .where(
            (frame_time_f >= Recordings.start_time)
            & (frame_time_f <= Recordings.end_time)
        )
        .where(Recordings.camera == camera_name)
        .order_by(Recordings.start_time.desc())
        .limit(1)
    )

    try:
        recording = recording_query.get()
    except DoesNotExist:
        return JSONResponse(
            content={
                "success": False,
                "message": f"Recording not found at {frame_time}",
            },
            status_code=404,
        )

    time_in_segment = frame_time_f - recording.start_time
    image_data = get_image_from_recording(
        request.app.frigate_config.ffmpeg, recording.path, time_in_segment, "png"
    )

    if not image_data:
        return JSONResponse(
            content={
                "success": False,
                "message": f"Unable to parse frame at time {frame_time}",
            },
            status_code=404,
        )

    nd = cv2.imdecode(np.frombuffer(image_data, dtype=np.int8), cv2.IMREAD_COLOR)

    image_id = str(uuid.uuid4())

    try:
        await asyncio.to_thread(_write_image, nd, image_id)
    except Exception:
        logger.exception("Failed to write recording frame %s", image_id)
        return JSONResponse(
            content={"success": False, "message": "Failed to write image to disk"},
            status_code=500,
        )

    meta = {
        "id": image_id,
        "event_id": None,
        "camera": camera_name,
        "label": None,
        "annotations": [],
    }
    await asyncio.to_thread(_write_meta, image_id, meta)

    return JSONResponse(
        content={"success": True, "local_id": image_id},
        status_code=200,
    )


# ---------------------------------------------------------------------------
# Dataset listing and management
# ---------------------------------------------------------------------------


@router.get(
    "/local_dataset",
    dependencies=[Depends(require_role(["admin"]))],
    summary="List local dataset images",
    description="Returns metadata for all images stored in the local dataset.",
)
async def list_local_dataset(
    request: Request,
    label: Optional[str] = None,
    camera: Optional[str] = None,
    annotated: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0,
):
    ids = await asyncio.to_thread(_list_image_ids)

    items: list[dict] = []
    for image_id in ids:
        meta = await asyncio.to_thread(_read_meta, image_id)
        if meta is None:
            continue
        if label and meta.get("label") != label:
            continue
        if camera and meta.get("camera") != camera:
            continue
        if annotated is not None:
            has_annotations = len(meta.get("annotations", [])) > 0
            if annotated != has_annotations:
                continue
        items.append(meta)

    total = len(items)
    page = items[offset : offset + limit]

    return JSONResponse(content={"total": total, "items": page})


@router.get(
    "/local_dataset/{image_id}/image.jpg",
    dependencies=[Depends(require_role(["admin"]))],
    summary="Serve local dataset image",
)
async def get_local_dataset_image(request: Request, image_id: str):
    path = _image_path(image_id)
    if not os.path.exists(path):
        return JSONResponse(
            content={"success": False, "message": "Image not found"},
            status_code=404,
        )
    return FileResponse(path, media_type="image/jpeg")


@router.get(
    "/local_dataset/{image_id}/thumbnail.jpg",
    dependencies=[Depends(require_role(["admin"]))],
    summary="Serve local dataset thumbnail",
)
async def get_local_dataset_thumbnail(request: Request, image_id: str):
    path = _thumb_path(image_id)
    if not os.path.exists(path):
        return JSONResponse(
            content={"success": False, "message": "Thumbnail not found"},
            status_code=404,
        )
    return FileResponse(path, media_type="image/jpeg")


@router.get(
    "/local_dataset/{image_id}",
    dependencies=[Depends(require_role(["admin"]))],
    summary="Get local dataset image metadata",
)
async def get_local_dataset_item(request: Request, image_id: str):
    meta = await asyncio.to_thread(_read_meta, image_id)
    if meta is None:
        return JSONResponse(
            content={"success": False, "message": "Image not found"},
            status_code=404,
        )
    return JSONResponse(content=meta)


@router.put(
    "/local_dataset/{image_id}/annotations",
    dependencies=[Depends(require_role(["admin"]))],
    summary="Update annotations for a local dataset image",
)
async def update_local_dataset_annotations(
    request: Request,
    image_id: str,
    body: LocalAnnotationUpdateBody,
):
    meta = await asyncio.to_thread(_read_meta, image_id)
    if meta is None:
        return JSONResponse(
            content={"success": False, "message": "Image not found"},
            status_code=404,
        )

    meta["annotations"] = [a.model_dump() for a in body.annotations]
    await asyncio.to_thread(_write_meta, image_id, meta)

    return JSONResponse(content={"success": True})


@router.delete(
    "/local_dataset/{image_id}",
    dependencies=[Depends(require_role(["admin"]))],
    summary="Delete a local dataset image",
)
async def delete_local_dataset_item(request: Request, image_id: str):
    deleted = False
    for path in [_image_path(image_id), _thumb_path(image_id), _meta_path(image_id)]:
        try:
            Path(path).unlink(missing_ok=True)
            deleted = True
        except OSError:
            logger.warning("Could not delete %s", path)

    if not deleted:
        return JSONResponse(
            content={"success": False, "message": "Image not found"},
            status_code=404,
        )
    return JSONResponse(content={"success": True})


@router.get(
    "/local_dataset/export/coco.zip",
    dependencies=[Depends(require_role(["admin"]))],
    summary="Export dataset as COCO-format zip",
    description=(
        "Downloads a zip archive containing all images under images/ and a "
        "COCO-format annotations/instances.json file. Suitable for use in "
        "most object-detection training pipelines."
    ),
)
async def export_local_dataset_coco(request: Request):
    ids = await asyncio.to_thread(_list_image_ids)

    # Build COCO structure
    coco: dict = {
        "info": {
            "description": "Frigate Local Dataset",
            "version": "1.0",
            "year": datetime.datetime.now().year,
            "date_created": datetime.datetime.now().isoformat(),
        },
        "licenses": [],
        "categories": [],
        "images": [],
        "annotations": [],
    }

    category_map: dict[str, int] = {}  # label -> category id
    annotation_id = 1

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for image_id in ids:
            meta = await asyncio.to_thread(_read_meta, image_id)
            if meta is None:
                continue

            img_path = _image_path(image_id)
            if not os.path.exists(img_path):
                continue

            # Read image dimensions
            img = cv2.imread(img_path)
            if img is None:
                continue
            img_h, img_w = img.shape[:2]

            filename = f"{image_id}.jpg"
            coco_image_id = len(coco["images"]) + 1

            coco["images"].append(
                {
                    "id": coco_image_id,
                    "file_name": filename,
                    "width": img_w,
                    "height": img_h,
                    "frigate_event_id": meta.get("event_id"),
                    "camera": meta.get("camera"),
                }
            )

            # Add image file to zip
            zf.write(img_path, arcname=f"images/{filename}")

            # Build annotations
            for ann in meta.get("annotations", []):
                label = ann.get("label", "")
                if not label:
                    continue

                # Register category
                if label not in category_map:
                    cat_id = len(category_map) + 1
                    category_map[label] = cat_id
                    coco["categories"].append(
                        {"id": cat_id, "name": label, "supercategory": "object"}
                    )

                # COCO bbox is [x_min, y_min, width, height] in absolute pixels
                # Our annotations are relative (0-1)
                x_rel = ann.get("x", 0.0)
                y_rel = ann.get("y", 0.0)
                w_rel = ann.get("w", 0.0)
                h_rel = ann.get("h", 0.0)

                x_abs = x_rel * img_w
                y_abs = y_rel * img_h
                w_abs = w_rel * img_w
                h_abs = h_rel * img_h

                coco["annotations"].append(
                    {
                        "id": annotation_id,
                        "image_id": coco_image_id,
                        "category_id": category_map[label],
                        "bbox": [
                            round(x_abs, 2),
                            round(y_abs, 2),
                            round(w_abs, 2),
                            round(h_abs, 2),
                        ],
                        "area": round(w_abs * h_abs, 2),
                        "segmentation": [],
                        "iscrowd": 0,
                    }
                )
                annotation_id += 1

        # Write annotations JSON
        zf.writestr(
            "annotations/instances.json",
            json.dumps(coco, indent=2),
        )

    buf.seek(0)
    return Response(
        content=buf.read(),
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="frigate_dataset.zip"',
        },
    )


@router.get(
    "/local_dataset/export/annotations.json",
    dependencies=[Depends(require_role(["admin"]))],
    summary="Export all annotations as JSON",
    description=(
        "Downloads a JSON file containing all images and their annotations "
        "with relative coordinates (legacy format)."
    ),
)
async def export_local_dataset_annotations(request: Request):
    ids = await asyncio.to_thread(_list_image_ids)
    result = []
    for image_id in ids:
        meta = await asyncio.to_thread(_read_meta, image_id)
        if meta:
            result.append(meta)

    return Response(
        content=json.dumps(result, indent=2).encode(),
        media_type="application/json",
        headers={
            "Content-Disposition": 'attachment; filename="annotations.json"',
        },
    )
