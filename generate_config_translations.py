#!/usr/bin/env python3
"""
Generate English translation JSON files from Pydantic config models.

This script dynamically extracts all top-level config sections from FrigateConfig
and generates JSON translation files with titles and descriptions for the web UI.
"""

import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, get_args, get_origin

from frigate.config.config import FrigateConfig
from frigate.util.schema import get_config_schema

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_field_translations(field_info) -> Dict[str, str]:
    """Extract title and description from a Pydantic field."""
    translations = {}

    if field_info.title:
        translations["label"] = field_info.title

    if field_info.description:
        translations["description"] = field_info.description

    return translations


def extract_translations_from_schema(
    schema: Dict[str, Any], defs: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Recursively extract translations (titles and descriptions) from a JSON schema.

    Returns a dictionary structure with label and description for each field,
    and nested fields directly under their parent keys.
    """
    if defs is None:
        defs = schema.get("$defs", {})

    translations = {}

    # Add top-level title and description if present
    if "title" in schema:
        translations["label"] = schema["title"]
    if "description" in schema:
        translations["description"] = schema["description"]

    # Process nested properties
    properties = schema.get("properties", {})
    for field_name, field_schema in properties.items():
        field_translations = {}

        # Handle $ref references
        if "$ref" in field_schema:
            ref_path = field_schema["$ref"]
            if ref_path.startswith("#/$defs/"):
                ref_name = ref_path.split("/")[-1]
                if ref_name in defs:
                    ref_schema = defs[ref_name]
                    # Extract from the referenced schema
                    ref_translations = extract_translations_from_schema(
                        ref_schema, defs=defs
                    )
                    # Use the $ref field's own title/description if present
                    if "title" in field_schema:
                        field_translations["label"] = field_schema["title"]
                    elif "label" in ref_translations:
                        field_translations["label"] = ref_translations["label"]
                    if "description" in field_schema:
                        field_translations["description"] = field_schema["description"]
                    elif "description" in ref_translations:
                        field_translations["description"] = ref_translations[
                            "description"
                        ]
                    # Add nested properties from referenced schema
                    nested_without_root = {
                        k: v
                        for k, v in ref_translations.items()
                        if k not in ("label", "description")
                    }
                    field_translations.update(nested_without_root)
        # Handle additionalProperties with $ref (for dict types)
        elif "additionalProperties" in field_schema:
            additional_props = field_schema["additionalProperties"]
            # Extract title and description from the field itself
            if "title" in field_schema:
                field_translations["label"] = field_schema["title"]
            if "description" in field_schema:
                field_translations["description"] = field_schema["description"]

            # If additionalProperties contains a $ref, extract nested translations
            if "$ref" in additional_props:
                ref_path = additional_props["$ref"]
                if ref_path.startswith("#/$defs/"):
                    ref_name = ref_path.split("/")[-1]
                    if ref_name in defs:
                        ref_schema = defs[ref_name]
                        nested = extract_translations_from_schema(ref_schema, defs=defs)
                        nested_without_root = {
                            k: v
                            for k, v in nested.items()
                            if k not in ("label", "description")
                        }
                        field_translations.update(nested_without_root)
        # Handle items with $ref (for array types)
        elif "items" in field_schema:
            items = field_schema["items"]
            # Extract title and description from the field itself
            if "title" in field_schema:
                field_translations["label"] = field_schema["title"]
            if "description" in field_schema:
                field_translations["description"] = field_schema["description"]

            # If items contains a $ref, extract nested translations
            if "$ref" in items:
                ref_path = items["$ref"]
                if ref_path.startswith("#/$defs/"):
                    ref_name = ref_path.split("/")[-1]
                    if ref_name in defs:
                        ref_schema = defs[ref_name]
                        nested = extract_translations_from_schema(ref_schema, defs=defs)
                        nested_without_root = {
                            k: v
                            for k, v in nested.items()
                            if k not in ("label", "description")
                        }
                        field_translations.update(nested_without_root)
        else:
            # Extract title and description
            if "title" in field_schema:
                field_translations["label"] = field_schema["title"]
            if "description" in field_schema:
                field_translations["description"] = field_schema["description"]

            # Recursively process nested properties
            if "properties" in field_schema:
                nested = extract_translations_from_schema(field_schema, defs=defs)
                # Merge nested translations
                nested_without_root = {
                    k: v for k, v in nested.items() if k not in ("label", "description")
                }
                field_translations.update(nested_without_root)
            # Handle anyOf cases
            elif "anyOf" in field_schema:
                for item in field_schema["anyOf"]:
                    if "properties" in item:
                        nested = extract_translations_from_schema(item, defs=defs)
                        nested_without_root = {
                            k: v
                            for k, v in nested.items()
                            if k not in ("label", "description")
                        }
                        field_translations.update(nested_without_root)
                    elif "$ref" in item:
                        ref_path = item["$ref"]
                        if ref_path.startswith("#/$defs/"):
                            ref_name = ref_path.split("/")[-1]
                            if ref_name in defs:
                                ref_schema = defs[ref_name]
                                nested = extract_translations_from_schema(
                                    ref_schema, defs=defs
                                )
                                nested_without_root = {
                                    k: v
                                    for k, v in nested.items()
                                    if k not in ("label", "description")
                                }
                                field_translations.update(nested_without_root)

        if field_translations:
            translations[field_name] = field_translations

    return translations


def generate_section_translation(config_class: type) -> Dict[str, Any]:
    """
    Generate translation structure for a config section using its JSON schema.
    """
    schema = config_class.model_json_schema()
    return extract_translations_from_schema(schema)


def get_detector_translations(
    config_schema: Dict[str, Any],
) -> tuple[Dict[str, Any], set[str]]:
    """Build detector type translations with nested fields based on schema definitions."""
    defs = config_schema.get("$defs", {})
    detector_schema = defs.get("DetectorConfig", {})
    discriminator = detector_schema.get("discriminator", {})
    mapping = discriminator.get("mapping", {})

    type_translations: Dict[str, Any] = {}
    nested_field_keys: set[str] = set()
    for detector_type, ref in mapping.items():
        if not isinstance(ref, str):
            continue

        if not ref.startswith("#/$defs/"):
            continue

        ref_name = ref.split("/")[-1]
        ref_schema = defs.get(ref_name, {})
        if not ref_schema:
            continue

        type_entry: Dict[str, str] = {}
        title = ref_schema.get("title")
        description = ref_schema.get("description")
        if title:
            type_entry["label"] = title
        if description:
            type_entry["description"] = description

        nested = extract_translations_from_schema(ref_schema, defs=defs)
        nested_without_root = {
            k: v for k, v in nested.items() if k not in ("label", "description")
        }
        if nested_without_root:
            type_entry.update(nested_without_root)
            nested_field_keys.update(nested_without_root.keys())

        if type_entry:
            type_translations[detector_type] = type_entry

    return type_translations, nested_field_keys


def main():
    """Main function to generate config translations."""

    # Define output directory
    if len(sys.argv) > 1:
        output_dir = Path(sys.argv[1])
    else:
        output_dir = (
            Path(__file__).parent / "web" / "public" / "locales" / "en" / "config"
        )

    logger.info(f"Output directory: {output_dir}")

    # Ensure the output directory exists; do not delete existing files.
    output_dir.mkdir(parents=True, exist_ok=True)
    logger.info(
        f"Using output directory (existing files will be overwritten): {output_dir}"
    )

    config_fields = FrigateConfig.model_fields
    config_schema = get_config_schema(FrigateConfig)
    logger.info(f"Found {len(config_fields)} top-level config sections")

    global_translations = {}

    for field_name, field_info in config_fields.items():
        if field_name.startswith("_"):
            continue

        logger.info(f"Processing section: {field_name}")

        # Get the field's type
        field_type = field_info.annotation
        from typing import Optional, Union

        origin = get_origin(field_type)
        if (
            origin is Optional
            or origin is Union
            or (
                hasattr(origin, "__name__")
                and origin.__name__ in ("UnionType", "Union")
            )
        ):
            args = get_args(field_type)
            field_type = next(
                (arg for arg in args if arg is not type(None)), field_type
            )

        # Handle Dict[str, SomeModel] - extract the value type
        if origin is dict:
            args = get_args(field_type)
            if args and len(args) > 1:
                field_type = args[1]  # Get value type from Dict[key, value]

        # Start with field's top-level metadata (label, description)
        section_data = get_field_translations(field_info)

        # Generate nested translations from the field type's schema
        if hasattr(field_type, "model_json_schema"):
            schema = field_type.model_json_schema()
            # Extract nested properties from schema
            nested = extract_translations_from_schema(schema)
            # Remove top-level label/description from nested since we got those from field_info
            nested_without_root = {
                k: v for k, v in nested.items() if k not in ("label", "description")
            }
            section_data.update(nested_without_root)

        if field_name == "detectors":
            detector_types, detector_field_keys = get_detector_translations(
                config_schema
            )
            section_data.update(detector_types)
            for key in detector_field_keys:
                if key == "type":
                    continue
                section_data.pop(key, None)

        if not section_data:
            logger.warning(f"No translations found for section: {field_name}")
            continue

        # Add camera-level fields to global config documentation if applicable
        CAMERA_LEVEL_FIELDS = {
            "birdseye": (
                "frigate.config.camera.birdseye",
                "BirdseyeCameraConfig",
                ["order"],
            ),
            "ffmpeg": (
                "frigate.config.camera.ffmpeg",
                "CameraFfmpegConfig",
                ["inputs"],
            ),
            "lpr": (
                "frigate.config.classification",
                "CameraLicensePlateRecognitionConfig",
                ["expire_time"],
            ),
            "semantic_search": (
                "frigate.config.classification",
                "CameraSemanticSearchConfig",
                ["triggers"],
            ),
        }

        if field_name in CAMERA_LEVEL_FIELDS:
            module_path, class_name, field_names = CAMERA_LEVEL_FIELDS[field_name]
            try:
                import importlib

                module = importlib.import_module(module_path)
                camera_class = getattr(module, class_name)
                schema = camera_class.model_json_schema()
                camera_fields = schema.get("properties", {})
                defs = schema.get("$defs", {})

                for fname in field_names:
                    if fname in camera_fields:
                        field_schema = camera_fields[fname]
                        field_trans = {}
                        if "title" in field_schema:
                            field_trans["label"] = field_schema["title"]
                        if "description" in field_schema:
                            field_trans["description"] = field_schema["description"]

                        # Extract nested properties based on schema type
                        nested_to_extract = None

                        # Handle direct $ref
                        if "$ref" in field_schema:
                            ref_path = field_schema["$ref"]
                            if ref_path.startswith("#/$defs/"):
                                ref_name = ref_path.split("/")[-1]
                                if ref_name in defs:
                                    nested_to_extract = defs[ref_name]

                        # Handle additionalProperties with $ref (for dict types)
                        elif "additionalProperties" in field_schema:
                            additional_props = field_schema["additionalProperties"]
                            if "$ref" in additional_props:
                                ref_path = additional_props["$ref"]
                                if ref_path.startswith("#/$defs/"):
                                    ref_name = ref_path.split("/")[-1]
                                    if ref_name in defs:
                                        nested_to_extract = defs[ref_name]

                        # Handle items with $ref (for array types)
                        elif "items" in field_schema:
                            items = field_schema["items"]
                            if "$ref" in items:
                                ref_path = items["$ref"]
                                if ref_path.startswith("#/$defs/"):
                                    ref_name = ref_path.split("/")[-1]
                                    if ref_name in defs:
                                        nested_to_extract = defs[ref_name]

                        # Extract nested properties if we found a schema to use
                        if nested_to_extract:
                            nested = extract_translations_from_schema(
                                nested_to_extract, defs=defs
                            )
                            nested_without_root = {
                                k: v
                                for k, v in nested.items()
                                if k not in ("label", "description")
                            }
                            field_trans.update(nested_without_root)

                        if field_trans:
                            section_data[fname] = field_trans
            except Exception as e:
                logger.warning(
                    f"Could not add camera-level fields for {field_name}: {e}"
                )

        # Add to global translations instead of writing separate files
        global_translations[field_name] = section_data

        logger.info(f"Added section to global translations: {field_name}")

    # Handle camera-level configs that aren't top-level FrigateConfig fields
    # These are defined as fields in CameraConfig, so we extract title/description from there
    camera_level_configs = {
        "camera_mqtt": ("frigate.config.camera.mqtt", "CameraMqttConfig", "mqtt"),
        "camera_ui": ("frigate.config.camera.ui", "CameraUiConfig", "ui"),
        "onvif": ("frigate.config.camera.onvif", "OnvifConfig", "onvif"),
    }

    # Import CameraConfig to extract field metadata
    from frigate.config.camera.camera import CameraConfig

    camera_config_schema = CameraConfig.model_json_schema()
    camera_properties = camera_config_schema.get("properties", {})

    for config_name, (
        module_path,
        class_name,
        camera_field_name,
    ) in camera_level_configs.items():
        try:
            logger.info(f"Processing camera-level section: {config_name}")
            import importlib

            module = importlib.import_module(module_path)
            config_class = getattr(module, class_name)

            section_data = {}

            # Extract top-level label and description from CameraConfig field definition
            if camera_field_name in camera_properties:
                field_schema = camera_properties[camera_field_name]
                if "title" in field_schema:
                    section_data["label"] = field_schema["title"]
                if "description" in field_schema:
                    section_data["description"] = field_schema["description"]

            # Process model fields from schema
            schema = config_class.model_json_schema()
            nested = extract_translations_from_schema(schema)
            # Remove top-level label/description since we got those from CameraConfig
            nested_without_root = {
                k: v for k, v in nested.items() if k not in ("label", "description")
            }
            section_data.update(nested_without_root)

            # Add camera-level section into global translations (do not write separate file)
            global_translations[config_name] = section_data
            logger.info(
                f"Added camera-level section to global translations: {config_name}"
            )
        except Exception as e:
            logger.error(f"Failed to generate {config_name}: {e}")

    # Remove top-level 'cameras' field if present so it remains a separate file
    if "cameras" in global_translations:
        logger.info(
            "Removing top-level 'cameras' from global translations to keep it as a separate cameras.json"
        )
        del global_translations["cameras"]

    # Write consolidated global.json with per-section keys
    global_file = output_dir / "global.json"
    with open(global_file, "w", encoding="utf-8") as f:
        json.dump(global_translations, f, indent=2, ensure_ascii=False)
        f.write("\n")

    logger.info(f"Generated consolidated translations: {global_file}")

    if not global_translations:
        logger.warning("No global translations were generated!")
    else:
        logger.info(f"Global contains {len(global_translations)} sections")

    # Generate cameras.json from CameraConfig schema
    cameras_file = output_dir / "cameras.json"
    logger.info(f"Generating cameras.json: {cameras_file}")
    try:
        if "camera_config_schema" in locals():
            camera_schema = camera_config_schema
        else:
            from frigate.config.camera.camera import CameraConfig

            camera_schema = CameraConfig.model_json_schema()

        camera_translations = extract_translations_from_schema(camera_schema)

        # Change descriptions to use 'for this camera' for fields that are global
        def sanitize_camera_descriptions(obj):
            if isinstance(obj, dict):
                for k, v in list(obj.items()):
                    if k == "description" and isinstance(v, str):
                        obj[k] = v.replace(
                            "for all cameras; can be overridden per-camera",
                            "for this camera",
                        )
                    else:
                        sanitize_camera_descriptions(v)
            elif isinstance(obj, list):
                for item in obj:
                    sanitize_camera_descriptions(item)

        sanitize_camera_descriptions(camera_translations)

        with open(cameras_file, "w", encoding="utf-8") as f:
            json.dump(camera_translations, f, indent=2, ensure_ascii=False)
            f.write("\n")
        logger.info(f"Generated cameras.json: {cameras_file}")
    except Exception as e:
        logger.error(f"Failed to generate cameras.json: {e}")

    logger.info("Translation generation complete!")


if __name__ == "__main__":
    main()
