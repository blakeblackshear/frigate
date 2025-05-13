"""Prints the base path as json to stdout."""

import json
import os
from typing import Any

base_path = os.environ.get("FRIGATE_BASE_PATH", "")

result: dict[str, Any] = {"base_path": base_path}

print(json.dumps(result))
