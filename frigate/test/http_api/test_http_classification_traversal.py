"""End to end checks that classification endpoints cannot escape their base dir."""

import os
import shutil
import tempfile
from unittest.mock import patch

from frigate.models import Event
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp

# Percent encodings that survive nginx normalization. nginx collapses a bare
# ".." segment, but "..:" and friends are not relative segments to nginx while
# pathvalidate still reduces them to exactly "..".
TRAVERSAL_NAMES = ["..%3A", "..%2A", "..%3C", "..%7C", "..%20", ".."]


class TestHttpClassificationTraversal(BaseTestHttp):
    def setUp(self):
        super().setUp([Event])
        self.app = super().create_app()

        self.root = tempfile.mkdtemp()
        self.clips = os.path.join(self.root, "clips")
        self.model_cache = os.path.join(self.root, "model_cache")
        os.makedirs(os.path.join(self.clips, "model1"))
        os.makedirs(os.path.join(self.model_cache, "model1"))
        os.makedirs(os.path.join(self.root, "recordings"))

        # Sibling data that a "/.." escape from clips would reach.
        self.canary = os.path.join(self.root, "recordings", "seg.mp4")

        with open(self.canary, "w") as f:
            f.write("recording")

        clips_patch = patch("frigate.api.classification.CLIPS_DIR", self.clips)
        cache_patch = patch(
            "frigate.api.classification.MODEL_CACHE_DIR", self.model_cache
        )
        clips_patch.start()
        cache_patch.start()
        self.addCleanup(clips_patch.stop)
        self.addCleanup(cache_patch.stop)

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)
        self.app.dependency_overrides.clear()
        super().tearDown()

    def test_delete_model_rejects_traversal_names(self):
        client = AuthTestClient(self.app)

        for name in TRAVERSAL_NAMES:
            with self.subTest(name=name):
                response = client.delete(f"/classification/{name}")

                # Either the router never matches it or the handler rejects it,
                # but the sibling directory must survive either way.
                self.assertNotEqual(response.status_code, 200)
                self.assertTrue(
                    os.path.exists(self.canary),
                    f"{name} deleted data outside the clips directory",
                )
                self.assertTrue(os.path.exists(os.path.join(self.root, "recordings")))

    def test_delete_model_still_removes_its_own_directories(self):
        client = AuthTestClient(self.app)

        response = client.delete("/classification/model1")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(os.path.exists(os.path.join(self.clips, "model1")))
        self.assertFalse(os.path.exists(os.path.join(self.model_cache, "model1")))
        self.assertTrue(os.path.exists(self.canary))
