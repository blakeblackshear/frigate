"""Audio lifecycle regression tests using the real camera config subscriber."""

import copy
import logging
import tempfile
import threading
import unittest
from collections import deque
from contextlib import ExitStack
from unittest.mock import MagicMock, patch

from frigate.comms.dispatcher import Dispatcher
from frigate.comms.runtime_state import RuntimeStatePersistence
from frigate.config import FrigateConfig
from frigate.events.audio import AudioEventMaintainer, AudioProcessor


@patch("frigate.detectors.detector_config.load_labels", return_value={0: "person"})
def build_config(_labels, enabled=True, audio=True):
    return FrigateConfig(
        mqtt={"enabled": False},
        ffmpeg={"hwaccel_args": []},
        cameras={
            "test": {
                "enabled": enabled,
                "audio": {"enabled": audio},
                "detect": {"width": 640, "height": 480},
                "ffmpeg": {
                    "hwaccel_args": [],
                    "inputs": [
                        {
                            "path": "rtsp://example.test/audio",
                            "roles": ["detect", "audio"],
                        }
                    ],
                },
            }
        },
    )


class UpdateTransport:
    """Replace only ZMQ delivery; retain production topic filtering and updates."""

    def __init__(self):
        self.pending = deque()

    def publish(self, kind, value):
        self.pending.append((f"config/cameras/test/{kind}", copy.deepcopy(value)))

    def check_for_update(self):
        return self.pending.popleft() if self.pending else (None, None)

    def stop(self):
        pass


class TestAudioManagerLifecycle(unittest.TestCase):
    def run_manager(self, config, steps):
        transport = UpdateTransport()
        stop = MagicMock()
        processor = AudioProcessor(config, {"test": MagicMock()}, MagicMock(), stop)
        processor.logger = logging.getLogger(__name__)
        workers = []

        def create_worker(*args):
            worker = MagicMock()
            worker.is_alive.return_value = False
            workers.append(worker)
            return worker

        actions = iter(steps)

        def tick(timeout):
            action = next(actions, None)
            if action is None:
                return True
            action(processor, transport, workers)
            return False

        stop.wait.side_effect = tick
        old_name = threading.current_thread().name
        try:
            with (
                patch.object(processor, "pre_run_setup"),
                patch(
                    "frigate.config.camera.updater.ConfigSubscriber",
                    return_value=transport,
                ),
                patch(
                    "frigate.events.audio.AudioEventMaintainer",
                    side_effect=create_worker,
                ),
            ):
                processor.run()
        finally:
            threading.current_thread().name = old_name
        return workers

    def assert_workers(self, processor, count):
        self.assertEqual(len(processor.audio_threads), count)

    def test_initially_disabled_then_enabled_spawns_once(self):
        def enable(processor, transport, workers):
            self.assert_workers(processor, 0)
            transport.publish("enabled", True)

        def repeat(processor, transport, workers):
            self.assert_workers(processor, 1)
            transport.publish("enabled", True)

        workers = self.run_manager(
            build_config(enabled=False), [enable, repeat, repeat]
        )
        self.assertEqual(len(workers), 1)
        workers[0].start.assert_called_once()

    def test_persisted_disabled_startup_then_dispatcher_enable(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch(
                "frigate.comms.runtime_state.find_config_file",
                return_value=f"{directory}/config.yml",
            ):
                state = RuntimeStatePersistence()
            state.set("test", "enabled", False)
            dispatcher = Dispatcher.__new__(Dispatcher)
            dispatcher.config = build_config()
            dispatcher._runtime_state = state
            dispatcher.comms = []
            dispatcher.config_updater = MagicMock()
            dispatcher.reapply_runtime_state_to_config()
            self.assertFalse(dispatcher.config.cameras["test"].enabled)
            self.assertTrue(dispatcher.config.cameras["test"].enabled_in_config)

            def enable(processor, transport, workers):
                self.assert_workers(processor, 0)
                dispatcher.config_updater.publish_update.side_effect = (
                    lambda topic, value: transport.publish(
                        topic.update_type.name, value
                    )
                )
                dispatcher._on_enabled_command("test", "ON")
                # The manager has a separate process-local configuration.
                self.assertFalse(processor.config.cameras["test"].enabled)

            def check(processor, transport, workers):
                self.assert_workers(processor, 1)

            workers = self.run_manager(
                copy.deepcopy(dispatcher.config), [enable, check]
            )
            self.assertEqual(len(workers), 1)

    def test_audio_disabled_waits_for_audio_enable(self):
        config = build_config(audio=False)

        def enable_camera(processor, transport, workers):
            self.assert_workers(processor, 0)
            transport.publish("enabled", True)

        def enable_audio(processor, transport, workers):
            self.assert_workers(processor, 0)
            transport.publish("audio", build_config().cameras["test"].audio)

        def check(processor, transport, workers):
            self.assert_workers(processor, 1)

        self.run_manager(config, [enable_camera, enable_audio, check])

    def test_enabled_camera_remove_and_add(self):
        config = build_config()
        camera = copy.deepcopy(config.cameras["test"])

        def remove(processor, transport, workers):
            self.assert_workers(processor, 1)
            transport.publish("remove", camera)

        def add(processor, transport, workers):
            self.assert_workers(processor, 0)
            workers[0].stop.assert_called_once()
            workers[0].join.assert_called_once_with(10)
            transport.publish("add", camera)

        def check(processor, transport, workers):
            self.assert_workers(processor, 1)
            self.assertEqual(len(workers), 2)

        self.run_manager(config, [remove, add, check])

    def test_missing_audio_role_does_not_spawn(self):
        config = build_config()
        config.cameras["test"].ffmpeg.inputs[0].roles = ["detect"]
        self.assertEqual(self.run_manager(config, []), [])


class TestAudioWorkerLifecycle(unittest.TestCase):
    def test_disable_closes_ffmpeg_and_reenable_resumes_reads(self):
        config = build_config()
        transport = UpdateTransport()
        stop = threading.Event()
        with ExitStack() as stack:
            for name in (
                "AudioTfl",
                "LogPipe",
                "InterProcessRequestor",
                "DetectionPublisher",
            ):
                stack.enter_context(patch(f"frigate.events.audio.{name}"))
            stack.enter_context(
                patch(
                    "frigate.config.camera.updater.ConfigSubscriber",
                    return_value=transport,
                )
            )
            start = stack.enter_context(
                patch("frigate.events.audio.start_or_restart_ffmpeg")
            )
            close = stack.enter_context(patch("frigate.events.audio.stop_ffmpeg"))
            worker = AudioEventMaintainer(
                config.cameras["test"], config, MagicMock(), MagicMock(), None, stop
            )
            reads = []
            sleeps = []

            def read():
                reads.append(True)
                if len(reads) == 1:
                    transport.publish("enabled", False)
                else:
                    stop.set()

            def disabled_sleep(seconds):
                sleeps.append(True)
                self.assertEqual(
                    len(sleeps), 1, "Worker did not consume re-enable update"
                )
                self.assertIsNone(worker.audio_listener)
                close.assert_called_once_with(start.return_value, worker.logger)
                transport.publish("enabled", True)

            stack.enter_context(patch.object(worker, "read_audio", side_effect=read))
            stack.enter_context(
                patch("frigate.events.audio.time.sleep", side_effect=disabled_sleep)
            )
            worker.run()
            self.assertEqual(len(reads), 2)
            self.assertEqual(start.call_count, 2)
            self.assertEqual(close.call_count, 2)  # disable and final shutdown
