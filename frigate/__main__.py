import faulthandler; faulthandler.enable()
import sys
import threading

threading.current_thread().name = "frigate"

from frigate.app import FrigateApp

cli = sys.modules['flask.cli']
cli.show_server_banner = lambda *x: None

if __name__ == '__main__':
    frigate_app = FrigateApp()

    frigate_app.start()
