import { FrigateConfig } from "@/types/frigateConfig";
import { useMemo } from "react";
import useSWR from "swr";

export function resolveZoneName(
  config: FrigateConfig | undefined,
  zoneId: string,
  cameraId?: string,
) {
  if (!config) return String(zoneId);

  if (cameraId) {
    const camera = config.cameras?.[String(cameraId)];
    const zone = camera?.zones?.[zoneId];
    return zone?.friendly_name || String(zoneId);
  }

  for (const camKey in config.cameras) {
    if (!Object.prototype.hasOwnProperty.call(config.cameras, camKey)) continue;
    const cam = config.cameras[camKey];
    if (!cam?.zones) continue;
    if (Object.prototype.hasOwnProperty.call(cam.zones, zoneId)) {
      const zone = cam.zones[zoneId];
      return zone?.friendly_name || String(zoneId);
    }
  }

  // Fallback: display the raw zone id verbatim (no friendly_name available)
  return String(zoneId);
}

export function useZoneFriendlyName(zoneId: string, cameraId?: string): string {
  const { data: config } = useSWR<FrigateConfig>("config");

  const name = useMemo(
    () => resolveZoneName(config, zoneId, cameraId),
    [config, cameraId, zoneId],
  );

  return name;
}
