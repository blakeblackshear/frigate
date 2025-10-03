#!/usr/bin/env python3
"""
Generate English translation JSON files from Pydantic config models.

This script dynamically extracts all top-level config sections from FrigateConfig
and generates JSON translation files with titles and descriptions for the web UI.
"""

import json
import logging
import shutil
from pathlib import Path
from typing import Any, Dict, Optional, get_args, get_origin

from pydantic import BaseModel
from pydantic.fields import FieldInfo

from frigate.config.config import FrigateConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_field_translations(field_info: FieldInfo) -> Dict[str, str]:
    """Extract title and description from a Pydantic field."""
    translations = {}

    if field_info.title:
        translations["label"] = field_info.title

    if field_info.description:
        translations["description"] = field_info.description

    return translations


def process_model_fields(model: type[BaseModel]) -> Dict[str, Any]:
    """
    Recursively process a Pydantic model to extract translations.

    Returns a nested dictionary structure matching the config schema,
    with title and description for each field.
    """
    translations = {}

    model_fields = model.model_fields

    for field_name, field_info in model_fields.items():
        field_translations = get_field_translations(field_info)

        # Get the field's type annotation
        field_type = field_info.annotation

        # Handle Optional types
        origin = get_origin(field_type)

        if origin is Optional or (
            hasattr(origin, "__name__") and origin.__name__ == "UnionType"
        ):
            args = get_args(field_type)
            field_type = next(
                (arg for arg in args if arg is not type(None)), field_type
            )

        # Handle Dict types (like Dict[str, CameraConfig])
        if get_origin(field_type) is dict:
            dict_args = get_args(field_type)

            if len(dict_args) >= 2:
                value_type = dict_args[1]

                if isinstance(value_type, type) and issubclass(value_type, BaseModel):
                    nested_translations = process_model_fields(value_type)

                    if nested_translations:
                        field_translations["properties"] = nested_translations
        elif isinstance(field_type, type) and issubclass(field_type, BaseModel):
            nested_translations = process_model_fields(field_type)
            if nested_translations:
                field_translations["properties"] = nested_translations

        if field_translations:
            translations[field_name] = field_translations

    return translations


def generate_section_translation(
    section_name: str, field_info: FieldInfo
) -> Dict[str, Any]:
    """
    Generate translation structure for a top-level config section.
    """
    section_translations = get_field_translations(field_info)
    field_type = field_info.annotation
    origin = get_origin(field_type)

    if origin is Optional or (
        hasattr(origin, "__name__") and origin.__name__ == "UnionType"
    ):
        args = get_args(field_type)
        field_type = next((arg for arg in args if arg is not type(None)), field_type)

    # Handle Dict types (like detectors, cameras, camera_groups)
    if get_origin(field_type) is dict:
        dict_args = get_args(field_type)
        if len(dict_args) >= 2:
            value_type = dict_args[1]
            if isinstance(value_type, type) and issubclass(value_type, BaseModel):
                nested = process_model_fields(value_type)
                if nested:
                    section_translations["properties"] = nested

    # If the field itself is a BaseModel, process it
    elif isinstance(field_type, type) and issubclass(field_type, BaseModel):
        nested = process_model_fields(field_type)
        if nested:
            section_translations["properties"] = nested

    return section_translations


def main():
    """Main function to generate config translations."""

    # Define output directory
    output_dir = Path(__file__).parent / "web" / "public" / "locales" / "en" / "config"

    logger.info(f"Output directory: {output_dir}")

    # Clean and recreate the output directory
    if output_dir.exists():
        logger.info(f"Removing existing directory: {output_dir}")
        shutil.rmtree(output_dir)

    logger.info(f"Creating directory: {output_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)

    config_fields = FrigateConfig.model_fields
    logger.info(f"Found {len(config_fields)} top-level config sections")

    for field_name, field_info in config_fields.items():
        if field_name.startswith("_"):
            continue

        logger.info(f"Processing section: {field_name}")
        section_data = generate_section_translation(field_name, field_info)

        if not section_data:
            logger.warning(f"No translations found for section: {field_name}")
            continue

        output_file = output_dir / f"{field_name}.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(section_data, f, indent=2, ensure_ascii=False)

        logger.info(f"Generated: {output_file}")

    logger.info("Translation generation complete!")


if __name__ == "__main__":
    main()
