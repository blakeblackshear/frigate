import faulthandler
import logging
import threading

from frigate.app import FrigateApp


def main() -> None:
    faulthandler.enable()

    # Clear all existing handlers.
    logging.basicConfig(
        level=logging.INFO,
        handlers=[],
        force=True,
    )

    threading.current_thread().name = "frigate"

    # Run the main application.
    FrigateApp().start()


if __name__ == "__main__":
    main()
