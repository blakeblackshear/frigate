import logging
import os
import threading
from pathlib import Path
from typing import Callable, List

import requests

from frigate.comms.inter_process import InterProcessRequestor
from frigate.const import UPDATE_MODEL_STATE
from frigate.types import ModelStatusTypesEnum
from frigate.util.file import FileLock

logger = logging.getLogger(__name__)


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
            lock_path = f"{path}.lock"
            lock = FileLock(lock_path, cleanup_stale_on_init=True)

            if not os.path.exists(path):
                with lock:
                    if not os.path.exists(path):
                        self.download_func(path)

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
    def download_from_url(url: str, save_path: str, silent: bool = False) -> Path:
        temporary_filename = Path(save_path).with_name(
            os.path.basename(save_path) + ".part"
        )
        temporary_filename.parent.mkdir(parents=True, exist_ok=True)

        if not silent:
            logger.info(f"Downloading model file from: {url}")

        try:
            with requests.get(url, stream=True, allow_redirects=True) as r:
                r.raise_for_status()
                with open(temporary_filename, "wb") as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)

            temporary_filename.rename(save_path)
        except Exception as e:
            logger.error(f"Error downloading model: {str(e)}")
            raise

        if not silent:
            logger.info(f"Downloading complete: {url}")

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
