"""Retarget the pinned Vega 10 logic headers for Tensile's native gfx90c ISA."""

import hashlib
import json
from pathlib import Path


def retarget(content: bytes) -> bytes:
    """Change only the architecture header, refusing unexpected source layouts."""
    lines = content.splitlines(keepends=True)
    if len(lines) < 4 or lines[1].strip() != b"- vega10":
        raise ValueError("Unexpected Vega 10 logic header")
    if lines[2].strip() not in {b"- gfx900", b"- gfx90c"}:
        raise ValueError("Unexpected source architecture")
    lines[2] = lines[2].replace(b"gfx900", b"gfx90c")
    return b"".join(lines)


def main() -> None:
    """Preserve kernel tuning and let Tensile derive the actual target ISA."""
    root = Path(
        "/work/rocm-libraries/projects/rocblas/library/src/blas3/Tensile/Logic/asm_full/vega10"
    )
    files = sorted(root.glob("*.yaml"))
    assert len(files) == 46, "Pinned asm_full Vega 10 logic set changed"
    records = []
    for path in files:
        original = path.read_bytes()
        target = retarget(original)
        if target != original:
            path.write_bytes(target)
        records.append(
            {
                "file": path.name,
                "output_sha256": hashlib.sha256(target).hexdigest(),
            }
        )
    output = Path("/opt/owned-deps/share/frigate/gfx90c-logic.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(
            {
                "method": "Vega 10 tuning, architecture header gfx900 to gfx90c",
                "reason": "Tensile recognizes gfx90c, but shipped Vega 10 logic names gfx900",
                "kernel_isa": "Derived by pinned Tensile LibraryIO from the gfx90c header",
                "gpu_qualified": False,
                "files": records,
            },
            indent=2,
        )
        + "\n"
    )


if __name__ == "__main__":
    main()
