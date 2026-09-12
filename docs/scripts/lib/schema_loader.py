"""Load JSON schema from Frigate's Pydantic config models."""

from typing import Any


def load_schema() -> dict[str, Any]:
    """Generate and return the full JSON schema for FrigateConfig."""
    from frigate.config.config import FrigateConfig
    from frigate.util.schema import get_config_schema

    return get_config_schema(FrigateConfig)


def resolve_ref(schema: dict[str, Any], ref: str) -> dict[str, Any]:
    """Resolve a $ref pointer within the schema."""
    # ref format: "#/$defs/RecordConfig"
    parts = ref.lstrip("#/").split("/")
    node = schema
    for part in parts:
        node = node[part]
    return node


def resolve_schema_node(
    schema: dict[str, Any], node: dict[str, Any]
) -> dict[str, Any]:
    """Resolve a schema node, following $ref and allOf if present."""
    if "$ref" in node:
        node = resolve_ref(schema, node["$ref"])
    if "allOf" in node:
        merged: dict[str, Any] = {}
        for item in node["allOf"]:
            resolved = resolve_schema_node(schema, item)
            merged.update(resolved)
        return merged
    return node


def get_section_schema(
    schema: dict[str, Any], section_key: str
) -> dict[str, Any] | None:
    """Get the resolved schema for a top-level config section."""
    props = schema.get("properties", {})
    if section_key not in props:
        return None
    return resolve_schema_node(schema, props[section_key])


def get_field_info(
    schema: dict[str, Any], section_key: str, field_path: list[str]
) -> dict[str, Any] | None:
    """Get schema info for a specific field path within a section.

    Args:
        schema: Full JSON schema
        section_key: Top-level section (e.g., "record")
        field_path: List of nested keys (e.g., ["continuous", "days"])

    Returns:
        Resolved schema node for the field, or None if not found.
    """
    section = get_section_schema(schema, section_key)
    if section is None:
        return None

    node = section
    for key in field_path:
        props = node.get("properties", {})
        if key not in props:
            return None
        node = resolve_schema_node(schema, props[key])

    return node


def is_boolean_field(field_schema: dict[str, Any]) -> bool:
    """Check if a schema node represents a boolean field."""
    return field_schema.get("type") == "boolean"


def is_enum_field(field_schema: dict[str, Any]) -> bool:
    """Check if a schema node is an enum."""
    return "enum" in field_schema


def is_object_field(field_schema: dict[str, Any]) -> bool:
    """Check if a schema node is an object with properties."""
    return field_schema.get("type") == "object" or "properties" in field_schema
