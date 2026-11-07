"""Tests for bounded hourly preview conversion."""

import subprocess
import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import MagicMock, patch

from frigate.config import CameraConfig, FrigateConfig
from frigate.const import INSERT_PREVIEW
from frigate.output import output, preview


class TestPreviewEncoding(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.cache = Path(self.directory.name) / "cache"
        (self.cache / preview.FOLDER_PREVIEW_FRAMES).mkdir(parents=True)
        for name, value in (
            ("CACHE_DIR", str(self.cache)),
            ("PREVIEW_CACHE_DIR", str(self.cache / preview.FOLDER_PREVIEW_FRAMES)),
            ("CLIPS_DIR", str(Path(self.directory.name) / "clips")),
        ):
            patched = patch.object(preview, name, value)
            patched.start()
            self.addCleanup(patched.stop)
        patched = patch.object(preview, "chown_to_runtime")
        patched.start()
        self.addCleanup(patched.stop)
        self.completed = subprocess.CompletedProcess([], 0, stderr="")

    def _converter(self, camera: str) -> preview.FFMpegConverter:
        config = CameraConfig(
            name=camera,
            ffmpeg={"inputs": [{"path": "test.mp4", "roles": ["detect"]}]},
        )
        times = [1000.0, 1002.5, 1003.0]
        for timestamp in times:
            Path(preview.get_cache_image_name(camera, timestamp)).touch()
        return preview.FFMpegConverter(config, times, MagicMock())

    def _assert_all_slots_available(self) -> None:
        acquired = 0
        try:
            for _ in range(preview.PREVIEW_MAX_CONCURRENT_ENCODERS):
                self.assertTrue(preview._preview_encoder_slots.acquire(blocking=False))
                acquired += 1
        finally:
            for _ in range(acquired):
                preview._preview_encoder_slots.release()

    def test_limits_concurrent_converters_and_finishes_queued_work(self):
        limit = preview.PREVIEW_MAX_CONCURRENT_ENCODERS
        converters = [self._converter(f"camera_{i}") for i in range(limit + 1)]
        release = threading.Event()
        at_capacity = threading.Event()
        extra_encoder = threading.Event()
        lock = threading.Lock()
        active = 0
        peak = 0

        def encode(*args, **kwargs):
            nonlocal active, peak
            with lock:
                active += 1
                peak = max(peak, active)
                if active == limit:
                    at_capacity.set()
                if active > limit:
                    extra_encoder.set()
            try:
                if not release.wait(5):
                    raise TimeoutError("Preview encoders were not released")
                return self.completed
            finally:
                with lock:
                    active -= 1

        with (
            patch.object(preview.sp, "run", side_effect=encode) as run,
            ThreadPoolExecutor(max_workers=len(converters)) as executor,
        ):
            futures = [executor.submit(converter.run) for converter in converters]
            try:
                self.assertTrue(at_capacity.wait(5))
                available = preview._preview_encoder_slots.acquire(blocking=False)
                if available:
                    preview._preview_encoder_slots.release()
                self.assertFalse(available)
                self.assertFalse(extra_encoder.wait(0.1))
                self.assertEqual(run.call_count, limit)
                for converter in converters:
                    for timestamp in converter.frame_times:
                        self.assertTrue(
                            Path(
                                preview.get_cache_image_name(
                                    converter.config.name, timestamp
                                )
                            ).exists()
                        )
            finally:
                release.set()
            for future in futures:
                future.result(timeout=5)
            self.assertEqual(peak, limit)
            self.assertEqual(run.call_count, len(converters))
        self._assert_all_slots_available()

    def test_preserves_timestamps_and_last_cached_frame(self):
        converter = self._converter("front")
        with patch.object(preview.sp, "run", return_value=self.completed) as run:
            converter.run()

        playlist = run.call_args.kwargs["input"]
        self.assertIn("duration 2.5", playlist)
        self.assertIn("duration 0.5", playlist)
        converter.requestor.send_data.assert_called_once_with(
            INSERT_PREVIEW,
            {
                "id": "front_1003.0",
                "camera": "front",
                "path": converter.path,
                "start_time": 1000.0,
                "end_time": 1003.0,
                "duration": 3.0,
            },
        )
        for timestamp in converter.frame_times[:-1]:
            self.assertFalse(
                Path(preview.get_cache_image_name("front", timestamp)).exists()
            )
        self.assertTrue(Path(preview.get_cache_image_name("front", 1003.0)).exists())

    def test_releases_slot_when_encoding_raises(self):
        converter = self._converter("front")
        with patch.object(preview.sp, "run", side_effect=OSError("Encoder failed")):
            with self.assertRaisesRegex(OSError, "Encoder failed"):
                converter.run()
        self._assert_all_slots_available()
        converter.requestor.send_data.assert_not_called()

    def test_releases_slot_after_failed_encoding(self):
        converter = self._converter("front")
        with (
            patch.object(
                preview.sp,
                "run",
                return_value=subprocess.CompletedProcess(
                    [], 1, stderr="Encoder failed"
                ),
            ),
            self.assertLogs(preview.logger, level="ERROR"),
        ):
            converter.run()
        self._assert_all_slots_available()
        converter.requestor.send_data.assert_not_called()

    def test_retries_without_leaking_encoder_slots(self):
        converter = self._converter("front")
        with (
            patch.object(
                preview.sp,
                "run",
                side_effect=[BlockingIOError(), self.completed],
            ) as run,
            patch.object(preview.time, "sleep") as sleep,
            self.assertLogs(preview.logger, level="WARNING"),
        ):
            converter.run()
        self.assertEqual(run.call_count, 2)
        sleep.assert_called_once_with(2)
        self._assert_all_slots_available()

    def test_shutdown_finishes_running_and_queued_previews_before_moving_cache(self):
        recorders = {}
        for index in range(preview.PREVIEW_MAX_CONCURRENT_ENCODERS + 1):
            camera = f"camera_{index}"
            config = CameraConfig(
                name=camera,
                detect={"width": 640, "height": 360},
                record={"enabled": True},
                ffmpeg={
                    "inputs": [{"path": "test.mp4", "roles": ["detect", "record"]}]
                },
            )
            with patch.object(
                preview, "InterProcessRequestor", return_value=MagicMock()
            ):
                recorder = preview.PreviewRecorder(config)
            recorder.start_time = 1000.0
            recorder.segment_end = 1004.0
            recorder.output_frames = [1000.0, 1002.5, 1003.0]
            for timestamp in recorder.output_frames:
                Path(preview.get_cache_image_name(camera, timestamp)).touch()
            recorders[camera] = recorder

        release = threading.Event()
        at_capacity = threading.Event()
        stopping = threading.Event()
        lock = threading.Lock()
        started = 0
        converters = []
        start_converter = preview.FFMpegConverter.start
        stop_recorder = recorders["camera_0"].stop

        def start(converter):
            converters.append(converter)
            start_converter(converter)

        def encode(*args, **kwargs):
            nonlocal started
            with lock:
                started += 1
                if started == preview.PREVIEW_MAX_CONCURRENT_ENCODERS:
                    at_capacity.set()
            if not release.wait(5):
                raise TimeoutError("Preview encoders were not released")
            for line in kwargs["input"].splitlines():
                if line.startswith("file '"):
                    self.assertTrue(Path(line[6:-1]).exists())
            return self.completed

        def stop():
            stopping.set()
            stop_recorder()

        def write_frame(recorder, timestamp, frame):
            Path(preview.get_cache_image_name(recorder.camera_name, timestamp)).touch()

        def add_camera(camera, server, jsmpeg, previews, write_times, birdseye):
            previews[camera] = recorders[camera]

        config = FrigateConfig(
            mqtt={"enabled": False},
            cameras={name: recorder.config for name, recorder in recorders.items()},
        )
        stop_event = threading.Event()
        stop_event.set()
        process = output.OutputProcess(config, stop_event)

        with (
            patch.object(
                preview.FFMpegConverter, "start", autospec=True, side_effect=start
            ),
            patch.object(preview.sp, "run", side_effect=encode),
            patch.object(
                preview.PreviewRecorder,
                "write_frame_to_cache",
                autospec=True,
                side_effect=write_frame,
            ),
            patch.object(recorders["camera_0"], "stop", side_effect=stop),
            patch.object(process, "pre_run_setup"),
            patch.object(process, "add_camera", side_effect=add_camera),
            patch.object(output.cv2, "setNumThreads"),
            patch.object(output, "SharedMemoryFrameManager"),
            patch.object(output, "make_server"),
            patch.object(output, "DetectionSubscriber") as subscriber,
            patch.object(output, "CameraConfigUpdateSubscriber"),
            patch.object(output, "ConfigSubscriber"),
            patch.object(output, "CACHE_DIR", str(self.cache)),
            patch.object(output, "CLIPS_DIR", preview.CLIPS_DIR),
        ):
            subscriber.return_value.check_for_update.return_value = None
            try:
                for index, recorder in enumerate(recorders.values()):
                    if index == 0:
                        recorder.flag_offline(1004.0)
                    else:
                        recorder.write_data([], [], 1004.0, MagicMock())
                self.assertTrue(at_capacity.wait(5))

                with ThreadPoolExecutor(max_workers=1) as executor:
                    shutdown = executor.submit(process.run)
                    try:
                        self.assertTrue(stopping.wait(5))
                        self.assertFalse(shutdown.done())
                        self.assertTrue(
                            (self.cache / preview.FOLDER_PREVIEW_FRAMES).exists()
                        )
                        for recorder in recorders.values():
                            recorder.requestor.stop.assert_not_called()
                    finally:
                        release.set()
                    shutdown.result(timeout=5)
            finally:
                release.set()
                for converter in converters:
                    converter.join(timeout=5)

        self.assertFalse((self.cache / preview.FOLDER_PREVIEW_FRAMES).exists())
        holdover = Path(preview.CLIPS_DIR) / "preview_restart_cache"
        for camera, recorder in recorders.items():
            recorder.requestor.send_data.assert_called_once()
            recorder.requestor.stop.assert_called_once()
            self.assertTrue(
                (
                    holdover / f"preview_{camera}-1004.0.{preview.PREVIEW_FRAME_TYPE}"
                ).exists()
            )
        self._assert_all_slots_available()


if __name__ == "__main__":
    unittest.main()
