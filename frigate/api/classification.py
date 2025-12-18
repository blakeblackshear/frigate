"""Object classification APIs."""

import datetime
import logging
import os
import random
import shutil
import string
from typing import Any

import cv2
from fastapi import APIRouter, Depends, Request, UploadFile
from fastapi.responses import JSONResponse
from pathvalidate import sanitize_filename
from peewee import DoesNotExist
from playhouse.shortcuts import model_to_dict

from frigate.api.auth import require_role
from frigate.api.defs.request.classification_body import (
    AudioTranscriptionBody,
    DeleteFaceImagesBody,
    GenerateObjectExamplesBody,
    GenerateStateExamplesBody,
    RenameFaceBody,
)
from frigate.api.defs.response.classification_response import (
    FaceRecognitionResponse,
    FacesResponse,
)
from frigate.api.defs.response.generic_response import GenericResponse
from frigate.api.defs.tags import Tags
from frigate.config import FrigateConfig
from frigate.config.camera import DetectConfig
from frigate.config.classification import ObjectClassificationType
from frigate.const import CLIPS_DIR, FACE_DIR, MODEL_CACHE_DIR
from frigate.embeddings import EmbeddingsContext
from frigate.models import Event
from frigate.util.classification import (
    collect_object_classification_examples,
    collect_state_classification_examples,
    get_dataset_image_count,
    read_training_metadata,
)
from frigate.util.file import get_event_snapshot

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.classification])


@router.get(
    "/faces",
    response_model=FacesResponse,
    summary="Get all registered faces",
    description="""Returns a dictionary mapping face names to lists of image filenames.
    Each key represents a registered face name, and the value is a list of image
    files associated with that face. Supported image formats include .webp, .png,
    .jpg, and .jpeg.""",
)
def get_faces():
    face_dict: dict[str, list[str]] = {}

    if not os.path.exists(FACE_DIR):
        return JSONResponse(status_code=200, content={})

    for name in os.listdir(FACE_DIR):
        face_dir = os.path.join(FACE_DIR, name)

        if not os.path.isdir(face_dir):
            continue

        face_dict[name] = []

        for file in filter(
            lambda f: (f.lower().endswith((".webp", ".png", ".jpg", ".jpeg"))),
            os.listdir(face_dir),
        ):
            face_dict[name].append(file)

    return JSONResponse(status_code=200, content=face_dict)


@router.post(
    "/faces/reprocess",
    dependencies=[Depends(require_role(["admin"]))],
    summary="Reprocess a face training image",
    description="""Reprocesses a face training image to update the prediction.
    Requires face recognition to be enabled in the configuration. The training file
    must exist in the faces/train directory. Returns a success response or an error
    message if face recognition is not enabled or the training file is invalid.""",
)
def reclassify_face(request: Request, body: dict = None):
    if not request.app.frigate_config.face_recognition.enabled:
        return JSONResponse(
            status_code=400,
            content={"message": "Face recognition is not enabled.", "success": False},
        )

    json: dict[str, Any] = body or {}
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

    if not isinstance(response, dict):
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Could not process request.",
            },
        )

    return JSONResponse(
        status_code=200 if response.get("success", True) else 400,
        content=response,
    )


@router.post(
    "/faces/train/{name}/classify",
    response_model=GenericResponse,
    summary="Classify and save a face training image",
    description="""Adds a training image to a specific face name for face recognition.
    Accepts either a training file from the train directory or an event_id to extract
    the face from. The image is saved to the face's directory and the face classifier
    is cleared to incorporate the new training data. Returns a success message with
    the new filename or an error if face recognition is not enabled, the file/event
    is invalid, or the face cannot be extracted.""",
)
def train_face(request: Request, name: str, body: dict = None):
    if not request.app.frigate_config.face_recognition.enabled:
        return JSONResponse(
            status_code=400,
            content={"message": "Face recognition is not enabled.", "success": False},
        )

    json: dict[str, Any] = body or {}
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
    new_name = f"{sanitized_name}-{datetime.datetime.now().timestamp()}.webp"
    new_file_folder = os.path.join(FACE_DIR, f"{sanitized_name}")

    os.makedirs(new_file_folder, exist_ok=True)

    if training_file_name:
        shutil.move(training_file, os.path.join(new_file_folder, new_name))
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
        success = True

        if face.size > 0:
            try:
                cv2.imwrite(os.path.join(new_file_folder, new_name), face)
                success = True
            except Exception:
                pass

        if not success:
            return JSONResponse(
                content=(
                    {
                        "success": False,
                        "message": "Invalid face box or no face exists",
                    }
                ),
                status_code=404,
            )

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


@router.post(
    "/faces/{name}/create",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Create a new face name",
    description="""Creates a new folder for a face name in the faces directory.
    This is used to organize face training images. The face name is sanitized and
    spaces are replaced with underscores. Returns a success message or an error if
    face recognition is not enabled.""",
)
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


@router.post(
    "/faces/{name}/register",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Register a face image",
    description="""Registers a face image for a specific face name by uploading an image file.
    The uploaded image is processed and added to the face recognition system. Returns a
    success response with details about the registration, or an error if face recognition
    is not enabled or the image cannot be processed.""",
)
async def register_face(request: Request, name: str, file: UploadFile):
    if not request.app.frigate_config.face_recognition.enabled:
        return JSONResponse(
            status_code=400,
            content={"message": "Face recognition is not enabled.", "success": False},
        )

    context: EmbeddingsContext = request.app.embeddings
    result = None if context is None else context.register_face(name, await file.read())

    if not isinstance(result, dict):
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Could not process request. Try restarting Frigate.",
            },
        )

    return JSONResponse(
        status_code=200 if result.get("success", True) else 400,
        content=result,
    )


@router.post(
    "/faces/recognize",
    response_model=FaceRecognitionResponse,
    summary="Recognize a face from an uploaded image",
    description="""Recognizes a face from an uploaded image file by comparing it against
    registered faces in the system. Returns the recognized face name and confidence score,
    or an error if face recognition is not enabled or the image cannot be processed.""",
)
async def recognize_face(request: Request, file: UploadFile):
    if not request.app.frigate_config.face_recognition.enabled:
        return JSONResponse(
            status_code=400,
            content={"message": "Face recognition is not enabled.", "success": False},
        )

    context: EmbeddingsContext = request.app.embeddings
    result = context.recognize_face(await file.read())

    if not isinstance(result, dict):
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Could not process request. Try restarting Frigate.",
            },
        )

    return JSONResponse(
        status_code=200 if result.get("success", True) else 400,
        content=result,
    )


@router.post(
    "/faces/{name}/delete",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Delete face images",
    description="""Deletes specific face images for a given face name. The image IDs must belong
    to the specified face folder. To delete an entire face folder, all image IDs in that
    folder must be sent. Returns a success message or an error if face recognition is not enabled.""",
)
def deregister_faces(request: Request, name: str, body: DeleteFaceImagesBody):
    if not request.app.frigate_config.face_recognition.enabled:
        return JSONResponse(
            status_code=400,
            content={"message": "Face recognition is not enabled.", "success": False},
        )

    context: EmbeddingsContext = request.app.embeddings
    context.delete_face_ids(name, map(lambda file: sanitize_filename(file), body.ids))
    return JSONResponse(
        content=({"success": True, "message": "Successfully deleted faces."}),
        status_code=200,
    )


@router.put(
    "/faces/{old_name}/rename",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Rename a face name",
    description="""Renames a face name in the system. The old name must exist and the new
    name must be valid. Returns a success message or an error if face recognition is not enabled.""",
)
def rename_face(request: Request, old_name: str, body: RenameFaceBody):
    if not request.app.frigate_config.face_recognition.enabled:
        return JSONResponse(
            status_code=400,
            content={"message": "Face recognition is not enabled.", "success": False},
        )

    context: EmbeddingsContext = request.app.embeddings
    try:
        context.rename_face(old_name, body.new_name)
        return JSONResponse(
            content={
                "success": True,
                "message": f"Successfully renamed face to {body.new_name}.",
            },
            status_code=200,
        )
    except ValueError as e:
        logger.error(e)
        return JSONResponse(
            status_code=400,
            content={
                "message": "Error renaming face. Check Frigate logs.",
                "success": False,
            },
        )


@router.put(
    "/lpr/reprocess",
    summary="Reprocess a license plate",
    description="""Reprocesses a license plate image to update the plate.
    Requires license plate recognition to be enabled in the configuration. The event_id
    must exist in the database. Returns a success message or an error if license plate
    recognition is not enabled or the event_id is invalid.""",
)
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


@router.put(
    "/reindex",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Reindex embeddings",
    description="""Reindexes the embeddings for all tracked objects.
    Requires semantic search to be enabled in the configuration. Returns a success message or an error if semantic search is not enabled.""",
)
def reindex_embeddings(request: Request):
    if not request.app.frigate_config.semantic_search.enabled:
        message = (
            "Cannot reindex tracked object embeddings, Semantic Search is not enabled."
        )
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

    context: EmbeddingsContext = request.app.embeddings
    response = context.reindex_embeddings()

    if response == "started":
        return JSONResponse(
            content={
                "success": True,
                "message": "Embeddings reindexing has started.",
            },
            status_code=202,  # 202 Accepted
        )
    elif response == "in_progress":
        return JSONResponse(
            content={
                "success": False,
                "message": "Embeddings reindexing is already in progress.",
            },
            status_code=409,  # 409 Conflict
        )
    else:
        return JSONResponse(
            content={
                "success": False,
                "message": "Failed to start reindexing.",
            },
            status_code=500,
        )


@router.put(
    "/audio/transcribe",
    response_model=GenericResponse,
    summary="Transcribe audio",
    description="""Transcribes audio from a specific event.
    Requires audio transcription to be enabled in the configuration. The event_id
    must exist in the database. Returns a success message or an error if audio transcription is not enabled or the event_id is invalid.""",
)
def transcribe_audio(request: Request, body: AudioTranscriptionBody):
    event_id = body.event_id

    try:
        event = Event.get(Event.id == event_id)
    except DoesNotExist:
        message = f"Event {event_id} not found"
        logger.error(message)
        return JSONResponse(
            content=({"success": False, "message": message}), status_code=404
        )

    if not request.app.frigate_config.cameras[event.camera].audio_transcription.enabled:
        message = f"Audio transcription is not enabled for {event.camera}."
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

    context: EmbeddingsContext = request.app.embeddings
    response = context.transcribe_audio(model_to_dict(event))

    if response == "started":
        return JSONResponse(
            content={
                "success": True,
                "message": "Audio transcription has started.",
            },
            status_code=202,  # 202 Accepted
        )
    elif response == "in_progress":
        return JSONResponse(
            content={
                "success": False,
                "message": "Audio transcription for a speech event is currently in progress. Try again later.",
            },
            status_code=409,  # 409 Conflict
        )
    else:
        logger.debug(f"Failed to transcribe audio, response: {response}")
        return JSONResponse(
            content={
                "success": False,
                "message": "Failed to transcribe audio.",
            },
            status_code=500,
        )


# custom classification training


@router.get(
    "/classification/{name}/dataset",
    summary="Get classification dataset",
    description="""Gets the dataset for a specific classification model.
    The name must exist in the classification models. Returns a success message or an error if the name is invalid.""",
)
def get_classification_dataset(name: str):
    dataset_dict: dict[str, list[str]] = {}

    dataset_dir = os.path.join(CLIPS_DIR, sanitize_filename(name), "dataset")

    if not os.path.exists(dataset_dir):
        return JSONResponse(
            status_code=200, content={"categories": {}, "training_metadata": None}
        )

    for category_name in os.listdir(dataset_dir):
        category_dir = os.path.join(dataset_dir, category_name)

        if not os.path.isdir(category_dir):
            continue

        dataset_dict[category_name] = []

        for file in filter(
            lambda f: (f.lower().endswith((".webp", ".png", ".jpg", ".jpeg"))),
            os.listdir(category_dir),
        ):
            dataset_dict[category_name].append(file)

    # Get training metadata
    metadata = read_training_metadata(sanitize_filename(name))
    current_image_count = get_dataset_image_count(sanitize_filename(name))

    if metadata is None:
        training_metadata = {
            "has_trained": False,
            "last_training_date": None,
            "last_training_image_count": 0,
            "current_image_count": current_image_count,
            "new_images_count": current_image_count,
            "dataset_changed": current_image_count > 0,
        }
    else:
        last_training_count = metadata.get("last_training_image_count", 0)
        # Dataset has changed if count is different (either added or deleted images)
        dataset_changed = current_image_count != last_training_count
        # Only show positive count for new images (ignore deletions in the count display)
        new_images_count = max(0, current_image_count - last_training_count)
        training_metadata = {
            "has_trained": True,
            "last_training_date": metadata.get("last_training_date"),
            "last_training_image_count": last_training_count,
            "current_image_count": current_image_count,
            "new_images_count": new_images_count,
            "dataset_changed": dataset_changed,
        }

    return JSONResponse(
        status_code=200,
        content={
            "categories": dataset_dict,
            "training_metadata": training_metadata,
        },
    )


@router.get(
    "/classification/attributes",
    summary="Get custom classification attributes",
    description="""Returns custom classification attributes for a given object type.
    Only includes models with classification_type set to 'attribute'.
    By default returns a flat sorted list of all attribute labels.
    If group_by_model is true, returns attributes grouped by model name.""",
)
def get_custom_attributes(
    request: Request, object_type: str = None, group_by_model: bool = False
):
    models_with_attributes = {}

    for (
        model_key,
        model_config,
    ) in request.app.frigate_config.classification.custom.items():
        if (
            not model_config.enabled
            or not model_config.object_config
            or model_config.object_config.classification_type
            != ObjectClassificationType.attribute
        ):
            continue

        model_objects = getattr(model_config.object_config, "objects", []) or []
        if object_type is not None and object_type not in model_objects:
            continue

        dataset_dir = os.path.join(CLIPS_DIR, sanitize_filename(model_key), "dataset")
        if not os.path.exists(dataset_dir):
            continue

        attributes = []
        for category_name in os.listdir(dataset_dir):
            category_dir = os.path.join(dataset_dir, category_name)
            if os.path.isdir(category_dir) and category_name != "none":
                attributes.append(category_name)

        if attributes:
            model_name = model_config.name or model_key
            models_with_attributes[model_name] = sorted(attributes)

    if group_by_model:
        return JSONResponse(content=models_with_attributes)
    else:
        # Flatten to a unique sorted list
        all_attributes = set()
        for attributes in models_with_attributes.values():
            all_attributes.update(attributes)
        return JSONResponse(content=sorted(list(all_attributes)))


@router.get(
    "/classification/{name}/train",
    summary="Get classification train images",
    description="""Gets the train images for a specific classification model.
    The name must exist in the classification models. Returns a success message or an error if the name is invalid.""",
)
def get_classification_images(name: str):
    train_dir = os.path.join(CLIPS_DIR, sanitize_filename(name), "train")

    if not os.path.exists(train_dir):
        return JSONResponse(status_code=200, content=[])

    return JSONResponse(
        status_code=200,
        content=list(
            filter(
                lambda f: (f.lower().endswith((".webp", ".png", ".jpg", ".jpeg"))),
                os.listdir(train_dir),
            )
        ),
    )


@router.post(
    "/classification/{name}/train",
    response_model=GenericResponse,
    summary="Train a classification model",
    description="""Trains a specific classification model.
    The name must exist in the classification models. Returns a success message or an error if the name is invalid.""",
)
async def train_configured_model(request: Request, name: str):
    config: FrigateConfig = request.app.frigate_config

    if name not in config.classification.custom:
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": f"{name} is not a known classification model.",
                }
            ),
            status_code=404,
        )

    context: EmbeddingsContext = request.app.embeddings
    context.start_classification_training(name)
    return JSONResponse(
        content={"success": True, "message": "Started classification model training."},
        status_code=200,
    )


@router.post(
    "/classification/{name}/dataset/{category}/delete",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Delete classification dataset images",
    description="""Deletes specific dataset images for a given classification model and category.
    The image IDs must belong to the specified category. Returns a success message or an error if the name or category is invalid.""",
)
def delete_classification_dataset_images(
    request: Request, name: str, category: str, body: dict = None
):
    config: FrigateConfig = request.app.frigate_config

    if name not in config.classification.custom:
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": f"{name} is not a known classification model.",
                }
            ),
            status_code=404,
        )

    json: dict[str, Any] = body or {}
    list_of_ids = json.get("ids", "")
    folder = os.path.join(
        CLIPS_DIR, sanitize_filename(name), "dataset", sanitize_filename(category)
    )

    for id in list_of_ids:
        file_path = os.path.join(folder, sanitize_filename(id))

        if os.path.isfile(file_path):
            os.unlink(file_path)

    if os.path.exists(folder) and not os.listdir(folder) and category.lower() != "none":
        os.rmdir(folder)

    return JSONResponse(
        content=({"success": True, "message": "Successfully deleted images."}),
        status_code=200,
    )


@router.put(
    "/classification/{name}/dataset/{old_category}/rename",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Rename a classification category",
    description="""Renames a classification category for a given classification model.
    The old category must exist and the new name must be valid. Returns a success message or an error if the name is invalid.""",
)
def rename_classification_category(
    request: Request, name: str, old_category: str, body: dict = None
):
    config: FrigateConfig = request.app.frigate_config

    if name not in config.classification.custom:
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": f"{name} is not a known classification model.",
                }
            ),
            status_code=404,
        )

    json: dict[str, Any] = body or {}
    new_category = sanitize_filename(json.get("new_category", ""))

    if not new_category:
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": "New category name is required.",
                }
            ),
            status_code=400,
        )

    old_folder = os.path.join(
        CLIPS_DIR, sanitize_filename(name), "dataset", sanitize_filename(old_category)
    )
    new_folder = os.path.join(
        CLIPS_DIR, sanitize_filename(name), "dataset", new_category
    )

    if not os.path.exists(old_folder):
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": f"Category {old_category} does not exist.",
                }
            ),
            status_code=404,
        )

    if os.path.exists(new_folder):
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": f"Category {new_category} already exists.",
                }
            ),
            status_code=400,
        )

    try:
        os.rename(old_folder, new_folder)
        return JSONResponse(
            content=(
                {
                    "success": True,
                    "message": f"Successfully renamed category to {new_category}.",
                }
            ),
            status_code=200,
        )
    except Exception as e:
        logger.error(f"Error renaming category: {e}")
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": "Failed to rename category",
                }
            ),
            status_code=500,
        )


@router.post(
    "/classification/{name}/dataset/categorize",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Categorize a classification image",
    description="""Categorizes a specific classification image for a given classification model and category.
    The image must exist in the specified category. Returns a success message or an error if the name or category is invalid.""",
)
def categorize_classification_image(request: Request, name: str, body: dict = None):
    config: FrigateConfig = request.app.frigate_config

    if name not in config.classification.custom:
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": f"{name} is not a known classification model.",
                }
            ),
            status_code=404,
        )

    json: dict[str, Any] = body or {}
    category = sanitize_filename(json.get("category", ""))
    training_file_name = sanitize_filename(json.get("training_file", ""))
    training_file = os.path.join(
        CLIPS_DIR, sanitize_filename(name), "train", training_file_name
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

    random_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    timestamp = datetime.datetime.now().timestamp()
    new_name = f"{category}-{timestamp}-{random_id}.png"
    new_file_folder = os.path.join(
        CLIPS_DIR, sanitize_filename(name), "dataset", category
    )

    os.makedirs(new_file_folder, exist_ok=True)

    # use opencv because webp images can not be used to train
    img = cv2.imread(training_file)
    cv2.imwrite(os.path.join(new_file_folder, new_name), img)
    os.unlink(training_file)

    return JSONResponse(
        content=({"success": True, "message": "Successfully categorized image."}),
        status_code=200,
    )


@router.post(
    "/classification/{name}/dataset/{category}/create",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Create an empty classification category folder",
    description="""Creates an empty folder for a classification category.
    This is used to create folders for categories that don't have images yet.
    Returns a success message or an error if the name is invalid.""",
)
def create_classification_category(request: Request, name: str, category: str):
    config: FrigateConfig = request.app.frigate_config

    if name not in config.classification.custom:
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": f"{name} is not a known classification model.",
                }
            ),
            status_code=404,
        )

    category_folder = os.path.join(
        CLIPS_DIR, sanitize_filename(name), "dataset", sanitize_filename(category)
    )

    os.makedirs(category_folder, exist_ok=True)

    return JSONResponse(
        content=(
            {
                "success": True,
                "message": f"Successfully created category folder: {category}",
            }
        ),
        status_code=200,
    )


@router.post(
    "/classification/{name}/train/delete",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Delete classification train images",
    description="""Deletes specific train images for a given classification model.
    The image IDs must belong to the specified train folder. Returns a success message or an error if the name is invalid.""",
)
def delete_classification_train_images(request: Request, name: str, body: dict = None):
    config: FrigateConfig = request.app.frigate_config

    if name not in config.classification.custom:
        return JSONResponse(
            content=(
                {
                    "success": False,
                    "message": f"{name} is not a known classification model.",
                }
            ),
            status_code=404,
        )

    json: dict[str, Any] = body or {}
    list_of_ids = json.get("ids", "")
    folder = os.path.join(CLIPS_DIR, sanitize_filename(name), "train")

    for id in list_of_ids:
        file_path = os.path.join(folder, sanitize_filename(id))

        if os.path.isfile(file_path):
            os.unlink(file_path)

    return JSONResponse(
        content=({"success": True, "message": "Successfully deleted images."}),
        status_code=200,
    )


@router.post(
    "/classification/generate_examples/state",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Generate state classification examples",
)
async def generate_state_examples(request: Request, body: GenerateStateExamplesBody):
    """Generate examples for state classification."""
    model_name = sanitize_filename(body.model_name)
    cameras_normalized = {
        camera_name: tuple(crop)
        for camera_name, crop in body.cameras.items()
        if camera_name in request.app.frigate_config.cameras
    }

    collect_state_classification_examples(model_name, cameras_normalized)

    return JSONResponse(
        content={"success": True, "message": "Example generation completed"},
        status_code=200,
    )


@router.post(
    "/classification/generate_examples/object",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Generate object classification examples",
)
async def generate_object_examples(request: Request, body: GenerateObjectExamplesBody):
    """Generate examples for object classification."""
    model_name = sanitize_filename(body.model_name)
    collect_object_classification_examples(model_name, body.label)

    return JSONResponse(
        content={"success": True, "message": "Example generation completed"},
        status_code=200,
    )


@router.delete(
    "/classification/{name}",
    response_model=GenericResponse,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Delete a classification model",
    description="""Deletes a specific classification model and all its associated data.
    Works even if the model is not in the config (e.g., partially created during wizard).
    Returns a success message.""",
)
def delete_classification_model(request: Request, name: str):
    sanitized_name = sanitize_filename(name)

    # Delete the classification model's data directory in clips
    data_dir = os.path.join(CLIPS_DIR, sanitized_name)
    if os.path.exists(data_dir):
        try:
            shutil.rmtree(data_dir)
            logger.info(f"Deleted classification data directory for {name}")
        except Exception as e:
            logger.debug(f"Failed to delete data directory for {name}: {e}")

    # Delete the classification model's files in model_cache
    model_dir = os.path.join(MODEL_CACHE_DIR, sanitized_name)
    if os.path.exists(model_dir):
        try:
            shutil.rmtree(model_dir)
            logger.info(f"Deleted classification model directory for {name}")
        except Exception as e:
            logger.debug(f"Failed to delete model directory for {name}: {e}")

    return JSONResponse(
        content=(
            {
                "success": True,
                "message": f"Successfully deleted classification model {name}.",
            }
        ),
        status_code=200,
    )
