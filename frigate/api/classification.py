"""Object classification APIs."""

import logging
import os
import random
import shutil
import string

import cv2
from fastapi import APIRouter, Depends, Request, UploadFile
from fastapi.responses import JSONResponse
from pathvalidate import sanitize_filename
from peewee import DoesNotExist
from playhouse.shortcuts import model_to_dict

from frigate.api.auth import require_role
from frigate.api.defs.tags import Tags
from frigate.config.camera import DetectConfig
from frigate.const import FACE_DIR
from frigate.embeddings import EmbeddingsContext
from frigate.models import Event
from frigate.util.path import get_event_snapshot

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.events])


@router.get("/faces")
def get_faces():
    face_dict: dict[str, list[str]] = {}

    for name in os.listdir(FACE_DIR):
        face_dir = os.path.join(FACE_DIR, name)

        if not os.path.isdir(face_dir):
            continue

        face_dict[name] = []

        for file in sorted(
            filter(
                lambda f: (f.lower().endswith((".webp", ".png", ".jpg", ".jpeg"))),
                os.listdir(face_dir),
            ),
            key=lambda f: os.path.getctime(os.path.join(face_dir, f)),
            reverse=True,
        ):
            face_dict[name].append(file)

    return JSONResponse(status_code=200, content=face_dict)


@router.post("/faces/reprocess", dependencies=[Depends(require_role(["admin"]))])
def reclassify_face(request: Request, body: dict = None):
    if not request.app.frigate_config.face_recognition.enabled:
        return JSONResponse(
            status_code=400,
            content={"message": "Face recognition is not enabled.", "success": False},
        )

    json: dict[str, any] = body or {}
    training_file = os.path.join(
        FACE_DIR, f"train/{sanitize_filename(json.get('training_file', ''))}"
    )

    if not training_file or not os.path.isfile(training_file):
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": f"Invalid filename or no file exists: {training_file}",
                }
            ),
            status_code=404,
        )

    context: EmbeddingsContext = request.app.embeddings
    response = context.reprocess_face(training_file)

    return JSONResponse(
        content=response,
        status_code=200,
    )


@router.post("/faces/train/{name}/classify")
def train_face(request: Request, name: str, body: dict = None):
    if not request.app.frigate_config.face_recognition.enabled:
        return JSONResponse(
            status_code=400,
            content={"message": "Face recognition is not enabled.", "success": False},
        )

    json: dict[str, any] = body or {}
    training_file_name = sanitize_filename(json.get("training_file", ""))
    training_file = os.path.join(FACE_DIR, f"train/{training_file_name}")
    event_id = json.get("event_id")

    if not training_file_name and not event_id:
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": "A training file or event_id must be passed.",
                }
            ),
            status_code=400,
        )

    if training_file_name and not os.path.isfile(training_file):
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": f"Invalid filename or no file exists: {training_file_name}",
                }
            ),
            status_code=404,
        )

    sanitized_name = sanitize_filename(name)
    rand_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    new_name = f"{sanitized_name}-{rand_id}.webp"
    new_file = os.path.join(FACE_DIR, f"{sanitized_name}/{new_name}")

    if training_file_name:
        shutil.move(training_file, new_file)
    else:
        try:
            event: Event = Event.get(Event.id == event_id)
        except DoesNotExist:
            return JSONResponse(
                content=(
                    {
                        "success": False,
                        "message": f"Invalid event_id or no event exists: {event_id}",
                    }
                ),
                status_code=404,
            )

        snapshot = get_event_snapshot(event)
        face_box = event.data["attributes"][0]["box"]
        detect_config: DetectConfig = request.app.frigate_config.cameras[
            event.camera
        ].detect

        # crop onto the face box minus the bounding box itself
        x1 = int(face_box[0] * detect_config.width) + 2
        y1 = int(face_box[1] * detect_config.height) + 2
        x2 = x1 + int(face_box[2] * detect_config.width) - 4
        y2 = y1 + int(face_box[3] * detect_config.height) - 4
        face = snapshot[y1:y2, x1:x2]
        cv2.imwrite(new_file, face)

    context: EmbeddingsContext = request.app.embeddings
    context.clear_face_classifier()

    return JSONResponse(
        content=(
            {
                "success": True,
                "message": f"Successfully saved {training_file_name} as {new_name}.",
            }
        ),
        status_code=200,
    )


@router.post("/faces/{name}/create", dependencies=[Depends(require_role(["admin"]))])
async def create_face(request: Request, name: str):
    if not request.app.frigate_config.face_recognition.enabled:
        return JSONResponse(
            status_code=400,
            content={"message": "Face recognition is not enabled.", "success": False},
        )

    os.makedirs(
        os.path.join(FACE_DIR, sanitize_filename(name.replace(" ", "_"))), exist_ok=True
    )
    return JSONResponse(
        status_code=200,
        content={"success": False, "message": "Successfully created face folder."},
    )


@router.post("/faces/{name}/register", dependencies=[Depends(require_role(["admin"]))])
async def register_face(request: Request, name: str, file: UploadFile):
    if not request.app.frigate_config.face_recognition.enabled:
        return JSONResponse(
            status_code=400,
            content={"message": "Face recognition is not enabled.", "success": False},
        )

    context: EmbeddingsContext = request.app.embeddings
    result = context.register_face(name, await file.read())
    return JSONResponse(
        status_code=200 if result.get("success", True) else 400,
        content=result,
    )


@router.post("/faces/{name}/delete", dependencies=[Depends(require_role(["admin"]))])
def deregister_faces(request: Request, name: str, body: dict = None):
    if not request.app.frigate_config.face_recognition.enabled:
        return JSONResponse(
            status_code=400,
            content={"message": "Face recognition is not enabled.", "success": False},
        )

    json: dict[str, any] = body or {}
    list_of_ids = json.get("ids", "")

    if not list_of_ids or len(list_of_ids) == 0:
        return JSONResponse(
            content=({"success": False, "message": "Not a valid list of ids"}),
            status_code=404,
        )

    context: EmbeddingsContext = request.app.embeddings
    context.delete_face_ids(
        name, map(lambda file: sanitize_filename(file), list_of_ids)
    )
    return JSONResponse(
        content=({"success": True, "message": "Successfully deleted faces."}),
        status_code=200,
    )


@router.put("/lpr/reprocess")
def reprocess_license_plate(request: Request, event_id: str):
    if not request.app.frigate_config.lpr.enabled:
        message = "License plate recognition is not enabled."
        logger.error(message)
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": message,
                }
            ),
            status_code=400,
        )

    try:
        event = Event.get(Event.id == event_id)
    except DoesNotExist:
        message = f"Event {event_id} not found"
        logger.error(message)
        return JSONResponse(
            content=({"success": False, "message": message}), status_code=404
        )

    context: EmbeddingsContext = request.app.embeddings
    response = context.reprocess_plate(model_to_dict(event))

    return JSONResponse(
        content=response,
        status_code=200,
    )
