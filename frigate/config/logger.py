import logging
from enum import Enum

from pydantic import Field, ValidationInfo, model_validator
from typing_extensions import Self

from .base import FrigateBaseModel

__all__ = ["LoggerConfig", "LogLevel"]


class LogLevel(str, Enum):
    debug = "debug"
    info = "info"
    warning = "warning"
    error = "error"
    critical = "critical"


class LoggerConfig(FrigateBaseModel):
    default: LogLevel = Field(default=LogLevel.info, title="Default logging level.")
    logs: dict[str, LogLevel] = Field(
        default_factory=dict, title="Log level for specified processes."
    )

    @model_validator(mode="after")
    def post_validation(self, info: ValidationInfo) -> Self:
        if isinstance(info.context, dict) and info.context.get("install", False):
            logging.getLogger().setLevel(self.default.value.upper())

            log_levels = {
                "werkzeug": LogLevel.error,
                "ws4py": LogLevel.error,
                **self.logs,
            }

            for log, level in log_levels.items():
                logging.getLogger(log).setLevel(level.value.upper())
