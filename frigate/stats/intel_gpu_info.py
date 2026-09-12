"""Resolve human-readable names for Intel GPUs via OpenVINO."""

import logging
import re

logger = logging.getLogger(__name__)


class IntelGpuNameResolver:
    """Build a pdev -> normalized device name map by enumerating OpenVINO GPUs.

    The lookup is performed once on first access and cached for the process
    lifetime. OpenVINO exposes DEVICE_PCI_INFO (domain/bus/device/function) and
    FULL_DEVICE_NAME for each GPU it can see, which is enough to associate the
    name with the pdev string used by DRM fdinfo.
    """

    _names: dict[str, str] | None = None

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

        cpu_name: str | None = None
        if "CPU" in devices:
            try:
                cpu_name = self._strip_trademarks(
                    core.get_property("CPU", "FULL_DEVICE_NAME")
                )
            except Exception as exc:
                logger.debug(f"Failed to read CPU FULL_DEVICE_NAME: {exc}")

        for device in devices:
            if not device.startswith("GPU"):
                continue

            try:
                pci = core.get_property(device, "DEVICE_PCI_INFO")
                raw_name = core.get_property(device, "FULL_DEVICE_NAME")
                device_type = core.get_property(device, "DEVICE_TYPE")
            except Exception as exc:
                logger.debug(f"Failed to read properties for {device}: {exc}")
                continue

            pdev = self._format_pdev(pci)
            if not pdev:
                continue

            names[pdev] = self._resolve_name(raw_name, device_type, cpu_name)

        self._names = names
        return names

    @staticmethod
    def _format_pdev(pci) -> str | None:
        try:
            return f"{pci.domain:04x}:{pci.bus:02x}:{pci.device:02x}.{pci.function:x}"
        except AttributeError:
            return None

    @classmethod
    def _resolve_name(cls, raw_name: str, device_type, cpu_name: str | None) -> str:
        """Build a display name for a GPU.

        Modern integrated Intel GPUs are reported by OpenVINO with a generic
        FULL_DEVICE_NAME like "Intel(R) Graphics (iGPU)" that gives no model
        information. Since the iGPU is part of the CPU on these platforms, fall
        back to the CPU name (which OpenVINO does report specifically) and
        suffix it with "iGPU" so it's clear what the entry is.
        """
        is_integrated = "INTEGRATED" in str(device_type).upper()

        if is_integrated and cpu_name:
            short_cpu = re.sub(r"^Intel\s+", "", cpu_name)
            return f"{short_cpu} iGPU"

        return cls._normalize_name(raw_name)

    @classmethod
    def _normalize_name(cls, name: str) -> str:
        cleaned = cls._strip_trademarks(name)
        cleaned = re.sub(r"\s*\((?:i|d)GPU\)\s*$", "", cleaned, flags=re.IGNORECASE)
        return " ".join(cleaned.split())

    @staticmethod
    def _strip_trademarks(name: str) -> str:
        cleaned = re.sub(r"\(R\)|\(TM\)", "", name)
        return " ".join(cleaned.split())


intel_gpu_name_resolver = IntelGpuNameResolver()
