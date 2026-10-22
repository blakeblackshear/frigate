"""Verify native code inside ELF and LLVM compressed offload containers."""

import os
import subprocess
import tempfile
from pathlib import Path


def inspect_gfx90c_code(path: Path) -> dict:
    """Inspect actual ELF flags, unpacking compressed Tensile bundles first."""
    with path.open("rb") as stream:
        header = stream.read(64)
    if header[:4] == b"CCOB":
        candidates = [
            Path("/opt/rocm") / suffix
            for suffix in (
                "bin/clang-offload-bundler",
                "lib/llvm/bin/clang-offload-bundler",
                "llvm/bin/clang-offload-bundler",
            )
        ]
        tool = next(
            (candidate for candidate in candidates if os.access(candidate, os.X_OK)),
            None,
        )
        assert tool is not None, "The pinned SDK offload-bundle tool is missing"
        result = subprocess.run(
            [str(tool), "--type=o", "--list", "--input=" + str(path)],
            capture_output=True,
            text=True,
            timeout=60,
        )
        assert result.returncode == 0, result.stderr
        targets = [line.strip() for line in result.stdout.splitlines() if line.strip()]
        device_targets = [target for target in targets if "amdgcn" in target]
        assert device_targets and all(
            "--gfx90c" in target for target in device_targets
        ), (path.name, targets)
        objects = []
        with tempfile.TemporaryDirectory(prefix="gfx90c-unbundle-") as temporary:
            for index, target in enumerate(device_targets):
                output = Path(temporary) / f"kernel-{index}.hsaco"
                result = subprocess.run(
                    [
                        str(tool),
                        "--type=o",
                        "--unbundle",
                        "--input=" + str(path),
                        "--targets=" + target,
                        "--output=" + str(output),
                    ],
                    capture_output=True,
                    text=True,
                    timeout=60,
                )
                assert result.returncode == 0, result.stderr
                objects.append({"target": target, **inspect_gfx90c_code(output)})
        return {"container": "compressed-clang-offload-bundle", "objects": objects}
    assert len(header) == 64 and header[:6] == b"\x7fELF\x02\x01", path.name
    machine = int.from_bytes(header[18:20], "little")
    flags = int.from_bytes(header[48:52], "little")
    assert machine == 224 and flags & 0xFF == 0x32, (path.name, machine, flags)
    return {"container": "elf", "machine": machine, "flags": flags}
