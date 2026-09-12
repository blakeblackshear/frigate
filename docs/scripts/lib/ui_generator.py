"""Generate UI tab markdown content from parsed YAML blocks."""

from typing import Any

from .i18n_loader import get_field_description, get_field_label, get_value_label
from .nav_map import ALL_CONFIG_SECTIONS, detect_level, get_nav_path
from .schema_loader import is_boolean_field, is_object_field
from .section_config_parser import get_hidden_fields
from .yaml_extractor import YamlBlock, get_leaf_paths


def _format_value(
    value: object,
    field_schema: dict[str, Any] | None,
    i18n: dict[str, Any] | None = None,
) -> str:
    """Format a YAML value for UI display.

    Looks up i18n labels for enum/option values when available.
    """
    if field_schema and is_boolean_field(field_schema):
        return "on" if value else "off"
    if isinstance(value, bool):
        return "on" if value else "off"
    if isinstance(value, list):
        if len(value) == 0:
            return "an empty list"
        items = []
        for v in value:
            label = get_value_label(i18n, str(v)) if i18n else None
            items.append(f"`{label}`" if label else f"`{v}`")
        return ", ".join(items)
    if value is None:
        return "empty"

    # Try i18n label for the raw value (enum translations)
    if i18n and isinstance(value, str):
        label = get_value_label(i18n, value)
        if label:
            return f"`{label}`"

    return f"`{value}`"


def _build_field_label(
    i18n: dict[str, Any],
    section_key: str,
    field_path: list[str],
    level: str,
) -> str:
    """Build the display label for a field using i18n labels.

    For a path like ["continuous", "days"], produces
    "Continuous retention > Retention days" using the actual i18n labels.
    """
    parts: list[str] = []

    for depth in range(len(field_path)):
        sub_path = field_path[: depth + 1]
        label = get_field_label(i18n, section_key, sub_path, level)

        if label:
            parts.append(label)
        else:
            # Fallback to title-cased field name
            parts.append(field_path[depth].replace("_", " ").title())

    return " > ".join(parts)


def _is_hidden(
    field_key: str,
    full_path: list[str],
    hidden_fields: set[str],
) -> bool:
    """Check if a field should be hidden from UI output."""
    # Check exact match
    if field_key in hidden_fields:
        return True

    # Check dotted path match (e.g., "alerts.enabled_in_config")
    dotted = ".".join(str(p) for p in full_path)
    if dotted in hidden_fields:
        return True

    # Check wildcard patterns (e.g., "filters.*.mask")
    for pattern in hidden_fields:
        if "*" in pattern:
            parts = pattern.split(".")
            if len(parts) == len(full_path):
                match = all(
                    p == "*" or p == fp for p, fp in zip(parts, full_path)
                )
                if match:
                    return True

    return False


def generate_ui_content(
    block: YamlBlock,
    schema: dict[str, Any],
    i18n: dict[str, Any],
    section_configs: dict[str, dict[str, Any]],
) -> str | None:
    """Generate UI tab markdown content for a YAML block.

    Args:
        block: Parsed YAML block from a doc file
        schema: Full JSON schema
        i18n: Loaded i18n translations
        section_configs: Parsed section config data

    Returns:
        Generated markdown string for the UI tab, or None if the block
        can't be converted (not a config block, etc.)
    """
    if block.section_key is None:
        return None

    # Determine which config data to walk
    if block.is_camera_level:
        # Camera-level: unwrap cameras.{name}.{section}
        cam_data = block.parsed.get("cameras", {})
        cam_name = block.camera_name or next(iter(cam_data), None)
        if not cam_name:
            return None
        inner = cam_data.get(cam_name, {})
        if not isinstance(inner, dict):
            return None
        level = "camera"
    else:
        inner = block.parsed
        # Determine level from section key
        level = detect_level(block.section_key)

    # Collect sections to process (may span multiple top-level keys)
    sections_to_process: list[tuple[str, dict]] = []
    for key in inner:
        if key in ALL_CONFIG_SECTIONS or key == block.section_key:
            val = inner[key]
            if isinstance(val, dict):
                sections_to_process.append((key, val))
            else:
                # Simple scalar at section level (e.g., record.enabled = True)
                sections_to_process.append((key, {key: val}))

    # If inner is the section itself (e.g., parsed = {"record": {...}})
    if not sections_to_process and block.section_key in inner:
        section_data = inner[block.section_key]
        if isinstance(section_data, dict):
            sections_to_process = [(block.section_key, section_data)]

    if not sections_to_process:
        # Try treating the whole inner dict as the section data
        sections_to_process = [(block.section_key, inner)]

    # Choose pattern based on whether YAML has comments (descriptive) or values
    use_table = block.has_comments

    lines: list[str] = []
    step_num = 1

    for section_key, section_data in sections_to_process:
        # Get navigation path
        i18n_level = "cameras" if level == "camera" else "global"
        nav_path = get_nav_path(section_key, level)
        if nav_path is None:
            # Try global as fallback
            nav_path = get_nav_path(section_key, "global")
        if nav_path is None:
            continue

        # Get hidden fields for this section
        hidden = get_hidden_fields(section_configs, section_key, level)

        # Get leaf paths from the YAML data
        leaves = get_leaf_paths(section_data)

        # Filter out hidden fields
        visible_leaves: list[tuple[tuple[str, ...], object]] = []
        for path, value in leaves:
            path_list = list(path)
            if not _is_hidden(path_list[-1], path_list, hidden):
                visible_leaves.append((path, value))

        if not visible_leaves:
            continue

        if use_table:
            # Pattern A: Field table with descriptions
            lines.append(
                f'Navigate to <NavPath path="{nav_path}" />.'
            )
            lines.append("")
            lines.append("| Field | Description |")
            lines.append("|-------|-------------|")

            for path, _value in visible_leaves:
                path_list = list(path)
                label = _build_field_label(
                    i18n, section_key, path_list, i18n_level
                )
                desc = get_field_description(
                    i18n, section_key, path_list, i18n_level
                )
                if not desc:
                    desc = ""
                lines.append(f"| **{label}** | {desc} |")
        else:
            # Pattern B: Set instructions
            multi_section = len(sections_to_process) > 1

            if multi_section:
                camera_note = ""
                if block.is_camera_level:
                    camera_note = (
                        " and select your camera"
                    )
                lines.append(
                    f'{step_num}. Navigate to <NavPath path="{nav_path}" />{camera_note}.'
                )
            else:
                if block.is_camera_level:
                    lines.append(
                        f'1. Navigate to <NavPath path="{nav_path}" /> and select your camera.'
                    )
                else:
                    lines.append(
                        f'Navigate to <NavPath path="{nav_path}" />.'
                    )
                    lines.append("")

            from .schema_loader import get_field_info

            for path, value in visible_leaves:
                path_list = list(path)
                label = _build_field_label(
                    i18n, section_key, path_list, i18n_level
                )
                field_info = get_field_info(schema, section_key, path_list)
                formatted = _format_value(value, field_info, i18n)

                if multi_section or block.is_camera_level:
                    lines.append(f"   - Set **{label}** to {formatted}")
                else:
                    lines.append(f"- Set **{label}** to {formatted}")

            step_num += 1

    if not lines:
        return None

    return "\n".join(lines)


def wrap_with_config_tabs(ui_content: str, yaml_raw: str, highlight: str | None = None) -> str:
    """Wrap UI content and YAML in ConfigTabs markup.

    Args:
        ui_content: Generated UI tab markdown
        yaml_raw: Original YAML text
        highlight: Optional highlight spec (e.g., "{3-4}")

    Returns:
        Full ConfigTabs MDX block
    """
    highlight_str = f" {highlight}" if highlight else ""

    return f"""<ConfigTabs>
<TabItem value="ui">

{ui_content}

</TabItem>
<TabItem value="yaml">

```yaml{highlight_str}
{yaml_raw}
```

</TabItem>
</ConfigTabs>"""
