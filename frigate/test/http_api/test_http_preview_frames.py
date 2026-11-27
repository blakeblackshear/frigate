"""Current-hour preview frame routes only return the requested camera's frames."""

import os
import shutil
import tempfile
import time
from unittest.mock import MagicMock, patch

from frigate.const import PREVIEW_FRAME_TYPE
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp

CAMERA = "front_door"

# camera names that extend CAMERA with "-" share its file name prefix
SIBLINGS = (f"{CAMERA}-2", f"{CAMERA}-door")


class TestHttpPreviewFrames(BaseTestHttp):
    def setUp(self):
        super().setUp([])
        self.app = super().create_app()

        self.cache_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.cache_dir, ignore_errors=True)
        self.preview_dir = os.path.join(self.cache_dir, "preview_frames")
        os.makedirs(self.preview_dir)

        for target, value in (
            ("frigate.api.media.CACHE_DIR", self.cache_dir),
            ("frigate.api.preview.CACHE_DIR", self.cache_dir),
            ("frigate.api.preview._preview_listing_cache", (-1.0, [])),
        ):
            patcher = patch(target, value)
            patcher.start()
            self.addCleanup(patcher.stop)

        # ahead of now so the media routes never fall back to stored previews

        self.start_ts = time.time() + 60
        self._write_frame(CAMERA, self.start_ts - 10)
        self.own_frames = [self._write_frame(CAMERA, self.start_ts + 1)]

        for sibling in SIBLINGS:
            self._write_frame(sibling, self.start_ts + 1)

    def _write_frame(self, camera: str, frame_time: float) -> str:
        name = f"preview_{camera}-{frame_time}.{PREVIEW_FRAME_TYPE}"
        with open(os.path.join(self.preview_dir, name), "wb") as f:
            f.write(b"frame")
        return name

    def _concat_files(self, mock_run: MagicMock) -> set[str]:
        concat = mock_run.call_args.kwargs["input"].decode()
        return {
            os.path.basename(line.split("'")[1])
            for line in concat.splitlines()
            if line.startswith("file ")
        }

    def test_frames_listing_excludes_sibling_camera(self):
        with AuthTestClient(self.app) as client:
            response = client.get(
                f"/preview/{CAMERA}/start/{self.start_ts}/end/inf/frames"
            )

        assert response.status_code == 200
        assert response.json() == self.own_frames

    def test_preview_gif_excludes_sibling_camera(self):
        result = MagicMock(returncode=0, stdout=b"GIF89a")

        with (
            patch("frigate.api.media.sp.run", return_value=result) as mock_run,
            AuthTestClient(self.app) as client,
        ):
            response = client.get(
                f"/{CAMERA}/start/{self.start_ts}/end/inf/preview.gif"
            )

        assert response.status_code == 200
        assert self._concat_files(mock_run) == set(self.own_frames)

    def test_preview_mp4_excludes_sibling_camera(self):
        def fake_run(cmd, **kwargs):
            with open(cmd[-1], "wb") as f:
                f.write(b"mp4")
            return MagicMock(returncode=0)

        with (
            patch("frigate.api.media.sp.run", side_effect=fake_run) as mock_run,
            AuthTestClient(self.app) as client,
        ):
            response = client.get(
                f"/{CAMERA}/start/{self.start_ts}/end/inf/preview.mp4"
            )

        assert response.status_code == 200
        assert self._concat_files(mock_run) == set(self.own_frames)
