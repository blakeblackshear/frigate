import atexit
import faulthandler
import logging
import multiprocessing as mp
import os
import pathlib
import subprocess
import threading
from logging.handlers import QueueHandler
from multiprocessing.synchronize import Event as MpEvent
from typing import Callable, Optional

from setproctitle import setproctitle

import frigate.log
from frigate.config.logger import LoggerConfig
from frigate.const import CONFIG_DIR


class BaseProcess(mp.Process):
    def __init__(
        self,
        stop_event: MpEvent,
        priority: int,
        *,
        name: Optional[str] = None,
        target: Optional[Callable] = None,
        args: tuple = (),
        kwargs: dict = {},
        daemon: Optional[bool] = None,
    ):
        self.priority = priority
        self.stop_event = stop_event
        super().__init__(
            name=name, target=target, args=args, kwargs=kwargs, daemon=daemon
        )

    def start(self, *args, **kwargs):
        self.before_start()
        super().start(*args, **kwargs)
        self.after_start()

    def before_start(self) -> None:
        pass

    def after_start(self) -> None:
        pass


class FrigateProcess(BaseProcess):
    logger: logging.Logger

    def before_start(self) -> None:
        self.__log_queue = frigate.log.log_listener.queue
        self.__memray_tracker = None

    def pre_run_setup(self, logConfig: LoggerConfig | None = None) -> None:
        os.nice(self.priority)
        setproctitle(self.name)
        threading.current_thread().name = f"process:{self.name}"
        faulthandler.enable()

        # setup logging
        self.logger = logging.getLogger(self.name)
        logging.basicConfig(handlers=[], force=True)
        logging.getLogger().addHandler(QueueHandler(self.__log_queue))

        # Always apply base log level suppressions for noisy third-party libraries
        # even if no specific logConfig is provided
        if logConfig:
            frigate.log.apply_log_levels(
                logConfig.default.value.upper(), logConfig.logs
            )
        else:
            # Apply default INFO level with standard library suppressions
            frigate.log.apply_log_levels("INFO", {})

        self._setup_memray()

    def _setup_memray(self) -> None:
        """Setup memray profiling if enabled via environment variable."""
        memray_modules = os.environ.get("FRIGATE_MEMRAY_MODULES", "")

        if not memray_modules:
            return

        # Extract module name from process name (e.g., "frigate.capture:camera" -> "frigate.capture")
        process_name = self.name
        module_name = (
            process_name.split(":")[0] if ":" in process_name else process_name
        )

        enabled_modules = [m.strip() for m in memray_modules.split(",")]

        if module_name not in enabled_modules and process_name not in enabled_modules:
            return

        try:
            import memray

            reports_dir = pathlib.Path(CONFIG_DIR) / "memray_reports"
            reports_dir.mkdir(parents=True, exist_ok=True)
            safe_name = (
                process_name.replace(":", "_").replace("/", "_").replace("\\", "_")
            )

            binary_file = reports_dir / f"{safe_name}.bin"

            self.__memray_tracker = memray.Tracker(str(binary_file))
            self.__memray_tracker.__enter__()

            # Register cleanup handler to stop tracking and generate HTML report
            # atexit runs on normal exits and most signal-based terminations (SIGTERM, SIGINT)
            # For hard kills (SIGKILL) or segfaults, the binary file is preserved for manual generation
            atexit.register(self._cleanup_memray, safe_name, binary_file)

            self.logger.info(
                f"Memray profiling enabled for module {module_name} (process: {self.name}). "
                f"Binary file (updated continuously): {binary_file}. "
                f"HTML report will be generated on exit: {reports_dir}/{safe_name}.html. "
                f"If process crashes, manually generate with: memray flamegraph {binary_file}"
            )
        except Exception as e:
            self.logger.error(f"Failed to setup memray profiling: {e}", exc_info=True)

    def _cleanup_memray(self, safe_name: str, binary_file: pathlib.Path) -> None:
        """Stop memray tracking and generate HTML report."""
        if self.__memray_tracker is None:
            return

        try:
            self.__memray_tracker.__exit__(None, None, None)
            self.__memray_tracker = None

            reports_dir = pathlib.Path(CONFIG_DIR) / "memray_reports"
            html_file = reports_dir / f"{safe_name}.html"

            result = subprocess.run(
                ["memray", "flamegraph", "--output", str(html_file), str(binary_file)],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result.returncode == 0:
                self.logger.info(f"Memray report generated: {html_file}")
            else:
                self.logger.error(
                    f"Failed to generate memray report: {result.stderr}. "
                    f"Binary file preserved at {binary_file} for manual generation."
                )

            # Keep the binary file for manual report generation if needed
            # Users can run: memray flamegraph {binary_file}

        except subprocess.TimeoutExpired:
            self.logger.error("Memray report generation timed out")
        except Exception as e:
            self.logger.error(f"Failed to cleanup memray profiling: {e}", exc_info=True)
