import faulthandler
import threading

from frigate.app import FrigateApp

faulthandler.enable()

threading.current_thread().name = "frigate"

if __name__ == "__main__":
    frigate_app = FrigateApp()

    frigate_app.start()
