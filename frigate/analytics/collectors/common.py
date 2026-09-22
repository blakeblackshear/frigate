"""Helpers the section collectors share."""

import math
from collections import Counter
from enum import Enum
from typing import Any, TypeVar

E = TypeVar("E", bound=Enum)


def closed(enum: type[E], value: Any, fallback: E) -> E:
    """The member for a value, or the fallback for one the enum doesn't know."""
    try:
        return enum(str(value))
    except ValueError:
        return fallback


def rate(value: Any) -> float:
    """A finite, non-negative number rounded to 2 decimals, else 0.

    A NaN would serialize as null and fail the schema's number type.
    """
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0

    if not math.isfinite(number):
        return 0.0

    return round(max(number, 0.0), 2)


def histogram(counter: "Counter[E]") -> dict[E, int]:
    """Drop the empty buckets, since an absent key means zero."""
    return {key: total for key, total in counter.items() if total > 0}
