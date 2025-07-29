import logging
import os
import socket
import threading
import time
from pathlib import Path
from typing import Callable, List, Optional, Tuple
from urllib.parse import urlparse

import requests

from frigate.comms.inter_process import InterProcessRequestor
from frigate.const import UPDATE_MODEL_STATE
from frigate.types import ModelStatusTypesEnum

logger = logging.getLogger(__name__)

# Mirror mapping configuration
MIRROR_MAPPING = {
    "raw.githubusercontent.com": "raw.gh.mirror.frigate-cn.video",
    "github.com": "gh.mirror.frigate-cn.video",
    "huggingface.co": "hf.mirror.frigate-cn.video",
}

# Global flag to force using official sources only
FORCE_OFFICIAL_SOURCE = False


def measure_latency(host: str, port: int = 80, timeout: float = 2.0) -> Optional[float]:
    """
    Measure the latency to a host using a TCP connection.
    Returns the latency in milliseconds or None if the connection failed.
    """
    try:
        start_time = time.time()
        with socket.create_connection((host, port), timeout=timeout):
            end_time = time.time()
        return (end_time - start_time) * 1000  # Convert to milliseconds
    except (socket.timeout, socket.error):
        return None


def set_force_official_source(force: bool = True) -> None:
    """
    Set the global flag to force using only official sources.
    """
    global FORCE_OFFICIAL_SOURCE
    FORCE_OFFICIAL_SOURCE = force
    if force:
        logger.info("Forced to use official sources only")


def get_best_mirror(url: str, latency_threshold: int = 20) -> Tuple[str, bool]:
    """
    Determine the best URL to use based on latency measurements.
    Returns a tuple of (url_to_use, is_mirror).
    """
    if FORCE_OFFICIAL_SOURCE:
        return url, False

    parsed_url = urlparse(url)
    host = parsed_url.netloc

    # Check if this URL has a mirror
    mirror_host = MIRROR_MAPPING.get(host)
    if not mirror_host:
        return url, False

    # Measure latency to both hosts
    official_latency = measure_latency(host)
    mirror_latency = measure_latency(mirror_host)

    # Log latency information
    if official_latency is not None and mirror_latency is not None:
        logger.info(
            f"Latency - Official: {official_latency:.2f}ms, Mirror: {mirror_latency:.2f}ms"
        )

    # Determine which URL to use
    use_mirror = False
    if official_latency is None:
        # Official site unreachable, try mirror
        use_mirror = mirror_latency is not None
    elif mirror_latency is None:
        # Mirror unreachable, use official
        use_mirror = False
    else:
        # Both reachable, compare latency
        use_mirror = mirror_latency < (official_latency - latency_threshold)

    if use_mirror:
        mirror_url = url.replace(host, mirror_host)
        logger.info(f"Using mirror: {mirror_url}")
        return mirror_url, True

    return url, False


class FileLock:
    def __init__(self, path):
        self.path = path
        self.lock_file = f"{path}.lock"

        # we have not acquired the lock yet so it should not exist
        if os.path.exists(self.lock_file):
            try:
                os.remove(self.lock_file)
            except Exception:
                pass

    def acquire(self):
        parent_dir = os.path.dirname(self.lock_file)
        os.makedirs(parent_dir, exist_ok=True)

        while True:
            try:
                with open(self.lock_file, "x"):
                    return
            except FileExistsError:
                time.sleep(0.1)

    def release(self):
        try:
            os.remove(self.lock_file)
        except FileNotFoundError:
            pass


class ModelDownloader:
    def __init__(
        self,
        model_name: str,
        download_path: str,
        file_names: List[str],
        download_func: Callable[[str], None],
        complete_func: Callable[[], None] | None = None,
        silent: bool = False,
    ):
        self.model_name = model_name
        self.download_path = download_path
        self.file_names = file_names
        self.download_func = download_func
        self.complete_func = complete_func
        self.silent = silent
        self.requestor = InterProcessRequestor()
        self.download_thread = None
        self.download_complete = threading.Event()

    def ensure_model_files(self):
        self.mark_files_state(
            self.requestor,
            self.model_name,
            self.file_names,
            ModelStatusTypesEnum.downloading,
        )
        self.download_thread = threading.Thread(
            target=self._download_models,
            name=f"_download_model_{self.model_name}",
            daemon=True,
        )
        self.download_thread.start()

    def _download_models(self):
        for file_name in self.file_names:
            path = os.path.join(self.download_path, file_name)
            lock = FileLock(path)

            if not os.path.exists(path):
                lock.acquire()
                try:
                    if not os.path.exists(path):
                        self.download_func(path)
                finally:
                    lock.release()

            self.requestor.send_data(
                UPDATE_MODEL_STATE,
                {
                    "model": f"{self.model_name}-{file_name}",
                    "state": ModelStatusTypesEnum.downloaded,
                },
            )

        if self.complete_func:
            self.complete_func()

        self.requestor.stop()
        self.download_complete.set()

    @staticmethod
    def download_from_url(
        url: str, save_path: str, silent: bool = False, use_mirror: bool = True
    ) -> Path:
        temporary_filename = Path(save_path).with_name(
            os.path.basename(save_path) + ".part"
        )
        temporary_filename.parent.mkdir(parents=True, exist_ok=True)

        # Check if we should use a mirror
        download_url = url
        if use_mirror:
            download_url, is_mirror = get_best_mirror(url)

        if not silent:
            logger.info(f"Downloading model file from: {download_url}")

        try:
            with requests.get(download_url, stream=True, allow_redirects=True) as r:
                r.raise_for_status()
                with open(temporary_filename, "wb") as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)

            temporary_filename.rename(save_path)
        except Exception as e:
            logger.error(f"Error downloading model: {str(e)}")
            # If mirror failed, try official source as fallback
            if download_url != url:
                logger.info(f"Mirror download failed, trying official source: {url}")
                return ModelDownloader.download_from_url(
                    url, save_path, silent, use_mirror=False
                )
            raise

        if not silent:
            logger.info(f"Downloading complete: {download_url}")

        return Path(save_path)

    @staticmethod
    def mark_files_state(
        requestor: InterProcessRequestor,
        model_name: str,
        files: list[str],
        state: ModelStatusTypesEnum,
    ) -> None:
        for file_name in files:
            requestor.send_data(
                UPDATE_MODEL_STATE,
                {
                    "model": f"{model_name}-{file_name}",
                    "state": state,
                },
            )

    def wait_for_download(self):
        self.download_complete.wait()
