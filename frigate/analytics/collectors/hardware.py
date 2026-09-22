"""Hardware section: CPU, memory, GPUs, decode and detection hardware, storage."""

import os
from collections import Counter
from typing import Any

import psutil

from frigate.analytics.collectors.common import closed, histogram
from frigate.analytics.context import ReportContext
from frigate.analytics.schema import (
    DecodeFamily,
    GpuInfo,
    GpuVendor,
    HardwareKey,
    HardwareSection,
    StorageInfo,
)
from frigate.const import RECORD_DIR
from frigate.detectors.hardware import hardware_prober
from frigate.util.hwaccel import hwaccel_options

DEVICE_TREE_MODEL = "/proc/device-tree/model"
CPUINFO = "/proc/cpuinfo"


def cpu_model() -> str:
    """The board model on ARM boards, else the CPU's model name."""
    try:
        with open(DEVICE_TREE_MODEL) as f:
            board = f.read().strip("\x00\n ")

        if board:
            return board[:64]
    except OSError:
        pass

    try:
        with open(CPUINFO) as f:
            for line in f:
                key, _, value = line.partition(":")

                if key.strip() == "model name" and value.strip():
                    return value.strip()[:64]
    except OSError:
        pass

    return "unknown"


def gpus(stats: dict[str, Any]) -> list[GpuInfo]:
    found: list[GpuInfo] = []

    for name, entry in stats.get("gpu_usages", {}).items():
        vendor = entry.get("vendor") if isinstance(entry, dict) else None
        found.append(
            GpuInfo(
                vendor=closed(GpuVendor, vendor, GpuVendor.other),
                name=str(name)[:64],
            )
        )

    return found


def decode_families() -> list[DecodeFamily]:
    _, available = hwaccel_options()
    families = [
        closed(DecodeFamily, family.key, DecodeFamily.other) for family in available
    ]
    return list(dict.fromkeys(families))


def detection_hardware() -> dict[HardwareKey, int]:
    units: Counter[HardwareKey] = Counter()

    for found in hardware_prober.probe():
        units[closed(HardwareKey, found.key, HardwareKey.other)] += found.count

    return histogram(units)


def storage(stats: dict[str, Any]) -> StorageInfo:
    # stats report sizes in MB
    entry = stats.get("service", {}).get("storage", {}).get(RECORD_DIR) or {}
    total_mb = float(entry.get("total") or 0)
    used_mb = float(entry.get("used") or 0)

    return StorageInfo(
        record_fs=str(entry.get("mount_type") or "unknown")[:16],
        record_total_gb=round(total_mb / 1024),
        record_used_pct=min(round(used_mb / total_mb * 100), 100)
        if total_mb > 0
        else 0,
    )


def collect(ctx: ReportContext) -> HardwareSection:
    return HardwareSection(
        cpu_model=cpu_model(),
        cpu_cores=os.cpu_count() or 0,
        memory_gb=round(psutil.virtual_memory().total / 2**30),
        gpus=gpus(ctx.stats),
        decode_families=decode_families(),
        detection_hardware=detection_hardware(),
        storage=storage(ctx.stats),
    )
