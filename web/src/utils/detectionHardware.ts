import { DetectionHardware } from "@/types/hardware";

// one detector per this many cameras, so the recommendation grows with the
// install without spawning a process per camera
const CAMERAS_PER_DETECTOR = 8;

export const MAX_DETECTORS = 8;

/** How many detectors to suggest for a model serving this many cameras. */
export function recommendedDetectorCount(cameraCount: number): number {
  const scaled = Math.ceil(cameraCount / CAMERAS_PER_DETECTOR);
  return Math.min(Math.max(scaled, 1), MAX_DETECTORS);
}

/** The hardware whose units cover every one of these device strings. */
export function hardwareForDevices(
  hardware: DetectionHardware[],
  devices: string[],
): DetectionHardware | undefined {
  if (devices.length === 0) {
    return undefined;
  }

  return hardware.find((entry) => {
    const known = new Set(entry.units.map((unit) => unit.device));
    return devices.every((device) => known.has(device));
  });
}

/**
 * A short summary of the hardware a model runs on.
 *
 * Repeating a device is how extra inference processes are configured, so the
 * raw list reads as "openvino:NPU, openvino:NPU". Collapse it to a name and a
 * count instead.
 */
export function summarizeDevices(
  hardware: DetectionHardware[],
  devices: string[],
): string | undefined {
  if (devices.length === 0) {
    return undefined;
  }

  const known = hardwareForDevices(hardware, devices);

  if (known) {
    return devices.length > 1
      ? `${known.name} (${devices.length})`
      : known.name;
  }

  // hardware this system does not report, so fall back to the raw strings
  const counts = new Map<string, number>();
  devices.forEach((device) =>
    counts.set(device, (counts.get(device) ?? 0) + 1),
  );

  return [...counts.entries()]
    .map(([device, count]) => (count > 1 ? `${device} ×${count}` : device))
    .join(", ");
}
