import faulthandler
import sys
import threading

from flask import cli

# Hotsawp the sqlite3 module for Chroma compatibility
__import__("pysqlite3")
sys.modules["sqlite3"] = sys.modules.pop("pysqlite3")

faulthandler.enable()

threading.current_thread().name = "frigate"

cli.show_server_banner = lambda *x: None

if __name__ == "__main__":
    from frigate.app import FrigateApp

    frigate_app = FrigateApp()

    frigate_app.start()
