import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import { useMemo } from "react";
import useSWR from "swr";

export function resolveCameraName(
  config: FrigateConfig | undefined,
  cameraId: string | CameraConfig | undefined,
) {
  if (typeof cameraId === "object" && cameraId !== null) {
    const camera = cameraId as CameraConfig;
    return camera?.nickname || camera?.name.replaceAll("_", " ");
  } else {
    const camera = config?.cameras?.[String(cameraId)];
    return camera?.nickname || String(cameraId).replaceAll("_", " ");
  }
}

export function useCameraNickname(
  cameraId: string | CameraConfig | undefined,
): string {
  const { data: config } = useSWR<FrigateConfig>("config");

  const name = useMemo(
    () => resolveCameraName(config, cameraId),
    [config, cameraId],
  );

  return name;
}
