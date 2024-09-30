from enum import Enum

from pydantic import Field

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
