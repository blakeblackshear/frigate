"""Object classification APIs."""

import logging
import os
import random
import shutil
import string

from fastapi import APIRouter, Request, UploadFile
from fastapi.responses import JSONResponse
from pathvalidate import sanitize_filename

from frigate.api.defs.tags import Tags
from frigate.const import FACE_DIR
from frigate.embeddings import EmbeddingsContext

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
            os.listdir(face_dir),
            key=lambda f: os.path.getctime(os.path.join(face_dir, f)),
            reverse=True,
        ):
            face_dict[name].append(file)

    return JSONResponse(status_code=200, content=face_dict)


@router.post("/faces/{name}")
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


@router.post("/faces/train/{name}/classify")
def train_face(request: Request, name: str, body: dict = None):
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

    rand_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    new_name = f"{name}-{rand_id}.webp"
    new_file = os.path.join(FACE_DIR, f"{name}/{new_name}")
    shutil.move(training_file, new_file)

    context: EmbeddingsContext = request.app.embeddings
    context.clear_face_classifier()

    return JSONResponse(
        content=(
            {
                "success": True,
                "message": f"Successfully saved {training_file} as {new_name}.",
            }
        ),
        status_code=200,
    )


@router.post("/faces/{name}/delete")
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
