from typing import Optional

from pydantic import Field

from .base import FrigateBaseModel

__all__ = ["TelemetryConfig", "StatsConfig"]


class StatsConfig(FrigateBaseModel):
    amd_gpu_stats: bool = Field(
        default=True,
        title="Enable AMD GPU stats",
        description="Enable collection of AMD GPU statistics if an AMD GPU is present.",
    )
    intel_gpu_stats: bool = Field(
        default=True,
        title="Enable Intel GPU stats",
        description="Enable collection of Intel GPU statistics if an Intel GPU is present.",
    )
    network_bandwidth: bool = Field(
        default=False,
        title="Enable network bandwidth for ffmpeg processes",
        description="Enable per-process network bandwidth monitoring for camera ffmpeg processes and detectors (requires capabilities).",
    )
    intel_gpu_device: Optional[str] = Field(
        default=None,
        title="Define the device to use when gathering SR-IOV stats",
        description="Device identifier used when treating Intel GPUs as SR-IOV to fix GPU stats.",
    )


class TelemetryConfig(FrigateBaseModel):
    network_interfaces: list[str] = Field(
        default=[],
        title="Enabled network interfaces for bandwidth calculation",
        description="List of network interface name prefixes to monitor for bandwidth statistics.",
    )
    stats: StatsConfig = Field(
        default_factory=StatsConfig,
        title="System Stats",
        description="Options to enable/disable collection of various system and GPU statistics.",
    )
    version_check: bool = Field(
        default=True,
        title="Enable latest version check",
        description="Enable an outbound check to detect if a newer Frigate version is available.",
    )
