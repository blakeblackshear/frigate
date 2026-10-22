"""Package the owned 10.1 stack, preserving the SDK's relative library layout."""

import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "owned"))
from gfx90c_code import inspect_gfx90c_code

PREFIX = Path("/opt/owned-deps")
SDK = PREFIX / "sdk"
ROOT = Path("/runtime")
SDK_DEST = ROOT / "opt/rocm-python"
DEST = SDK_DEST / "_rocm_sdk_devel"
PRIVATE = DEST / "lib/migraphx/lib"


def sha256(path: Path) -> str:
    """Hash a native artifact without loading it into memory."""
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def copy_file(source: Path, destination: Path) -> None:
    """Keep SONAME symlinks beside their actual targets."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    if source.is_symlink():
        target = source.resolve(strict=True)
        copy_file(target, destination.parent / target.name)
        destination.unlink(missing_ok=True)
        destination.symlink_to(target.name)
    else:
        destination.unlink(missing_ok=True)
        shutil.copy2(source, destination)


def main() -> None:
    """Assemble runtime files without initializing HSA or enumerating devices."""
    assert not Path("/dev/kfd").exists() and not Path("/dev/dri").exists()
    subprocess.run(
        [
            "python3",
            "/recipes/source_inputs.py",
            "verify",
            "--lock",
            "/recipes/runtime-os-lock.json",
            "--root",
            "/inputs",
        ],
        check=True,
    )
    if SDK_DEST.exists():
        shutil.rmtree(SDK_DEST)
    if (ROOT / "usr").exists():
        shutil.rmtree(ROOT / "usr")
    SDK_DEST.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(SDK, SDK_DEST, symlinks=True)
    alias = ROOT / "opt/rocm-10.1.0"
    alias.unlink(missing_ok=True)
    alias.symlink_to("rocm-python/_rocm_sdk_devel")
    PRIVATE.mkdir(parents=True, exist_ok=True)

    libraries = [
        path
        for path in (PREFIX / "lib").rglob("*.so*")
        if path.is_file() and not path.name.startswith("migraphx.cpython-")
    ]
    assert any(path.name.startswith("libmigraphx_gpu.so") for path in libraries)
    assert (PREFIX / "lib/librockCompiler.a").is_file()
    for path in libraries:
        copy_file(path, PRIVATE / path.name)
    for source in (PREFIX / "include", PREFIX / "lib/migraphx/include"):
        if source.is_dir():
            shutil.copytree(source, DEST / "lib/migraphx/include", dirs_exist_ok=True)

    # Replace the SDK's stock BLAS, not just the linker-facing symlink. Other
    # SDK libraries also resolve this SONAME through their sibling-relative RPATH.
    owned_blas = {path.resolve() for path in (PREFIX / "lib").glob("librocblas.so*")}
    assert len(owned_blas) == 1, "Missing or ambiguous owned rocBLAS"
    blas = owned_blas.pop()
    for path in (PREFIX / "lib").glob("librocblas.so*"):
        copy_file(path, DEST / "lib" / path.name)
    stock_blas = SDK_DEST / "_rocm_sdk_libraries/lib/librocblas.so.5"
    assert stock_blas.is_file()
    stock_blas.unlink()
    shutil.copy2(blas, stock_blas)
    assert sha256(stock_blas) == sha256(blas)

    kernels = PREFIX / "lib/rocblas/library"
    assert kernels.is_dir()
    native_kernels = sorted(
        path for path in kernels.rglob("*gfx90c*") if path.is_file()
    )
    assert native_kernels, "No native gfx90c Tensile library was produced"
    native_code = [
        {"file": str(path.relative_to(kernels)), **inspect_gfx90c_code(path)}
        for path in native_kernels
        if path.suffix in {".co", ".hsaco"}
    ]
    assert native_code, "No native device code objects were produced"
    shutil.copytree(kernels, DEST / "lib/rocblas/library", dirs_exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="rocblas-fatbin-") as temporary:
        fatbin = Path(temporary) / "fatbin"
        subprocess.run(
            [
                "objcopy",
                "-O",
                "binary",
                "--only-section=.hip_fatbin",
                str(blas),
                str(fatbin),
            ],
            check=True,
        )
        fatbin_bytes = fatbin.stat().st_size
        assert fatbin_bytes >= 1_000_000, (
            "rocBLAS device-code section is unexpectedly small"
        )

    bindings = {path.resolve() for path in PREFIX.rglob("migraphx.cpython-311-*.so")}
    assert len(bindings) == 1
    binding = bindings.pop()
    copy_file(binding, DEST / "lib" / binding.name)
    for name in ("migraphx-driver", "migraphx-hiprtc-driver"):
        matches = {path.resolve() for path in PREFIX.rglob(name) if path.is_file()}
        # CMake can also install a shell convenience wrapper. Select the ELF.
        native = [path for path in matches if path.open("rb").read(4) == b"\x7fELF"]
        assert len(native) == 1, f"Missing or ambiguous {name}"
        copy_file(native[0], DEST / "lib/migraphx/bin" / name)
        helper = DEST / "bin" / name
        helper.unlink(missing_ok=True)
        helper.symlink_to("../lib/migraphx/bin/" + name)
    assert (DEST / "bin/rocminfo").is_file()

    with tempfile.TemporaryDirectory(prefix="runtime-os-") as temporary:
        extracted = Path(temporary)
        for package in sorted(Path("/inputs/runtime-os").glob("*.deb")):
            subprocess.run(["dpkg-deb", "-x", str(package), temporary], check=True)
        shutil.copytree(
            extracted / "usr/include",
            ROOT / "usr/include",
            symlinks=True,
            dirs_exist_ok=True,
        )
        shutil.copytree(
            extracted / "usr/lib/gcc/x86_64-linux-gnu/14",
            ROOT / "usr/lib/gcc/x86_64-linux-gnu/14",
            symlinks=True,
            dirs_exist_ok=True,
        )
        for pattern in (
            "usr/lib/x86_64-linux-gnu/libnuma.so.*",
            "usr/lib/llvm-19/lib/libomp.so*",
        ):
            for source in extracted.glob(pattern):
                copy_file(source, ROOT / "usr/lib/x86_64-linux-gnu" / source.name)
        shutil.copytree(
            extracted / "usr/share/doc",
            ROOT / "usr/share/doc",
            symlinks=True,
            dirs_exist_ok=True,
        )

    # Upstream's split Python helper links to libpython, unlike the standalone
    # 7.2 binding. Use the exact Debian runtime that supplied its build headers.
    with tempfile.TemporaryDirectory(prefix="runtime-python-") as temporary:
        extracted = Path(temporary)
        for package in sorted(Path("/inputs/builder").glob("libpython3.11*.deb")):
            subprocess.run(["dpkg-deb", "-x", str(package), temporary], check=True)
        python_libraries = list(
            extracted.glob("usr/lib/x86_64-linux-gnu/libpython3.11.so*")
        )
        assert python_libraries, "Missing locked CPython shared runtime"
        for library in python_libraries:
            copy_file(library, PRIVATE / library.name)
        copyright_file = extracted / "usr/share/doc/libpython3.11-minimal/copyright"
        assert copyright_file.is_file()
        license_dir = DEST / "share/frigate/licenses/python3.11"
        license_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(copyright_file, license_dir / "copyright")

    metadata = DEST / "share/frigate"
    shutil.copytree(PREFIX / "share/frigate", metadata, dirs_exist_ok=True)
    shutil.copy2("/recipes/runtime-os-lock.json", metadata)
    lock = json.loads(Path("/recipes/source-lock.json").read_text())
    manifest = {
        "source_lock_sha256": sha256(metadata / "source-lock.json"),
        "runtime_os_lock_sha256": sha256(metadata / "runtime-os-lock.json"),
        "python_binding_sha256": sha256(binding),
        "python_shared_runtime_sha256": sha256(PRIVATE / "libpython3.11.so.1.0"),
        "classic_compiler_archive_sha256": sha256(PREFIX / "lib/librockCompiler.a"),
        "runtime": lock["runtime"],
        "reference_binary_provenance": "owned source build; no Gary binary payload",
        "gpu_qualified": False,
        "rocblas_source_binary_sha256": sha256(blas),
        "rocblas_fatbin_bytes": fatbin_bytes,
        "gfx90c_kernel_files": [
            str(path.relative_to(kernels)) for path in native_kernels
        ],
        "gfx90c_kernel_code_objects": native_code,
        "sdk_layout": "AMD wheel siblings, with owned rocBLAS replacing stock SONAME",
    }
    (metadata / "source-build.json").write_text(json.dumps(manifest, indent=2) + "\n")
    assert os.access(DEST / "bin/rocminfo", os.X_OK)


if __name__ == "__main__":
    main()
