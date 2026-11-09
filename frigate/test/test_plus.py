"""Tests for Frigate+ model metadata."""

import json
import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

import requests

from frigate.plus import PlusApi, PlusKeyStatus, load_plus_model_info


class TestHailoAlias(unittest.TestCase):
    """Frigate+ reports Hailo models by the detector's pre-rename key.

    Both the model list and a cached info file have to carry the current key,
    or every Hailo model reads as unsupported.
    """

    def _get_models(self, models: list[dict]) -> list[dict]:
        api = PlusApi.__new__(PlusApi)
        response = MagicMock(ok=True, json=lambda: {"list": models})

        with patch.object(PlusApi, "_get", return_value=response):
            return api.get_models()["list"]

    def test_the_model_list_gains_the_current_key(self):
        models = self._get_models([{"supportedDetectors": ["hailo8l"]}])

        self.assertEqual(models[0]["supportedDetectors"], ["hailo8l", "hailo"])

    def test_the_old_key_is_kept_for_older_versions(self):
        models = self._get_models([{"supportedDetectors": ["hailo8l"]}])

        self.assertIn("hailo8l", models[0]["supportedDetectors"])

    def test_other_detectors_are_untouched(self):
        models = self._get_models([{"supportedDetectors": ["openvino", "onnx"]}])

        self.assertEqual(models[0]["supportedDetectors"], ["openvino", "onnx"])

    def test_a_model_already_naming_both_is_unchanged(self):
        models = self._get_models([{"supportedDetectors": ["hailo8l", "hailo"]}])

        self.assertEqual(models[0]["supportedDetectors"], ["hailo8l", "hailo"])

    def test_an_empty_list(self):
        self.assertEqual(self._get_models([]), [])


class TestLoadPlusModelInfo(unittest.TestCase):
    def setUp(self):
        self.cache = tempfile.TemporaryDirectory()
        self.addCleanup(self.cache.cleanup)
        patcher = patch("frigate.plus.MODEL_CACHE_DIR", self.cache.name)
        patcher.start()
        self.addCleanup(patcher.stop)

    def _write(self, model_id: str, content: str) -> None:
        with open(os.path.join(self.cache.name, f"{model_id}.json"), "w") as f:
            f.write(content)

    def test_a_cached_hailo_model_gains_the_current_key(self):
        self._write("abc", json.dumps({"supportedDetectors": ["hailo8l"]}))

        self.assertEqual(
            load_plus_model_info("abc")["supportedDetectors"], ["hailo8l", "hailo"]
        )

    def test_a_missing_file(self):
        self.assertIsNone(load_plus_model_info("nope"))

    def test_an_unreadable_file(self):
        self._write("bad", "{not json")

        self.assertIsNone(load_plus_model_info("bad"))


class TestValidateKey(unittest.TestCase):
    """The key format is checked locally, but only the server knows if it is valid."""

    def _api(self, key: str | None = "id:secret") -> PlusApi:
        api = PlusApi.__new__(PlusApi)
        api.host = "https://plus.test"
        api.key = key
        api._token_data = {}
        return api

    def _validate(self, **response) -> tuple[PlusKeyStatus, PlusApi]:
        api = self._api()

        with patch("frigate.plus.requests.get", return_value=MagicMock(**response)):
            return api.validate_key(), api

    def test_an_accepted_key_is_valid(self):
        status, api = self._validate(
            ok=True, status_code=200, json=lambda: {"accessToken": "t"}
        )

        self.assertEqual(status, PlusKeyStatus.valid)
        self.assertEqual(api._token_data, {"accessToken": "t"})

    def test_a_rejected_key_is_invalid(self):
        for code in (401, 403):
            status, _ = self._validate(ok=False, status_code=code)

            self.assertEqual(status, PlusKeyStatus.invalid)

    def test_a_server_error_is_not_reported_as_invalid(self):
        status, _ = self._validate(ok=False, status_code=500)

        self.assertEqual(status, PlusKeyStatus.unreachable)

    def test_a_connection_failure_is_unreachable(self):
        api = self._api()

        with patch("frigate.plus.requests.get", side_effect=requests.ConnectionError()):
            self.assertEqual(api.validate_key(), PlusKeyStatus.unreachable)

    def test_no_key_is_not_sent_to_the_server(self):
        api = self._api(key=None)

        with patch("frigate.plus.requests.get") as get:
            self.assertEqual(api.validate_key(), PlusKeyStatus.not_set)

        get.assert_not_called()


if __name__ == "__main__":
    unittest.main(verbosity=2)
