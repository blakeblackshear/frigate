"""Map config section keys to Settings UI navigation paths."""

# Derived from web/src/pages/Settings.tsx section mappings
# and web/public/locales/en/views/settings.json menu labels.
#
# Format: section_key -> (group_label, page_label)
# Navigation path: "Settings > {group_label} > {page_label}"

GLOBAL_NAV: dict[str, tuple[str, str]] = {
    "detect": ("Global configuration", "Object detection"),
    "ffmpeg": ("Global configuration", "FFmpeg"),
    "record": ("Global configuration", "Recording"),
    "snapshots": ("Global configuration", "Snapshots"),
    "motion": ("Global configuration", "Motion detection"),
    "objects": ("Global configuration", "Objects"),
    "review": ("Global configuration", "Review"),
    "audio": ("Global configuration", "Audio events"),
    "live": ("Global configuration", "Live playback"),
    "timestamp_style": ("Global configuration", "Timestamp style"),
    "notifications": ("Notifications", "Notifications"),
}

CAMERA_NAV: dict[str, tuple[str, str]] = {
    "detect": ("Camera configuration", "Object detection"),
    "ffmpeg": ("Camera configuration", "FFmpeg"),
    "record": ("Camera configuration", "Recording"),
    "snapshots": ("Camera configuration", "Snapshots"),
    "motion": ("Camera configuration", "Motion detection"),
    "objects": ("Camera configuration", "Objects"),
    "review": ("Camera configuration", "Review"),
    "audio": ("Camera configuration", "Audio events"),
    "audio_transcription": ("Camera configuration", "Audio transcription"),
    "notifications": ("Camera configuration", "Notifications"),
    "live": ("Camera configuration", "Live playback"),
    "birdseye": ("Camera configuration", "Birdseye"),
    "face_recognition": ("Camera configuration", "Face recognition"),
    "lpr": ("Camera configuration", "License plate recognition"),
    "mqtt": ("Camera configuration", "MQTT"),
    "onvif": ("Camera configuration", "ONVIF"),
    "ui": ("Camera configuration", "Camera UI"),
    "timestamp_style": ("Camera configuration", "Timestamp style"),
}

ENRICHMENT_NAV: dict[str, tuple[str, str]] = {
    "semantic_search": ("Enrichments", "Semantic search"),
    "genai": ("Enrichments", "Generative AI"),
    "face_recognition": ("Enrichments", "Face recognition"),
    "lpr": ("Enrichments", "License plate recognition"),
    "classification": ("Enrichments", "Object classification"),
    "audio_transcription": ("Enrichments", "Audio transcription"),
}

SYSTEM_NAV: dict[str, tuple[str, str]] = {
    "go2rtc_streams": ("System", "go2rtc streams"),
    "database": ("System", "Database"),
    "mqtt": ("System", "MQTT"),
    "tls": ("System", "TLS"),
    "auth": ("System", "Authentication"),
    "networking": ("System", "Networking"),
    "proxy": ("System", "Proxy"),
    "ui": ("System", "UI"),
    "logger": ("System", "Logging"),
    "environment_vars": ("System", "Environment variables"),
    "telemetry": ("System", "Telemetry"),
    "birdseye": ("System", "Birdseye"),
    "detectors": ("System", "Detector hardware"),
    "model": ("System", "Detection model"),
}

# All known top-level config section keys
ALL_CONFIG_SECTIONS = (
    set(GLOBAL_NAV)
    | set(CAMERA_NAV)
    | set(ENRICHMENT_NAV)
    | set(SYSTEM_NAV)
    | {"cameras"}
)


def get_nav_path(section_key: str, level: str = "global") -> str | None:
    """Get the full navigation path for a config section.

    Args:
        section_key: Config section key (e.g., "record")
        level: "global", "camera", "enrichment", or "system"

    Returns:
        NavPath string like "Settings > Global configuration > Recording",
        or None if not found.
    """
    nav_tables = {
        "global": GLOBAL_NAV,
        "camera": CAMERA_NAV,
        "enrichment": ENRICHMENT_NAV,
        "system": SYSTEM_NAV,
    }

    table = nav_tables.get(level)
    if table is None:
        return None

    entry = table.get(section_key)
    if entry is None:
        return None

    group, page = entry
    return f"Settings > {group} > {page}"


def detect_level(section_key: str) -> str:
    """Detect whether a config section is global, camera, enrichment, or system."""
    if section_key in SYSTEM_NAV:
        return "system"
    if section_key in ENRICHMENT_NAV:
        return "enrichment"
    if section_key in GLOBAL_NAV:
        return "global"
    if section_key in CAMERA_NAV:
        return "camera"
    return "global"
