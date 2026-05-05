from typing import Optional

from pydantic import Field

from .base import FrigateBaseModel

__all__ = ["TelemetryConfig", "StatsConfig"]


class StatsConfig(FrigateBaseModel):
    amd_gpu_stats: bool = Field(
        default=True,
        title="AMD GPU stats",
        description="Enable collection of AMD GPU statistics if an AMD GPU is present.",
    )
    intel_gpu_stats: bool = Field(
        default=True,
        title="Intel GPU stats",
        description="Enable collection of Intel GPU statistics if an Intel GPU is present.",
    )
    network_bandwidth: bool = Field(
        default=False,
        title="Network bandwidth",
        description="Enable per-process network bandwidth monitoring for camera ffmpeg processes and detectors (requires capabilities).",
    )
    intel_gpu_device: Optional[str] = Field(
        default=None,
        title="Intel GPU device",
        description="PCI bus address or DRM device path (e.g. /dev/dri/card1) used to pin Intel GPU stats to a specific device when multiple are present.",
    )


class TelemetryConfig(FrigateBaseModel):
    network_interfaces: list[str] = Field(
        default=[],
        title="Network interfaces",
        description="List of network interface name prefixes to monitor for bandwidth statistics.",
    )
    stats: StatsConfig = Field(
        default_factory=StatsConfig,
        title="System stats",
        description="Options to enable/disable collection of various system and GPU statistics.",
    )
    version_check: bool = Field(
        default=True,
        title="Version check",
        description="Enable an outbound check to detect if a newer Frigate version is available.",
    )
