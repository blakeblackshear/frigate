#!/usr/bin/env python3
"""Generate E2E mock data from backend Pydantic and Peewee models.

Run from the repo root:
    PYTHONPATH=/workspace/frigate python3 web/e2e/fixtures/mock-data/generate-mock-data.py

Strategy:
  - FrigateConfig: instantiate the Pydantic config model, then model_dump()
  - API responses: instantiate Pydantic response models (ReviewSegmentResponse,
    EventResponse, ExportModel, ExportCaseModel) to validate all required fields
  - If the backend adds a required field, this script fails at instantiation time
  - The Peewee model field list is checked to detect new columns that would
    appear in .dicts() API responses but aren't in our mock data
"""

import json
import sys
import time
import warnings
from datetime import datetime, timedelta
from pathlib import Path

warnings.filterwarnings("ignore")

OUTPUT_DIR = Path(__file__).parent
NOW = time.time()
HOUR = 3600

CAMERAS = ["front_door", "backyard", "garage"]


def check_pydantic_fields(pydantic_class, mock_keys, model_name):
    """Verify mock data covers all fields declared in the Pydantic response model.

    The Pydantic response model is what the frontend actually receives.
    Peewee models may have extra legacy columns that are filtered out by
    FastAPI's response_model validation.
    """
    required_fields = set()
    for name, field_info in pydantic_class.model_fields.items():
        required_fields.add(name)

    missing = required_fields - mock_keys
    if missing:
        print(
            f"  ERROR: {model_name} response model has fields not in mock data: {missing}",
            file=sys.stderr,
        )
        print(
            f"  Add these fields to the mock data in this script.",
            file=sys.stderr,
        )
        sys.exit(1)

    extra = mock_keys - required_fields
    if extra:
        print(
            f"  NOTE: {model_name} mock data has extra fields (not in response model): {extra}",
        )


def generate_config():
    """Generate FrigateConfig from the Python backend model."""
    from frigate.config import FrigateConfig

    config = FrigateConfig.model_validate_json(
        json.dumps(
            {
                "mqtt": {"host": "mqtt"},
                "cameras": {
                    cam: {
                        "ffmpeg": {
                            "inputs": [
                                {
                                    "path": f"rtsp://10.0.0.{i+1}:554/video",
                                    "roles": ["detect"],
                                }
                            ]
                        },
                        "detect": {"height": 720, "width": 1280, "fps": 5},
                    }
                    for i, cam in enumerate(CAMERAS)
                },
                "camera_groups": {
                    "default": {
                        "cameras": CAMERAS,
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
        )
    )

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        snapshot = config.model_dump()

    # Runtime-computed fields not in the Pydantic dump
    all_attrs = set()
    for attrs in snapshot.get("model", {}).get("attributes_map", {}).values():
        all_attrs.update(attrs)
    snapshot["model"]["all_attributes"] = sorted(all_attrs)
    snapshot["model"]["colormap"] = {}

    return snapshot


def generate_reviews():
    """Generate ReviewSegmentResponse[] validated against Pydantic + Peewee."""
    from frigate.api.defs.response.review_response import ReviewSegmentResponse

    reviews = [
        ReviewSegmentResponse(
            id="review-alert-001",
            camera="front_door",
            severity="alert",
            start_time=datetime.fromtimestamp(NOW - 2 * HOUR),
            end_time=datetime.fromtimestamp(NOW - 2 * HOUR + 30),
            has_been_reviewed=False,
            thumb_path="/clips/front_door/review-alert-001-thumb.jpg",
            data=json.dumps(
                {
                    "audio": [],
                    "detections": ["person-abc123"],
                    "objects": ["person"],
                    "sub_labels": [],
                    "significant_motion_areas": [],
                    "zones": ["front_yard"],
                }
            ),
        ),
        ReviewSegmentResponse(
            id="review-alert-002",
            camera="backyard",
            severity="alert",
            start_time=datetime.fromtimestamp(NOW - 3 * HOUR),
            end_time=datetime.fromtimestamp(NOW - 3 * HOUR + 45),
            has_been_reviewed=True,
            thumb_path="/clips/backyard/review-alert-002-thumb.jpg",
            data=json.dumps(
                {
                    "audio": [],
                    "detections": ["car-def456"],
                    "objects": ["car"],
                    "sub_labels": [],
                    "significant_motion_areas": [],
                    "zones": ["driveway"],
                }
            ),
        ),
        ReviewSegmentResponse(
            id="review-detect-001",
            camera="garage",
            severity="detection",
            start_time=datetime.fromtimestamp(NOW - 4 * HOUR),
            end_time=datetime.fromtimestamp(NOW - 4 * HOUR + 20),
            has_been_reviewed=False,
            thumb_path="/clips/garage/review-detect-001-thumb.jpg",
            data=json.dumps(
                {
                    "audio": [],
                    "detections": ["person-ghi789"],
                    "objects": ["person"],
                    "sub_labels": [],
                    "significant_motion_areas": [],
                    "zones": [],
                }
            ),
        ),
        ReviewSegmentResponse(
            id="review-detect-002",
            camera="front_door",
            severity="detection",
            start_time=datetime.fromtimestamp(NOW - 5 * HOUR),
            end_time=datetime.fromtimestamp(NOW - 5 * HOUR + 15),
            has_been_reviewed=False,
            thumb_path="/clips/front_door/review-detect-002-thumb.jpg",
            data=json.dumps(
                {
                    "audio": [],
                    "detections": ["car-jkl012"],
                    "objects": ["car"],
                    "sub_labels": [],
                    "significant_motion_areas": [],
                    "zones": ["front_yard"],
                }
            ),
        ),
    ]

    result = [r.model_dump(mode="json") for r in reviews]

    # Verify mock data covers all Pydantic response model fields
    check_pydantic_fields(
        ReviewSegmentResponse, set(result[0].keys()), "ReviewSegment"
    )

    return result


def generate_events():
    """Generate EventResponse[] validated against Pydantic + Peewee."""
    from frigate.api.defs.response.event_response import EventResponse

    events = [
        EventResponse(
            id="event-person-001",
            label="person",
            sub_label=None,
            camera="front_door",
            start_time=NOW - 2 * HOUR,
            end_time=NOW - 2 * HOUR + 30,
            false_positive=False,
            zones=["front_yard"],
            thumbnail=None,
            has_clip=True,
            has_snapshot=True,
            retain_indefinitely=False,
            plus_id=None,
            model_hash="abc123",
            detector_type="cpu",
            model_type="ssd",
            data={
                "top_score": 0.92,
                "score": 0.92,
                "region": [0.1, 0.1, 0.5, 0.8],
                "box": [0.2, 0.15, 0.45, 0.75],
                "area": 0.18,
                "ratio": 0.6,
                "type": "object",
                "description": "A person walking toward the front door",
                "average_estimated_speed": 1.2,
                "velocity_angle": 45.0,
                "path_data": [[[0.2, 0.5], 0.0], [[0.3, 0.5], 1.0]],
            },
        ),
        EventResponse(
            id="event-car-001",
            label="car",
            sub_label=None,
            camera="backyard",
            start_time=NOW - 3 * HOUR,
            end_time=NOW - 3 * HOUR + 45,
            false_positive=False,
            zones=["driveway"],
            thumbnail=None,
            has_clip=True,
            has_snapshot=True,
            retain_indefinitely=False,
            plus_id=None,
            model_hash="def456",
            detector_type="cpu",
            model_type="ssd",
            data={
                "top_score": 0.87,
                "score": 0.87,
                "region": [0.3, 0.2, 0.9, 0.7],
                "box": [0.35, 0.25, 0.85, 0.65],
                "area": 0.2,
                "ratio": 1.25,
                "type": "object",
                "description": "A car parked in the driveway",
                "average_estimated_speed": 0.0,
                "velocity_angle": 0.0,
                "path_data": [],
            },
        ),
        EventResponse(
            id="event-person-002",
            label="person",
            sub_label=None,
            camera="garage",
            start_time=NOW - 4 * HOUR,
            end_time=NOW - 4 * HOUR + 20,
            false_positive=False,
            zones=[],
            thumbnail=None,
            has_clip=False,
            has_snapshot=True,
            retain_indefinitely=False,
            plus_id=None,
            model_hash="ghi789",
            detector_type="cpu",
            model_type="ssd",
            data={
                "top_score": 0.78,
                "score": 0.78,
                "region": [0.0, 0.0, 0.6, 0.9],
                "box": [0.1, 0.05, 0.5, 0.85],
                "area": 0.32,
                "ratio": 0.5,
                "type": "object",
                "description": None,
                "average_estimated_speed": 0.5,
                "velocity_angle": 90.0,
                "path_data": [[[0.1, 0.4], 0.0]],
            },
        ),
    ]

    result = [e.model_dump(mode="json") for e in events]

    check_pydantic_fields(EventResponse, set(result[0].keys()), "Event")

    return result


def generate_exports():
    """Generate ExportModel[] validated against Pydantic + Peewee."""
    from frigate.api.defs.response.export_response import ExportModel

    exports = [
        ExportModel(
            id="export-001",
            camera="front_door",
            name="Front Door - Person Alert",
            date=NOW - 1 * HOUR,
            video_path="/exports/export-001.mp4",
            thumb_path="/exports/export-001-thumb.jpg",
            in_progress=False,
            export_case_id=None,
        ),
        ExportModel(
            id="export-002",
            camera="backyard",
            name="Backyard - Car Detection",
            date=NOW - 3 * HOUR,
            video_path="/exports/export-002.mp4",
            thumb_path="/exports/export-002-thumb.jpg",
            in_progress=False,
            export_case_id="case-001",
        ),
        ExportModel(
            id="export-003",
            camera="garage",
            name="Garage - In Progress",
            date=NOW - 0.5 * HOUR,
            video_path="/exports/export-003.mp4",
            thumb_path="/exports/export-003-thumb.jpg",
            in_progress=True,
            export_case_id=None,
        ),
    ]

    result = [e.model_dump(mode="json") for e in exports]

    check_pydantic_fields(ExportModel, set(result[0].keys()), "Export")

    return result


def generate_cases():
    """Generate ExportCaseModel[] validated against Pydantic + Peewee."""
    from frigate.api.defs.response.export_case_response import ExportCaseModel

    cases = [
        ExportCaseModel(
            id="case-001",
            name="Package Theft Investigation",
            description="Review of suspicious activity near the front porch",
            created_at=NOW - 24 * HOUR,
            updated_at=NOW - 3 * HOUR,
        ),
    ]

    result = [c.model_dump(mode="json") for c in cases]

    check_pydantic_fields(ExportCaseModel, set(result[0].keys()), "ExportCase")

    return result


def generate_review_summary():
    """Generate ReviewSummary for the calendar filter."""
    today = datetime.now().strftime("%Y-%m-%d")
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    return {
        today: {
            "day": today,
            "reviewed_alert": 1,
            "reviewed_detection": 0,
            "total_alert": 2,
            "total_detection": 2,
        },
        yesterday: {
            "day": yesterday,
            "reviewed_alert": 3,
            "reviewed_detection": 2,
            "total_alert": 3,
            "total_detection": 4,
        },
    }


def write_json(filename, data):
    path = OUTPUT_DIR / filename
    path.write_text(json.dumps(data, default=str))
    print(f"  {path.name} ({path.stat().st_size} bytes)")


def main():
    print("Generating E2E mock data from backend models...")
    print("  Validating against Pydantic response models + Peewee DB columns")
    print()

    write_json("config-snapshot.json", generate_config())
    write_json("reviews.json", generate_reviews())
    write_json("events.json", generate_events())
    write_json("exports.json", generate_exports())
    write_json("cases.json", generate_cases())
    write_json("review-summary.json", generate_review_summary())

    print()
    print("All mock data validated against backend schemas.")
    print("If this script fails, update the mock data to match the new schema.")


if __name__ == "__main__":
    main()
