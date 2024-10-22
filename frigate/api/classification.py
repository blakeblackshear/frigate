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
    #if not file.content_type.startswith("image"):
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
