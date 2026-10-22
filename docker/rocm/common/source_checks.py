"""Qualify the owned runtime in a container without network or GPU devices."""

import argparse
import importlib.metadata
import json
import logging
import os
import subprocess
import sys
import tempfile
import traceback
from pathlib import Path

from offline_checks import (
    check_hiprtc,
    check_migrations,
    require_isolation,
    sha256,
)


def check_linking() -> dict:
    """Reject any unresolved native library in the packaged inference closure."""
    root = Path("/opt/rocm").resolve()
    manifest = json.loads((root / "share/frigate/source-build.json").read_text())
    assert not manifest["gpu_qualified"]
    runtime = manifest["runtime"]["rocm"]
    assert runtime == os.environ.get("FRIGATE_OFFLINE_EXPECTED_ROCM", "7.2.4")
    assert root == Path("/opt/rocm-" + runtime).resolve()
    assert manifest["source_lock_sha256"] == sha256(
        root / "share/frigate/source-lock.json"
    )
    assert manifest["runtime_os_lock_sha256"] == sha256(
        root / "share/frigate/runtime-os-lock.json"
    )
    expected = {
        "HSA_ENABLE_SDMA": "0",
        "HSA_OVERRIDE_GFX_VERSION": "9.0.0",
        "MIGRAPHX_DISABLE_MIOPEN_FUSION": "1",
        "MIGRAPHX_DISABLE_SCHEDULE_PASS": "1",
        "MIGRAPHX_DISABLE_REDUCE_FUSION": "1",
        "MIGRAPHX_ENABLE_HIPRTC_WORKAROUNDS": "1",
        "MIOPEN_CUSTOM_CACHE_DIR": "/config/model_cache/migraphx",
        "MIOPEN_USER_DB_PATH": "/config/model_cache/migraphx",
        "AMD_COMGR_CACHE": "1",
        "AMD_COMGR_CACHE_DIR": "/config/model_cache/migraphx",
        "FRIGATE_MIGRAPHX_CONSERVE_CPU": "1",
        "FRIGATE_MIGRAPHX_FAST_MATH": "1",
        "FRIGATE_MIGRAPHX_EXHAUSTIVE_TUNE": "1",
    }
    namespace = os.environ.get("FRIGATE_MIGRAPHX_CACHE_NAMESPACE")
    if namespace:
        for name in (
            "MIOPEN_CUSTOM_CACHE_DIR",
            "MIOPEN_USER_DB_PATH",
            "AMD_COMGR_CACHE_DIR",
        ):
            expected[name] += "/" + namespace
    if runtime == "10.1.0":
        expected.pop("HSA_OVERRIDE_GFX_VERSION")
        expected["FRIGATE_ROCM_NATIVE_GFX90C"] = "1"
        assert "HSA_OVERRIDE_GFX_VERSION" not in os.environ
        assert manifest["runtime"]["rocmlir_implementation"] == "classic"
        assert manifest["runtime"]["rocmlir_dialect_api"] == 6
        blas = root / "lib/librocblas.so"
        assert sha256(blas.resolve()) == manifest["rocblas_source_binary_sha256"]
        assert manifest["rocblas_fatbin_bytes"] >= 1_000_000
        assert manifest["gfx90c_kernel_files"]
        sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "owned"))
        from gfx90c_code import inspect_gfx90c_code

        for name in manifest["gfx90c_kernel_files"]:
            if Path(name).suffix in {".co", ".hsaco"}:
                inspect_gfx90c_code(root / "lib/rocblas/library" / name)
        assert (
            sha256(root / "lib/migraphx/lib/libpython3.11.so.1.0")
            == manifest["python_shared_runtime_sha256"]
        )
    assert all(os.environ.get(key) == value for key, value in expected.items())
    assert Path("/usr/include/features.h").is_file()
    assert Path("/usr/include/c++/14").is_dir()
    assert Path("/usr/include/x86_64-linux-gnu/c++/14").is_dir()
    binding = root / "lib/migraphx.cpython-311-x86_64-linux-gnu.so"
    assert sha256(binding) == manifest["python_binding_sha256"]
    helpers = {
        root / "bin" / name
        for name in ("migraphx-driver", "migraphx-hiprtc-driver", "rocminfo")
    }
    assert all(path.is_file() and os.access(path, os.X_OK) for path in helpers)
    checked = []
    relocations_checked = 0
    library_paths = (
        root.rglob("*.so*")
        if runtime == "7.2.4"
        else list((root / "lib").glob("*.so*"))
        + list((root / "lib/migraphx/lib").glob("*.so*"))
    )
    for path in sorted(
        {path.resolve() for path in library_paths if path.is_file()}
        | {path.resolve() for path in helpers}
    ):
        with path.open("rb") as file:
            header = file.read(20)
        if header[:4] != b"\x7fELF" or header[18:20] != b">\x00":
            continue
        result = subprocess.run(["ldd", str(path)], capture_output=True, text=True)
        assert result.returncode == 0, f"ldd failed for {path}"
        assert "not found" not in result.stdout, result.stdout
        # CPython supplies extension-module symbols during the import below.
        # Standalone native libraries and helpers must resolve their own symbols.
        if path != binding:
            relocated = subprocess.run(
                ["ldd", "-r", str(path)], capture_output=True, text=True
            )
            details = relocated.stdout + relocated.stderr
            assert relocated.returncode == 0, details
            assert "not found" not in details, details
            assert "undefined symbol:" not in details, details
            relocations_checked += 1
        checked.append(str(path))
    assert checked
    sys.path.insert(0, "/opt/rocm/lib")
    import migraphx
    import onnxruntime

    assert Path(migraphx.__file__).resolve() == binding.resolve()
    assert onnxruntime.__version__ == "1.30.0"
    assert "CPUExecutionProvider" in onnxruntime.get_available_providers()
    assert not any(
        "MIGraphX" in provider for provider in onnxruntime.get_available_providers()
    )
    assert not any(
        distribution.metadata["Name"].lower().startswith("rocm-sdk")
        for distribution in importlib.metadata.distributions()
    )
    from frigate.version import VERSION

    from frigate.app import FrigateApp
    from frigate.detectors.detector_types import api_types

    assert FrigateApp is not None and "migraphx" in api_types
    assert VERSION == os.environ.get(
        "FRIGATE_OFFLINE_EXPECTED_VERSION", "0.19.0-5bb2cde"
    )
    pip = subprocess.run(
        [sys.executable, "-m", "pip", "check"], capture_output=True, text=True
    )
    assert pip.returncode == 0, pip.stdout + pip.stderr
    return {
        "frigate_version": VERSION,
        "binding_sha256": sha256(binding),
        "native_libraries_and_helpers_checked": len(checked),
        "native_relocation_checks": relocations_checked,
        "unresolved_dependencies": 0,
        "binding_and_application_imports": "passed",
        "ort_providers": onnxruntime.get_available_providers(),
        "pip_check": "passed",
        "compatibility_environment": expected,
        "source_lock_sha256": manifest["source_lock_sha256"],
        "runtime_os_lock_sha256": manifest["runtime_os_lock_sha256"],
        "gpu_enumeration_execution": False,
    }


def check_reference() -> dict:
    """Run CPU reference arithmetic and parse the real ONNX model without GPU use."""
    sys.path.insert(0, "/opt/rocm/lib")
    import migraphx
    import numpy as np

    left_values = np.array([-3, 0, 2, 8], dtype=np.float32)
    right_values = np.array([1, -2, 4, 0.5], dtype=np.float32)
    for target in ("ref", "cpu"):
        program = migraphx.program()
        module = program.get_main_module()
        shape = migraphx.shape(type="float_type", lens=[4])
        left = module.add_parameter("left", shape=shape)
        right = module.add_parameter("right", shape=shape)
        output = module.add_instruction(migraphx.op("add"), [left, right])
        module.add_return([output])
        program.compile(migraphx.get_target(target))
        actual = np.array(
            program.run(
                {
                    "left": migraphx.argument(left_values),
                    "right": migraphx.argument(right_values),
                }
            )[0]
        )
        np.testing.assert_array_equal(actual, left_values + right_values)
    model = Path("/config/model_cache/yolo26s-distill_320.onnx")
    assert (
        sha256(model)
        == "6c2662cd56393e30041cc67ca14b18c20388d7234ebd159b3eb998ec5371197e"
    )
    parsed = migraphx.parse_onnx(str(model))
    inputs = {
        name: list(value.lens())
        for name, value in parsed.get_parameter_shapes().items()
    }
    outputs = [list(value.lens()) for value in parsed.get_output_shapes()]
    assert list(inputs.values()) == [[1, 3, 320, 320]]
    assert outputs == [[1, 300, 6]]
    return {
        "cpu_reference_arithmetic": "passed",
        "onednn_cpu_arithmetic": "passed",
        "onnx_parser": "passed",
        "model_sha256": sha256(model),
        "input_shapes": inputs,
        "output_shapes": outputs,
        "full_model_inference": False,
        "gpu_enumeration_compilation_execution": False,
    }


def pack_compile_request(value: str | bool | list | dict) -> bytes:
    """Encode the helper's four MessagePack value types without extra packages."""
    if isinstance(value, bool):
        return b"\xc3" if value else b"\xc2"
    if isinstance(value, str):
        encoded = value.encode()
        return b"\xdb" + len(encoded).to_bytes(4, "big") + encoded
    if isinstance(value, list):
        return (
            b"\xdd"
            + len(value).to_bytes(4, "big")
            + b"".join(map(pack_compile_request, value))
        )
    if isinstance(value, dict):
        return (
            b"\xdf"
            + len(value).to_bytes(4, "big")
            + b"".join(
                pack_compile_request(key) + pack_compile_request(item)
                for key, item in value.items()
            )
        )
    raise TypeError("Unsupported compile-request value")


def unpack_compile_reply(data: bytes) -> bytes:
    """Decode 2.18's single-key reply with one binary chunk for this tiny kernel."""
    # MIGraphX wraps binary data in an array of chunks, even below its 4 GiB
    # chunk limit. This probe is small enough to require exactly one chunk.
    prefix = b"\x81\xabcode_object\x91"
    if not data.startswith(prefix) or len(data) <= len(prefix):
        raise ValueError("Unexpected HIPRTC driver reply")
    offset = len(prefix)
    length_bytes = {0xC4: 1, 0xC5: 2, 0xC6: 4}.get(data[offset])
    if length_bytes is None or len(data) < offset + 1 + length_bytes:
        raise ValueError("Missing HIPRTC binary payload length")
    length = int.from_bytes(data[offset + 1 : offset + 1 + length_bytes], "big")
    offset += 1 + length_bytes
    if len(data) != offset + length:
        raise ValueError("Truncated or trailing HIPRTC binary payload")
    return data[offset:]


def check_helper() -> dict:
    """Use each pinned MIGraphX driver's actual protocol without GPU access."""
    request = {
        "srcs": [
            {
                "path": "owned724-helper-check.cpp",
                "content": '#include <type_traits>\nstatic_assert(std::is_floating_point<float>::value, "float trait");\nextern "C" __global__ void check(float* x) { x[0] += 1.0f; }\n',
            }
        ],
        "params": [
            "-std=c++17",
            "-I/usr/include/c++/14",
            "-I/usr/include/x86_64-linux-gnu/c++/14",
            "-I/usr/include",
            "-I/usr/include/x86_64-linux-gnu",
        ],
        "arch": os.environ.get("FRIGATE_OFFLINE_ARCH", "gfx900"),
        "quiet": False,
    }
    with tempfile.TemporaryDirectory(prefix="owned724-helper-") as directory:
        output = Path(directory) / "check.hsaco"
        stdout_protocol = os.environ.get("FRIGATE_OFFLINE_EXPECTED_ROCM") == "10.1.0"
        result = subprocess.run(
            ["/opt/rocm/bin/migraphx-hiprtc-driver"]
            + ([] if stdout_protocol else [str(output)]),
            input=pack_compile_request(request),
            capture_output=True,
            timeout=90,
        )
        assert result.returncode == 0, result.stderr.decode(errors="replace")
        if stdout_protocol:
            code = unpack_compile_reply(result.stdout)
        else:
            # The older helper can return zero without producing a code object.
            assert output.is_file(), result.stderr.decode(errors="replace")
            code = output.read_bytes()
        assert code[:4] == b"\x7fELF" and code[18:20] == b"\xe0\x00"
        assert (
            int.from_bytes(code[48:52], "little") & 0xFF
            == {
                "gfx900": 0x2C,
                "gfx90c": 0x32,
            }[request["arch"]]
        )
        artifact = Path("/tmp/qualified-helper.hsaco")
        artifact.write_bytes(code)
        artifact.chmod(0o600)
        return {
            "migraphx_hiprtc_helper": "passed",
            "explicit_target": request["arch"],
            "code_bytes": len(code),
            "code_sha256": sha256(artifact),
            "protocol": "stdout-msgpack" if stdout_protocol else "output-file",
            "gpu_devices_exposed": False,
            "gpu_enumeration_execution": False,
        }


def main() -> None:
    """Print a sanitized result and retain any sensitive exception privately."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "mode", choices=("linking", "hiprtc", "helper", "reference", "migrations")
    )
    args = parser.parse_args()
    require_isolation()
    for name in (
        "MIOPEN_CUSTOM_CACHE_DIR",
        "MIOPEN_USER_DB_PATH",
        "AMD_COMGR_CACHE_DIR",
    ):
        Path(os.environ[name]).mkdir(parents=True, exist_ok=True)
    logging.disable(logging.CRITICAL)
    try:
        result = {
            "linking": check_linking,
            "hiprtc": lambda: check_hiprtc(
                os.environ.get("FRIGATE_OFFLINE_ARCH", "gfx900")
            ),
            "helper": check_helper,
            "reference": check_reference,
            "migrations": check_migrations,
        }[args.mode]()
    except Exception as error:
        error_path = Path(f"/tmp/owned724-{args.mode}-error.txt")
        error_path.write_text(traceback.format_exc())
        error_path.chmod(0o600)
        print(
            json.dumps(
                {
                    "state": "failed",
                    "error_type": type(error).__name__,
                    "private_error_log": str(error_path),
                }
            )
        )
        sys.exit(1)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
