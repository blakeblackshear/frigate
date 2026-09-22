"""Install section: version, image variant, install type, platform."""

import os
import platform
import re

from frigate.analytics.collectors.common import closed
from frigate.analytics.context import ReportContext
from frigate.analytics.schema import Arch, ImageVariant, InstallSection, InstallType
from frigate.version import VERSION

KERNEL_PATTERN = re.compile(r"^(\d{1,3})\.(\d{1,3})")


def image_variant(value: str | None) -> ImageVariant:
    """The published image from the build-time FRIGATE_IMAGE_VARIANT, dev when unset."""
    if not value:
        return ImageVariant.dev

    return closed(ImageVariant, value, ImageVariant.other)


def install_type() -> InstallType:
    # the add-on is a container too, so it has to be checked first
    if os.path.isfile("/data/options.json"):
        return InstallType.ha_addon

    if os.environ.get("KUBERNETES_SERVICE_HOST"):
        return InstallType.kubernetes

    if os.path.exists("/run/.containerenv"):
        return InstallType.podman

    if os.path.exists("/.dockerenv"):
        return InstallType.docker

    return InstallType.unknown


def arch(machine: str) -> Arch:
    match machine.lower():
        case "x86_64" | "amd64":
            return Arch.x86_64
        case "aarch64" | "arm64":
            return Arch.aarch64
        case _:
            return Arch.other


def kernel(release: str) -> str:
    match = KERNEL_PATTERN.match(release)
    return f"{match.group(1)}.{match.group(2)}" if match else "unknown"


def collect(ctx: ReportContext) -> InstallSection:
    return InstallSection(
        version=VERSION[:32],
        image_variant=image_variant(os.environ.get("FRIGATE_IMAGE_VARIANT")),
        install_type=install_type(),
        arch=arch(platform.machine()),
        kernel=kernel(platform.release()),
        run_as_root=os.geteuid() == 0,
    )
