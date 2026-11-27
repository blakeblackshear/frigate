"""Parsing of detection hardware device strings."""

import logging
from dataclasses import dataclass

from pydantic import TypeAdapter, ValidationError

from frigate.detectors.detector_config import BaseDetectorConfig, ModelConfig
from frigate.detectors.detector_types import DetectorConfig, config_types

logger = logging.getLogger(__name__)

_detector_adapter: TypeAdapter[BaseDetectorConfig] = TypeAdapter(DetectorConfig)


@dataclass(frozen=True)
class DeviceSpec:
    """A parsed `<detector>` or `<detector>:<device>` string."""

    raw: str
    detector: str
    device: str | None

    @property
    def shareable(self) -> bool:
        """Whether this device may be listed more than once."""
        return config_types[self.detector].shareable


class DeviceParseError(ValueError):
    pass


def parse_device(raw: str) -> DeviceSpec:
    """Parse a device string into its detector type and detector specific device.

    Args:
        raw: The configured device string, for example 'edgetpu:pci:0'

    Returns:
        The parsed spec

    Raises:
        DeviceParseError: If the detector type is unknown or the device is not
            valid for that detector
    """
    detector, separator, device = raw.partition(":")

    if detector not in config_types:
        raise DeviceParseError(
            f"'{raw}' does not name a known detector. Available detectors are {', '.join(sorted(config_types))}"
        )

    spec = DeviceSpec(raw=raw, detector=detector, device=device if separator else None)

    # surface a bad device now rather than when the detection process starts
    build_detector_config(spec, None)
    return spec


def build_detector_config(
    spec: DeviceSpec, model: ModelConfig | None
) -> BaseDetectorConfig:
    """Build the detector config a device string describes.

    Args:
        spec: The parsed device spec
        model: The model this detector runs, if it has been resolved yet

    Returns:
        The validated detector config

    Raises:
        DeviceParseError: If the device is not valid for this detector type
    """
    config: dict[str, object] = {"type": spec.detector, "model": model}

    if spec.device is not None:
        config_class = config_types[spec.detector]

        try:
            config[config_class.device_spec_field] = config_class.device_spec_type(
                spec.device
            )
        except ValueError as err:
            raise DeviceParseError(
                f"'{spec.raw}' is not a valid {spec.detector} device: {err}"
            ) from err

    try:
        return _detector_adapter.validate_python(config)
    except ValidationError as err:
        raise DeviceParseError(f"'{spec.raw}' is not a valid device: {err}") from err


def runner_names(devices: list[DeviceSpec]) -> list[str]:
    """Build a unique name for each device, since a shareable device may repeat.

    Args:
        devices: Every device spec across every configured model, in config order

    Returns:
        A name per device, suffixed with '#2', '#3', etc. on repeats
    """
    names: list[str] = []
    seen: dict[str, int] = {}

    for spec in devices:
        count = seen.get(spec.raw, 0) + 1
        seen[spec.raw] = count
        names.append(spec.raw if count == 1 else f"{spec.raw}#{count}")

    return names
