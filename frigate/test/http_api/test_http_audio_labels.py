"""Tests for the audio labels API."""

import unittest
from unittest.mock import patch

from frigate.models import Event
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp


class TestHttpAudioLabels(BaseTestHttp):
    def setUp(self):
        super().setUp([Event])

    def _labels(self, config: dict | None = None) -> dict[str, str]:
        if config:
            self.minimal_config.update(config)

        app = self.create_app()

        with patch(
            "frigate.api.app.load_labels", return_value={0: "speech", 1: "bark"}
        ):
            with AuthTestClient(app) as client:
                response = client.get("/audio_labels")

        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_the_default_labels_are_returned(self):
        self.assertEqual(self._labels(), {"0": "speech", "1": "bark"})

    def test_a_global_labelmap_override_is_offered(self):
        # grouping several classes under one label makes that label selectable
        labels = self._labels({"audio": {"labelmap": {0: "noise", 1: "noise"}}})

        self.assertEqual(set(labels.values()), {"noise"})

    def test_a_camera_labelmap_override_is_offered(self):
        labels = self._labels(
            {
                "cameras": {
                    "front_door": {
                        **self.minimal_config["cameras"]["front_door"],
                        "audio": {"labelmap": {1: "dogs"}},
                    }
                }
            }
        )

        self.assertEqual(labels["1"], "dogs")
        self.assertEqual(labels["0"], "speech")


if __name__ == "__main__":
    unittest.main(verbosity=2)
