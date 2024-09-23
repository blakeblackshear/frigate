import argparse
import faulthandler
import logging
import signal
import sys
import threading

from flask import cli
from pydantic import ValidationError

from frigate.app import FrigateApp
from frigate.config import FrigateConfig
from frigate.log import log_thread


def main() -> None:
    faulthandler.enable()

    # Clear all existing handlers.
    logging.basicConfig(
        level=logging.INFO,
        handlers=[],
        force=True,
    )

    threading.current_thread().name = "frigate"
    cli.show_server_banner = lambda *x: None

    # Make sure we exit cleanly on SIGTERM.
    signal.signal(signal.SIGTERM, lambda sig, frame: sys.exit())

    run()


@log_thread()
def run() -> None:
    # Parse the cli arguments.
    parser = argparse.ArgumentParser(
        prog="Frigate",
        description="An NVR with realtime local object detection for IP cameras.",
    )
    parser.add_argument("--validate-config", action="store_true")
    args = parser.parse_args()

    # Load the configuration.
    try:
        config = FrigateConfig.load()
    except ValidationError as e:
        print("*************************************************************")
        print("*************************************************************")
        print("***    Your config file is not valid!                     ***")
        print("***    Please check the docs at                           ***")
        print("***    https://docs.frigate.video/configuration/          ***")
        print("*************************************************************")
        print("*************************************************************")
        print("***    Config Validation Errors                           ***")
        print("*************************************************************")
        for error in e.errors():
            location = ".".join(str(item) for item in error["loc"])
            print(f"{location}: {error['msg']}")
        print("*************************************************************")
        print("***    End Config Validation Errors                       ***")
        print("*************************************************************")
        sys.exit(1)
    if args.validate_config:
        print("*************************************************************")
        print("*** Your config file is valid.                            ***")
        print("*************************************************************")
        sys.exit(0)

    # Run the main application.
    FrigateApp(config).start()


if __name__ == "__main__":
    main()
