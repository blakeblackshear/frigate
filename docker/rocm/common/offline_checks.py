"""Qualify Linux linking and disposable appdata without starting Frigate."""

import argparse
import ctypes
import hashlib
import importlib.metadata
import json
import logging
import os
import sqlite3
import subprocess
import sys
import traceback
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))


def require_isolation() -> None:
    """Refuse checks outside an explicitly isolated Linux container."""
    assert sys.platform == "linux"
    assert os.environ.get("FRIGATE_OFFLINE_CHECK") == "1"
    assert not Path("/dev/kfd").exists()
    assert not Path("/dev/dri").exists()
    for line in Path("/proc/net/route").read_text().splitlines()[1:]:
        assert line.split()[1] != "00000000", "A network default route is present"


def sha256(path: Path) -> str:
    """Hash a file without loading large libraries into memory."""
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def check_hiprtc(architecture: str = "gfx900") -> dict:
    """Compile for an explicit target on the CPU, without enumerating a GPU."""
    require_isolation()
    assert architecture in {"gfx900", "gfx90c"}
    assert Path("/usr/include/features.h").is_file()
    compiler = ctypes.CDLL("/opt/rocm/lib/libhiprtc.so")
    program = ctypes.c_void_p()
    compiler.hiprtcCreateProgram.argtypes = [
        ctypes.POINTER(ctypes.c_void_p),
        ctypes.c_char_p,
        ctypes.c_char_p,
        ctypes.c_int,
        ctypes.c_void_p,
        ctypes.c_void_p,
    ]
    compiler.hiprtcCompileProgram.argtypes = [
        ctypes.c_void_p,
        ctypes.c_int,
        ctypes.POINTER(ctypes.c_char_p),
    ]
    compiler.hiprtcGetProgramLogSize.argtypes = [
        ctypes.c_void_p,
        ctypes.POINTER(ctypes.c_size_t),
    ]
    compiler.hiprtcGetProgramLog.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
    compiler.hiprtcGetCodeSize.argtypes = [
        ctypes.c_void_p,
        ctypes.POINTER(ctypes.c_size_t),
    ]
    compiler.hiprtcDestroyProgram.argtypes = [ctypes.POINTER(ctypes.c_void_p)]
    source = b"""#include <type_traits>
static_assert(std::is_floating_point<float>::value, "float trait");
extern "C" __global__ void check(float* x) { x[0] += 1.0f; }
"""
    assert (
        compiler.hiprtcCreateProgram(
            ctypes.byref(program), source, b"legacy724-header-check.cpp", 0, None, None
        )
        == 0
    )
    try:
        options = [
            f"--gpu-architecture={architecture}".encode(),
            b"-std=c++17",
            b"-I/usr/include/c++/14",
            b"-I/usr/include/x86_64-linux-gnu/c++/14",
            b"-I/usr/include",
            b"-I/usr/include/x86_64-linux-gnu",
        ]
        arguments = (ctypes.c_char_p * len(options))(*options)
        status = compiler.hiprtcCompileProgram(program, len(options), arguments)
        size = ctypes.c_size_t()
        assert compiler.hiprtcGetProgramLogSize(program, ctypes.byref(size)) == 0
        log = ctypes.create_string_buffer(max(1, size.value))
        assert compiler.hiprtcGetProgramLog(program, log) == 0
        assert status == 0, log.value.decode(errors="replace")
        assert compiler.hiprtcGetCodeSize(program, ctypes.byref(size)) == 0
        assert size.value > 0
        return {
            "hiprtc_compile": "passed",
            "explicit_target": architecture,
            "code_bytes": size.value,
            "features_header_sha256": sha256(Path("/usr/include/features.h")),
            "gpu_devices_exposed": False,
            "gpu_enumeration_execution": False,
        }
    finally:
        compiler.hiprtcDestroyProgram(ctypes.byref(program))


def check_linking() -> dict:
    """Load the actual legacy binding alongside upstream CPU ORT, without targets."""
    assert Path("/opt/rocm").resolve() == Path("/opt/rocm-7.2.4")
    expected_environment = {
        "HSA_ENABLE_SDMA": "0",
        "HSA_OVERRIDE_GFX_VERSION": "9.0.0",
        "MIGRAPHX_DISABLE_MIOPEN_FUSION": "1",
        "MIGRAPHX_DISABLE_SCHEDULE_PASS": "1",
        "MIGRAPHX_DISABLE_REDUCE_FUSION": "1",
        "MIGRAPHX_ENABLE_HIPRTC_WORKAROUNDS": "1",
    }
    assert all(
        os.environ.get(key) == value for key, value in expected_environment.items()
    )
    assert Path("/usr/include/c++/14").is_dir()
    assert Path("/usr/include/x86_64-linux-gnu/c++/14").is_dir()
    binding = Path("/opt/rocm/lib/migraphx.cpython-311-x86_64-linux-gnu.so")
    binding_hash = sha256(binding)
    assert binding_hash == (
        "634426e75cd56368f640852bef685ac304ce4f5131812f66ace2c2df4528a514"
    )

    libraries = {p.resolve() for p in Path("/opt/rocm").rglob("*.so*") if p.is_file()}
    checked = []
    missing = []
    for library in sorted(libraries):
        with library.open("rb") as source:
            header = source.read(20)
        # GPU code objects are ELF too. Only check native x86-64 shared libraries.
        if header[:4] != b"\x7fELF" or header[18:20] != b">\x00":
            continue
        result = subprocess.run(["ldd", str(library)], capture_output=True, text=True)
        assert result.returncode == 0, f"ldd failed for {library}"
        if "not found" in result.stdout:
            missing.append(
                {
                    "library": str(library),
                    "missing": [
                        line.strip()
                        for line in result.stdout.splitlines()
                        if "not found" in line
                    ],
                }
            )
        checked.append(str(library))
    # Gary's stripped image already leaves these four optional components
    # unresolved. They are outside the linked MIGraphX inference libraries.
    # Keep the baseline intact and reject any additional unresolved dependency.
    inherited_optional_missing = {
        "/opt/rocm-7.2.4/lib/libhiprand.so.1.1.70204": ["librocrand.so.1 => not found"],
        "/opt/rocm-7.2.4/lib/libhipsparse.so.4.2.0.70204": [
            "librocsparse.so.1 => not found"
        ],
        "/opt/rocm-7.2.4/lib/libmigraphx_py_3.10.so": [
            "libpython3.10.so.1.0 => not found"
        ],
        "/opt/rocm-7.2.4/lib/librocprofiler64.so.2.0.70204": [
            "libhsa-amd-aqlprofile64.so.1 => not found"
        ],
    }
    assert {
        item["library"]: item["missing"] for item in missing
    } == inherited_optional_missing, json.dumps(missing, indent=2)

    sys.path.append("/opt/rocm/lib")
    import migraphx
    import onnxruntime

    assert Path(migraphx.__file__).resolve() == binding.resolve()
    assert onnxruntime.__version__.startswith("1.30.")
    assert "CPUExecutionProvider" in onnxruntime.get_available_providers()
    assert not any("MIGraphX" in p for p in onnxruntime.get_available_providers())
    assert not any(
        d.metadata["Name"].lower().startswith("rocm-sdk")
        for d in importlib.metadata.distributions()
    )

    # Importing the application proves its dependencies coexist with MIGraphX.
    # No FrigateApp instance, target, compiler, program, or detector is created.
    from frigate.version import VERSION

    from frigate.app import FrigateApp
    from frigate.detectors.detector_types import api_types

    assert FrigateApp is not None
    assert "migraphx" in api_types
    assert "5bb2cde" in VERSION
    pip = subprocess.run(
        [sys.executable, "-m", "pip", "check"], capture_output=True, text=True
    )
    assert pip.returncode == 0, pip.stdout + pip.stderr
    return {
        "frigate_version": VERSION,
        "python": sys.version.split()[0],
        "binding_sha256": binding_hash,
        "native_libraries_checked": len(checked),
        "inference_libraries_unresolved_dependencies": 0,
        "inherited_optional_components_unresolved": inherited_optional_missing,
        "migraphx_import": "passed",
        "application_import": "passed",
        "onnxruntime": onnxruntime.__version__,
        "ort_providers": onnxruntime.get_available_providers(),
        "pip_check": "passed",
        "compatibility_environment": expected_environment,
        "hiprtc_support_headers_present": True,
        "gpu_enumeration_compilation_execution": False,
    }


def quote_identifier(value: str) -> str:
    """Quote an SQLite identifier read from schema metadata."""
    return '"' + value.replace('"', '""') + '"'


def database_snapshot(path: Path, columns: dict | None = None) -> dict:
    """Hash logical rows without exposing private contents in the report."""
    with sqlite3.connect(f"file:{path}?mode=ro", uri=True) as db:
        assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert not db.execute("PRAGMA foreign_key_check").fetchall()
        if columns is None:
            tables = [
                row[0]
                for row in db.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' "
                    "AND name NOT IN ('migratehistory', 'sqlite_sequence') ORDER BY name"
                )
            ]
            columns = {
                table: [
                    row[1]
                    for row in db.execute(
                        f"PRAGMA table_info({quote_identifier(table)})"
                    )
                ]
                for table in tables
            }
        result = {}
        for table, names in columns.items():
            fields = ", ".join(map(quote_identifier, names))
            digest = hashlib.sha256()
            count = 0
            for row in db.execute(
                f"SELECT {fields} FROM {quote_identifier(table)} ORDER BY {fields}"
            ):
                digest.update(repr(row).encode())
                digest.update(b"\n")
                count += 1
            result[table] = {"rows": count, "sha256": digest.hexdigest()}
        return {"columns": columns, "data": result}


def check_migrations() -> dict:
    """Run real config and DB migrations on an isolated /config copy, twice."""
    from peewee import SqliteDatabase
    from peewee_migrate import Router
    from ruamel.yaml import YAML

    from frigate.app import FrigateApp
    from frigate.config import FrigateConfig
    from frigate.config.holder import ConfigHolder
    from frigate.detectors.device import build_detector_config, parse_device

    config_path = Path("/config/config.yaml")
    db_path = Path("/config/frigate.db")
    assert os.environ.get("CONFIG_FILE") == str(config_path)
    original = YAML().load(config_path)
    original_config_hash = sha256(config_path)
    original_db_hash = sha256(db_path)
    before = database_snapshot(db_path)
    db = SqliteDatabase(db_path)
    pending = list(Router(db).diff)
    db.close()

    # These guards detect accidental hardware, media, or network probes while
    # exercising the actual config loader with all installed image dependencies.
    with (
        patch("subprocess.Popen", side_effect=AssertionError("Subprocess blocked")),
        patch("socket.socket.connect", side_effect=AssertionError("Network blocked")),
    ):
        config = FrigateConfig.load(install=True)
    assert config.database.path == str(db_path)
    assert len(config.cameras) == len(original["cameras"])
    assert not config.record.enabled
    assert all(not camera.record.enabled for camera in config.cameras.values())
    assert all(
        camera.ffmpeg.hwaccel_args == "preset-vaapi"
        for camera in config.cameras.values()
    )
    migrated = YAML().load(config_path)
    assert "detectors" not in migrated and "model" not in migrated
    assert str(migrated["version"]) == "0.19-0"
    for name, camera in original["cameras"].items():
        for field in (
            "ffmpeg",
            "detect",
            "objects",
            "motion",
            "zones",
            "review",
            "record",
            "snapshots",
            "onvif",
            "audio",
        ):
            assert camera.get(field) == migrated["cameras"][name].get(field), field
    for field in ("ffmpeg", "objects", "motion", "record", "mqtt", "go2rtc", "auth"):
        assert original.get(field) == migrated.get(field), field
    assert len(config.models) == 1
    model = config.models[0]
    for field, value in original["model"].items():
        assert getattr(model, field) == value, field
    assert migrated["models"][0]["devices"] == ["migraphx:GPU"]
    detector = build_detector_config(parse_device("migraphx:GPU"), model)
    assert detector.conserve_cpu and detector.fast_math and detector.exhaustive_tune
    assert sha256(Path("/config/backup_config.yaml")) == original_config_hash

    migrated_hash = sha256(config_path)
    with (
        patch("subprocess.Popen", side_effect=AssertionError("Subprocess blocked")),
        patch("socket.socket.connect", side_effect=AssertionError("Network blocked")),
    ):
        FrigateConfig.load(install=True)
    assert sha256(config_path) == migrated_hash

    # Avoid __init__ and start: they create workers. This is the actual schema,
    # backup, vacuum, and ownership method invoked by application startup.
    app = FrigateApp.__new__(FrigateApp)
    app.config_holder = ConfigHolder(config)
    app.init_database()
    assert sha256(Path("/config/backup.db")) == original_db_hash
    assert database_snapshot(db_path, before["columns"]) == before
    db = SqliteDatabase(db_path)
    assert not Router(db).diff
    db.close()
    first_db_hash = sha256(db_path)
    app.init_database()
    assert sha256(db_path) == first_db_hash
    assert database_snapshot(db_path, before["columns"]) == before
    assert Path("/config/.exports").exists()
    # The saved appdata already completed export migration. Keep that marker;
    # no exports, recordings, or media files are mounted or processed here.
    app.check_db_data_migrations()
    assert sha256(db_path) == first_db_hash
    assert sha256(Path("/config/original-config.yaml")) == original_config_hash
    cache_dir = Path("/config/model_cache/migraphx")
    cache_dir.mkdir(parents=True, exist_ok=True)
    write_probe = cache_dir / ".offline-write-probe"
    write_probe.write_text("ok")
    assert write_probe.read_text() == "ok"
    write_probe.unlink()
    return {
        "config_migration": "0.18-0 -> 0.19-0",
        "camera_count": len(config.cameras),
        "camera_workload_and_streams_preserved": True,
        "model_contract_and_tuning_preserved": True,
        "recording_enabled": False,
        "config_second_load_unchanged": True,
        "schema_migrations_applied": pending,
        "original_columns_and_rows_preserved": True,
        "table_row_counts": {
            key: value["rows"] for key, value in before["data"].items()
        },
        "user_and_password_rows_unchanged": True,
        "database_integrity": "ok",
        "database_foreign_keys": "ok",
        "database_backup_matches_original": True,
        "database_second_init_unchanged": True,
        "existing_export_migration_marker_preserved": True,
        "runtime_uid": os.geteuid(),
        "nonroot_config_database_and_cache_writes": "passed",
        "gpu_enumeration_compilation_execution": False,
    }


def main() -> None:
    """Run a selected check and print only a secret-free JSON receipt."""
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("linking", "migrations", "hiprtc"))
    args = parser.parse_args()
    require_isolation()
    logging.disable(logging.CRITICAL)
    try:
        result = {
            "linking": check_linking,
            "migrations": check_migrations,
            "hiprtc": check_hiprtc,
        }[args.mode]()
    except Exception as error:
        # ValidationError can contain camera credentials. Keep the traceback in
        # a private file and emit only the exception type to captured stdout.
        error_path = Path(f"/tmp/offline-{args.mode}-error.txt")
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
