from pydantic import Field

from .base import FrigateBaseModel

__all__ = ["TelemetryConfig", "StatsConfig"]


class StatsConfig(FrigateBaseModel):
    amd_gpu_stats: bool = Field(default=True, title="Enable AMD GPU stats.")
    intel_gpu_stats: bool = Field(default=True, title="Enable Intel GPU stats.")
    network_bandwidth: bool = Field(
        default=False, title="Enable network bandwidth for ffmpeg processes."
    )
    sriov: bool = Field(
        default=False, title="Treat device as SR-IOV to support GPU stats."
    )


class TelemetryConfig(FrigateBaseModel):
    network_interfaces: list[str] = Field(
        default=[],
        title="Enabled network interfaces for bandwidth calculation.",
    )
    stats: StatsConfig = Field(
        default_factory=StatsConfig, title="System Stats Configuration"
    )
    version_check: bool = Field(default=True, title="Enable latest version check.")
