"""Tests for the model download failure notice."""

import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from frigate.util import downloader
from frigate.util.downloader import ModelDownloader


class TestModelDownloadNotice(unittest.TestCase):
    def setUp(self):
        self.download_path = tempfile.mkdtemp()
        downloader.last_download_error.clear()

    def _notice_calls(self, requestor: MagicMock) -> list[dict]:
        return [
            call.args[1]
            for call in requestor.send_data.call_args_list
            if call.args[0] == "update_notice"
        ]

    def _downloader(self, download_func) -> ModelDownloader:
        with patch("frigate.util.downloader.InterProcessRequestor"):
            return ModelDownloader(
                "facedet", self.download_path, ["facedet.onnx"], download_func
            )

    def test_raising_download_reports_and_reraises(self):
        def failing(path: str) -> None:
            raise RuntimeError("HTTP 503 from upstream\nmore detail")

        model_downloader = self._downloader(failing)

        with self.assertRaises(RuntimeError):
            model_downloader._download_models()

        notices = self._notice_calls(model_downloader.requestor)
        self.assertEqual(len(notices), 1)
        self.assertEqual(notices[0]["action"], "raise")
        self.assertEqual(notices[0]["kind"], "model_download_failed")
        self.assertEqual(notices[0]["scope"], "facedet")
        self.assertEqual(
            notices[0]["params"],
            {"file": "facedet.onnx", "error": "HTTP 503 from upstream"},
        )

    def test_swallowing_download_that_leaves_no_file_reports(self):
        target = os.path.join(self.download_path, "facedet.onnx")

        def swallowing(path: str) -> None:
            # mirrors the processors: download_from_url fails, they only log
            with patch(
                "frigate.util.downloader.requests.get", side_effect=OSError("dns")
            ):
                try:
                    ModelDownloader.download_from_url("http://x/facedet.onnx", path)
                except Exception:
                    pass

        model_downloader = self._downloader(swallowing)
        model_downloader._download_models()

        notices = self._notice_calls(model_downloader.requestor)
        self.assertEqual(len(notices), 1)
        self.assertEqual(notices[0]["action"], "raise")
        self.assertEqual(notices[0]["params"], {"file": "facedet.onnx", "error": "dns"})
        self.assertFalse(os.path.exists(target))

    def test_success_resolves(self):
        def succeeding(path: str) -> None:
            with open(path, "w") as f:
                f.write("model")

        model_downloader = self._downloader(succeeding)
        model_downloader._download_models()

        notices = self._notice_calls(model_downloader.requestor)
        self.assertEqual(len(notices), 1)
        self.assertEqual(notices[0]["action"], "resolve")
        self.assertEqual(notices[0]["scope"], "facedet")
