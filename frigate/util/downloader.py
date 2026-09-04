import logging
import os
import threading
from collections.abc import Callable
from pathlib import Path

import requests

from frigate.comms.inter_process import InterProcessRequestor
from frigate.const import UPDATE_MODEL_STATE, UPDATE_NOTICE
from frigate.types import ModelStatusTypesEnum
from frigate.util.file import FileLock

logger = logging.getLogger(__name__)

# target path -> first line of the last download error for it; every existing
# download function swallows its exceptions, so this is how the downloader
# thread learns why a file is still missing
last_download_error: dict[str, str] = {}


def _first_line(error: BaseException) -> str:
    text = str(error).strip().splitlines()
    return (text[0] if text else type(error).__name__)[:200]


class ModelDownloader:
    def __init__(
        self,
        model_name: str,
        download_path: str,
        file_names: list[str],
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

    def _notice_scope(self, file_name: str) -> str:
        # per file: several loaders share one model_name with disjoint files,
        # so a model wide scope lets one of them clear another's notice
        return f"{self.model_name}/{file_name}"

    def _report_failure(self, file_name: str, error: str) -> None:
        self.requestor.send_data(
            UPDATE_NOTICE,
            {
                "action": "raise",
                "kind": "model_download_failed",
                "scope": self._notice_scope(file_name),
                "params": {"file": file_name, "error": error},
            },
        )

    def _resolve_failure(self, file_name: str) -> None:
        self.requestor.send_data(
            UPDATE_NOTICE,
            {
                "action": "resolve",
                "kind": "model_download_failed",
                "scope": self._notice_scope(file_name),
                "params": {},
            },
        )

    def _send_state(self, file_name: str, state: ModelStatusTypesEnum) -> None:
        self.requestor.send_data(
            UPDATE_MODEL_STATE,
            {"model": f"{self.model_name}-{file_name}", "state": state},
        )

    def _download_models(self):
        for file_name in self.file_names:
            path = os.path.join(self.download_path, file_name)
            lock_path = f"{path}.lock"
            lock = FileLock(lock_path, cleanup_stale_on_init=True)

            if not os.path.exists(path):
                with lock:
                    if not os.path.exists(path):
                        try:
                            self.download_func(path)
                        except Exception as e:
                            self._report_failure(file_name, _first_line(e))
                            self._send_state(file_name, ModelStatusTypesEnum.error)
                            raise

                        if not os.path.exists(path):
                            self._report_failure(
                                file_name,
                                last_download_error.pop(path, "download failed"),
                            )
                            self._send_state(file_name, ModelStatusTypesEnum.error)
                            continue

            self._resolve_failure(file_name)
            self._send_state(file_name, ModelStatusTypesEnum.downloaded)

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
            last_download_error[save_path] = _first_line(e)
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
