import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import { useMemo } from "react";
import useSWR from "swr";
import { usePersistence } from "./use-persistence";
import { LivePlayerMode } from "@/types/live";

export default function useCameraLiveMode(
  cameraConfig: CameraConfig,
  preferredMode?: LivePlayerMode,
): LivePlayerMode | undefined {
  const { data: config } = useSWR<FrigateConfig>("config");

  const restreamEnabled = useMemo(() => {
    if (!config) {
      return false;
    }

    return (
      cameraConfig &&
      Object.keys(config.go2rtc.streams || {}).includes(
        cameraConfig.live.stream_name,
      )
    );
  }, [config, cameraConfig]);
  const defaultLiveMode = useMemo<LivePlayerMode | undefined>(() => {
    if (config) {
      if (restreamEnabled) {
        return preferredMode || "mse";
      }

      return "jsmpeg";
    }

    return undefined;
  }, [config, preferredMode, restreamEnabled]);
  const [viewSource] = usePersistence<LivePlayerMode>(
    `${cameraConfig.name}-source`,
    defaultLiveMode,
  );

  if (
    restreamEnabled &&
    (preferredMode == "mse" || preferredMode == "webrtc")
  ) {
    return preferredMode;
  } else {
    return viewSource;
  }
}
