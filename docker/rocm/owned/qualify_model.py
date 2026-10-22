"""Compare a fixed private YOLO26 corpus using the actual Frigate adapter.

Reference generation is CPU-only. GPU mode requires a separate explicit flag
and an isolated, authorized hardware test window. This script manages no service.
"""

import argparse
import hashlib
import json
import os
import tempfile
import time
from pathlib import Path
from types import SimpleNamespace

import numpy as np


def sha256(path: Path) -> str:
    """Hash a model or test artifact."""
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def save_json(path: Path, value: dict) -> None:
    """Keep camera-derived outputs private."""
    path.write_text(json.dumps(value, indent=2) + "\n")
    path.chmod(0o600)


def cache_tree_sha256(root: Path) -> str:
    """Identify an interrupted runtime's private tuning cache exactly."""
    records = []
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            raise ValueError("A qualification cache must not contain symlinks")
        if path.is_file():
            records.append([str(path.relative_to(root)), sha256(path)])
    return hashlib.sha256(
        json.dumps(records, separators=(",", ":")).encode()
    ).hexdigest()


def validate_resume(cache: Path, receipt: dict, namespace: str, model_hash: str):
    """Resume bounded cold initialization using only that attempt's cache."""
    if (
        receipt.get("state") != "incomplete-cold"
        or receipt.get("cache_namespace") != namespace
        or receipt.get("model_sha256") != model_hash
        or receipt.get("initial_cache_empty_verified") is not True
        or not receipt.get("attempts")
        or receipt.get("cache_tree_sha256") != cache_tree_sha256(cache.parent)
    ):
        raise ValueError("Interrupted initialization receipt or cache differs")


def sanitize_legacy_tuning_cache(path: Path) -> dict | None:
    """Retain completed 2.15 choices and drop only unfinished null markers."""
    if path.is_symlink():
        raise ValueError("A legacy tuning cache must not be a symlink")
    if not path.exists():
        return None
    before = sha256(path)
    rows = json.loads(path.read_text())
    if not isinstance(rows, list) or any(
        not isinstance(row, list)
        or len(row) != 2
        or not isinstance(row[0], dict)
        or set(row[0]) != {"name", "problem"}
        or not isinstance(row[0]["name"], str)
        or not row[0]["name"]
        for row in rows
    ):
        raise ValueError("Unexpected legacy tuning-cache format")
    completed = [row for row in rows if row[1] is not None]
    removed = len(rows) - len(completed)
    if removed:
        payload = json.dumps(completed, indent=2, allow_nan=False) + "\n"
        with tempfile.NamedTemporaryFile(
            mode="w", dir=path.parent, prefix=".problem-cache-", delete=False
        ) as temporary:
            temporary.write(payload)
            temporary_path = Path(temporary.name)
        temporary_path.replace(path)
    return {
        "sha256_before": before,
        "sha256_after": sha256(path),
        "unfinished_marks_removed": removed,
        "completed_choices_retained": len(completed),
    }


def configure_tuning_cache(cache: Path) -> dict[str, str]:
    """Persist each pinned backend's choices in its private runtime namespace."""
    settings = {"MIGRAPHX_TRACE_BENCHMARKING": "1"}
    if os.environ.get("FRIGATE_ROCM_NATIVE_GFX90C") == "1":
        settings["MIGRAPHX_GPU_OPTIONS"] = json.dumps(
            {"problem_cache_files": [str(cache.parent / "problems.json")]},
            separators=(",", ":"),
        )
    else:
        settings["MIGRAPHX_PROBLEM_CACHE"] = str(cache.parent / "problems.json")
    for key, value in settings.items():
        if key in os.environ and os.environ[key] != value:
            raise ValueError(f"Unexpected qualification setting: {key}")
    os.environ.update(settings)
    return settings


def validate_warm(
    cache: Path, receipt: dict, namespace: str, model_hash: str, reference_hash: str
):
    """Require a successful cold correctness result before timing its cache."""
    if (
        receipt.get("passed") is not True
        or receipt.get("cache_policy") not in {"cold", "resume-cold"}
        or receipt.get("model_sha256") != model_hash
        or receipt.get("reference_manifest_sha256") != reference_hash
        or receipt.get("cache_namespace") != namespace
        or receipt.get("hip_device_flags") != 4
        or receipt.get("tuning")
        != {"conserve_cpu": True, "fast_math": True, "exhaustive_tune": True}
        or receipt.get("cache_sha256") != sha256(cache)
    ):
        raise ValueError("Warm timing requires the matching passed cold result")


def compare_detections(expected: np.ndarray, actual: np.ndarray) -> dict:
    """Match confident detections by class and geometry, allowing rank changes.

    The adapter filters at 0.4. Treat scores between 0.35 and 0.45 as borderline
    and report them separately. Outside that band require a matching class,
    box IoU of at least 0.98, and confidence difference no greater than 0.02.
    """
    if expected.shape != (20, 6) or actual.shape != (20, 6):
        raise ValueError("Expected the Frigate (20, 6) detection contract")
    if not np.isfinite(expected).all() or not np.isfinite(actual).all():
        raise ValueError("Non-finite detections")
    reference = expected[expected[:, 1] > 0]
    observed = actual[actual[:, 1] > 0]
    remaining = set(range(len(observed)))
    matches = []
    unmatched = []
    for row in reference[np.argsort(-reference[:, 1])]:
        candidates = []
        for index in remaining:
            other = observed[index]
            if row[0] != other[0]:
                continue
            top = np.maximum(row[2:4], other[2:4])
            bottom = np.minimum(row[4:6], other[4:6])
            intersection = float(np.prod(np.maximum(0, bottom - top)))
            area_a = float(np.prod(np.maximum(0, row[4:6] - row[2:4])))
            area_b = float(np.prod(np.maximum(0, other[4:6] - other[2:4])))
            union = area_a + area_b - intersection
            iou = intersection / union if union else 0.0
            candidates.append((iou, index))
        if not candidates or max(candidates)[0] < 0.98:
            unmatched.append(float(row[1]))
            continue
        iou, index = max(candidates)
        remaining.remove(index)
        matches.append(
            {
                "iou": iou,
                "confidence_error": abs(float(row[1] - observed[index, 1])),
                "reference_confidence": float(row[1]),
                "actual_confidence": float(observed[index, 1]),
            }
        )
    unexpected = [float(observed[index, 1]) for index in sorted(remaining)]
    failures = sum(score >= 0.45 for score in unmatched + unexpected)
    failures += sum(
        row["confidence_error"] > 0.02
        and max(row["reference_confidence"], row["actual_confidence"]) >= 0.45
        for row in matches
    )
    return {
        "passed": failures == 0,
        "matches": matches,
        "unmatched_reference_scores": unmatched,
        "unmatched_actual_scores": unexpected,
        "borderline_reference_count": int(
            np.count_nonzero((reference[:, 1] >= 0.35) & (reference[:, 1] < 0.45))
        ),
        "confident_failures": failures,
    }


def parser_adapter(size: int):
    """Use the production postprocessor without constructing a GPU detector."""
    from frigate.detectors.plugins.migraphx import migraphxDetector

    result = migraphxDetector.__new__(migraphxDetector)
    result.width = result.height = size
    result.model_is_e2e = True
    return result


def reference(args) -> None:
    """Create immutable BGR/NCHW inputs and explicit CPU ONNX Runtime results."""
    if Path("/dev/kfd").exists() or Path("/dev/dri").exists():
        raise RuntimeError("Reference generation requires a device-free container")
    import cv2
    import onnxruntime as ort

    from frigate.detectors.detector_config import InputDTypeEnum, InputTensorEnum
    from frigate.object_detection.base import BaseLocalDetector
    from frigate.object_detection.util import tensor_transform

    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(
        str(args.model), sess_options=options, providers=["CPUExecutionProvider"]
    )
    assert session.get_providers() == ["CPUExecutionProvider"]
    assert session.get_inputs()[0].shape == [1, 3, args.size, args.size]
    assert session.get_outputs()[0].shape == [1, 300, 6]
    context = SimpleNamespace(
        input_transform=tensor_transform(InputTensorEnum.nchw),
        dtype=InputDTypeEnum.float,
    )
    adapter = parser_adapter(args.size)
    cpu_model = None
    if args.migraphx_cpu:
        import sys

        sys.path.insert(0, "/opt/rocm/lib")
        import migraphx

        cpu_model = migraphx.parse_onnx(str(args.model))
        cpu_model.compile(migraphx.get_target("cpu"))
    inputs, outputs, frames = {}, {}, []
    cpu_outputs, cpu_comparisons = {}, []
    for index, image_path in enumerate(sorted(args.images.glob("*.jpg"))):
        image = cv2.imread(str(image_path))
        if image is None:
            raise ValueError("Unreadable corpus frame")
        resized = cv2.resize(
            image, (args.size, args.size), interpolation=cv2.INTER_LINEAR
        )
        tensor = np.ascontiguousarray(
            BaseLocalDetector._transform_input(context, resized[None, ...])
        )
        output = session.run(None, {session.get_inputs()[0].name: tensor})[0]
        assert output.shape == (1, 300, 6) and np.isfinite(output).all()
        key = f"frame{index:03d}"
        inputs[key], outputs[key] = tensor, output
        detections = adapter.optimized_process_yolo(output)
        if cpu_model is not None:
            native = np.array(
                cpu_model.run(
                    {cpu_model.get_parameter_names()[0]: migraphx.argument(tensor)}
                )[0]
            )
            assert native.shape == output.shape and np.isfinite(native).all()
            cpu_outputs[key] = native
            comparison = compare_detections(
                detections, adapter.optimized_process_yolo(native)
            )
            cpu_comparisons.append({"key": key, **comparison})
        frames.append(
            {
                "key": key,
                "image_sha256": sha256(image_path),
                "input_sha256": hashlib.sha256(tensor.tobytes()).hexdigest(),
                "detections": detections.tolist(),
            }
        )
    if not frames:
        raise ValueError("No JPEG corpus frames")
    confident_count = sum(
        row[1] >= 0.45 for frame in frames for row in frame["detections"]
    )
    np.savez(args.output / "inputs.npz", **inputs)
    np.savez(args.output / "outputs.npz", **outputs)
    if cpu_model is not None:
        np.savez(args.output / "migraphx-cpu-outputs.npz", **cpu_outputs)
        save_json(
            args.output / "migraphx-cpu-comparison.json",
            {
                "passed": all(row["passed"] for row in cpu_comparisons),
                "frames": cpu_comparisons,
                "gpu_devices_exposed": False,
            },
        )
        if not all(row["passed"] for row in cpu_comparisons):
            raise RuntimeError("MIGraphX CPU detections differ from ONNX Runtime")
    save_json(
        args.output / "manifest.json",
        {
            "model_sha256": sha256(args.model),
            "labelmap_sha256": sha256(args.labelmap),
            "input_contract": [1, 3, args.size, args.size],
            "pixel_format": "bgr",
            "input_dtype": "float32 divided by 255",
            "frame_preparation": "Full captured frame resized with OpenCV INTER_LINEAR; not a replay of Frigate motion regions",
            "ort_version": ort.__version__,
            "provider": session.get_providers(),
            "gpu_devices_exposed": False,
            "inputs_sha256": sha256(args.output / "inputs.npz"),
            "outputs_sha256": sha256(args.output / "outputs.npz"),
            "frames": frames,
            "confident_detection_count": confident_count,
        },
    )
    if confident_count < args.min_confident_detections:
        raise RuntimeError("Corpus lacks confident reference detections")


def gpu(args) -> None:
    """Check cold/warm compilation, correctness, and bounded adapter timings."""
    from gpu_canary import require_gpu

    require_gpu(args.allow_gpu)
    namespace = os.environ.get("FRIGATE_MIGRAPHX_CACHE_NAMESPACE", "")
    if not namespace or Path(namespace).name != namespace or namespace in {".", ".."}:
        raise ValueError("An isolated runtime cache namespace is required")
    manifest = json.loads((args.reference / "manifest.json").read_text())
    assert manifest["model_sha256"] == sha256(args.model)
    assert manifest["labelmap_sha256"] == sha256(args.labelmap)
    assert manifest["input_contract"] == [1, 3, args.size, args.size]
    assert manifest["confident_detection_count"] >= args.min_confident_detections
    for name in ("inputs", "outputs"):
        assert manifest[name + "_sha256"] == sha256(args.reference / (name + ".npz"))
    from frigate.const import MODEL_CACHE_DIR
    from frigate.detectors.detector_config import ModelConfig
    from frigate.detectors.plugins.migraphx import (
        migraphxDetector,
        migraphxDetectorConfig,
    )

    cache = (
        Path(MODEL_CACHE_DIR) / "migraphx" / namespace / (args.model.stem + "_tune.mxr")
    )
    initialization_history = None
    if args.cache_policy == "cold":
        if cache.parent.exists() and any(cache.parent.iterdir()):
            raise ValueError(
                "Cold qualification requires an empty private cache directory"
            )
    elif args.cache_policy == "resume-cold":
        if not args.cold_receipt:
            raise ValueError("Resuming requires the interrupted cold receipt")
        initialization_history = json.loads(args.cold_receipt.read_text())
        validate_resume(
            cache, initialization_history, namespace, manifest["model_sha256"]
        )
    else:
        if not args.cold_receipt:
            raise ValueError("Warm qualification requires the prior cold receipt")
        prior = json.loads(args.cold_receipt.read_text())
        validate_warm(
            cache,
            prior,
            namespace,
            manifest["model_sha256"],
            sha256(args.reference / "manifest.json"),
        )
    tuning_cache_maintenance = None
    if os.environ.get("FRIGATE_ROCM_NATIVE_GFX90C") != "1":
        tuning_cache_maintenance = sanitize_legacy_tuning_cache(
            cache.parent / "problems.json"
        )
    tuning_cache_environment = configure_tuning_cache(cache)
    model = ModelConfig(
        path=str(args.model),
        labelmap_path=str(args.labelmap),
        width=args.size,
        height=args.size,
        model_type="yolo-generic",
        input_tensor="nchw",
        input_dtype="float",
        input_pixel_format="bgr",
    )
    started = time.perf_counter()
    detector = migraphxDetector(
        migraphxDetectorConfig(
            type="migraphx",
            device="gpu",
            model=model,
            conserve_cpu=True,
            fast_math=True,
            exhaustive_tune=True,
        )
    )
    load_seconds = time.perf_counter() - started
    graph = args.output / "compiled-program.txt"
    graph.write_text(str(detector.model) + "\n")
    graph.chmod(0o600)
    import ctypes

    hip = ctypes.CDLL("/opt/rocm/lib/libamdhip64.so")
    hip.hipGetDeviceFlags.argtypes = [ctypes.POINTER(ctypes.c_uint)]
    hip.hipGetDeviceFlags.restype = ctypes.c_int
    flags = ctypes.c_uint()
    if hip.hipGetDeviceFlags(ctypes.byref(flags)) != 0 or flags.value != 4:
        raise RuntimeError(
            "Could not verify the requested yielding GPU scheduling mode"
        )
    with np.load(args.reference / "inputs.npz", allow_pickle=False) as archive:
        inputs = {name: np.ascontiguousarray(archive[name]) for name in archive.files}
    expected = np.load(args.reference / "outputs.npz", allow_pickle=False)
    outputs, comparisons = {}, []
    for frame in manifest["frames"]:
        key = frame["key"]
        tensor = inputs[key]
        assert tensor.dtype == np.float32 and tensor.shape == (
            1,
            3,
            args.size,
            args.size,
        )
        assert hashlib.sha256(tensor.tobytes()).hexdigest() == frame["input_sha256"]
        detector.preprocess(tensor)
        value = detector.model.run(
            {detector.model_param_name: detector.model_input_arg}
        )[0]
        raw = (
            np.frombuffer(value, dtype=np.float32)
            .reshape(value.get_shape().lens())
            .copy()
        )
        assert raw.shape == (1, 300, 6) and np.isfinite(raw).all()
        detections = detector.optimized_process_yolo(raw)
        np.testing.assert_allclose(
            detector.detect_raw(tensor), detections, atol=1e-5, rtol=1e-5
        )
        outputs[key] = raw
        error = np.abs(raw - expected[key])
        comparisons.append(
            {
                "key": key,
                "raw_ranked_max_absolute_error": float(error.max()),
                "raw_ranked_p99_absolute_error": float(np.percentile(error, 99)),
                "detection_comparison": compare_detections(
                    np.asarray(frame["detections"]), detections
                ),
            }
        )
    keys = sorted(inputs)
    samples = []
    for index in range(args.warmups + args.iterations):
        tensor = inputs[keys[index % len(keys)]]
        started = time.perf_counter()
        detector.detect_raw(tensor)
        elapsed = time.perf_counter() - started
        if index >= args.warmups:
            samples.append(elapsed * 1000)
        time.sleep(max(0, 1 / args.rate - elapsed))
    np.savez(args.output / "outputs.npz", **outputs)
    passed = all(row["detection_comparison"]["passed"] for row in comparisons)
    save_json(
        args.output / "result.json",
        {
            "passed": passed,
            "model_sha256": manifest["model_sha256"],
            "reference_manifest_sha256": sha256(args.reference / "manifest.json"),
            "cache_namespace": namespace,
            "cache_sha256": sha256(cache),
            "cache_policy": args.cache_policy,
            "initialization_history": initialization_history,
            "tuning_cache_environment": tuning_cache_environment,
            "legacy_tuning_cache_maintenance": tuning_cache_maintenance,
            "compiled_program_sha256": sha256(graph),
            "hip_device_flags": flags.value,
            "compile_or_load_seconds": load_seconds,
            "native_gfx90c": os.environ.get("FRIGATE_ROCM_NATIVE_GFX90C") == "1",
            "hsa_override": os.environ.get("HSA_OVERRIDE_GFX_VERSION"),
            "tuning": {
                "conserve_cpu": True,
                "fast_math": True,
                "exhaustive_tune": True,
            },
            "comparisons": comparisons,
            "samples_ms": samples,
            "median_ms": float(np.median(samples)),
            "p95_ms": float(np.percentile(samples, 95)),
            "warmups": args.warmups,
            "rate_hz": args.rate,
            "timing_scope": "Actual adapter detect_raw including input copy, synchronized run and postprocessing",
        },
    )
    if not passed:
        raise RuntimeError("Confident detections differ; inspect the private result")


def main() -> None:
    """Require explicit paths and a new output directory for each test."""
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("reference", "gpu"))
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--labelmap", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--size", type=int, default=320)
    parser.add_argument("--images", type=Path)
    parser.add_argument("--reference", type=Path)
    parser.add_argument("--allow-gpu", action="store_true")
    parser.add_argument("--migraphx-cpu", action="store_true")
    parser.add_argument("--min-confident-detections", type=int, default=1)
    parser.add_argument(
        "--cache-policy", choices=("cold", "resume-cold", "warm"), default="cold"
    )
    parser.add_argument("--cold-receipt", type=Path)
    parser.add_argument("--warmups", type=int, default=20)
    parser.add_argument("--iterations", type=int, default=100)
    parser.add_argument("--rate", type=float, default=5)
    args = parser.parse_args()
    if (
        not 1 <= args.iterations <= 1000
        or not 0 <= args.warmups <= 200
        or not 0 < args.rate <= 10
    ):
        parser.error("Invalid bounded sample count or rate")
    if args.mode == "reference" and not args.images:
        parser.error("Reference mode requires --images")
    if args.mode == "gpu" and not args.reference:
        parser.error("GPU mode requires --reference")
    if args.min_confident_detections < 0:
        parser.error("The confident detection count cannot be negative")
    args.output.mkdir(mode=0o700, parents=True, exist_ok=False)
    {"reference": reference, "gpu": gpu}[args.mode](args)
    print(
        json.dumps({"mode": args.mode, "state": "passed", "output": str(args.output)})
    )


if __name__ == "__main__":
    main()
