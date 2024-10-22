import logging
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from playhouse.sqliteq import SqliteQueueDatabase
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette_context import middleware, plugins
from starlette_context.plugins import Plugin

from frigate.api import app as main_app
from frigate.api import (
    auth,
    classification,
    event,
    export,
    media,
    notification,
    preview,
    review,
)
from frigate.api.auth import get_jwt_secret, limiter
from frigate.comms.event_metadata_updater import (
    EventMetadataPublisher,
)
from frigate.config import FrigateConfig
from frigate.embeddings import EmbeddingsContext
from frigate.events.external import ExternalEventProcessor
from frigate.ptz.onvif import OnvifController
from frigate.stats.emitter import StatsEmitter
from frigate.storage import StorageMaintainer

logger = logging.getLogger(__name__)


def check_csrf(request: Request):
    if request.method in ["GET", "HEAD", "OPTIONS", "TRACE"]:
        pass
    if "origin" in request.headers and "x-csrf-token" not in request.headers:
        return JSONResponse(
            content={"success": False, "message": "Missing CSRF header"},
            status_code=401,
        )


# Used to retrieve the remote-user header: https://starlette-context.readthedocs.io/en/latest/plugins.html#easy-mode
class RemoteUserPlugin(Plugin):
    key = "Remote-User"


def create_fastapi_app(
    frigate_config: FrigateConfig,
    database: SqliteQueueDatabase,
    embeddings: Optional[EmbeddingsContext],
    detected_frames_processor,
    storage_maintainer: StorageMaintainer,
    onvif: OnvifController,
    external_processor: ExternalEventProcessor,
    stats_emitter: StatsEmitter,
    event_metadata_updater: EventMetadataPublisher,
):
    logger.info("Starting FastAPI app")
    app = FastAPI(
        debug=False,
        swagger_ui_parameters={"apisSorter": "alpha", "operationsSorter": "alpha"},
    )

    # update the request_address with the x-forwarded-for header from nginx
    # https://starlette-context.readthedocs.io/en/latest/plugins.html#forwarded-for
    app.add_middleware(
        middleware.ContextMiddleware,
        plugins=(plugins.ForwardedForPlugin(),),
    )

    # Middleware to connect to DB before and close connection after request
    # https://github.com/fastapi/full-stack-fastapi-template/issues/224#issuecomment-737423886
    # https://fastapi.tiangolo.com/tutorial/middleware/#before-and-after-the-response
    @app.middleware("http")
    async def frigate_middleware(request: Request, call_next):
        # Before request
        check_csrf(request)
        if database.is_closed():
            database.connect()

        response = await call_next(request)

        # After request https://stackoverflow.com/a/75487519
        if not database.is_closed():
            database.close()
        return response

    @app.on_event("startup")
    async def startup():
        logger.info("FastAPI started")

    # Rate limiter (used for login endpoint)
    auth.rateLimiter.set_limit(frigate_config.auth.failed_login_rate_limit or "")
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # Routes
    # Order of include_router matters: https://fastapi.tiangolo.com/tutorial/path-params/#order-matters
    app.include_router(auth.router)
    app.include_router(classification.router)
    app.include_router(review.router)
    app.include_router(main_app.router)
    app.include_router(preview.router)
    app.include_router(notification.router)
    app.include_router(export.router)
    app.include_router(event.router)
    app.include_router(media.router)
    # App Properties
    app.frigate_config = frigate_config
    app.embeddings = embeddings
    app.detected_frames_processor = detected_frames_processor
    app.storage_maintainer = storage_maintainer
    app.camera_error_image = None
    app.onvif = onvif
    app.stats_emitter = stats_emitter
    app.event_metadata_updater = event_metadata_updater
    app.external_processor = external_processor
    app.jwt_token = get_jwt_secret() if frigate_config.auth.enabled else None

    return app
