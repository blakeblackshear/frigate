"""Configuration for the local dataset feature."""

from pydantic import Field

from frigate.config.base import FrigateBaseModel

__all__ = ["LocalDatasetConfig"]


class LocalDatasetConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable local dataset",
        description="Enable the local dataset feature, which allows saving event snapshots and recording frames locally for annotation and model training without requiring a Frigate+ subscription.",
    )
