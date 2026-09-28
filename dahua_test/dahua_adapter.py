"""Compatibility imports for the legacy Dahua simulator UI."""

import sys
from pathlib import Path

repository_root = Path(__file__).resolve().parents[1]
if str(repository_root) not in sys.path:
    sys.path.insert(0, str(repository_root))

from frigate.dahua_adapter import (
    DahuaAccessController,
    DahuaNotSupported,
    DahuaOperationError,
)

__all__ = ["DahuaAccessController", "DahuaNotSupported", "DahuaOperationError"]
