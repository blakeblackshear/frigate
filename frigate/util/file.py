"""Path and file utilities."""

import base64
import fcntl
import logging
import os
import time
from pathlib import Path
from typing import Optional

import cv2
from numpy import ndarray

from frigate.const import CLIPS_DIR, THUMB_DIR
from frigate.models import Event

logger = logging.getLogger(__name__)


def get_event_thumbnail_bytes(event: Event) -> bytes | None:
    if event.thumbnail:
        return base64.b64decode(event.thumbnail)
    else:
        try:
            with open(
                os.path.join(THUMB_DIR, event.camera, f"{event.id}.webp"), "rb"
            ) as f:
                return f.read()
        except Exception:
            return None


def get_event_snapshot(event: Event) -> ndarray:
    media_name = f"{event.camera}-{event.id}"
    return cv2.imread(f"{os.path.join(CLIPS_DIR, media_name)}.jpg")


### Deletion


def delete_event_images(event: Event) -> bool:
    return delete_event_snapshot(event) and delete_event_thumbnail(event)


def delete_event_snapshot(event: Event) -> bool:
    media_name = f"{event.camera}-{event.id}"
    media_path = Path(f"{os.path.join(CLIPS_DIR, media_name)}.jpg")

    try:
        media_path.unlink(missing_ok=True)
        media_path = Path(f"{os.path.join(CLIPS_DIR, media_name)}-clean.webp")
        media_path.unlink(missing_ok=True)
        # also delete clean.png (legacy) for backward compatibility
        media_path = Path(f"{os.path.join(CLIPS_DIR, media_name)}-clean.png")
        media_path.unlink(missing_ok=True)
        return True
    except OSError:
        return False


def delete_event_thumbnail(event: Event) -> bool:
    if event.thumbnail:
        return True
    else:
        Path(os.path.join(THUMB_DIR, event.camera, f"{event.id}.webp")).unlink(
            missing_ok=True
        )
        return True


### File Locking


class FileLock:
    """
    A file-based lock for coordinating access to resources across processes.

    Uses fcntl.flock() for proper POSIX file locking on Linux. Supports timeouts,
    stale lock detection, and can be used as a context manager.

    Example:
        ```python
        # Using as a context manager (recommended)
        with FileLock("/path/to/resource.lock", timeout=60):
            # Critical section
            do_something()

        # Manual acquisition and release
        lock = FileLock("/path/to/resource.lock")
        if lock.acquire(timeout=60):
            try:
                do_something()
            finally:
                lock.release()
        ```

    Attributes:
        lock_path: Path to the lock file
        timeout: Maximum time to wait for lock acquisition (seconds)
        poll_interval: Time to wait between lock acquisition attempts (seconds)
        stale_timeout: Time after which a lock is considered stale (seconds)
    """

    def __init__(
        self,
        lock_path: str | Path,
        timeout: int = 300,
        poll_interval: float = 1.0,
        stale_timeout: int = 600,
        cleanup_stale_on_init: bool = False,
    ):
        """
        Initialize a FileLock.

        Args:
            lock_path: Path to the lock file
            timeout: Maximum time to wait for lock acquisition in seconds (default: 300)
            poll_interval: Time to wait between lock attempts in seconds (default: 1.0)
            stale_timeout: Time after which a lock is considered stale in seconds (default: 600)
            cleanup_stale_on_init: Whether to clean up stale locks on initialization (default: False)
        """
        self.lock_path = Path(lock_path)
        self.timeout = timeout
        self.poll_interval = poll_interval
        self.stale_timeout = stale_timeout
        self._fd: Optional[int] = None
        self._acquired = False

        if cleanup_stale_on_init:
            self._cleanup_stale_lock()

    def _cleanup_stale_lock(self) -> bool:
        """
        Clean up a stale lock file if it exists and is old.

        Returns:
            True if lock was cleaned up, False otherwise
        """
        try:
            if self.lock_path.exists():
                # Check if lock file is older than stale_timeout
                lock_age = time.time() - self.lock_path.stat().st_mtime
                if lock_age > self.stale_timeout:
                    logger.warning(
                        f"Removing stale lock file: {self.lock_path} (age: {lock_age:.1f}s)"
                    )
                    self.lock_path.unlink()
                    return True
        except Exception as e:
            logger.error(f"Error cleaning up stale lock: {e}")

        return False

    def is_stale(self) -> bool:
        """
        Check if the lock file is stale (older than stale_timeout).

        Returns:
            True if lock is stale, False otherwise
        """
        try:
            if self.lock_path.exists():
                lock_age = time.time() - self.lock_path.stat().st_mtime
                return lock_age > self.stale_timeout
        except Exception:
            pass

        return False

    def acquire(self, timeout: Optional[int] = None) -> bool:
        """
        Acquire the file lock using fcntl.flock().

        Args:
            timeout: Maximum time to wait for lock in seconds (uses instance timeout if None)

        Returns:
            True if lock acquired, False if timeout or error
        """
        if self._acquired:
            logger.warning(f"Lock already acquired: {self.lock_path}")
            return True

        if timeout is None:
            timeout = self.timeout

        # Ensure parent directory exists
        self.lock_path.parent.mkdir(parents=True, exist_ok=True)

        # Clean up stale lock before attempting to acquire
        self._cleanup_stale_lock()

        try:
            self._fd = os.open(self.lock_path, os.O_CREAT | os.O_RDWR)

            start_time = time.time()
            while time.time() - start_time < timeout:
                try:
                    fcntl.flock(self._fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    self._acquired = True
                    logger.debug(f"Acquired lock: {self.lock_path}")
                    return True
                except (OSError, IOError):
                    # Lock is held by another process
                    if time.time() - start_time >= timeout:
                        logger.warning(f"Timeout waiting for lock: {self.lock_path}")
                        os.close(self._fd)
                        self._fd = None
                        return False

                    time.sleep(self.poll_interval)

            # Timeout reached
            if self._fd is not None:
                os.close(self._fd)
                self._fd = None
            return False

        except Exception as e:
            logger.error(f"Error acquiring lock: {e}")
            if self._fd is not None:
                try:
                    os.close(self._fd)
                except Exception:
                    pass
                self._fd = None
            return False

    def release(self) -> None:
        """
        Release the file lock.

        This closes the file descriptor and removes the lock file.
        """
        if not self._acquired:
            return

        try:
            # Close file descriptor and release fcntl lock
            if self._fd is not None:
                try:
                    fcntl.flock(self._fd, fcntl.LOCK_UN)
                    os.close(self._fd)
                except Exception as e:
                    logger.warning(f"Error closing lock file descriptor: {e}")
                finally:
                    self._fd = None

            # Remove lock file
            if self.lock_path.exists():
                self.lock_path.unlink()
                logger.debug(f"Released lock: {self.lock_path}")

        except FileNotFoundError:
            # Lock file already removed, that's fine
            pass
        except Exception as e:
            logger.error(f"Error releasing lock: {e}")
        finally:
            self._acquired = False

    def __enter__(self):
        """Context manager entry - acquire the lock."""
        if not self.acquire():
            raise TimeoutError(f"Failed to acquire lock: {self.lock_path}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - release the lock."""
        self.release()
        return False

    def __del__(self):
        """Destructor - ensure lock is released."""
        if self._acquired:
            self.release()
