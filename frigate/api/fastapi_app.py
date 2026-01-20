import logging
import re
from typing import Optional

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse
from joserfc.jwk import OctKey
from playhouse.sqliteq import SqliteQueueDatabase
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette_context import middleware, plugins
from starlette_context.plugins import Plugin

from frigate.api import app as main_app
from frigate.api import (
    auth,
    camera,
    chat,
    classification,
    event,
    export,
    media,
    notification,
    preview,
    record,
    review,
)
from frigate.api.auth import get_jwt_secret, limiter, require_admin_by_default
from frigate.comms.event_metadata_updater import (
    EventMetadataPublisher,
)
from frigate.config import FrigateConfig
from frigate.config.camera.updater import CameraConfigUpdatePublisher
from frigate.embeddings import EmbeddingsContext
from frigate.ptz.onvif import OnvifController
from frigate.stats.emitter import StatsEmitter
from frigate.storage import StorageMaintainer

logger = logging.getLogger(__name__)


def check_csrf(request: Request) -> bool:
    if request.method in ["GET", "HEAD", "OPTIONS", "TRACE"]:
        return True
    if "origin" in request.headers and "x-csrf-token" not in request.headers:
        return False

    return True


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
    stats_emitter: StatsEmitter,
    event_metadata_updater: EventMetadataPublisher,
    config_publisher: CameraConfigUpdatePublisher,
    enforce_default_admin: bool = True,
):
    logger.info("Starting FastAPI app")
    app = FastAPI(
        debug=False,
        swagger_ui_parameters={"apisSorter": "alpha", "operationsSorter": "alpha"},
        dependencies=[Depends(require_admin_by_default())]
        if enforce_default_admin
        else [],
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
        if not check_csrf(request):
            return JSONResponse(
                content={"success": False, "message": "Missing CSRF header"},
                status_code=401,
            )

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
    if frigate_config.auth.failed_login_rate_limit is None:
        limiter.enabled = False
    else:
        auth.rateLimiter.set_limit(frigate_config.auth.failed_login_rate_limit)

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # Routes
    # Order of include_router matters: https://fastapi.tiangolo.com/tutorial/path-params/#order-matters
    app.include_router(auth.router)
    app.include_router(camera.router)
    app.include_router(chat.router)
    app.include_router(classification.router)
    app.include_router(review.router)
    app.include_router(main_app.router)
    app.include_router(preview.router)
    app.include_router(notification.router)
    app.include_router(export.router)
    app.include_router(event.router)
    app.include_router(media.router)
    app.include_router(record.router)
    # App Properties
    app.frigate_config = frigate_config
    app.embeddings = embeddings
    app.detected_frames_processor = detected_frames_processor
    app.storage_maintainer = storage_maintainer
    app.camera_error_image = None
    app.onvif = onvif
    app.stats_emitter = stats_emitter
    app.event_metadata_updater = event_metadata_updater
    app.config_publisher = config_publisher

    if frigate_config.auth.enabled:
        secret = get_jwt_secret()
        key_bytes = None
        if isinstance(secret, str):
            # If the secret looks like hex (e.g., generated by secrets.token_hex), use raw bytes
            if len(secret) % 2 == 0 and re.fullmatch(r"[0-9a-fA-F]+", secret or ""):
                try:
                    key_bytes = bytes.fromhex(secret)
                except ValueError:
                    key_bytes = secret.encode("utf-8")
            else:
                key_bytes = secret.encode("utf-8")
        elif isinstance(secret, (bytes, bytearray)):
            key_bytes = bytes(secret)
        else:
            key_bytes = str(secret).encode("utf-8")

        app.jwt_token = OctKey.import_key(key_bytes)
    else:
        app.jwt_token = None

    return app
