"""Object classification APIs."""

import logging

from fastapi import APIRouter, Request, UploadFile
from fastapi.responses import JSONResponse

from frigate.api.defs.tags import Tags
from frigate.embeddings import EmbeddingsContext

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.events])


@router.get("/faces")
def get_faces():
    return JSONResponse(content={"message": "there are faces"})


@router.post("/faces/{name}")
async def register_face(request: Request, name: str, file: UploadFile):
    # if not file.content_type.startswith("image"):
    #    return JSONResponse(
    #        status_code=400,
    #        content={
    #            "success": False,
    #            "message": "Only an image can be used to register a face.",
    #        },
    #    )

    context: EmbeddingsContext = request.app.embeddings
    context.register_face(name, await file.read())
    return JSONResponse(
        status_code=200,
        content={"success": True, "message": "Successfully registered face."},
    )


@router.delete("/faces")
def deregister_faces(request: Request, body: dict = None):
    json: dict[str, any] = body or {}
    list_of_ids = json.get("ids", "")

    if not list_of_ids or len(list_of_ids) == 0:
        return JSONResponse(
            content=({"success": False, "message": "Not a valid list of ids"}),
            status_code=404,
        )

    context: EmbeddingsContext = request.app.embeddings
    context.delete_face_ids(list_of_ids)
    return JSONResponse(
        content=({"success": True, "message": "Successfully deleted faces."}),
        status_code=200,
    )
