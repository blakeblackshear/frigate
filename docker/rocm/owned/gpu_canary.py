"""Run one explicitly authorized GPU canary before the full model test.

This command manages no service and performs no reset or reboot. A process
timeout cannot guarantee recovery from a driver hang on a shared physical GPU.
"""

import argparse
import ctypes as ct
import hashlib
import json
import os
import sys
import time
from pathlib import Path

import numpy as np


def require_gpu(allowed: bool) -> None:
    """Check authorization and APU settings before loading a HIP library."""
    if not allowed or not Path("/dev/kfd").exists():
        raise RuntimeError("Canary requires --allow-gpu and approved device access")
    if os.environ.get("HSA_ENABLE_SDMA") != "0":
        raise RuntimeError("HSA_ENABLE_SDMA=0 must precede HIP initialization")
    if os.environ.get("FRIGATE_ROCM_NATIVE_GFX90C") == "1":
        if "HSA_OVERRIDE_GFX_VERSION" in os.environ:
            raise RuntimeError("Native gfx90c mode must not inherit a gfx900 override")
    elif os.environ.get("HSA_OVERRIDE_GFX_VERSION") != "9.0.0":
        raise RuntimeError("The 7.2.4 profile requires the gfx900 override")


class Hip:
    """Bind the stable HIP runtime API declared in the pinned SDK headers."""

    def __init__(self):
        self.lib = ct.CDLL("/opt/rocm/lib/libamdhip64.so")
        signatures = {
            "hipInit": [ct.c_uint],
            "hipSetDeviceFlags": [ct.c_uint],
            "hipGetDeviceFlags": [ct.POINTER(ct.c_uint)],
            "hipMalloc": [ct.POINTER(ct.c_void_p), ct.c_size_t],
            "hipFree": [ct.c_void_p],
            "hipMemcpy": [ct.c_void_p, ct.c_void_p, ct.c_size_t, ct.c_int],
            "hipDeviceSynchronize": [],
            "hipModuleLoad": [ct.POINTER(ct.c_void_p), ct.c_char_p],
            "hipModuleGetFunction": [ct.POINTER(ct.c_void_p), ct.c_void_p, ct.c_char_p],
            "hipModuleUnload": [ct.c_void_p],
            "hipModuleLaunchKernel": [ct.c_void_p]
            + [ct.c_uint] * 7
            + [ct.c_void_p, ct.POINTER(ct.c_void_p), ct.POINTER(ct.c_void_p)],
        }
        for name, arguments in signatures.items():
            function = getattr(self.lib, name)
            function.argtypes, function.restype = arguments, ct.c_int
        self.lib.hipGetErrorString.argtypes = [ct.c_int]
        self.lib.hipGetErrorString.restype = ct.c_char_p
        self.allocations = []
        self.call("hipSetDeviceFlags", 4)
        self.call("hipInit", 0)
        flags = ct.c_uint()
        self.call("hipGetDeviceFlags", ct.byref(flags))
        if flags.value != 4:
            raise RuntimeError("GPU scheduling flags differ from the requested mode")

    def call(self, name, *arguments):
        """Reject every nonzero HIP status."""
        status = getattr(self.lib, name)(*arguments)
        if status:
            detail = self.lib.hipGetErrorString(status)
            raise RuntimeError(f"{name} failed ({status}): {detail!r}")

    def upload(self, array):
        """Allocate and copy one contiguous host array."""
        device = ct.c_void_p()
        self.call("hipMalloc", ct.byref(device), array.nbytes)
        self.allocations.append(device)
        self.call("hipMemcpy", device, array.ctypes.data, array.nbytes, 1)
        return device

    def download(self, device, array):
        """Synchronize and copy into the original host memory layout."""
        self.call("hipDeviceSynchronize")
        self.call("hipMemcpy", array.ctypes.data, device, array.nbytes, 2)

    def close(self):
        """Free only this process's owned allocations."""
        for pointer in reversed(self.allocations):
            self.call("hipFree", pointer)


def check_hip(hip: Hip, code: Path) -> dict:
    """Launch the one-element kernel returned by offline HIPRTC qualification."""
    data = code.read_bytes()
    architecture = 0x32 if os.environ.get("FRIGATE_ROCM_NATIVE_GFX90C") == "1" else 0x2C
    assert data[:6] == b"\x7fELF\x02\x01"
    assert int.from_bytes(data[18:20], "little") == 224
    assert int.from_bytes(data[48:52], "little") & 0xFF == architecture
    host = np.array([41], dtype=np.float32)
    device = hip.upload(host)
    module, function = ct.c_void_p(), ct.c_void_p()
    hip.call("hipModuleLoad", ct.byref(module), os.fsencode(code))
    try:
        hip.call("hipModuleGetFunction", ct.byref(function), module, b"check")
        parameters = (ct.c_void_p * 1)(ct.cast(ct.byref(device), ct.c_void_p))
        hip.call(
            "hipModuleLaunchKernel",
            function,
            1,
            1,
            1,
            1,
            1,
            1,
            0,
            None,
            parameters,
            None,
        )
        hip.download(device, host)
        np.testing.assert_array_equal(host, np.array([42], dtype=np.float32))
    finally:
        hip.call("hipModuleUnload", module)
    return {"code_sha256": hashlib.sha256(data).hexdigest(), "result": float(host[0])}


def check_blas(hip: Hip) -> dict:
    """Compare fixed FP32 SGEMM output to NumPy."""
    library = ct.CDLL("/opt/rocm/lib/librocblas.so")
    signatures = {
        "rocblas_create_handle": [ct.POINTER(ct.c_void_p)],
        "rocblas_destroy_handle": [ct.c_void_p],
        "rocblas_sgemm": [ct.c_void_p, ct.c_int, ct.c_int]
        + [ct.c_int] * 3
        + [
            ct.POINTER(ct.c_float),
            ct.c_void_p,
            ct.c_int,
            ct.c_void_p,
            ct.c_int,
            ct.POINTER(ct.c_float),
            ct.c_void_p,
            ct.c_int,
        ],
    }
    for name, arguments in signatures.items():
        function = getattr(library, name)
        function.argtypes, function.restype = arguments, ct.c_int
    random = np.random.default_rng(42)
    left = np.asfortranarray(random.normal(size=(64, 64)).astype(np.float32))
    right = np.asfortranarray(random.normal(size=(64, 64)).astype(np.float32))
    result = np.zeros((64, 64), dtype=np.float32, order="F")
    a, b, c = (hip.upload(array) for array in (left, right, result))
    handle = ct.c_void_p()
    assert library.rocblas_create_handle(ct.byref(handle)) == 0
    try:
        alpha, beta = ct.c_float(1), ct.c_float(0)
        status = library.rocblas_sgemm(
            handle,
            111,
            111,
            64,
            64,
            64,
            ct.byref(alpha),
            a,
            64,
            b,
            64,
            ct.byref(beta),
            c,
            64,
        )
        assert status == 0, f"rocBLAS status {status}"
        hip.download(c, result)
        expected = left @ right
        np.testing.assert_allclose(result, expected, atol=1e-4, rtol=1e-4)
    finally:
        assert library.rocblas_destroy_handle(handle) == 0
    return {
        "matrix_shape": [64, 64],
        "max_absolute_error": float(np.abs(result - expected).max()),
    }


def check_convolution(hip: Hip) -> dict:
    """Compile and execute a tiny graph with the production tuning controls."""
    sys.path.insert(0, "/opt/rocm/lib")
    import migraphx

    random = np.random.default_rng(42)
    values = random.normal(size=(1, 3, 8, 8)).astype(np.float32)
    weights = random.normal(size=(4, 3, 3, 3)).astype(np.float32)
    program = migraphx.program()
    module = program.get_main_module()
    x = module.add_parameter(
        "x", migraphx.shape(type="float_type", lens=list(values.shape))
    )
    w = module.add_parameter(
        "w", migraphx.shape(type="float_type", lens=list(weights.shape))
    )
    convolution = module.add_instruction(
        migraphx.op("convolution", padding=[1, 1], stride=[1, 1], dilation=[1, 1]),
        [x, w],
    )
    module.add_return([convolution])
    started = time.perf_counter()
    program.compile(
        migraphx.get_target("gpu"),
        offload_copy=True,
        fast_math=True,
        exhaustive_tune=True,
    )
    compile_seconds = time.perf_counter() - started
    result = np.array(
        program.run({"x": migraphx.argument(values), "w": migraphx.argument(weights)})[
            0
        ]
    )
    hip.call("hipDeviceSynchronize")
    padded = np.pad(values, ((0, 0), (0, 0), (1, 1), (1, 1)))
    expected = np.empty((1, 4, 8, 8), dtype=np.float32)
    for y in range(8):
        for x in range(8):
            expected[:, :, y, x] = np.einsum(
                "nchw,ochw->no", padded[:, :, y : y + 3, x : x + 3], weights
            )
    np.testing.assert_allclose(result, expected, atol=3e-4, rtol=3e-4)
    return {
        "compile_seconds": compile_seconds,
        "max_absolute_error": float(np.abs(result - expected).max()),
        "compiled_graph": str(program),
    }


def main() -> None:
    """Run one stage, leaving progression and timeout policy to the operator."""
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("step", choices=("hip", "blas", "convolution"))
    parser.add_argument("--allow-gpu", action="store_true")
    parser.add_argument("--code", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    require_gpu(args.allow_gpu)
    if args.step == "hip" and not args.code:
        parser.error("HIP canary requires the offline qualified code object")
    if args.output.exists():
        raise ValueError("Use a fresh result path")
    for name in (
        "MIOPEN_CUSTOM_CACHE_DIR",
        "MIOPEN_USER_DB_PATH",
        "AMD_COMGR_CACHE_DIR",
    ):
        Path(os.environ[name]).mkdir(parents=True, exist_ok=True)
    hip = Hip()
    try:
        result = {
            "hip": lambda: check_hip(hip, args.code),
            "blas": lambda: check_blas(hip),
            "convolution": lambda: check_convolution(hip),
        }[args.step]()
    finally:
        hip.close()
    args.output.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    args.output.write_text(
        json.dumps(
            {"step": args.step, "state": "passed", "hip_device_flags": 4, **result},
            indent=2,
        )
        + "\n"
    )
    args.output.chmod(0o600)
    print(json.dumps({"step": args.step, "state": "passed"}))


if __name__ == "__main__":
    main()
