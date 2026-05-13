"""Resolve human-readable names for Intel GPUs via OpenVINO."""

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)


class IntelGpuNameResolver:
    """Build a pdev -> normalized device name map by enumerating OpenVINO GPUs.

    The lookup is performed once on first access and cached for the process
    lifetime. OpenVINO exposes DEVICE_PCI_INFO (domain/bus/device/function) and
    FULL_DEVICE_NAME for each GPU it can see, which is enough to associate the
    name with the pdev string used by DRM fdinfo.
    """

    _names: Optional[dict[str, str]] = None

    def get_names(self) -> dict[str, str]:
        if self._names is not None:
            return self._names

        names: dict[str, str] = {}

        try:
            from openvino import Core
        except ImportError:
            logger.debug("OpenVINO unavailable; cannot resolve Intel GPU names")
            self._names = names
            return names

        try:
            core = Core()
            devices = core.available_devices
        except Exception as exc:
            logger.debug(f"OpenVINO Core initialization failed: {exc}")
            self._names = names
            return names

        for device in devices:
            if not device.startswith("GPU"):
                continue

            try:
                pci = core.get_property(device, "DEVICE_PCI_INFO")
                raw_name = core.get_property(device, "FULL_DEVICE_NAME")
            except Exception as exc:
                logger.debug(f"Failed to read properties for {device}: {exc}")
                continue

            pdev = self._format_pdev(pci)
            if not pdev:
                continue

            names[pdev] = self._normalize_name(raw_name)

        self._names = names
        return names

    @staticmethod
    def _format_pdev(pci) -> Optional[str]:
        try:
            return f"{pci.domain:04x}:{pci.bus:02x}:{pci.device:02x}.{pci.function:x}"
        except AttributeError:
            return None

    @staticmethod
    def _normalize_name(name: str) -> str:
        cleaned = re.sub(r"\(R\)|\(TM\)", "", name)
        cleaned = re.sub(r"\s*\((?:i|d)GPU\)\s*$", "", cleaned, flags=re.IGNORECASE)
        return " ".join(cleaned.split())


intel_gpu_name_resolver = IntelGpuNameResolver()
