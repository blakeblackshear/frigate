"""Compatibility entry point for the standalone Dahua simulator."""

import sys
from pathlib import Path

repository_root = Path(__file__).resolve().parents[1]
if str(repository_root) not in sys.path:
    sys.path.insert(0, str(repository_root))

from dahua_tools.simulator import app, main

__all__ = ["app", "main"]

if __name__ == "__main__":
    main()
