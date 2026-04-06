#!/usr/bin/env python3
"""Generate a complete FrigateConfig snapshot for E2E tests.

Run from the repo root:
    python3 web/e2e/fixtures/mock-data/generate-config-snapshot.py

This generates config-snapshot.json with all fields from the Python backend,
plus runtime-computed fields that the API adds but aren't in the Pydantic model.
"""

import json
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

from frigate.config import FrigateConfig  # noqa: E402

# Minimal config with 3 test cameras and camera groups
MINIMAL_CONFIG = {
    "mqtt": {"host": "mqtt"},
    "cameras": {
        "front_door": {
            "ffmpeg": {
                "inputs": [
                    {"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}
                ]
            },
            "detect": {"height": 720, "width": 1280, "fps": 5},
        },
        "backyard": {
            "ffmpeg": {
                "inputs": [
                    {"path": "rtsp://10.0.0.2:554/video", "roles": ["detect"]}
                ]
            },
            "detect": {"height": 720, "width": 1280, "fps": 5},
        },
        "garage": {
            "ffmpeg": {
                "inputs": [
                    {"path": "rtsp://10.0.0.3:554/video", "roles": ["detect"]}
                ]
            },
            "detect": {"height": 720, "width": 1280, "fps": 5},
        },
    },
    "camera_groups": {
        "default": {
            "cameras": ["front_door", "backyard", "garage"],
            "icon": "generic",
            "order": 0,
        },
        "outdoor": {
            "cameras": ["front_door", "backyard"],
            "icon": "generic",
            "order": 1,
        },
    },
}


def generate():
    config = FrigateConfig.model_validate_json(json.dumps(MINIMAL_CONFIG))

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        snapshot = config.model_dump()

    # Add runtime-computed fields that the API serves but aren't in the
    # Pydantic model dump. These are computed by the backend when handling
    # GET /api/config requests.

    # model.all_attributes: flattened list of all attribute labels from attributes_map
    all_attrs = set()
    for attrs in snapshot.get("model", {}).get("attributes_map", {}).values():
        all_attrs.update(attrs)
    snapshot["model"]["all_attributes"] = sorted(all_attrs)

    # model.colormap: empty by default (populated at runtime from model output)
    snapshot["model"]["colormap"] = {}

    # Convert to JSON-serializable format (handles datetime, Path, etc.)
    output = json.dumps(snapshot, default=str)

    # Write to config-snapshot.json in the same directory as this script
    output_path = Path(__file__).parent / "config-snapshot.json"
    output_path.write_text(output)
    print(f"Generated {output_path} ({len(output)} bytes)")


if __name__ == "__main__":
    generate()
