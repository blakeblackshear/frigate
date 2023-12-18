# This is required to satisfy the chromadb dependency
__import__("pysqlite3")
import sys  # noqa: E402

sys.modules["sqlite3"] = sys.modules.pop("pysqlite3")

import faulthandler  # noqa: E402
import threading  # noqa: E402

from flask import cli  # noqa: E402

from frigate.app import FrigateApp  # noqa: E402

faulthandler.enable()

threading.current_thread().name = "frigate"

cli.show_server_banner = lambda *x: None

if __name__ == "__main__":
    frigate_app = FrigateApp()

    frigate_app.start()
