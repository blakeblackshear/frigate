"""Fetch or verify the exact cached inputs for the legacy runtime build."""

import argparse
import hashlib
import json
import shutil
import urllib.request
from pathlib import Path


def verify(path: Path, artifact: dict) -> None:
    """Reject incomplete or changed inputs before a compiler is started."""
    if not path.is_file() or path.stat().st_size != artifact["bytes"]:
        raise ValueError(f"Missing or incomplete input: {artifact['path']}")
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    if digest.hexdigest() != artifact["sha256"]:
        raise ValueError(f"Input checksum mismatch: {artifact['path']}")


def selected_artifacts(lock: dict, groups: list[str]) -> list[dict]:
    """Select declared groups without allowing files outside the cache."""
    artifacts = []
    for artifact in lock["artifacts"]:
        path = Path(artifact["path"])
        if path.is_absolute() or ".." in path.parts:
            raise ValueError(f"Invalid cached input path: {path}")
        if not groups or artifact["group"] in groups:
            artifacts.append(artifact)
    if not artifacts:
        raise ValueError("No locked inputs selected")
    return artifacts


def main() -> None:
    """Fetch inputs with networking, or verify them in an offline build."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("fetch", "verify"))
    parser.add_argument("--lock", type=Path, required=True)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--group", action="append", default=[])
    args = parser.parse_args()
    lock = json.loads(args.lock.read_text())
    artifacts = selected_artifacts(lock, args.group)
    for artifact in artifacts:
        path = args.root / artifact["path"]
        if args.mode == "fetch" and not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            temporary = path.with_suffix(path.suffix + ".part")
            with urllib.request.urlopen(artifact["url"], timeout=120) as source:
                with temporary.open("wb") as output:
                    shutil.copyfileobj(source, output)
            verify(temporary, artifact)
            temporary.replace(path)
        verify(path, artifact)
    print(json.dumps({"verified_inputs": len(artifacts), "groups": args.group}))


if __name__ == "__main__":
    main()
