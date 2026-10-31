"""Tests for directory ffmpeg inputs."""

import os
import tempfile
import unittest

from pydantic import ValidationError

from frigate.camera.directory_input import (
    DirectoryImporter,
    apply_directory_playback_time,
    parse_directory_input,
    substitute_directory_file,
)
from frigate.config import FrigateConfig

LABELMAP = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "labelmap.txt")
)


def _camera(path: str, **ffmpeg) -> dict:
    return {
        "mqtt": {"host": "mqtt"},
        "models": [{"devices": ["zmq"], "labelmap_path": LABELMAP}],
        "cameras": {
            "back": {
                "ffmpeg": {
                    "inputs": [{"path": path}],
                    **ffmpeg,
                },
                "detect": {"width": 1280, "height": 720, "fps": 5},
                "record": {"enabled": True},
            }
        },
    }


class TestParseDirectoryInput(unittest.TestCase):
    def test_parses_folder_and_strips_trailing_slash(self) -> None:
        self.assertEqual(parse_directory_input("directory:/data/back"), "/data/back")
        self.assertEqual(
            parse_directory_input("directory:/data/back/"),
            "/data/back",
        )

    def test_other_paths_are_not_directory_inputs(self) -> None:
        self.assertIsNone(parse_directory_input("rtsp://10.0.0.1/video"))
        self.assertIsNone(parse_directory_input("/media/clip.mp4"))

    def test_missing_folder_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "must include a folder"):
            parse_directory_input("directory:")
        with self.assertRaisesRegex(ValueError, "must include a folder"):
            parse_directory_input("directory:   ")

    def test_substitute_replaces_input_path(self) -> None:
        cmd = substitute_directory_file(
            ["ffmpeg", "-re", "-i", "directory:/data/back", "pipe:"],
            "/data/back/clip.mp4",
        )

        self.assertEqual(
            cmd,
            ["ffmpeg", "-re", "-i", "/data/back/clip.mp4", "pipe:"],
        )


class TestDirectoryImporter(unittest.TestCase):
    def test_plays_oldest_stable_mp4_and_skips_other_files(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            older = os.path.join(directory, "older.MP4")
            newer = os.path.join(directory, "newer.mp4")
            os.makedirs(os.path.join(directory, "nested"))
            with open(older, "wb") as file:
                file.write(b"older")
            with open(newer, "wb") as file:
                file.write(b"newer")
            with open(os.path.join(directory, "notes.txt"), "wb") as file:
                file.write(b"nope")
            with open(os.path.join(directory, ".hidden.mp4"), "wb") as file:
                file.write(b"hidden")
            with open(os.path.join(directory, "nested", "inner.mp4"), "wb") as file:
                file.write(b"inner")
            os.makedirs(os.path.join(directory, "failed"))
            with open(os.path.join(directory, "failed", "bad.mp4"), "wb") as file:
                file.write(b"bad")
            os.utime(older, (1_000, 1_000))
            os.utime(newer, (2_000, 2_000))

            importer = DirectoryImporter(directory, stable_seconds=5)
            self.assertIsNone(importer.next_file(10_000))
            self.assertEqual(importer.next_file(10_004), None)
            self.assertEqual(importer.next_file(10_005), older)

            importer.mark_success(older)
            self.assertFalse(os.path.exists(older))
            self.assertEqual(importer.next_file(10_006), newer)

    def test_waits_until_a_growing_file_stops_changing(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, "clip.mp4")
            with open(path, "wb") as file:
                file.write(b"1234")

            importer = DirectoryImporter(directory, stable_seconds=5)
            self.assertIsNone(importer.next_file(0))

            with open(path, "ab") as file:
                file.write(b"5678")
            self.assertIsNone(importer.next_file(10))
            self.assertIsNone(importer.next_file(14))
            self.assertEqual(importer.next_file(15), path)

    def test_empty_file_is_moved_to_failed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, "empty.mp4")
            open(path, "wb").close()

            importer = DirectoryImporter(directory, stable_seconds=0)
            self.assertIsNone(importer.next_file(0))
            self.assertIsNone(importer.next_file(1))

            self.assertFalse(os.path.exists(path))
            self.assertTrue(
                os.path.exists(os.path.join(directory, "failed", "empty.mp4"))
            )

    def test_failure_renames_when_the_destination_exists(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, "clip.mp4")
            with open(path, "wb") as file:
                file.write(b"bad")
            failed = os.path.join(directory, "failed")
            os.makedirs(failed)
            with open(os.path.join(failed, "clip.mp4"), "wb") as file:
                file.write(b"already")

            importer = DirectoryImporter(directory)
            importer.mark_failure(path)

            self.assertFalse(os.path.exists(path))
            names = sorted(os.listdir(failed))
            self.assertEqual(len(names), 2)
            self.assertIn("clip.mp4", names)
            self.assertTrue(any(name.startswith("clip_") for name in names))

    def test_missing_directory_returns_nothing(self) -> None:
        importer = DirectoryImporter("/tmp/frigate-missing-directory-input")
        self.assertIsNone(importer.next_file(0))
        self.assertIsNone(importer.next_file(1))


class TestDirectoryInputConfig(unittest.TestCase):
    def test_directory_command_plays_in_realtime(self) -> None:
        config = FrigateConfig(**_camera("directory:/data/back_camera"))
        command = config.cameras["back"].ffmpeg_cmds[0]

        self.assertEqual(command["directory"], "/data/back_camera")
        cmd = command["cmd"]
        self.assertIn("directory:/data/back_camera", cmd)
        self.assertIn("-re", cmd)
        self.assertNotIn("-use_wallclock_as_timestamps", cmd)
        self.assertNotIn("-rtsp_transport", cmd)

    def test_playback_time_offsets_only_the_segment_output(self) -> None:
        config = FrigateConfig(**_camera("directory:/data/back_camera"))
        cmd = substitute_directory_file(
            config.cameras["back"].ffmpeg_cmds[0]["cmd"],
            "/data/back_camera/clip.mp4",
        )
        played = apply_directory_playback_time(cmd, 1700000000.0)
        segment_at = played.index("-f")

        self.assertEqual(
            played[segment_at - 2 : segment_at + 2],
            ["-output_ts_offset", "1700000000.000", "-f", "segment"],
        )
        self.assertEqual(played[played.index("-i") + 1], "/data/back_camera/clip.mp4")
        self.assertEqual(
            apply_directory_playback_time(played, 5).count("-output_ts_offset"), 1
        )
        self.assertEqual(
            apply_directory_playback_time(["ffmpeg", "-i", "clip.mp4"], 5),
            ["ffmpeg", "-i", "clip.mp4"],
        )

    def test_camera_level_rtsp_preset_is_not_inherited(self) -> None:
        config = FrigateConfig(
            **_camera(
                "directory:/data/back_camera",
                input_args="preset-rtsp-generic",
            )
        )
        cmd = config.cameras["back"].ffmpeg_cmds[0]["cmd"]

        self.assertIn("-re", cmd)
        self.assertNotIn("-use_wallclock_as_timestamps", cmd)
        self.assertNotIn("-rtsp_transport", cmd)

    def test_explicit_input_args_replace_the_directory_preset(self) -> None:
        raw = _camera("directory:/data/back_camera")
        raw["cameras"]["back"]["ffmpeg"]["inputs"][0]["input_args"] = "-re -an"
        config = FrigateConfig(**raw)
        cmd = config.cameras["back"].ffmpeg_cmds[0]["cmd"]

        self.assertIn("-an", cmd)
        self.assertNotIn("-use_wallclock_as_timestamps", cmd)

    def test_audio_role_is_rejected(self) -> None:
        raw = _camera("directory:/data/back_camera")
        raw["cameras"]["back"]["ffmpeg"]["inputs"][0]["roles"] = ["detect", "audio"]

        with self.assertRaisesRegex(ValidationError, "audio role"):
            FrigateConfig(**raw)

    def test_directory_must_be_the_only_input(self) -> None:
        raw = _camera("directory:/data/back_camera")
        raw["cameras"]["back"]["ffmpeg"]["inputs"] = [
            {"path": "directory:/data/back_camera", "roles": ["detect"]},
            {"path": "rtsp://10.0.0.1:554/video", "roles": ["record"]},
        ]

        with self.assertRaisesRegex(ValidationError, "only input"):
            FrigateConfig(**raw)

    def test_two_cameras_cannot_share_a_directory(self) -> None:
        raw = _camera("directory:/data/back_camera")
        raw["cameras"]["side"] = {
            "ffmpeg": {"inputs": [{"path": "directory:/data/back_camera/"}]},
            "detect": {"width": 1280, "height": 720, "fps": 5},
        }

        with self.assertRaisesRegex(ValidationError, "both import"):
            FrigateConfig(**raw)

    def test_empty_directory_path_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValidationError, "must include a folder"):
            FrigateConfig(**_camera("directory:"))
