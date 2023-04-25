"""Recordings Utilities."""

import os


def remove_empty_directories(directory: str) -> None:
    # list all directories recursively and sort them by path,
    # longest first
    paths = sorted(
        [x[0] for x in os.walk(directory)],
        key=lambda p: len(str(p)),
        reverse=True,
    )
    for path in paths:
        # don't delete the parent
        if path == directory:
            continue
        if len(os.listdir(path)) == 0:
            os.rmdir(path)
