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
        # Looks like a media path but couldn't classify — fail closed for
        # restricted users (UNRESOLVED_MEDIA), not pass-through.
        self._assert(
            "/clips/nonexistent-1234.jpg", MediaAuthResolution.UNRESOLVED_MEDIA
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

    def test_clip_previews(self):
        self._assert("/clips/previews/", MediaAuthResolution.LISTING_MULTI_CAMERA)
        self._assert(
            "/clips/previews/front_door/",
            MediaAuthResolution.CAMERA,
            camera="front_door",
        )
        self._assert(
            "/clips/previews/back_door/segment.mp4",
            MediaAuthResolution.CAMERA,
            camera="back_door",
        )

    def test_clip_review_thumbs(self):
        # Format: /clips/review/thumb-{camera}-{review_id}.webp (frigate/review/maintainer.py).
        self._assert(
            "/clips/review/thumb-front_door-abc123.webp",
            MediaAuthResolution.CAMERA,
            camera="front_door",
        )
        # Hyphenated camera name — longest-prefix match.
        self._assert(
            "/clips/review/thumb-back-yard-abc123.webp",
            MediaAuthResolution.CAMERA,
            camera="back-yard",
        )
        # Unknown camera prefix → unresolved, not allowed for restricted users.
        self._assert(
            "/clips/review/thumb-unknown-cam-abc123.webp",
            MediaAuthResolution.UNRESOLVED_MEDIA,
        )

    def test_clip_admin_only_subtrees(self):
        self._assert("/clips/faces/train/foo.webp", MediaAuthResolution.ADMIN_ONLY)
        self._assert("/clips/faces/", MediaAuthResolution.ADMIN_ONLY)
        self._assert("/clips/genai-requests/x/0.webp", MediaAuthResolution.ADMIN_ONLY)
        self._assert(
            "/clips/preview_restart_cache/x.mp4", MediaAuthResolution.ADMIN_ONLY
        )
        self._assert("/clips/some_model/train/x.jpg", MediaAuthResolution.ADMIN_ONLY)
        self._assert("/clips/some_model/dataset/x.jpg", MediaAuthResolution.ADMIN_ONLY)

    def test_clip_unknown_subtree_is_unresolved(self):
        # Unknown /clips/{x}/{y}/... subtree falls through as unresolved (not
        # admin-only) so restricted users get 403 without admins being denied
        # access to legitimate but unrecognized resources.
        self._assert("/clips/random_dir/foo.jpg", MediaAuthResolution.UNRESOLVED_MEDIA)

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
            date=int(datetime.datetime.now().timestamp()),
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

    def test_unknown_export_is_unresolved(self):
        # No matching row → UNRESOLVED_MEDIA (fail closed for restricted users),
        # not UNKNOWN (which would pass-through).
        resolution, camera = resolve_media_uri(
            "/exports/does_not_exist.mp4", self.config
        )
        self.assertEqual(resolution, MediaAuthResolution.UNRESOLVED_MEDIA)
        self.assertIsNone(camera)

    def test_export_anchored_match_not_endswith(self):
        # Anchored exact-path equality must NOT match by filename suffix.
        # A request like /exports/clip.mp4 must not authorize against a row at
        # /media/frigate/exports/back_door_clip.mp4 just because the suffix matches.
        self._insert_export("exp_bd", "back_door", "back_door_clip.mp4")
        self._insert_export("exp_fd", "front_door", "front_door_clip.mp4")
        resolution, _ = resolve_media_uri("/exports/clip.mp4", self.config)
        self.assertEqual(resolution, MediaAuthResolution.UNRESOLVED_MEDIA)


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
        self.assertIsNone(self._deny("/clips/front_door-1.jpg", "limited_user"))
        self.assertIsNone(
            self._deny("/recordings/2026-05-11/14/front_door/00.00.mp4", "limited_user")
        )
        self.assertIsNone(
            self._deny("/clips/thumbs/front_door/abc.webp", "limited_user")
        )

    def test_restricted_role_blocked_other_camera(self):
        self.assertEqual(self._deny("/clips/back_door-1.jpg", "limited_user"), 403)
        self.assertEqual(
            self._deny("/recordings/2026-05-11/14/back_door/00.00.mp4", "limited_user"),
            403,
        )
        self.assertEqual(
            self._deny("/clips/thumbs/back_door/abc.webp", "limited_user"), 403
        )

    def test_restricted_role_blocked_admin_only(self):
        self.assertEqual(self._deny("/clips/faces/train/foo.webp", "limited_user"), 403)

    def test_restricted_role_blocked_multi_camera_listing(self):
        self.assertEqual(self._deny("/clips/", "limited_user"), 403)
        self.assertEqual(self._deny("/exports/", "limited_user"), 403)
        self.assertEqual(self._deny("/recordings/2026-05-11/14/", "limited_user"), 403)

    def test_restricted_role_allowed_neutral_listing(self):
        self.assertIsNone(self._deny("/recordings/", "limited_user"))
        self.assertIsNone(self._deny("/recordings/2026-05-11/", "limited_user"))

    def test_non_media_uri_passes_through(self):
        self.assertIsNone(self._deny("/api/events", "limited_user"))
        self.assertIsNone(self._deny("http://h/login", "limited_user"))

    def test_missing_header(self):
        self.assertIsNone(self._deny(None, "limited_user"))
        self.assertIsNone(self._deny("", "limited_user"))

    def test_traversal_in_media_uri_denied_for_all_roles(self):
        # Bypass attempt: parts[3] looks like an allowed camera, but the
        # normalized path nginx would serve points at a forbidden camera.
        # Both restricted and admin should be denied — the URI is malformed
        # and we refuse to make an auth decision against it.
        traversal_uris = [
            "/recordings/2026-05-11/14/front_door/../back_door/00.00.mp4",
            "/clips/front_door-1.jpg/../back_door-1.jpg",
            "/exports/../recordings/2026-05-11/14/back_door/00.00.mp4",
            "/clips/./back_door-1.jpg",
        ]
        for uri in traversal_uris:
            self.assertEqual(self._deny(uri, "limited_user"), 403, uri)
            self.assertEqual(self._deny(uri, "admin"), 403, uri)
            self.assertEqual(self._deny(uri, "viewer"), 403, uri)

    def test_traversal_outside_media_passes_through(self):
        # `..` in non-media URIs is not our problem; the backend handles it.
        self.assertIsNone(self._deny("/api/foo/../bar", "limited_user"))

    def test_percent_encoded_traversal_denied(self):
        # nginx may decode percent-encoded `%2E%2E` to `..` before serving;
        # we must apply the same denial after percent-decoding.
        self.assertEqual(
            self._deny(
                "/recordings/2026-05-11/14/front_door/%2E%2E/back_door/00.mp4",
                "limited_user",
            ),
            403,
        )

    def test_unresolved_media_fails_closed_for_restricted(self):
        # Restricted user requesting a media URI we can't classify (no DB row,
        # unknown clip prefix, unknown clip subtree) must be denied.
        self.assertEqual(self._deny("/clips/nonexistent-1.jpg", "limited_user"), 403)
        self.assertEqual(self._deny("/clips/random_dir/foo.jpg", "limited_user"), 403)
        self.assertEqual(
            self._deny("/clips/review/thumb-unknown_cam-1.webp", "limited_user"),
            403,
        )

    def test_unresolved_media_allowed_for_admin(self):
        # Admin and full-access roles are *not* denied on UNRESOLVED_MEDIA —
        # nginx returns 404 if the file doesn't exist on disk anyway, and we
        # don't want a stale DB to lock out admins.
        self.assertIsNone(self._deny("/clips/nonexistent-1.jpg", "admin"))
        self.assertIsNone(self._deny("/clips/nonexistent-1.jpg", "viewer"))


if __name__ == "__main__":
    unittest.main()
