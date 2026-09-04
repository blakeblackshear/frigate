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
        self.assertEqual(notices[0]["scope"], "facedet/facedet.onnx")
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
        self.assertEqual(notices[0]["scope"], "facedet/facedet.onnx")

    def test_a_sibling_downloader_only_resolves_its_own_files(self):
        """PaddleOCR, facedet and jina each spread one model_name over several
        downloaders, so a resolve must never reach a sibling's file."""

        def succeeding(path: str) -> None:
            with open(path, "w") as f:
                f.write("model")

        with patch("frigate.util.downloader.InterProcessRequestor"):
            sibling = ModelDownloader(
                "paddleocr-onnx", self.download_path, ["det.onnx"], succeeding
            )

        sibling._download_models()

        self.assertEqual(
            [n["scope"] for n in self._notice_calls(sibling.requestor)],
            ["paddleocr-onnx/det.onnx"],
        )


class TestModelDownloadState(unittest.TestCase):
    """A failed download marks the model state as error, not stuck downloading."""

    def setUp(self):
        self.download_path = tempfile.mkdtemp()
        downloader.last_download_error.clear()

    def _state_calls(self, requestor: MagicMock) -> list[dict]:
        return [
            call.args[1]
            for call in requestor.send_data.call_args_list
            if call.args[0] == "update_model_state"
        ]

    def _downloader(self, download_func) -> ModelDownloader:
        with patch("frigate.util.downloader.InterProcessRequestor"):
            return ModelDownloader(
                "facedet", self.download_path, ["facedet.onnx"], download_func
            )

    def test_raising_download_marks_error(self):
        def failing(path: str) -> None:
            raise RuntimeError("boom")

        model_downloader = self._downloader(failing)

        with self.assertRaises(RuntimeError):
            model_downloader._download_models()

        states = self._state_calls(model_downloader.requestor)
        self.assertEqual(states[-1]["state"], "error")
        self.assertEqual(states[-1]["model"], "facedet-facedet.onnx")

    def test_missing_file_marks_error(self):
        def swallowing(path: str) -> None:
            pass

        model_downloader = self._downloader(swallowing)
        model_downloader._download_models()

        states = self._state_calls(model_downloader.requestor)
        self.assertEqual([s["state"] for s in states], ["error"])

    def test_success_marks_downloaded(self):
        def succeeding(path: str) -> None:
            with open(path, "w") as f:
                f.write("model")

        model_downloader = self._downloader(succeeding)
        model_downloader._download_models()

        states = self._state_calls(model_downloader.requestor)
        self.assertEqual([s["state"] for s in states], ["downloaded"])
