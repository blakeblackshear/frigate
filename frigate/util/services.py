"""Utilities for services."""

import asyncio
import json
import logging
import os
import re
import resource
import shutil
import signal
import subprocess as sp
import time
import traceback
from datetime import datetime
from typing import Any

import cv2
import psutil
import py3nvml.py3nvml as nvml
import requests

from frigate.const import (
    DRIVER_AMD,
    DRIVER_ENV_VAR,
    FFMPEG_HWACCEL_NVIDIA,
    FFMPEG_HWACCEL_VAAPI,
    SHM_FRAMES_VAR,
)
from frigate.util.builtin import clean_camera_user_pass, escape_special_characters

logger = logging.getLogger(__name__)


def restart_frigate():
    proc = psutil.Process(1)
    # if this is running via s6, sigterm pid 1
    if proc.name() == "s6-svscan":
        proc.terminate()
    # otherwise, just try and exit frigate
    else:
        os.kill(os.getpid(), signal.SIGINT)


def print_stack(sig, frame):
    traceback.print_stack(frame)


def listen():
    signal.signal(signal.SIGUSR1, print_stack)


def get_cgroups_version() -> str:
    """Determine what version of cgroups is enabled."""

    cgroup_path = "/sys/fs/cgroup"

    if not os.path.ismount(cgroup_path):
        logger.debug(f"{cgroup_path} is not a mount point.")
        return "unknown"

    try:
        with open("/proc/mounts") as f:
            mounts = f.readlines()

        for mount in mounts:
            mount_info = mount.split()
            if mount_info[1] == cgroup_path:
                fs_type = mount_info[2]
                if fs_type == "cgroup2fs" or fs_type == "cgroup2":
                    return "cgroup2"
                elif fs_type == "tmpfs":
                    return "cgroup"
                else:
                    logger.debug(
                        f"Could not determine cgroups version: unhandled filesystem {fs_type}"
                    )
                break
    except Exception as e:
        logger.debug(f"Could not determine cgroups version: {e}")

    return "unknown"


def get_docker_memlimit_bytes() -> int:
    """Get mem limit in bytes set in docker if present. Returns -1 if no limit detected."""

    # check running a supported cgroups version
    if get_cgroups_version() == "cgroup2":
        memlimit_path = "/sys/fs/cgroup/memory.max"

        try:
            with open(memlimit_path) as f:
                value = f.read().strip()

            if value.isnumeric():
                return int(value)
            elif value.lower() == "max":
                return -1
        except Exception as e:
            logger.debug(f"Unable to get docker memlimit: {e}")

    return -1


def get_cpu_stats() -> dict[str, dict]:
    """Get cpu usages for each process id"""
    usages = {}
    docker_memlimit = get_docker_memlimit_bytes() / 1024
    total_mem = os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / 1024

    system_cpu = psutil.cpu_percent(
        interval=None
    )  # no interval as we don't want to be blocking
    system_mem = psutil.virtual_memory()
    usages["frigate.full_system"] = {
        "cpu": str(system_cpu),
        "mem": str(system_mem.percent),
    }

    keywords = ["ffmpeg", "go2rtc", "frigate.", "python3"]
    for process in psutil.process_iter(["pid", "name", "cpu_percent", "cmdline"]):
        pid = str(process.info["pid"])
        try:
            cpu_percent = process.info["cpu_percent"]
            cmdline = " ".join(process.info["cmdline"]).rstrip()

            if not any(keyword in cmdline for keyword in keywords):
                continue

            with open(f"/proc/{pid}/stat") as f:
                stats = f.readline().split()
            utime = int(stats[13])
            stime = int(stats[14])
            start_time = int(stats[21])

            with open("/proc/uptime") as f:
                system_uptime_sec = int(float(f.read().split()[0]))

            clk_tck = os.sysconf(os.sysconf_names["SC_CLK_TCK"])

            process_utime_sec = utime // clk_tck
            process_stime_sec = stime // clk_tck
            process_start_time_sec = start_time // clk_tck

            process_elapsed_sec = system_uptime_sec - process_start_time_sec
            process_usage_sec = process_utime_sec + process_stime_sec
            cpu_average_usage = process_usage_sec * 100 // process_elapsed_sec

            with open(f"/proc/{pid}/statm") as f:
                mem_stats = f.readline().split()
            mem_res = int(mem_stats[1]) * os.sysconf("SC_PAGE_SIZE") / 1024

            if docker_memlimit > 0:
                mem_pct = round((mem_res / docker_memlimit) * 100, 1)
            else:
                mem_pct = round((mem_res / total_mem) * 100, 1)

            usages[pid] = {
                "cpu": str(cpu_percent),
                "cpu_average": str(round(cpu_average_usage, 2)),
                "mem": f"{mem_pct}",
                "cmdline": clean_camera_user_pass(cmdline),
            }
        except Exception:
            continue

    return usages


def get_physical_interfaces(interfaces) -> list:
    if not interfaces:
        return []

    with open("/proc/net/dev") as file:
        lines = file.readlines()

    physical_interfaces = []
    for line in lines:
        if ":" in line:
            interface = line.split(":")[0].strip()
            for int in interfaces:
                if interface.startswith(int):
                    physical_interfaces.append(interface)

    return physical_interfaces


def get_bandwidth_stats(config) -> dict[str, dict]:
    """Get bandwidth usages for each ffmpeg process id"""
    usages = {}
    top_command = ["nethogs", "-t", "-v0", "-c5", "-d1"] + get_physical_interfaces(
        config.telemetry.network_interfaces
    )

    p = sp.run(
        top_command,
        encoding="ascii",
        capture_output=True,
    )

    if p.returncode != 0:
        logger.error(f"Error getting network stats :: {p.stderr}")
        return usages
    else:
        lines = p.stdout.split("\n")
        for line in lines:
            stats = list(filter(lambda a: a != "", line.strip().split("\t")))
            try:
                if re.search(
                    r"(^ffmpeg|\/go2rtc|frigate\.detector\.[a-z]+)/([0-9]+)/", stats[0]
                ):
                    process = stats[0].split("/")
                    usages[process[len(process) - 2]] = {
                        "bandwidth": round(float(stats[1]) + float(stats[2]), 1),
                    }
            except (IndexError, ValueError):
                continue

    return usages


def is_vaapi_amd_driver() -> bool:
    # Use the explicitly configured driver, if available
    driver = os.environ.get(DRIVER_ENV_VAR)
    if driver:
        return driver == DRIVER_AMD

    # Otherwise, ask vainfo what is has autodetected
    p = vainfo_hwaccel()

    if p.returncode != 0:
        logger.error(f"Unable to poll vainfo: {p.stderr}")
        return False
    else:
        output = p.stdout.decode("unicode_escape").split("\n")

        # VA Info will print out the friendly name of the driver
        return any("AMD Radeon Graphics" in line for line in output)


def get_amd_gpu_stats() -> dict[str, str] | None:
    """Get stats using radeontop."""
    radeontop_command = ["radeontop", "-d", "-", "-l", "1"]

    p = sp.run(
        radeontop_command,
        encoding="ascii",
        capture_output=True,
    )

    if p.returncode != 0:
        logger.error(f"Unable to poll radeon GPU stats: {p.stderr}")
        return None
    else:
        usages = p.stdout.split(",")
        results: dict[str, str] = {}

        for hw in usages:
            if "gpu" in hw:
                results["gpu"] = f"{hw.strip().split(' ')[1].replace('%', '')}%"
            elif "vram" in hw:
                results["mem"] = f"{hw.strip().split(' ')[1].replace('%', '')}%"

        return results


_INTEL_FDINFO_SAMPLE_SECONDS = 1.0

# Engines we track. Render/3D and Compute are pooled into "compute"; Video and
# VideoEnhance into "dec" (VideoEnhance is the post-process engine that handles
# VAAPI scaling/deinterlace/CSC, e.g. ffmpeg `-vf scale_vaapi=...`). The Copy
# (DMA blitter) engine is intentionally ignored — it represents transparent
# memory transfers, not user-visible GPU work.
# i915 fdinfo keys (cumulative ns) → logical engine name.
_I915_ENGINE_KEYS = {
    "drm-engine-render": "render",
    "drm-engine-video": "video",
    "drm-engine-video-enhance": "video-enhance",
    "drm-engine-compute": "compute",
}
# Xe fdinfo suffixes (cumulative cycles, paired with drm-total-cycles-*).
_XE_ENGINE_KEYS = {
    "rcs": "render",
    "vcs": "video",
    "vecs": "video-enhance",
    "ccs": "compute",
}
_INTEL_DRM_DRIVERS = ("i915", "xe")
_PCI_ADDRESS_RE = re.compile(
    r"^[0-9a-fA-F]{4}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}\.[0-9a-fA-F]$"
)


def _resolve_intel_gpu_pdev(device: str | None) -> str | None:
    """Map a configured GPU hint (/dev/dri/card1, renderD128, or a PCI bus
    address) to its drm-pdev string so we can filter fdinfo entries to that
    device. Returns None when no hint is supplied or it cannot be resolved."""
    if not device:
        return None

    if _PCI_ADDRESS_RE.match(device):
        return device

    name = os.path.basename(device.rstrip("/"))
    try:
        pdev = os.path.basename(os.path.realpath(f"/sys/class/drm/{name}/device"))
    except OSError:
        return None

    # realpath does not raise on a nonexistent node; it returns the input
    # path unchanged, so validate the result actually looks like a PCI
    # address before trusting it.
    return pdev if _PCI_ADDRESS_RE.match(pdev) else None


def _enumerate_drm_devices() -> dict[str, str]:
    """Map each PCI-attached DRM device to its bound kernel driver.

    Reads /sys/class/drm, which reflects every GPU on the host even when only
    some render nodes are mapped into the container, so device presence can be
    verified without /dev access. Returns {pdev: driver}, e.g.
    {"0000:00:02.0": "i915"}.
    """
    devices: dict[str, str] = {}

    try:
        entries = os.listdir("/sys/class/drm")
    except OSError:
        return devices

    for entry in entries:
        device_dir = f"/sys/class/drm/{entry}/device"
        pdev = os.path.basename(os.path.realpath(device_dir))

        if not _PCI_ADDRESS_RE.match(pdev):
            continue

        try:
            driver = os.path.basename(os.readlink(f"{device_dir}/driver"))
        except OSError:
            continue

        devices[pdev] = driver

    return devices


def _read_intel_drm_fdinfo(target_pdev: str | None) -> dict | None:
    """Snapshot DRM fdinfo for every Intel client visible in /proc.

    Returns a dict keyed by (pdev, drm-client-id, pid) so the same context
    seen via multiple file descriptors on a single process collapses to one
    entry. Clients whose fdinfo carries no engine counters are still included
    with an empty "engines" dict so the caller can distinguish "clients exist
    but the kernel publishes no busyness" from "no clients at all". Returns
    None when /proc itself cannot be scanned, which is a different failure
    than a scan that finds nothing.
    """
    snapshot: dict = {}

    try:
        proc_entries = os.listdir("/proc")
    except OSError:
        return None

    for entry in proc_entries:
        if not entry.isdigit():
            continue

        fdinfo_dir = f"/proc/{entry}/fdinfo"
        try:
            fds = os.listdir(fdinfo_dir)
        except (FileNotFoundError, PermissionError, NotADirectoryError, OSError):
            continue

        for fd in fds:
            try:
                with open(f"{fdinfo_dir}/{fd}") as f:
                    content = f.read()
            except (FileNotFoundError, PermissionError, OSError):
                continue

            if "drm-driver" not in content:
                continue

            fields: dict[str, str] = {}
            for line in content.splitlines():
                key, sep, value = line.partition(":")
                if sep:
                    fields[key.strip()] = value.strip()

            driver = fields.get("drm-driver")
            if driver not in ("i915", "xe"):
                continue

            pdev = fields.get("drm-pdev", "")
            if target_pdev and pdev != target_pdev:
                continue

            client_id = fields.get("drm-client-id")
            if not client_id:
                continue

            key = (pdev, client_id, entry)
            if key in snapshot:
                continue

            engines: dict[str, tuple[int, int, int]] = {}

            if driver == "i915":
                for fkey, engine in _I915_ENGINE_KEYS.items():
                    raw = fields.get(fkey)
                    if not raw:
                        continue
                    try:
                        engines[engine] = (int(raw.split()[0]), 0, 1)
                    except (ValueError, IndexError):
                        continue
            else:
                for suffix, engine in _XE_ENGINE_KEYS.items():
                    busy_raw = fields.get(f"drm-cycles-{suffix}")
                    total_raw = fields.get(f"drm-total-cycles-{suffix}")

                    if not (busy_raw and total_raw):
                        continue

                    # drm-cycles-* is summed across every instance of the engine
                    # class while drm-total-cycles-* tracks a single instance, so
                    # busy/total scales up to the capacity (e.g. Battlemage
                    # reports 2 for vcs/vecs). Capture it to divide back out;
                    # absent means a single engine, so default to 1.
                    capacity_raw = fields.get(f"drm-engine-capacity-{suffix}")

                    try:
                        capacity = int(capacity_raw.split()[0]) if capacity_raw else 1
                    except (ValueError, IndexError):
                        capacity = 1

                    try:
                        engines[engine] = (
                            int(busy_raw.split()[0]),
                            int(total_raw.split()[0]),
                            max(1, capacity),
                        )
                    except (ValueError, IndexError):
                        continue

            snapshot[key] = {"driver": driver, "pid": entry, "engines": engines}

    return snapshot


def _idle_intel_gpu_stats(
    target_pdev: str | None, intel_pdevs: dict[str, str]
) -> dict[str, dict[str, Any]]:
    """Build a 0% reading for the configured (or every) Intel GPU.

    Used when the device is confirmed present but no DRM client is currently
    attached, e.g. while camera processes are restarting. That is an idle
    state, not a collection failure, so it must produce a valid reading:
    returning None would latch the hwaccel error cooldown and blank GPU stats
    for an hour over a momentary gap.
    """
    from frigate.stats.intel_gpu_info import intel_gpu_name_resolver

    names = intel_gpu_name_resolver.get_names()
    pdevs = [target_pdev] if target_pdev else sorted(intel_pdevs)

    return {
        pdev: {
            "name": names.get(pdev) or "Intel iGPU",
            "vendor": "intel",
            "gpu": "0.0%",
            "mem": "-%",
            "compute": "0.0%",
            "dec": "0.0%",
        }
        for pdev in pdevs
    }


def get_intel_gpu_stats(
    intel_gpu_device: str | None,
) -> dict[str, dict[str, Any]] | None:
    """Get stats by reading DRM fdinfo files, bucketed per-pdev.

    Each DRM client FD exposes monotonic per-engine busy counters via
    /proc/<pid>/fdinfo/<fd>. For i915 this requires kernel 6.5 or newer:
    earlier kernels omit the per-engine counters whenever GuC submission is
    active, which is the default on 12th gen and newer. Xe has exposed them
    since its first release. We sample twice and divide busy-time deltas by
    wall-clock to derive utilization. Render/3D and Compute are pooled into
    "compute"; Video and VideoEnhance into "dec". Overall "gpu" is the sum of
    those pools (clamped to 100%).

    The return value is keyed by the GPU's drm-pdev string so multiple Intel
    GPUs in the same system are reported separately. Each entry carries a
    "name" populated from OpenVINO (falling back to the pdev) so callers can
    surface a real device name in the UI.

    A device that exists but has no attached DRM clients reports an idle 0%
    reading. None is returned only for durable failures (no Intel GPU, a bad
    intel_gpu_device config, unreadable /proc, or a kernel that publishes no
    counters), each of which logs a distinct warning, and the caller latches
    it against retries for an hour.
    """
    from frigate.stats.intel_gpu_info import intel_gpu_name_resolver

    target_pdev = _resolve_intel_gpu_pdev(intel_gpu_device)
    if intel_gpu_device and not target_pdev:
        logger.warning(
            "Unable to collect Intel GPU stats: configured intel_gpu_device %s "
            "does not exist or could not be resolved to a PCI device",
            intel_gpu_device,
        )
        return None

    drm_devices = _enumerate_drm_devices()
    intel_pdevs = {
        pdev: driver
        for pdev, driver in drm_devices.items()
        if driver in _INTEL_DRM_DRIVERS
    }

    if not intel_pdevs:
        logger.warning(
            "Unable to collect Intel GPU stats: no Intel GPU (i915/xe) found in "
            "/sys/class/drm. Check that the driver is loaded on the host"
        )
        return None

    if target_pdev and target_pdev not in intel_pdevs:
        logger.warning(
            "Unable to collect Intel GPU stats: configured intel_gpu_device %s "
            "resolved to %s (driver: %s), which is not an Intel GPU",
            intel_gpu_device,
            target_pdev,
            drm_devices.get(target_pdev, "unknown"),
        )
        return None

    snapshot_a = _read_intel_drm_fdinfo(target_pdev)
    if snapshot_a is None:
        logger.warning("Unable to collect Intel GPU stats: /proc could not be read")
        return None

    if not snapshot_a:
        # No process currently holds the GPU open, e.g. while camera processes
        # are restarting. The device is confirmed present, so report idle
        # rather than an error; the next stats cycle re-samples normally.
        logger.debug("No active DRM clients for Intel GPU, reporting idle")
        return _idle_intel_gpu_stats(target_pdev, intel_pdevs)

    if not any(client["engines"] for client in snapshot_a.values()):
        # Clients exist but the kernel published no busyness for them, so
        # there is nothing to sample and a second snapshot would not help.
        # i915 suppresses per-client engine counters while GuC submission is
        # active on kernels older than 6.5 (kernel commit 1324680a80eb lifted
        # this), which covers stock Debian 12 and Ubuntu 22.04 on 12th gen
        # and newer.
        logger.warning(
            "Unable to collect Intel GPU stats: found %d DRM client(s) for %s but "
            "no per-engine counters. Kernel 6.5 or newer is required.",
            len(snapshot_a),
            "/".join(sorted({client["driver"] for client in snapshot_a.values()})),
        )
        return None

    start = time.monotonic()
    time.sleep(_INTEL_FDINFO_SAMPLE_SECONDS)
    elapsed_ns = (time.monotonic() - start) * 1e9

    snapshot_b = _read_intel_drm_fdinfo(target_pdev)
    if snapshot_b is None:
        logger.warning("Unable to collect Intel GPU stats: /proc could not be read")
        return None

    if not snapshot_b or elapsed_ns <= 0:
        # Every client disappeared during the sample window; transient by
        # definition, so report idle instead of latching an error.
        logger.debug(
            "No DRM clients persisted across Intel GPU samples, reporting idle"
        )
        return _idle_intel_gpu_stats(target_pdev, intel_pdevs)

    def _new_engine_pct() -> dict[str, float]:
        return {"render": 0.0, "video": 0.0, "video-enhance": 0.0, "compute": 0.0}

    per_pdev_engine_pct: dict[str, dict[str, float]] = {}
    per_pdev_pid_pct: dict[str, dict[str, float]] = {}

    for key, data_b in snapshot_b.items():
        data_a = snapshot_a.get(key)
        if not data_a or data_a["driver"] != data_b["driver"]:
            continue

        # Skip before the setdefault below so a counter-less client cannot
        # register its pdev on its own.
        if not data_b["engines"]:
            continue

        pdev = key[0]
        engine_pct = per_pdev_engine_pct.setdefault(pdev, _new_engine_pct())
        pid_pct = per_pdev_pid_pct.setdefault(pdev, {})

        client_total = 0.0
        for engine, (busy_b, total_b, capacity) in data_b["engines"].items():
            if engine not in engine_pct:
                continue

            busy_a, total_a, _ = data_a["engines"].get(
                engine, (busy_b, total_b, capacity)
            )

            if data_b["driver"] == "i915":
                delta = max(0, busy_b - busy_a)
                pct = min(100.0, delta / elapsed_ns * 100.0)
            else:
                delta_busy = max(0, busy_b - busy_a)
                delta_total = total_b - total_a
                if delta_total <= 0:
                    continue
                # Normalize by capacity so a class with N engine instances
                # (busy summed across all N) reports 0-100%, not 0-N*100%.
                pct = min(100.0, delta_busy / (delta_total * capacity) * 100.0)

            engine_pct[engine] += pct
            client_total += pct

        pid_pct[data_b["pid"]] = pid_pct.get(data_b["pid"], 0.0) + client_total

    if not per_pdev_engine_pct:
        # Clients were seen in both snapshots but none persisted as the same
        # (pdev, client-id, pid); process churn, so report idle.
        logger.debug(
            "No DRM clients persisted across Intel GPU samples, reporting idle"
        )
        return _idle_intel_gpu_stats(target_pdev, intel_pdevs)

    names = intel_gpu_name_resolver.get_names()
    results: dict[str, dict[str, Any]] = {}

    for pdev, engine_pct in per_pdev_engine_pct.items():
        for engine in engine_pct:
            engine_pct[engine] = min(100.0, engine_pct[engine])

        compute_pct = min(100.0, engine_pct["render"] + engine_pct["compute"])
        dec_pct = min(100.0, engine_pct["video"] + engine_pct["video-enhance"])
        overall_pct = min(100.0, compute_pct + dec_pct)

        entry: dict[str, Any] = {
            "name": names.get(pdev) or "Intel iGPU",
            "vendor": "intel",
            "gpu": f"{round(overall_pct, 2)}%",
            "mem": "-%",
            "compute": f"{round(compute_pct, 2)}%",
            "dec": f"{round(dec_pct, 2)}%",
        }

        pid_pct = per_pdev_pid_pct.get(pdev)
        if pid_pct:
            entry["clients"] = {
                pid: f"{round(min(100.0, pct), 2)}%" for pid, pct in pid_pct.items()
            }

        results[pdev] = entry

    return results


def get_openvino_npu_stats() -> dict[str, str] | None:
    """Get NPU stats using openvino."""
    NPU_RUNTIME_PATH = "/sys/devices/pci0000:00/0000:00:0b.0/power/runtime_active_time"

    try:
        with open(NPU_RUNTIME_PATH) as f:
            initial_runtime = float(f.read().strip())

        initial_time = time.time()

        # Sleep for 1 second to get an accurate reading
        time.sleep(1.0)

        # Read runtime value again
        with open(NPU_RUNTIME_PATH) as f:
            current_runtime = float(f.read().strip())

        current_time = time.time()

        # Calculate usage percentage
        runtime_diff = current_runtime - initial_runtime
        time_diff = (current_time - initial_time) * 1000.0  # Convert to milliseconds

        if time_diff > 0:
            usage = min(100.0, max(0.0, (runtime_diff / time_diff * 100.0)))
        else:
            usage = 0.0

        return {"npu": f"{round(usage, 2)}", "mem": "-%"}
    except (FileNotFoundError, PermissionError, ValueError):
        return None


def get_rockchip_gpu_stats() -> dict[str, str | float] | None:
    """Get GPU stats using rk."""
    try:
        with open("/sys/kernel/debug/rkrga/load") as f:
            content = f.read()
    except FileNotFoundError:
        return None

    load_values = []
    for line in content.splitlines():
        match = re.search(r"load = (\d+)%", line)
        if match:
            load_values.append(int(match.group(1)))

    if not load_values:
        return None

    average_load = f"{round(sum(load_values) / len(load_values), 2)}%"
    stats: dict[str, str | float] = {"gpu": average_load, "mem": "-%"}

    try:
        with open("/sys/class/thermal/thermal_zone5/temp") as f:
            line = f.readline().strip()
            stats["temp"] = round(int(line) / 1000, 1)
    except (FileNotFoundError, OSError, ValueError):
        pass

    return stats


def get_rockchip_npu_stats() -> dict[str, float | str] | None:
    """Get NPU stats using rk."""
    try:
        with open("/sys/kernel/debug/rknpu/load") as f:
            npu_output = f.read()

            if "Core0:" in npu_output:
                # multi core NPU
                core_loads = re.findall(r"Core\d+:\s*(\d+)%", npu_output)
            else:
                # single core NPU
                core_loads = re.findall(r"NPU load:\s+(\d+)%", npu_output)
    except FileNotFoundError:
        core_loads = None

    if not core_loads:
        return None

    percentages = [int(load) for load in core_loads]
    mean = round(sum(percentages) / len(percentages), 2)
    stats: dict[str, float | str] = {"npu": mean, "mem": "-%"}

    try:
        with open("/sys/class/thermal/thermal_zone6/temp") as f:
            line = f.readline().strip()
            stats["temp"] = round(int(line) / 1000, 1)
    except (FileNotFoundError, OSError, ValueError):
        pass

    return stats


def get_axcl_npu_stats() -> dict[str, str | float] | None:
    """Get NPU stats using axcl."""
    # Check if axcl-smi exists
    axcl_smi_path = "/usr/bin/axcl/axcl-smi"
    if not os.path.exists(axcl_smi_path):
        return None

    try:
        # Run axcl-smi command to get NPU stats
        axcl_command = [axcl_smi_path, "sh", "cat", "/proc/ax_proc/npu/top"]
        p = sp.run(
            axcl_command,
            capture_output=True,
            text=True,
        )

        if p.returncode != 0:
            pass
        else:
            utilization = None

            for line in p.stdout.strip().splitlines():
                line = line.strip()
                if line.startswith("utilization:"):
                    match = re.search(r"utilization:(\d+)%", line)
                    if match:
                        utilization = float(match.group(1))

            if utilization is not None:
                stats: dict[str, str | float] = {"npu": utilization, "mem": "-%"}
                return stats
    except Exception:
        pass

    return None


def try_get_info(f, h, default="N/A", sensor=None):
    try:
        if h:
            if sensor is not None:
                v = f(h, sensor)
            else:
                v = f(h)
        else:
            v = f()
    except nvml.NVMLError_NotSupported:
        v = default
    return v


def get_nvidia_gpu_stats() -> dict[int, dict]:
    names: dict[str, int] = {}
    results = {}
    try:
        nvml.nvmlInit()
        deviceCount = nvml.nvmlDeviceGetCount()
        for i in range(deviceCount):
            handle = nvml.nvmlDeviceGetHandleByIndex(i)
            gpu_name = nvml.nvmlDeviceGetName(handle)

            # handle case where user has multiple of same GPU
            if gpu_name in names:
                names[gpu_name] += 1
                gpu_name += f" ({names.get(gpu_name)})"
            else:
                names[gpu_name] = 1

            meminfo = try_get_info(nvml.nvmlDeviceGetMemoryInfo, handle)
            util = try_get_info(nvml.nvmlDeviceGetUtilizationRates, handle)
            enc = try_get_info(nvml.nvmlDeviceGetEncoderUtilization, handle)
            dec = try_get_info(nvml.nvmlDeviceGetDecoderUtilization, handle)
            temp = try_get_info(
                nvml.nvmlDeviceGetTemperature, handle, default=None, sensor=0
            )
            pstate = try_get_info(nvml.nvmlDeviceGetPowerState, handle, default=None)

            if util != "N/A":
                gpu_util = util.gpu
            else:
                gpu_util = 0

            if meminfo != "N/A":
                gpu_mem_util = meminfo.used / meminfo.total * 100
            else:
                gpu_mem_util = -1

            if temp != "N/A" and temp is not None:
                temp = float(temp)
            else:
                temp = None

            if enc != "N/A":
                enc_util = enc[0]
            else:
                enc_util = -1

            if dec != "N/A":
                dec_util = dec[0]
            else:
                dec_util = -1

            results[i] = {
                "name": gpu_name,
                "gpu": gpu_util,
                "mem": gpu_mem_util,
                "enc": enc_util,
                "dec": dec_util,
                "pstate": pstate or "unknown",
                "temp": temp,
            }
    except Exception:
        pass
    finally:
        return results


def get_jetson_stats() -> dict[int, dict] | None:
    results = {}

    try:
        results["mem"] = "-"  # no discrete gpu memory

        if os.path.exists("/sys/devices/gpu.0/load"):
            with open("/sys/devices/gpu.0/load") as f:
                gpuload = float(f.readline()) / 10
                results["gpu"] = f"{gpuload}%"
        elif os.path.exists("/sys/devices/platform/gpu.0/load"):
            with open("/sys/devices/platform/gpu.0/load") as f:
                gpuload = float(f.readline()) / 10
                results["gpu"] = f"{gpuload}%"
        else:
            results["gpu"] = "-"
    except Exception:
        return None

    return results


def get_hailo_temps() -> dict[str, float]:
    """Get temperatures for Hailo devices."""
    try:
        from hailo_platform import Device
    except ModuleNotFoundError:
        return {}

    temps = {}

    try:
        device_ids = Device.scan()
        for i, device_id in enumerate(device_ids):
            try:
                with Device(device_id) as device:
                    temp_info = device.control.get_chip_temperature()

                    # Get board name and normalise it
                    identity = device.control.identify()
                    board_name = None
                    for line in str(identity).split("\n"):
                        if line.startswith("Board Name:"):
                            board_name = (
                                line.split(":", 1)[1].strip().lower().replace("-", "")
                            )
                            break

                    if not board_name:
                        board_name = f"hailo{i}"

                    # Use indexed name if multiple devices, otherwise just the board name
                    device_name = (
                        f"{board_name}-{i}" if len(device_ids) > 1 else board_name
                    )

                    # ts1_temperature is also available, but appeared to be the same as ts0 in testing.
                    temps[device_name] = round(temp_info.ts0_temperature, 1)
            except Exception as e:
                logger.debug(
                    f"Failed to get temperature for Hailo device {device_id}: {e}"
                )
                continue
    except Exception as e:
        logger.debug(f"Failed to scan for Hailo devices: {e}")

    return temps


def is_go2rtc_arbitrary_exec_allowed() -> bool:
    """Read the GO2RTC_ALLOW_ARBITRARY_EXEC override from env, docker
    secrets, or the Home Assistant add-on options file."""
    raw: str | None = None
    if "GO2RTC_ALLOW_ARBITRARY_EXEC" in os.environ:
        raw = os.environ.get("GO2RTC_ALLOW_ARBITRARY_EXEC")
    elif (
        os.path.isdir("/run/secrets")
        and os.access("/run/secrets", os.R_OK)
        and "GO2RTC_ALLOW_ARBITRARY_EXEC" in os.listdir("/run/secrets")
    ):
        try:
            with open("/run/secrets/GO2RTC_ALLOW_ARBITRARY_EXEC") as f:
                raw = f.read().strip()
        except OSError:
            raw = None
    elif os.path.isfile("/data/options.json"):
        try:
            with open("/data/options.json") as f:
                options = json.loads(f.read())
            raw = options.get("go2rtc_allow_arbitrary_exec")
        except (OSError, json.JSONDecodeError):
            raw = None

    return raw is not None and str(raw).lower() in ("true", "1", "yes")


def is_restricted_go2rtc_source(stream_source: str) -> bool:
    """Check if a stream source is a restricted type (echo, expr, or exec)
    and the GO2RTC_ALLOW_ARBITRARY_EXEC override is not set."""
    if not stream_source.strip().startswith(("echo:", "expr:", "exec:")):
        return False
    return not is_go2rtc_arbitrary_exec_allowed()


def ffprobe_stream(ffmpeg, path: str, detailed: bool = False) -> sp.CompletedProcess:
    """Run ffprobe on stream."""
    clean_path = escape_special_characters(path)

    # Base entries that are always included
    stream_entries = "codec_long_name,width,height,bit_rate,duration,display_aspect_ratio,avg_frame_rate"

    # Additional detailed entries
    if detailed:
        stream_entries += ",codec_name,profile,level,pix_fmt,channels,sample_rate,channel_layout,r_frame_rate"
        format_entries = "format_name,size,bit_rate,duration"
    else:
        format_entries = None

    def run(rtsp_transport: str | None = None) -> sp.CompletedProcess:
        cmd = [ffmpeg.ffprobe_path]
        if rtsp_transport:
            cmd += ["-rtsp_transport", rtsp_transport]
        cmd += [
            "-timeout",
            "1000000",
            "-print_format",
            "json",
            "-show_entries",
            f"stream={stream_entries}",
        ]
        if detailed and format_entries:
            cmd.extend(["-show_entries", f"format={format_entries}"])
        cmd.extend(["-loglevel", "error", clean_path])
        try:
            return sp.run(cmd, capture_output=True, timeout=6)
        except sp.TimeoutExpired as e:
            logger.info(
                "ffprobe timed out while probing %s (transport=%s)",
                clean_camera_user_pass(path),
                rtsp_transport or "default",
            )
            return sp.CompletedProcess(
                args=cmd,
                returncode=1,
                stdout=e.stdout or b"",
                stderr=(e.stderr or b"") + b"\nffprobe timed out",
            )

    result = run()

    # For RTSP: retry with explicit TCP transport if the first attempt failed
    # (default UDP may be blocked)
    if result.returncode != 0 and clean_path.startswith("rtsp://"):
        result = run(rtsp_transport="tcp")

    return result


KEYFRAME_PROBE_WINDOW_SECONDS = 20
KEYFRAME_GAP_WARNING_SECONDS = 4.0


def parse_keyframe_packets(output: str) -> tuple[list[float], float | None]:
    """Parse ffprobe CSV `pts_time,flags` output.

    Returns the presentation timestamps of keyframes (flags containing "K")
    and the maximum timestamp observed across all packets.
    """
    keyframe_pts: list[float] = []
    max_pts: float | None = None

    for line in output.splitlines():
        parts = line.split(",")
        if len(parts) < 2:
            continue
        try:
            pts = float(parts[0])
        except ValueError:
            continue
        if max_pts is None or pts > max_pts:
            max_pts = pts
        if "K" in parts[1]:
            keyframe_pts.append(pts)

    return keyframe_pts, max_pts


def classify_keyframe_gaps(
    keyframe_pts: list[float], segment_time: int
) -> dict[str, Any]:
    """Classify keyframe spacing for recording suitability.

    A camera using a smart/+ codec or a long/variable GOP produces large or
    irregular gaps between keyframes, which breaks time-based recording
    segmentation. Severity:
      - "unknown" when fewer than two keyframes were observed
      - "error" when the longest gap exceeds the record segment length
      - "warning" when the longest gap exceeds the warning threshold
      - "ok" otherwise
    """
    thresholds = {
        "warning": KEYFRAME_GAP_WARNING_SECONDS,
        "error": segment_time,
    }

    if len(keyframe_pts) < 2:
        return {
            "keyframe_count": len(keyframe_pts),
            "max_gap": None,
            "mean_gap": None,
            "min_gap": None,
            "segment_time": segment_time,
            "severity": "unknown",
            "thresholds": thresholds,
        }

    gaps = [b - a for a, b in zip(keyframe_pts, keyframe_pts[1:])]
    max_gap = max(gaps)

    if max_gap > segment_time:
        severity = "error"
    elif max_gap > KEYFRAME_GAP_WARNING_SECONDS:
        severity = "warning"
    else:
        severity = "ok"

    return {
        "keyframe_count": len(keyframe_pts),
        "max_gap": round(max_gap, 2),
        "mean_gap": round(sum(gaps) / len(gaps), 2),
        "min_gap": round(min(gaps), 2),
        "segment_time": segment_time,
        "severity": severity,
        "thresholds": thresholds,
    }


async def analyze_record_keyframes(
    ffmpeg, url: str, segment_time: int, window: int = KEYFRAME_PROBE_WINDOW_SECONDS
) -> dict[str, Any]:
    """Probe a stream for ~`window` seconds and classify its keyframe spacing.

    Reads video packet flags via ffprobe to find keyframes, then measures the
    gaps between them. On timeout or failure returns an "unknown" result rather
    than a false all-clear.
    """
    clean_url = escape_special_characters(url)
    cmd = [
        ffmpeg.ffprobe_path,
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-read_intervals",
        f"%+{window}",
        "-show_entries",
        "packet=pts_time,flags",
        "-of",
        "csv=p=0",
        clean_url,
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=window + 15)
    except TimeoutError:
        logger.warning("Keyframe probe timed out for record stream")
        proc.kill()
        return classify_keyframe_gaps([], segment_time)
    except OSError as err:
        logger.error("Keyframe probe failed: %s", err)
        return classify_keyframe_gaps([], segment_time)

    keyframe_pts, max_pts = parse_keyframe_packets(stdout.decode("utf-8", "replace"))
    result = classify_keyframe_gaps(keyframe_pts, segment_time)
    result["duration_observed"] = round(max_pts, 2) if max_pts is not None else None
    return result


def vainfo_hwaccel(device_name: str | None = None) -> sp.CompletedProcess:
    """Run vainfo."""
    if not device_name:
        cmd = ["vainfo"]
    else:
        if os.path.isabs(device_name) and device_name.startswith("/dev/dri/"):
            device_path = device_name
        else:
            device_path = f"/dev/dri/{device_name}"

        cmd = ["vainfo", "--display", "drm", "--device", device_path]

    return sp.run(cmd, capture_output=True)


def get_nvidia_driver_info() -> dict[str, Any]:
    """Get general hardware info for nvidia GPU."""
    results = {}
    try:
        nvml.nvmlInit()
        deviceCount = nvml.nvmlDeviceGetCount()
        for i in range(deviceCount):
            handle = nvml.nvmlDeviceGetHandleByIndex(i)
            driver = try_get_info(nvml.nvmlSystemGetDriverVersion, None, default=None)
            cuda_compute = try_get_info(
                nvml.nvmlDeviceGetCudaComputeCapability, handle, default=None
            )
            vbios = try_get_info(nvml.nvmlDeviceGetVbiosVersion, handle, default=None)
            results[i] = {
                "name": nvml.nvmlDeviceGetName(handle),
                "driver": driver or "unknown",
                "cuda_compute": cuda_compute or "unknown",
                "vbios": vbios or "unknown",
            }
    except Exception:
        pass
    finally:
        return results


def auto_detect_hwaccel() -> str:
    """Detect hwaccel args by default."""
    try:
        cuda = False
        vaapi = False
        resp = requests.get("http://127.0.0.1:1984/api/ffmpeg/hardware", timeout=3)

        if resp.status_code == 200:
            data: dict[str, list[dict[str, str]]] = resp.json()
            for source in data.get("sources", []):
                if "cuda" in source.get("url", "") and source.get("name") == "OK":
                    cuda = True

                if "vaapi" in source.get("url", "") and source.get("name") == "OK":
                    vaapi = True
    except requests.RequestException:
        pass

    if cuda:
        logger.info("Automatically detected nvidia hwaccel for video decoding")
        return FFMPEG_HWACCEL_NVIDIA

    if vaapi:
        logger.info("Automatically detected vaapi hwaccel for video decoding")
        return FFMPEG_HWACCEL_VAAPI

    logger.warning(
        "Did not detect hwaccel, using a GPU for accelerated video decoding is highly recommended"
    )
    return ""


async def get_video_properties(
    ffmpeg, url: str, get_duration: bool = False
) -> dict[str, Any]:
    async def probe_with_ffprobe(
        url: str,
        rtsp_transport: str | None = None,
    ) -> tuple[bool, int, int, str | None, float]:
        """Fallback using ffprobe: returns (valid, width, height, codec, duration)."""
        cmd = [ffmpeg.ffprobe_path]
        if rtsp_transport:
            cmd += ["-rtsp_transport", rtsp_transport]
        cmd += [
            "-rw_timeout",
            "5000000",
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            url,
        ]
        proc = None
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            try:
                stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=6)
            except TimeoutError:
                logger.info(
                    "ffprobe timed out while probing %s (transport=%s)",
                    clean_camera_user_pass(url),
                    rtsp_transport or "default",
                )
                proc.kill()
                await proc.wait()
                return False, 0, 0, None, -1

            if proc.returncode != 0:
                return False, 0, 0, None, -1

            data = json.loads(stdout.decode())
            video_streams = [
                s for s in data.get("streams", []) if s.get("codec_type") == "video"
            ]
            if not video_streams:
                return False, 0, 0, None, -1

            v = video_streams[0]
            width = int(v.get("width", 0))
            height = int(v.get("height", 0))
            codec = v.get("codec_name")

            duration_str = data.get("format", {}).get("duration")
            duration = float(duration_str) if duration_str else -1.0

            return True, width, height, codec, duration
        except (json.JSONDecodeError, ValueError, KeyError, sp.SubprocessError):
            return False, 0, 0, None, -1

    def probe_with_cv2(url: str) -> tuple[bool, int, int, str | None, float]:
        """Primary attempt using cv2: returns (valid, width, height, fourcc, duration)."""
        cap = cv2.VideoCapture(url)
        if not cap.isOpened():
            cap.release()
            return False, 0, 0, None, -1

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        valid = width > 0 and height > 0
        fourcc = None
        duration = -1.0

        if valid:
            fourcc_int = int(cap.get(cv2.CAP_PROP_FOURCC))
            fourcc = fourcc_int.to_bytes(4, "little").decode("latin-1").strip()

            if get_duration:
                fps = cap.get(cv2.CAP_PROP_FPS)
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                if fps > 0 and total_frames > 0:
                    duration = total_frames / fps

        cap.release()
        return valid, width, height, fourcc, duration

    is_rtsp = url.startswith("rtsp://")

    if is_rtsp:
        # skip cv2 for RTSP: its FFmpeg backend has a hardcoded ~30s internal
        # timeout that cannot be shortened per-call, and ffprobe bounded by
        # -rw_timeout handles RTSP probing reliably
        has_video, width, height, fourcc, duration = await probe_with_ffprobe(url)
    else:
        # try cv2 first for local files, HTTP, RTMP
        has_video, width, height, fourcc, duration = probe_with_cv2(url)

        # fallback to ffprobe if needed
        if not has_video or (get_duration and duration < 0):
            has_video, width, height, fourcc, duration = await probe_with_ffprobe(url)

    # last resort for RTSP: try TCP transport, since default UDP may be blocked
    if (not has_video or (get_duration and duration < 0)) and is_rtsp:
        has_video, width, height, fourcc, duration = await probe_with_ffprobe(
            url, rtsp_transport="tcp"
        )

    result: dict[str, Any] = {"has_valid_video": has_video}
    if has_video:
        result.update({"width": width, "height": height})
        if fourcc:
            result["fourcc"] = fourcc
    if get_duration:
        result["duration"] = duration

    return result


def process_logs(
    contents: str,
    service: str | None = None,
    start: int | None = None,
    end: int | None = None,
) -> tuple[int, list[str]]:
    log_lines = []
    last_message = None
    last_timestamp = None
    repeat_count = 0

    for raw_line in contents.splitlines():
        clean_line = raw_line.strip()

        if len(clean_line) < 10:
            continue

        # Handle cases where S6 does not include date in log line
        if "  " not in clean_line:
            clean_line = f"{datetime.now()}  {clean_line}"

        try:
            # Find the position of the first double space to extract timestamp and message
            date_end = clean_line.index("  ")
            timestamp = clean_line[:date_end]
            full_message = clean_line[date_end:].strip()

            # For frigate, remove the date part from message comparison
            if service == "frigate":
                # Skip the date at the start of the message if it exists
                date_parts = full_message.split("]", 1)
                if len(date_parts) > 1:
                    message_part = date_parts[1].strip()
                else:
                    message_part = full_message
            else:
                message_part = full_message

            if message_part == last_message:
                repeat_count += 1
                continue
            else:
                if repeat_count > 0:
                    # Insert a deduplication message formatted the same way as logs
                    dedup_message = f"{last_timestamp}  [LOGGING] Last message repeated {repeat_count} times"
                    log_lines.append(dedup_message)
                    repeat_count = 0

                log_lines.append(clean_line)
                last_timestamp = timestamp

                last_message = message_part

        except ValueError:
            # If we can't parse the line properly, just add it as is
            log_lines.append(clean_line)
            continue

    # If there were repeated messages at the end, log the count
    if repeat_count > 0:
        dedup_message = (
            f"{last_timestamp}  [LOGGING] Last message repeated {repeat_count} times"
        )
        log_lines.append(dedup_message)

    return len(log_lines), log_lines[start:end]


def set_file_limit() -> None:
    # Newer versions of containerd 2.X+ impose a very low soft file limit of 1024
    # This applies to OSs like HA OS (see https://github.com/home-assistant/operating-system/issues/4110)
    # Attempt to increase this limit
    soft_limit = int(os.getenv("SOFT_FILE_LIMIT", "65536") or "65536")

    current_soft, current_hard = resource.getrlimit(resource.RLIMIT_NOFILE)
    logger.debug(f"Current file limits - Soft: {current_soft}, Hard: {current_hard}")

    new_soft = min(soft_limit, current_hard)
    resource.setrlimit(resource.RLIMIT_NOFILE, (new_soft, current_hard))
    logger.debug(
        f"File limit set. New soft limit: {new_soft}, Hard limit remains: {current_hard}"
    )


def get_fs_type(path: str) -> str:
    bestMatch = ""
    fsType = ""
    for part in psutil.disk_partitions(all=True):
        if path.startswith(part.mountpoint) and len(bestMatch) < len(part.mountpoint):
            fsType = part.fstype
            bestMatch = part.mountpoint
    return fsType


def calculate_shm_requirements(config) -> dict:
    try:
        storage_stats = shutil.disk_usage("/dev/shm")
    except (FileNotFoundError, OSError):
        return {}

    total_mb = round(storage_stats.total / pow(2, 20), 1)
    used_mb = round(storage_stats.used / pow(2, 20), 1)
    free_mb = round(storage_stats.free / pow(2, 20), 1)

    # required for log files + nginx cache
    min_req_shm = 40 + 10

    if config.birdseye.restream:
        min_req_shm += 8

    available_shm = total_mb - min_req_shm
    cam_total_frame_size = 0.0

    for camera in config.cameras.values():
        if camera.enabled_in_config and camera.detect.width and camera.detect.height:
            cam_total_frame_size += round(
                (camera.detect.width * camera.detect.height * 1.5 + 270480) / 1048576,
                1,
            )

    # leave room for 2 cameras that are added dynamically, if a user wants to add more cameras they may need to increase the SHM size and restart after adding them.
    cam_total_frame_size += 2 * round(
        (1280 * 720 * 1.5 + 270480) / 1048576,
        1,
    )

    shm_frame_count = min(
        int(os.environ.get(SHM_FRAMES_VAR, "50")),
        int(available_shm / cam_total_frame_size),
    )

    # minimum required shm recommendation
    min_shm = round(min_req_shm + cam_total_frame_size * 20)

    return {
        "total": total_mb,
        "used": used_mb,
        "free": free_mb,
        "mount_type": get_fs_type("/dev/shm"),
        "available": round(available_shm, 1),
        "camera_frame_size": cam_total_frame_size,
        "shm_frame_count": shm_frame_count,
        "min_shm": min_shm,
    }
