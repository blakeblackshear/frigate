import logging

from fastapi import FastAPI

from frigate.api import app as main_app
from frigate.api import media, preview
from frigate.plus import PlusApi
from frigate.ptz.onvif import OnvifController
from frigate.stats.emitter import StatsEmitter
from frigate.storage import StorageMaintainer

logger = logging.getLogger(__name__)


def create_fastapi_app(
    frigate_config,
    detected_frames_processor,
    storage_maintainer: StorageMaintainer,
    onvif: OnvifController,
    plus_api: PlusApi,
    stats_emitter: StatsEmitter,
):
    logger.info("Starting FastAPI app")
    app = FastAPI(
        debug=False,
        swagger_ui_parameters={"apisSorter": "alpha", "operationsSorter": "alpha"},
    )
    # Routes
    app.include_router(main_app.router)
    app.include_router(media.router)
    app.include_router(preview.router)
    # App Properties
    app.frigate_config = frigate_config
    app.detected_frames_processor = detected_frames_processor
    app.storage_maintainer = storage_maintainer
    app.camera_error_image = None
    app.onvif = onvif
    app.plus_api = plus_api
    app.stats_emitter = stats_emitter

    return app
