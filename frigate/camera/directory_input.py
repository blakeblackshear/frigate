"""Import MP4 files from a directory into a camera one at a time."""

import logging
import os
import shutil
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)

DIRECTORY_PREFIX = "directory:"
FAILED_DIR_NAME = "failed"
DIRECTORY_FILE_STABLE_SECONDS = 5.0


def parse_directory_input(path: str) -> str | None:
    """Return the folder for a directory: input, or None for any other path.

    Args:
        path: Camera input path from config.

    Returns:
        Absolute folder path, or None when the path is not a directory input.

    Raises:
        ValueError: The directory: prefix is present but no folder follows it.
    """
    if not path.startswith(DIRECTORY_PREFIX):
        return None

    folder = path[len(DIRECTORY_PREFIX) :].strip().rstrip("/")
    if not folder:
        raise ValueError(
            "A directory input must include a folder, for example directory:/media/frigate/imports."
        )

    return os.path.abspath(folder)


def substitute_directory_file(cmd: list[str], file_path: str) -> list[str]:
    """Replace the ffmpeg -i path with the MP4 file being imported.

    Args:
        cmd: ffmpeg command built from config. The -i value is the directory: path.
        file_path: Absolute path of the MP4 to play.

    Returns:
        A copy of the command whose input is file_path.
    """
    updated = list(cmd)
    try:
        index = updated.index("-i")
    except ValueError:
        return updated

    updated[index + 1] = file_path
    return updated


def apply_directory_playback_time(cmd: list[str], now: float) -> list[str]:
    """Stamp the recording output with the current time.

    -re paces a file from its own timestamps. Rewriting those timestamps as
    the file is read makes -re ingest the file immediately, so this offset is
    applied only to the recording segment output.

    Args:
        cmd: ffmpeg command whose -i path is already the MP4 to play.
        now: Unix timestamp used as the recording time offset.

    Returns:
        A copy of the command. Commands without a segment output are unchanged.
    """
    updated = list(cmd)
    if "-output_ts_offset" in updated:
        return updated

    for index, part in enumerate(updated[:-1]):
        if part == "-f" and updated[index + 1] == "segment":
            return (
                updated[:index] + ["-output_ts_offset", f"{now:.3f}"] + updated[index:]
            )

    return updated


def verify_camera_directory_input(camera_name: str, inputs: list[Any]) -> None:
    """Require a directory import to be the camera's only input, without audio.

    Args:
        camera_name: Camera name, used in the error message.
        inputs: The camera's ffmpeg inputs after role assignment.

    Raises:
        ValueError: The directory input is combined with another input or audio.
    """
    folders = []
    for ffmpeg_input in inputs:
        folder = parse_directory_input(ffmpeg_input.path)
        if folder is not None:
            folders.append(ffmpeg_input)

    if not folders:
        return

    if len(inputs) != 1:
        raise ValueError(
            f"Camera {camera_name} uses a directory input, which must be the camera's only input."
        )

    if "audio" in folders[0].roles:
        raise ValueError(
            f"Camera {camera_name} directory input cannot use the audio role."
        )


def verify_unique_directory_inputs(cameras: dict[str, Any]) -> None:
    """Reject two cameras that import from the same folder.

    Args:
        cameras: Camera configs keyed by name.

    Raises:
        ValueError: More than one camera uses the same directory.
    """
    seen: dict[str, str] = {}
    for name, camera in cameras.items():
        for ffmpeg_input in camera.ffmpeg.inputs:
            folder = parse_directory_input(ffmpeg_input.path)
            if folder is None:
                continue

            other = seen.get(folder)
            if other is not None:
                raise ValueError(
                    f"Cameras {other} and {name} both import from {folder}. "
                    "Use a separate directory for each camera."
                )
            seen[folder] = name


class DirectoryImporter:
    """Choose one stable MP4 at a time and delete or quarantine it afterwards."""

    def __init__(
        self, directory: str, stable_seconds: float = DIRECTORY_FILE_STABLE_SECONDS
    ) -> None:
        self.directory = directory
        self.failed_dir = os.path.join(directory, FAILED_DIR_NAME)
        self.stable_seconds = stable_seconds
        # path -> (size, mtime, first time that size and mtime were seen)
        self._observations: dict[str, tuple[int, float, float]] = {}
        self._missing_logged = False
        self._waiting_logged = False

    def next_file(self, now: float | None = None) -> str | None:
        """Return the oldest MP4 whose size has stopped changing.

        A file that stays empty is moved to the failed folder instead of being
        played. Files still being copied are left in place.

        Args:
            now: Timestamp used for the stability check. Defaults to the current time.

        Returns:
            Absolute path of the next file, or None when nothing is ready.
        """
        if now is None:
            now = datetime.now().timestamp()

        if not os.path.isdir(self.directory):
            if not self._missing_logged:
                logger.error(
                    "Directory input folder does not exist: %s", self.directory
                )
                self._missing_logged = True
            return None

        self._missing_logged = False
        candidates = self._list_mp4s()
        live = set(candidates)
        for path in list(self._observations):
            if path not in live:
                self._observations.pop(path, None)

        ready: list[tuple[float, str, str]] = []
        for path in candidates:
            try:
                stat = os.stat(path)
            except OSError:
                logger.exception("Unable to stat directory input file %s", path)
                continue

            signature = (stat.st_size, stat.st_mtime)
            previous = self._observations.get(path)
            if previous is None or (previous[0], previous[1]) != signature:
                self._observations[path] = (stat.st_size, stat.st_mtime, now)
                continue

            if now - previous[2] < self.stable_seconds:
                continue

            if stat.st_size <= 0:
                self.mark_failure(path)
                continue

            ready.append((stat.st_mtime, os.path.basename(path), path))

        if not ready:
            if not self._waiting_logged:
                logger.info("Waiting for mp4 files in %s", self.directory)
                self._waiting_logged = True
            return None

        self._waiting_logged = False
        ready.sort()
        return ready[0][2]

    def mark_success(self, path: str) -> None:
        """Delete a file that played through to the end.

        Args:
            path: Absolute path of the imported MP4.
        """
        try:
            os.remove(path)
        except OSError:
            logger.exception("Failed to delete processed file %s", path)
        else:
            logger.info("Deleted processed file %s", path)
        self._observations.pop(path, None)

    def mark_failure(self, path: str) -> None:
        """Move a file that could not be played into the failed folder.

        Args:
            path: Absolute path of the MP4.
        """
        try:
            os.makedirs(self.failed_dir, exist_ok=True)
            destination = self._failure_destination(path)
            shutil.move(path, destination)
        except OSError:
            logger.exception("Failed to move %s into %s", path, self.failed_dir)
        else:
            logger.warning("Moved failed file %s to %s", path, destination)
        self._observations.pop(path, None)

    def _list_mp4s(self) -> list[str]:
        """List importable MP4 files in the top level of the folder."""
        try:
            names = os.listdir(self.directory)
        except OSError:
            logger.exception("Unable to list directory input %s", self.directory)
            return []

        files = []
        for name in names:
            if name.startswith(".") or name == FAILED_DIR_NAME:
                continue
            if not name.lower().endswith(".mp4"):
                continue

            path = os.path.join(self.directory, name)
            if os.path.isfile(path):
                files.append(path)
        return files

    def _failure_destination(self, path: str) -> str:
        """Pick a path inside the failed folder that does not already exist."""
        name = os.path.basename(path)
        destination = os.path.join(self.failed_dir, name)
        if not os.path.exists(destination):
            return destination

        stem, ext = os.path.splitext(name)
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        destination = os.path.join(self.failed_dir, f"{stem}_{stamp}{ext}")
        if not os.path.exists(destination):
            return destination

        index = 1
        while True:
            candidate = os.path.join(self.failed_dir, f"{stem}_{stamp}_{index}{ext}")
            if not os.path.exists(candidate):
                return candidate
            index += 1
