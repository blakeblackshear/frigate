"""Package the owned inference libraries and pinned AMD runtime dependencies."""

import hashlib
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path("/runtime")
ROCM = Path("/opt/rocm").resolve()
PREFIX = Path("/opt/owned-deps")
DEST = ROOT / "opt/rocm-7.2.4"
PRIVATE_LIB = DEST / "lib/migraphx/lib"


def copy_file(source: Path, destination: Path) -> None:
    """Copy the file and any symlink target beside it."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    if source.is_symlink():
        target = source.resolve(strict=True)
        copy_file(target, destination.parent / target.name)
        destination.unlink(missing_ok=True)
        destination.symlink_to(target.name)
    else:
        shutil.copy2(source, destination)


def native_elf(path: Path) -> bool:
    """Identify x86-64 libraries without interpreting GPU code objects."""
    with path.open("rb") as file:
        header = file.read(20)
    return header[:4] == b"\x7fELF" and header[18:20] == b">\x00"


def main() -> None:
    """Assemble only the inference closure; never enumerate or use a GPU."""
    assert not Path("/dev/kfd").exists() and not Path("/dev/dri").exists()
    PRIVATE_LIB.mkdir(parents=True, exist_ok=True)
    custom_libraries = sorted(PREFIX.rglob("*.so*"))
    assert any(path.name.startswith("libmigraphx_gpu.so") for path in custom_libraries)
    for path in custom_libraries:
        if path.is_file():
            copy_file(path, PRIVATE_LIB / path.name)
    shutil.copytree(PREFIX / "include", DEST / "lib/migraphx/include")
    shutil.copytree(
        PREFIX / "lib/migraphx/include",
        DEST / "lib/migraphx/include",
        dirs_exist_ok=True,
    )
    shutil.copytree(PREFIX / "share/frigate", DEST / "share/frigate")

    # These components can be loaded dynamically, so ldd alone is insufficient.
    # Include both the runtime compiler and the MIOpen/rocBLAS fallback paths.
    roots = (
        "libMIOpen.so*",
        "libamd_comgr.so*",
        "libamdhip64.so*",
        "libhiprtc.so*",
        "libhipblas.so*",
        "libhipblaslt.so*",
        "libhsa-runtime64.so*",
        "librocblas.so*",
        "librocroller.so*",
        "libroctracer64.so*",
        "libroctx64.so*",
    )
    libraries = list(custom_libraries)
    for name in ("migraphx-driver", "migraphx-hiprtc-driver"):
        matches = {path.resolve() for path in PREFIX.rglob(name) if path.is_file()}
        executables = [path for path in matches if native_elf(path)]
        assert len(executables) == 1, f"Missing or ambiguous compiler helper: {name}"
        executable = executables[0]
        copy_file(executable, DEST / "lib/migraphx/bin" / name)
        (DEST / "bin").mkdir(exist_ok=True)
        (DEST / "bin" / name).symlink_to("../lib/migraphx/bin/" + name)
        libraries.append(executable)
    assert (ROCM / "bin/rocminfo").is_file()
    copy_file(ROCM / "bin/rocminfo", DEST / "bin/rocminfo")
    libraries.append(ROCM / "bin/rocminfo")
    for pattern in roots:
        matches = list((ROCM / "lib").glob(pattern))
        if pattern != "librocroller.so*":
            assert matches, f"Missing required AMD library: {pattern}"
        for path in matches:
            copy_file(path, DEST / "lib" / path.name)
            libraries.append(path)

    visited = set()
    while libraries:
        path = libraries.pop().resolve()
        if path in visited or not native_elf(path):
            continue
        visited.add(path)
        linked = subprocess.run(["ldd", str(path)], capture_output=True, text=True)
        assert linked.returncode == 0, linked.stderr
        assert "not found" not in linked.stdout, linked.stdout
        for line in linked.stdout.splitlines():
            fields = line.split()
            if len(fields) >= 3 and fields[1] == "=>" and fields[2].startswith("/"):
                dependency = Path(fields[2])
                resolved = dependency.resolve(strict=True)
                if resolved.is_relative_to(ROCM):
                    copy_file(dependency, DEST / "lib" / dependency.name)
                    libraries.append(dependency)
                elif resolved.is_relative_to(PREFIX):
                    copy_file(dependency, PRIVATE_LIB / dependency.name)
                    libraries.append(dependency)

    shutil.copytree(ROCM / "include/hip", DEST / "include/hip", symlinks=True)
    shutil.copytree(ROCM / "share/miopen/db", DEST / "share/miopen/db", symlinks=True)
    shutil.copytree(
        ROCM / "lib/rocblas/library", DEST / "lib/rocblas/library", symlinks=True
    )
    subprocess.run(
        ["dpkg-deb", "-x", "/inputs/sources/rocblas-gfx900.deb", "/legacy-kernels"],
        check=True,
    )
    legacy = next(Path("/legacy-kernels/opt").glob("rocm-*"))
    kernels = list((legacy / "lib/rocblas/library").glob("*gfx900*"))
    assert kernels, "The legacy package contains no gfx900 kernel bundle"
    for path in kernels:
        copy_file(path, DEST / "lib/rocblas/library" / path.name)
    for path in legacy.glob("share/doc/*"):
        if path.is_dir():
            shutil.copytree(
                path,
                DEST / "share/frigate/licenses/rocblas-6.3.4" / path.name,
                symlinks=True,
            )
    # Preserve upstream notices from both source-built and packaged components.
    for path in ROCM.glob("share/doc/*"):
        if path.is_dir():
            shutil.copytree(path, DEST / "share/doc" / path.name, symlinks=True)
    lock = json.loads(Path("/recipes/source-lock.json").read_text())
    manifest = {
        "source_lock_sha256": hashlib.sha256(
            Path("/recipes/source-lock.json").read_bytes()
        ).hexdigest(),
        "runtime": lock["runtime"],
        "reference_binary_provenance": "not established; this is a new source build",
        "gpu_qualified": False,
        "amd_dependency_libraries": sorted(
            str(path) for path in visited if path.is_relative_to(ROCM)
        ),
        "gfx900_kernel_files": sorted(path.name for path in kernels),
    }
    (DEST / "share/frigate/source-build.json").write_text(
        json.dumps(manifest, indent=2) + "\n"
    )


if __name__ == "__main__":
    main()
