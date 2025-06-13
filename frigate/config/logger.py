from pydantic import Field, ValidationInfo, model_validator
from typing_extensions import Self

from frigate.log import LogLevel, apply_log_levels

from .base import FrigateBaseModel

__all__ = ["LoggerConfig"]


class LoggerConfig(FrigateBaseModel):
    default: LogLevel = Field(default=LogLevel.info, title="Default logging level.")
    logs: dict[str, LogLevel] = Field(
        default_factory=dict, title="Log level for specified processes."
    )

    @model_validator(mode="after")
    def post_validation(self, info: ValidationInfo) -> Self:
        if isinstance(info.context, dict) and info.context.get("install", False):
            apply_log_levels(self.default.value.upper(), self.logs)

        return self
