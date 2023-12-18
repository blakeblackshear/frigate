__import__("pysqlite3")
import sys

sys.modules["sqlite3"] = sys.modules.pop("pysqlite3")

import faulthandler
import threading

from flask import cli

from frigate.app import FrigateApp

faulthandler.enable()

threading.current_thread().name = "frigate"

cli.show_server_banner = lambda *x: None

if __name__ == "__main__":
    frigate_app = FrigateApp()

    frigate_app.start()
