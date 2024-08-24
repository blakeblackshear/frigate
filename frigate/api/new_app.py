import logging

from fastapi import FastAPI

from frigate.api import app as main_app
from frigate.api import media, preview

logger = logging.getLogger(__name__)

# https://fastapi.tiangolo.com/tutorial/metadata/#use-your-tags
tags_metadata = [
    {
        "name": "Preview",
        "description": "Preview routes",
    },
    {
        "name": "Logs",
        "description": "Logs routes",
    },
    {
        "name": "Media",
        "description": "Media routes",
    },
]


def create_fastapi_app(frigate_config, detected_frames_processor):
    logger.info("Starting FastAPI app")
    app = FastAPI(debug=False, tags_metadata=tags_metadata)
    app.include_router(preview.router)
    app.include_router(media.router)
    app.include_router(main_app.router)
    app.frigate_config = frigate_config
    app.detected_frames_processor = detected_frames_processor
    app.camera_error_image = None

    return app
