import faulthandler
import logging
import threading

from flask import cli

from frigate.app import FrigateApp


def main() -> None:
    faulthandler.enable()
    logging.basicConfig(level=logging.INFO, handlers=[])

    threading.current_thread().name = "frigate"
    cli.show_server_banner = lambda *x: None

    # Run the main application.
    FrigateApp().start()


if __name__ == "__main__":
    main()
