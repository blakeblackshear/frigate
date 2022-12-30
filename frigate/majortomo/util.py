"""Utilities and helpers useful in other modules"""
from typing import Text, Union

TextOrBytes = Union[Text, bytes]


def text_to_ascii_bytes(text: TextOrBytes) -> bytes:
    """Convert a text-or-bytes value to ASCII-encoded bytes

    If the input is already `bytes`, we simply return it as is
    """
    if isinstance(text, str):
        return text.encode("ascii", "strict")
    return text


def id_to_int(id_):
    # type: (Union[bytes, str]) -> int
    """Convert a ZMQ client ID to printable integer

    This is needed to log client IDs while maintaining Python cross-version compatibility (so we can't use bytes.hex()
    for example)
    """
    i = 0
    for c in id_:
        if not isinstance(c, int):
            c = ord(c)
        i = (i << 8) + c
    return i
