"""Tests for safe filesystem path construction."""

import os
import shutil
import tempfile
import unittest

from frigate.const import TRIGGER_DIR
from frigate.util.path import (
    get_trigger_thumbnail_path,
    is_contained_in,
    safe_join,
    sanitize_contained_path,
    sanitize_path_component,
)

# Values that pathvalidate's sanitize_filename reduces to exactly "..", because
# it strips reserved characters but leaves relative markers intact. nginx only
# normalizes a bare ".." segment, so the decorated variants reach the app.
DOT_DOT_VARIANTS = ["..", "..:", "..*", "..?", '.."', "..<", "..>", "..|", ".. ", " .."]


class TestSanitizePathComponent(unittest.TestCase):
    def test_rejects_dot_dot_variants(self):
        for value in DOT_DOT_VARIANTS:
            with self.subTest(value=value):
                self.assertIsNone(sanitize_path_component(value))

    def test_rejects_relative_markers_and_empty(self):
        for value in [".", "", None, "   ", "/", "//", "\\"]:
            with self.subTest(value=value):
                self.assertIsNone(sanitize_path_component(value))

    def test_strips_separators(self):
        component = sanitize_path_component("a/b/c")
        self.assertIsNotNone(component)
        self.assertNotIn("/", component)

    def test_allows_ordinary_names(self):
        for value in ["model1", "front-door", "My Model", "café", "a.b_c-1"]:
            with self.subTest(value=value):
                self.assertEqual(sanitize_path_component(value), value)


class TestSafeJoin(unittest.TestCase):
    base = "/media/frigate/clips"

    def test_rejects_dot_dot_variants(self):
        for value in DOT_DOT_VARIANTS:
            with self.subTest(value=value):
                self.assertIsNone(safe_join(self.base, value))

    def test_rejects_dot_dot_in_any_segment(self):
        self.assertIsNone(safe_join(self.base, "model", "dataset", ".."))
        self.assertIsNone(safe_join(self.base, "..", "dataset", ".."))

    def test_result_stays_inside_base(self):
        for value in ["model1", "a/../..", "....//", "..\\..", "%2e%2e"]:
            with self.subTest(value=value):
                joined = safe_join(self.base, value)

                if joined is not None:
                    self.assertTrue(is_contained_in(joined, self.base))

    def test_joins_multiple_segments(self):
        self.assertEqual(
            safe_join(self.base, "model1", "dataset", "none"),
            "/media/frigate/clips/model1/dataset/none",
        )

    def test_rejects_empty_segment(self):
        self.assertIsNone(safe_join(self.base, "model1", "", "none"))


class TestIsContainedIn(unittest.TestCase):
    def test_rejects_sibling_sharing_a_name_prefix(self):
        self.assertFalse(
            is_contained_in("/media/frigate/clips_evil/x.webp", "/media/frigate/clips")
        )

    def test_accepts_base_itself_and_children(self):
        self.assertTrue(is_contained_in("/media/frigate/clips", "/media/frigate/clips"))
        self.assertTrue(
            is_contained_in("/media/frigate/clips/a/b.webp", "/media/frigate/clips")
        )

    def test_rejects_parent(self):
        self.assertFalse(is_contained_in("/media/frigate", "/media/frigate/clips"))

    def test_handles_a_root_base(self):
        # A prefix test would compare against "//" here and wrongly report that
        # the root directory contains nothing.
        self.assertTrue(is_contained_in("/child", "/"))
        self.assertEqual(safe_join("/", "child"), "/child")

    def test_rejects_uncomparable_paths(self):
        self.assertFalse(is_contained_in("relative/x", "/media/frigate/clips"))


class TestSanitizeContainedPath(unittest.TestCase):
    base = "/media/frigate/clips"

    def test_rejects_dot_dot_anywhere(self):
        for value in [
            "/media/frigate/clips/../../etc/passwd",
            "clips\\..\\..\\etc/passwd",
            "/media/frigate/clips/a/../../../x",
        ]:
            with self.subTest(value=value):
                self.assertIsNone(sanitize_contained_path(value, self.base))

    def test_rejects_sibling_sharing_a_name_prefix(self):
        self.assertIsNone(
            sanitize_contained_path("/media/frigate/clips_evil/x.webp", self.base)
        )

    def test_rejects_outside_base(self):
        self.assertIsNone(sanitize_contained_path("/etc/passwd", self.base))

    def test_rejects_empty(self):
        self.assertIsNone(sanitize_contained_path("", self.base))
        self.assertIsNone(sanitize_contained_path(None, self.base))

    def test_keeps_a_valid_nested_path(self):
        self.assertEqual(
            sanitize_contained_path("/media/frigate/clips/a/b.webp", self.base),
            "/media/frigate/clips/a/b.webp",
        )


class TestTriggerThumbnailPath(unittest.TestCase):
    def test_stays_inside_the_trigger_dir(self):
        for camera, data in [
            ("cam", "../../../../etc/passwd"),
            ("cam", "../../../../config/config.yml"),
            ("cam", "normal-event-id"),
        ]:
            with self.subTest(camera=camera, data=data):
                path = get_trigger_thumbnail_path(camera, data)

                self.assertIsNotNone(path)
                self.assertTrue(is_contained_in(path, TRIGGER_DIR))

    def test_rejects_traversal_camera_names(self):
        for camera in DOT_DOT_VARIANTS:
            with self.subTest(camera=camera):
                self.assertIsNone(get_trigger_thumbnail_path(camera, "data"))

    def test_builds_the_expected_path(self):
        self.assertEqual(
            get_trigger_thumbnail_path("front_door", "abc"),
            os.path.join(TRIGGER_DIR, "front_door", "abc.webp"),
        )


class TestRmtreeContainment(unittest.TestCase):
    """A recursive delete built through safe_join must not reach a parent.

    shutil.rmtree on a path ending in ".." deletes the parent's contents before
    failing on the final rmdir, so the guard has to run before the call.
    """

    def setUp(self):
        self.root = tempfile.mkdtemp()
        self.clips = os.path.join(self.root, "clips")
        os.makedirs(os.path.join(self.clips, "model1"))
        os.makedirs(os.path.join(self.root, "recordings"))

        with open(os.path.join(self.root, "recordings", "seg.mp4"), "w") as f:
            f.write("recording")

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def test_traversal_name_never_yields_a_path_to_delete(self):
        for value in DOT_DOT_VARIANTS:
            with self.subTest(value=value):
                self.assertIsNone(safe_join(self.clips, value))

        self.assertTrue(
            os.path.exists(os.path.join(self.root, "recordings", "seg.mp4"))
        )

    def test_ordinary_name_still_deletes_its_own_directory(self):
        target = safe_join(self.clips, "model1")
        self.assertIsNotNone(target)

        shutil.rmtree(target)

        self.assertFalse(os.path.exists(os.path.join(self.clips, "model1")))
        self.assertTrue(
            os.path.exists(os.path.join(self.root, "recordings", "seg.mp4"))
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
