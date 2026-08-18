"""JSON schema utilities for Frigate."""

from typing import Any

from pydantic import BaseModel


def get_config_schema(config_class: type[BaseModel]) -> dict[str, Any]:
    """Get the JSON schema for FrigateConfig.

    Args:
        config_class: The config model to describe

    Returns:
        The JSON schema
    """
    return config_class.model_json_schema()
