"""Unit tests for `frigate.api.media_auth`.

Covers URI classification, the role-vs-camera decision matrix, and the export
DB-lookup path. These are pure functions/DB lookups — no HTTP stack involved.
"""

import datetime
import logging
import os
import unittest

from peewee_migrate import Router
from playhouse.sqlite_ext import SqliteExtDatabase
from playhouse.sqliteq import SqliteQueueDatabase

from frigate.api.media_auth import (
    MediaAuthResolution,
    deny_response_for_media_uri,
    extract_path,
    resolve_media_uri,
)
from frigate.config import FrigateConfig
from frigate.models import Event, Export, Recordings, ReviewSegment
from frigate.test.const import TEST_DB, TEST_DB_CLEANUPS

_CONFIG = {
    "mqtt": {"host": "mqtt"},
    "auth": {"roles": {"limited_user": ["front_door"]}},
    "cameras": {
        "front_door": {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}]
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
        },
        "back_door": {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.2:554/video", "roles": ["detect"]}]
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
        },
        # Camera name with a hyphen — exercises longest-prefix match.
        "back-yard": {
            "ffmpeg": {
                "inputs": [{"path": "rtsp://10.0.0.3:554/video", "roles": ["detect"]}]
            },
            "detect": {"height": 1080, "width": 1920, "fps": 5},
        },
    },
}


class TestExtractPath(unittest.TestCase):
    def test_full_url(self):
        self.assertEqual(
            extract_path("http://host:8971/clips/front_door-1.jpg"),
            "/clips/front_door-1.jpg",
        )

    def test_strips_query_string(self):
        self.assertEqual(
            extract_path("http://h/recordings/2026-05-11/14/front_door/00.00.mp4?t=1"),
            "/recordings/2026-05-11/14/front_door/00.00.mp4",
        )

    def test_path_only(self):
        self.assertEqual(extract_path("/exports/x.mp4"), "/exports/x.mp4")

    def test_percent_decoded(self):
        self.assertEqual(
            extract_path("http://h/clips/front%20door-1.jpg"),
            "/clips/front door-1.jpg",
        )

    def test_empty(self):
        self.assertIsNone(extract_path(None))
        self.assertIsNone(extract_path(""))


class TestResolveMediaUri(unittest.TestCase):
    def setUp(self):
        self.config = FrigateConfig(**_CONFIG)

    def _assert(self, uri, resolution, camera=None):
        got_resolution, got_camera = resolve_media_uri(uri, self.config)
        self.assertEqual(got_resolution, resolution, uri)
        self.assertEqual(got_camera, camera, uri)

    def test_unknown_paths(self):
        self._assert("/api/events", MediaAuthResolution.UNKNOWN)
        self._assert("/", MediaAuthResolution.UNKNOWN)
        self._assert("", MediaAuthResolution.UNKNOWN)

    def test_recordings(self):
        self._assert("/recordings/", MediaAuthResolution.LISTING_NEUTRAL)
        self._assert("/recordings/2026-05-11/", MediaAuthResolution.LISTING_NEUTRAL)
        self._assert(
            "/recordings/2026-05-11/14/", MediaAuthResolution.LISTING_MULTI_CAMERA
        )
        self._assert(
            "/recordings/2026-05-11/14/front_door/",
            MediaAuthResolution.CAMERA,
            camera="front_door",
        )
        self._assert(
            "/recordings/2026-05-11/14/back_door/00.00.mp4",
            MediaAuthResolution.CAMERA,
            camera="back_door",
        )

    def test_clip_flat_filename_resolves_camera(self):
        self._assert(
            "/clips/front_door-1234.jpg",
            MediaAuthResolution.CAMERA,
            camera="front_door",
        )
        self._assert(
            "/clips/back_door-1234-clean.webp",
            MediaAuthResolution.CAMERA,
            camera="back_door",
        )

    def test_clip_filename_with_hyphenated_camera_name(self):
        # Camera name "back-yard" itself contains a hyphen; longest-prefix
        # match must pick `back-yard`, not the bogus `back` prefix.
        self._assert(
            "/clips/back-yard-1234.jpg",
            MediaAuthResolution.CAMERA,
            camera="back-yard",
        )

    def test_clip_filename_no_matching_camera(self):
        self._assert(
            "/clips/nonexistent-1234.jpg", MediaAuthResolution.UNKNOWN
        )

    def test_clip_thumbs(self):
        self._assert("/clips/thumbs/", MediaAuthResolution.LISTING_MULTI_CAMERA)
        self._assert(
            "/clips/thumbs/front_door/",
            MediaAuthResolution.CAMERA,
            camera="front_door",
        )
        self._assert(
            "/clips/thumbs/back_door/abc.webp",
            MediaAuthResolution.CAMERA,
            camera="back_door",
        )

    def test_clip_admin_only_subtrees(self):
        self._assert("/clips/faces/train/foo.webp", MediaAuthResolution.ADMIN_ONLY)
        self._assert("/clips/faces/", MediaAuthResolution.ADMIN_ONLY)
        self._assert("/clips/some_model/train/x.jpg", MediaAuthResolution.ADMIN_ONLY)
        self._assert("/clips/some_model/dataset/x.jpg", MediaAuthResolution.ADMIN_ONLY)

    def test_clip_top_level_listing(self):
        self._assert("/clips/", MediaAuthResolution.LISTING_MULTI_CAMERA)

    def test_exports_listing(self):
        self._assert("/exports/", MediaAuthResolution.LISTING_MULTI_CAMERA)


class TestExportResolution(unittest.TestCase):
    """Export resolution requires a DB lookup."""

    def setUp(self):
        migrate_db = SqliteExtDatabase("test.db")
        del logging.getLogger("peewee_migrate").handlers[:]
        Router(migrate_db).run()
        migrate_db.close()
        self.db = SqliteQueueDatabase(TEST_DB)
        self.db.bind([Event, ReviewSegment, Recordings, Export])
        self.config = FrigateConfig(**_CONFIG)

    def tearDown(self):
        if not self.db.is_closed():
            self.db.close()
        for f in TEST_DB_CLEANUPS:
            try:
                os.remove(f)
            except OSError:
                pass

    def _insert_export(self, export_id, camera, filename):
        Export.insert(
            id=export_id,
            camera=camera,
            name=f"export-{export_id}",
            date=datetime.datetime.now(),
            video_path=f"/media/frigate/exports/{filename}",
            thumb_path=f"/media/frigate/exports/{filename}.jpg",
            in_progress=False,
        ).execute()

    def test_export_resolves_camera(self):
        self._insert_export(
            "exp1", "back_door", "back_door_20260511_140000-20260511_150000_abc123.mp4"
        )
        resolution, camera = resolve_media_uri(
            "/exports/back_door_20260511_140000-20260511_150000_abc123.mp4",
            self.config,
        )
        self.assertEqual(resolution, MediaAuthResolution.CAMERA)
        self.assertEqual(camera, "back_door")

    def test_unknown_export(self):
        resolution, camera = resolve_media_uri(
            "/exports/does_not_exist.mp4", self.config
        )
        self.assertEqual(resolution, MediaAuthResolution.UNKNOWN)
        self.assertIsNone(camera)


class TestDenyResponseForMediaUri(unittest.TestCase):
    """End-to-end decision check used by /auth."""

    def setUp(self):
        self.config = FrigateConfig(**_CONFIG)

    def _deny(self, url, role):
        return deny_response_for_media_uri(url, role, self.config)

    def test_admin_always_allowed(self):
        self.assertIsNone(self._deny("/clips/back_door-1.jpg", "admin"))
        self.assertIsNone(self._deny("/clips/", "admin"))
        self.assertIsNone(self._deny("/clips/faces/x.webp", "admin"))
        self.assertIsNone(
            self._deny("/recordings/2026-05-11/14/back_door/00.00.mp4", "admin")
        )

    def test_unrestricted_role_allowed(self):
        # "viewer" role has no entry in roles_dict → full access (matches the
        # behavior of require_camera_access).
        self.assertIsNone(self._deny("/clips/back_door-1.jpg", "viewer"))
        self.assertIsNone(self._deny("/clips/", "viewer"))

    def test_restricted_role_allowed_camera(self):
        self.assertIsNone(
            self._deny("/clips/front_door-1.jpg", "limited_user")
        )
        self.assertIsNone(
            self._deny(
                "/recordings/2026-05-11/14/front_door/00.00.mp4", "limited_user"
            )
        )
        self.assertIsNone(
            self._deny("/clips/thumbs/front_door/abc.webp", "limited_user")
        )

    def test_restricted_role_blocked_other_camera(self):
        self.assertEqual(
            self._deny("/clips/back_door-1.jpg", "limited_user"), 403
        )
        self.assertEqual(
            self._deny(
                "/recordings/2026-05-11/14/back_door/00.00.mp4", "limited_user"
            ),
            403,
        )
        self.assertEqual(
            self._deny("/clips/thumbs/back_door/abc.webp", "limited_user"), 403
        )

    def test_restricted_role_blocked_admin_only(self):
        self.assertEqual(
            self._deny("/clips/faces/train/foo.webp", "limited_user"), 403
        )

    def test_restricted_role_blocked_multi_camera_listing(self):
        self.assertEqual(self._deny("/clips/", "limited_user"), 403)
        self.assertEqual(self._deny("/exports/", "limited_user"), 403)
        self.assertEqual(
            self._deny("/recordings/2026-05-11/14/", "limited_user"), 403
        )

    def test_restricted_role_allowed_neutral_listing(self):
        self.assertIsNone(self._deny("/recordings/", "limited_user"))
        self.assertIsNone(self._deny("/recordings/2026-05-11/", "limited_user"))

    def test_non_media_uri_passes_through(self):
        self.assertIsNone(self._deny("/api/events", "limited_user"))
        self.assertIsNone(self._deny("http://h/login", "limited_user"))

    def test_missing_header(self):
        self.assertIsNone(self._deny(None, "limited_user"))
        self.assertIsNone(self._deny("", "limited_user"))


if __name__ == "__main__":
    unittest.main()
