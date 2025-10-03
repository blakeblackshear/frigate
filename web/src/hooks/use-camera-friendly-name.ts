import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import { useMemo } from "react";
import useSWR from "swr";

export function resolveCameraName(
  config: FrigateConfig | undefined,
  cameraId: string | CameraConfig | undefined,
) {
  if (typeof cameraId === "object" && cameraId !== null) {
    const camera = cameraId as CameraConfig;
    return camera?.friendly_name || camera?.name.replaceAll("_", " ");
  } else {
    const camera = config?.cameras?.[String(cameraId)];
    return camera?.friendly_name || String(cameraId).replaceAll("_", " ");
  }
}

export function useCameraFriendlyName(
  cameraId: string | CameraConfig | undefined,
): string {
  const { data: config } = useSWR<FrigateConfig>("config");

  const name = useMemo(
    () => resolveCameraName(config, cameraId),
    [config, cameraId],
  );

  return name;
}
