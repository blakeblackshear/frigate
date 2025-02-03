"""Object classification APIs."""

import logging
import os
import random
import shutil
import string
from typing import Optional

from fastapi import APIRouter, Request, UploadFile
from fastapi.responses import JSONResponse
from pathvalidate import sanitize_filename

from frigate.api.defs.tags import Tags
from frigate.const import FACE_DIR, CLIPS_DIR
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
    list_of_ids = json.get("ids", [])
    delete_directory = json.get("delete_directory", False)

    if not list_of_ids:
        return JSONResponse(
            content={"success": False, "message": "Not a valid list of ids"},
            status_code=404,
        )

    face_dir = os.path.join(FACE_DIR, name)
    
    if not os.path.exists(face_dir):
        return JSONResponse(
            status_code=404,
            content={"message": f"Face '{name}' not found", "success": False},
        )

    try:
        if delete_directory:
            shutil.rmtree(face_dir)
        else:
            context: EmbeddingsContext = request.app.embeddings
            context.delete_face_ids(
                name, map(lambda file: sanitize_filename(file), list_of_ids)
            )
        
        context: EmbeddingsContext = request.app.embeddings
        context.clear_face_classifier()

        return JSONResponse(
            content={"success": True, "message": "Successfully deleted faces."},
            status_code=200,
        )
    except Exception as e:
        logger.error(f"Failed to delete face: {str(e)}")
        return JSONResponse(
            content={"success": False, "message": f"Failed to delete face: {str(e)}"},
            status_code=500,
        )


@router.post("/faces/{name}/create")
def create_face(name: str):
    """Create a new face directory without requiring an image."""
    folder = os.path.join(FACE_DIR, name)
    if os.path.exists(folder):
        return JSONResponse(
            status_code=400,
            content={"message": f"Face '{name}' already exists", "success": False},
        )
    
    os.makedirs(folder, exist_ok=True)
    return JSONResponse(
        status_code=200,
        content={"message": "Successfully created face", "success": True},
    )


@router.post("/faces/{name}/rename")
def rename_face(request: Request, name: str, body: dict = None):
    """Rename a face directory."""
    if not request.app.frigate_config.face_recognition.enabled:
        return JSONResponse(
            status_code=400,
            content={"message": "Face recognition is not enabled.", "success": False},
        )

    json: dict[str, any] = body or {}
    new_name = json.get("new_name")

    if not new_name:
        return JSONResponse(
            status_code=400,
            content={"message": "New name is required", "success": False},
        )

    old_folder = os.path.join(FACE_DIR, name)
    new_folder = os.path.join(FACE_DIR, new_name)

    if not os.path.exists(old_folder):
        return JSONResponse(
            status_code=404,
            content={"message": f"Face '{name}' not found", "success": False},
        )

    if os.path.exists(new_folder):
        return JSONResponse(
            status_code=400,
            content={"message": f"Face '{new_name}' already exists", "success": False},
        )

    try:
        try:
            os.rename(old_folder, new_folder)
        except OSError:
            shutil.copytree(old_folder, new_folder)
            shutil.rmtree(old_folder)

        context: EmbeddingsContext = request.app.embeddings
        context.clear_face_classifier()

        return JSONResponse(
            status_code=200,
            content={"message": "Successfully renamed face", "success": True},
        )
    except Exception as e:
        logger.error(f"Failed to rename face: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Failed to rename face: {str(e)}", "success": False},
        )


@router.get("/lpr/debug")
def get_lpr_debug(request: Request):
    """Get all LPR debug images."""
    if not request.app.frigate_config.lpr.enabled:
        return JSONResponse(
            status_code=400,
            content={"message": "LPR is not enabled.", "success": False},
        )

    lpr_dir = os.path.join(CLIPS_DIR, "lpr")
    if not os.path.exists(lpr_dir):
        return {}

    lpr_images = {}
    for image in os.listdir(lpr_dir):
        if not image.endswith(('.jpg', '.webp')):
            continue
        lpr_images[image] = image

    return lpr_images


@router.post("/lpr/debug/delete")
def delete_lpr_debug(request: Request, body: dict = None):
    """Delete LPR debug images."""
    if not request.app.frigate_config.lpr.enabled:
        return JSONResponse(
            status_code=400,
            content={"message": "LPR is not enabled.", "success": False},
        )

    json: dict[str, any] = body or {}
    list_of_ids = json.get("ids", [])

    if not list_of_ids:
        return JSONResponse(
            content={"success": False, "message": "Not a valid list of ids"},
            status_code=404,
        )

    lpr_dir = os.path.join(CLIPS_DIR, "lpr")
    if not os.path.exists(lpr_dir):
        return JSONResponse(
            status_code=404,
            content={"message": "LPR debug directory not found", "success": False},
        )

    try:
        for image_id in list_of_ids:
            image_path = os.path.join(lpr_dir, sanitize_filename(image_id))
            if os.path.exists(image_path):
                os.remove(image_path)

        return JSONResponse(
            content={"success": True, "message": "Successfully deleted LPR debug images."},
            status_code=200,
        )
    except Exception as e:
        return JSONResponse(
            content={"success": False, "message": f"Failed to delete LPR debug images: {str(e)}"},
            status_code=500,
        )
