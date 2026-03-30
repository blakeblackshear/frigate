"""Load i18n translation files for Settings UI field labels."""

import json
from pathlib import Path
from typing import Any

# Base path for locale files
WEB_LOCALES = Path(__file__).resolve().parents[3] / "web" / "public" / "locales" / "en"


def load_i18n() -> dict[str, Any]:
    """Load and merge all relevant i18n files.

    Returns:
        Dict with keys: "global", "cameras", "settings_menu"
    """
    global_path = WEB_LOCALES / "config" / "global.json"
    cameras_path = WEB_LOCALES / "config" / "cameras.json"
    settings_path = WEB_LOCALES / "views" / "settings.json"

    result: dict[str, Any] = {}

    with open(global_path) as f:
        result["global"] = json.load(f)

    with open(cameras_path) as f:
        result["cameras"] = json.load(f)

    with open(settings_path) as f:
        settings = json.load(f)
        result["settings_menu"] = settings.get("menu", {})

    # Build a unified enum value → label lookup from all known sources.
    # Merges multiple maps so callers don't need to know which file
    # a particular enum lives in.
    value_labels: dict[str, str] = {}

    config_form = settings.get("configForm", {})

    # FFmpeg preset labels (preset-vaapi → "VAAPI (Intel/AMD GPU)")
    value_labels.update(
        config_form.get("ffmpegArgs", {}).get("presetLabels", {})
    )

    # Timestamp position (tl → "Top left")
    value_labels.update(settings.get("timestampPosition", {}))

    # Input role options (detect → "Detect")
    value_labels.update(
        config_form.get("inputRoles", {}).get("options", {})
    )

    # GenAI role options (vision → "Vision")
    value_labels.update(
        config_form.get("genaiRoles", {}).get("options", {})
    )

    result["value_labels"] = value_labels

    return result


def get_field_label(
    i18n: dict[str, Any],
    section_key: str,
    field_path: list[str],
    level: str = "global",
) -> str | None:
    """Look up the UI label for a field.

    Args:
        i18n: Loaded i18n data from load_i18n()
        section_key: Config section (e.g., "record")
        field_path: Path within section (e.g., ["continuous", "days"])
        level: "global" or "cameras"

    Returns:
        The label string, or None if not found.
    """
    source = i18n.get(level, {})
    node = source.get(section_key, {})

    for key in field_path:
        if not isinstance(node, dict):
            return None
        node = node.get(key, {})

    if isinstance(node, dict):
        return node.get("label")
    return None


def get_field_description(
    i18n: dict[str, Any],
    section_key: str,
    field_path: list[str],
    level: str = "global",
) -> str | None:
    """Look up the UI description for a field."""
    source = i18n.get(level, {})
    node = source.get(section_key, {})

    for key in field_path:
        if not isinstance(node, dict):
            return None
        node = node.get(key, {})

    if isinstance(node, dict):
        return node.get("description")
    return None


def get_value_label(
    i18n: dict[str, Any],
    value: str,
) -> str | None:
    """Look up the display label for an enum/option value.

    Args:
        i18n: Loaded i18n data from load_i18n()
        value: The raw config value (e.g., "preset-vaapi", "tl")

    Returns:
        The human-readable label (e.g., "VAAPI (Intel/AMD GPU)"), or None.
    """
    return i18n.get("value_labels", {}).get(value)


def get_section_label(
    i18n: dict[str, Any],
    section_key: str,
    level: str = "global",
) -> str | None:
    """Get the top-level label for a config section."""
    source = i18n.get(level, {})
    section = source.get(section_key, {})
    if isinstance(section, dict):
        return section.get("label")
    return None
