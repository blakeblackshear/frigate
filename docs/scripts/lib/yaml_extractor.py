"""Extract YAML code blocks from markdown documentation files."""

import re
from dataclasses import dataclass, field

import yaml


@dataclass
class YamlBlock:
    """A YAML code block extracted from a markdown file."""

    raw: str  # Original YAML text
    parsed: dict  # Parsed YAML content
    line_start: int  # Line number in the markdown file (1-based)
    line_end: int  # End line number
    highlight: str | None = None  # Highlight spec (e.g., "{3-4}")
    has_comments: bool = False  # Whether the YAML has inline comments
    inside_config_tabs: bool = False  # Already wrapped in ConfigTabs
    section_key: str | None = None  # Detected top-level config section
    is_camera_level: bool = False  # Whether this is camera-level config
    camera_name: str | None = None  # Camera name if camera-level
    config_keys: list[str] = field(
        default_factory=list
    )  # Top-level keys in the YAML


def extract_yaml_blocks(content: str) -> list[YamlBlock]:
    """Extract all YAML fenced code blocks from markdown content.

    Args:
        content: Markdown file content

    Returns:
        List of YamlBlock instances
    """
    blocks: list[YamlBlock] = []
    lines = content.split("\n")
    i = 0
    in_config_tabs = False

    while i < len(lines):
        line = lines[i]

        # Track ConfigTabs context
        if "<ConfigTabs>" in line:
            in_config_tabs = True
        elif "</ConfigTabs>" in line:
            in_config_tabs = False

        # Look for YAML fence opening
        fence_match = re.match(r"^```yaml\s*(\{[^}]*\})?\s*$", line)
        if fence_match:
            highlight = fence_match.group(1)
            start_line = i + 1  # 1-based
            yaml_lines: list[str] = []
            i += 1

            # Collect until closing fence
            while i < len(lines) and not lines[i].startswith("```"):
                yaml_lines.append(lines[i])
                i += 1

            end_line = i + 1  # 1-based, inclusive of closing fence
            raw = "\n".join(yaml_lines)

            # Check for inline comments
            has_comments = any(
                re.search(r"#\s*(<-|[A-Za-z])", yl) for yl in yaml_lines
            )

            # Parse YAML
            try:
                parsed = yaml.safe_load(raw)
            except yaml.YAMLError:
                i += 1
                continue

            if not isinstance(parsed, dict):
                i += 1
                continue

            # Detect config section and level
            config_keys = list(parsed.keys())
            section_key = None
            is_camera = False
            camera_name = None

            if "cameras" in parsed and isinstance(parsed["cameras"], dict):
                is_camera = True
                cam_entries = parsed["cameras"]
                if len(cam_entries) == 1:
                    camera_name = list(cam_entries.keys())[0]
                    inner = cam_entries[camera_name]
                    if isinstance(inner, dict):
                        inner_keys = list(inner.keys())
                        if len(inner_keys) >= 1:
                            section_key = inner_keys[0]
            elif len(config_keys) >= 1:
                section_key = config_keys[0]

            blocks.append(
                YamlBlock(
                    raw=raw,
                    parsed=parsed,
                    line_start=start_line,
                    line_end=end_line,
                    highlight=highlight,
                    has_comments=has_comments,
                    inside_config_tabs=in_config_tabs,
                    section_key=section_key,
                    is_camera_level=is_camera,
                    camera_name=camera_name,
                    config_keys=config_keys,
                )
            )

        i += 1

    return blocks


@dataclass
class ConfigTabsBlock:
    """An existing ConfigTabs block in a markdown file."""

    line_start: int  # 1-based line of <ConfigTabs>
    line_end: int  # 1-based line of </ConfigTabs>
    ui_content: str  # Content inside the UI TabItem
    yaml_block: YamlBlock  # The YAML block inside the YAML TabItem
    raw_text: str  # Full raw text of the ConfigTabs block


def extract_config_tabs_blocks(content: str) -> list[ConfigTabsBlock]:
    """Extract existing ConfigTabs blocks from markdown content.

    Parses the structure:
        <ConfigTabs>
        <TabItem value="ui">
        ...ui content...
        </TabItem>
        <TabItem value="yaml">
        ```yaml
        ...yaml...
        ```
        </TabItem>
        </ConfigTabs>

    Returns:
        List of ConfigTabsBlock instances
    """
    blocks: list[ConfigTabsBlock] = []
    lines = content.split("\n")
    i = 0

    while i < len(lines):
        if "<ConfigTabs>" not in lines[i]:
            i += 1
            continue

        block_start = i  # 0-based

        # Find </ConfigTabs>
        j = i + 1
        while j < len(lines) and "</ConfigTabs>" not in lines[j]:
            j += 1

        if j >= len(lines):
            i += 1
            continue

        block_end = j  # 0-based, line with </ConfigTabs>
        block_text = "\n".join(lines[block_start : block_end + 1])

        # Extract UI content (between <TabItem value="ui"> and </TabItem>)
        ui_match = re.search(
            r'<TabItem\s+value="ui">\s*\n(.*?)\n\s*</TabItem>',
            block_text,
            re.DOTALL,
        )
        ui_content = ui_match.group(1).strip() if ui_match else ""

        # Extract YAML block from inside the yaml TabItem
        yaml_tab_match = re.search(
            r'<TabItem\s+value="yaml">\s*\n(.*?)\n\s*</TabItem>',
            block_text,
            re.DOTALL,
        )

        yaml_block = None
        if yaml_tab_match:
            yaml_tab_text = yaml_tab_match.group(1)
            fence_match = re.search(
                r"```yaml\s*(\{[^}]*\})?\s*\n(.*?)\n```",
                yaml_tab_text,
                re.DOTALL,
            )
            if fence_match:
                highlight = fence_match.group(1)
                yaml_raw = fence_match.group(2)
                has_comments = bool(
                    re.search(r"#\s*(<-|[A-Za-z])", yaml_raw)
                )

                try:
                    parsed = yaml.safe_load(yaml_raw)
                except yaml.YAMLError:
                    parsed = {}

                if isinstance(parsed, dict):
                    config_keys = list(parsed.keys())
                    section_key = None
                    is_camera = False
                    camera_name = None

                    if "cameras" in parsed and isinstance(
                        parsed["cameras"], dict
                    ):
                        is_camera = True
                        cam_entries = parsed["cameras"]
                        if len(cam_entries) == 1:
                            camera_name = list(cam_entries.keys())[0]
                            inner = cam_entries[camera_name]
                            if isinstance(inner, dict):
                                inner_keys = list(inner.keys())
                                if len(inner_keys) >= 1:
                                    section_key = inner_keys[0]
                    elif len(config_keys) >= 1:
                        section_key = config_keys[0]

                    yaml_block = YamlBlock(
                        raw=yaml_raw,
                        parsed=parsed,
                        line_start=block_start + 1,
                        line_end=block_end + 1,
                        highlight=highlight,
                        has_comments=has_comments,
                        inside_config_tabs=True,
                        section_key=section_key,
                        is_camera_level=is_camera,
                        camera_name=camera_name,
                        config_keys=config_keys,
                    )

        if yaml_block:
            blocks.append(
                ConfigTabsBlock(
                    line_start=block_start + 1,  # 1-based
                    line_end=block_end + 1,  # 1-based
                    ui_content=ui_content,
                    yaml_block=yaml_block,
                    raw_text=block_text,
                )
            )

        i = j + 1

    return blocks


def get_leaf_paths(
    data: dict, prefix: tuple[str, ...] = ()
) -> list[tuple[tuple[str, ...], object]]:
    """Walk a parsed YAML dict and return all leaf key paths with values.

    Args:
        data: Parsed YAML dict
        prefix: Current key path prefix

    Returns:
        List of (key_path_tuple, value) pairs.
        e.g., [( ("record", "continuous", "days"), 3 ), ...]
    """
    results: list[tuple[tuple[str, ...], object]] = []

    for key, value in data.items():
        path = prefix + (str(key),)
        if isinstance(value, dict):
            results.extend(get_leaf_paths(value, path))
        else:
            results.append((path, value))

    return results
