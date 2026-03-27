"""Parse TypeScript section config files for hidden/advanced field info."""

import json
import re
from pathlib import Path
from typing import Any

SECTION_CONFIGS_DIR = (
    Path(__file__).resolve().parents[3]
    / "web"
    / "src"
    / "components"
    / "config-form"
    / "section-configs"
)


def _extract_string_array(text: str, field_name: str) -> list[str]:
    """Extract a string array value from TypeScript object literal text."""
    pattern = rf"{field_name}\s*:\s*\[(.*?)\]"
    match = re.search(pattern, text, re.DOTALL)
    if not match:
        return []
    content = match.group(1)
    return re.findall(r'"([^"]*)"', content)


def _parse_section_file(filepath: Path) -> dict[str, Any]:
    """Parse a single section config .ts file."""
    text = filepath.read_text()

    # Extract base block
    base_match = re.search(r"base\s*:\s*\{(.*?)\n  \}", text, re.DOTALL)
    base_text = base_match.group(1) if base_match else ""

    # Extract global block
    global_match = re.search(r"global\s*:\s*\{(.*?)\n  \}", text, re.DOTALL)
    global_text = global_match.group(1) if global_match else ""

    # Extract camera block
    camera_match = re.search(r"camera\s*:\s*\{(.*?)\n  \}", text, re.DOTALL)
    camera_text = camera_match.group(1) if camera_match else ""

    result: dict[str, Any] = {
        "fieldOrder": _extract_string_array(base_text, "fieldOrder"),
        "hiddenFields": _extract_string_array(base_text, "hiddenFields"),
        "advancedFields": _extract_string_array(base_text, "advancedFields"),
    }

    # Merge global-level hidden fields
    global_hidden = _extract_string_array(global_text, "hiddenFields")
    if global_hidden:
        result["globalHiddenFields"] = global_hidden

    # Merge camera-level hidden fields
    camera_hidden = _extract_string_array(camera_text, "hiddenFields")
    if camera_hidden:
        result["cameraHiddenFields"] = camera_hidden

    return result


def load_section_configs() -> dict[str, dict[str, Any]]:
    """Load all section configs from TypeScript files.

    Returns:
        Dict mapping section name to parsed config.
    """
    # Read sectionConfigs.ts to get the mapping of section keys to filenames
    registry_path = SECTION_CONFIGS_DIR.parent / "sectionConfigs.ts"
    registry_text = registry_path.read_text()

    configs: dict[str, dict[str, Any]] = {}

    for ts_file in SECTION_CONFIGS_DIR.glob("*.ts"):
        if ts_file.name == "types.ts":
            continue

        section_name = ts_file.stem
        configs[section_name] = _parse_section_file(ts_file)

    # Map section config keys from the registry (handles renames like
    # "timestamp_style: timestampStyle")
    key_map: dict[str, str] = {}
    for match in re.finditer(
        r"(\w+)(?:\s*:\s*\w+)?\s*,", registry_text[registry_text.find("{") :]
    ):
        key = match.group(1)
        key_map[key] = key

    # Handle explicit key mappings like `timestamp_style: timestampStyle`
    for match in re.finditer(r"(\w+)\s*:\s*(\w+)\s*,", registry_text):
        key_map[match.group(1)] = match.group(2)

    return configs


def get_hidden_fields(
    configs: dict[str, dict[str, Any]],
    section_key: str,
    level: str = "global",
) -> set[str]:
    """Get the set of hidden fields for a section at a given level.

    Args:
        configs: Loaded section configs
        section_key: Config section name (e.g., "record")
        level: "global" or "camera"

    Returns:
        Set of hidden field paths (e.g., {"enabled_in_config", "sync_recordings"})
    """
    config = configs.get(section_key, {})
    hidden = set(config.get("hiddenFields", []))

    if level == "global":
        hidden.update(config.get("globalHiddenFields", []))
    elif level == "camera":
        hidden.update(config.get("cameraHiddenFields", []))

    return hidden


def get_advanced_fields(
    configs: dict[str, dict[str, Any]],
    section_key: str,
) -> set[str]:
    """Get the set of advanced fields for a section."""
    config = configs.get(section_key, {})
    return set(config.get("advancedFields", []))
