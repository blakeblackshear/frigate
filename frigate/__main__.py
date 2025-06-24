import argparse
import faulthandler
import multiprocessing as mp
import signal
import sys
import threading
from typing import Union

import ruamel.yaml
from pydantic import ValidationError

from frigate.app import FrigateApp
from frigate.config import FrigateConfig
from frigate.log import setup_logging
from frigate.util.config import find_config_file


def main() -> None:
    manager = mp.Manager()
    faulthandler.enable()

    # Setup the logging thread
    setup_logging(manager)

    threading.current_thread().name = "frigate"
    stop_event = mp.Event()

    # send stop event on SIGINT
    signal.signal(signal.SIGINT, lambda sig, frame: stop_event.set())

    # Make sure we exit cleanly on SIGTERM.
    signal.signal(signal.SIGTERM, lambda sig, frame: sys.exit())

    # Parse the cli arguments.
    parser = argparse.ArgumentParser(
        prog="Frigate",
        description="An NVR with realtime local object detection for IP cameras.",
    )
    parser.add_argument("--validate-config", action="store_true")
    args = parser.parse_args()

    # Load the configuration.
    try:
        config = FrigateConfig.load(install=True)
    except ValidationError as e:
        print("*************************************************************")
        print("*************************************************************")
        print("***    Your config file is not valid!                     ***")
        print("***    Please check the docs at                           ***")
        print("***    https://docs.frigate.video/configuration/          ***")
        print("*************************************************************")
        print("*************************************************************")
        print("***    Config Validation Errors                           ***")
        print("*************************************************************\n")
        # Attempt to get the original config file for line number tracking
        config_path = find_config_file()
        with open(config_path, "r") as f:
            yaml_config = ruamel.yaml.YAML()
            yaml_config.preserve_quotes = True
            full_config = yaml_config.load(f)

        for error in e.errors():
            error_path = error["loc"]

            current = full_config
            line_number = "Unknown"
            last_line_number = "Unknown"

            try:
                for i, part in enumerate(error_path):
                    key: Union[int, str] = (
                        int(part) if isinstance(part, str) and part.isdigit() else part
                    )

                    if isinstance(current, ruamel.yaml.comments.CommentedMap):
                        current = current[key]
                    elif isinstance(current, list):
                        if isinstance(key, int):
                            current = current[key]

                    if hasattr(current, "lc"):
                        last_line_number = current.lc.line

                    if i == len(error_path) - 1:
                        if hasattr(current, "lc"):
                            line_number = current.lc.line
                        else:
                            line_number = last_line_number

            except Exception as traverse_error:
                print(f"Could not determine exact line number: {traverse_error}")

            if current != full_config:
                print(f"Line #  : {line_number}")
                print(f"Key     : {' -> '.join(map(str, error_path))}")
                print(f"Value   : {error.get('input', '-')}")
            print(f"Message : {error.get('msg', error.get('type', 'Unknown'))}\n")

        print("*************************************************************")
        print("***    End Config Validation Errors                       ***")
        print("*************************************************************")

        # attempt to start Frigate in recovery mode
        try:
            config = FrigateConfig.load(install=True, safe_load=True)
            print("Starting Frigate in safe mode.")
        except ValidationError:
            print("Unable to start Frigate in safe mode.")
            sys.exit(1)
    if args.validate_config:
        print("*************************************************************")
        print("*** Your config file is valid.                            ***")
        print("*************************************************************")
        sys.exit(0)

    # Run the main application.
    FrigateApp(config, manager, stop_event).start()


if __name__ == "__main__":
    mp.set_forkserver_preload(
        [
            # Standard library and core dependencies
            "sqlite3",
            # Third-party libraries commonly used in Frigate
            "numpy",
            "cv2",
            "peewee",
            "zmq",
            "ruamel.yaml",
            # Frigate core modules
            "frigate.camera.maintainer",
        ]
    )
    mp.set_start_method("forkserver", force=True)
    main()
