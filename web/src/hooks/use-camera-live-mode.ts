import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import { useMemo } from "react";
import useSWR from "swr";
import { usePersistence } from "./use-persistence";
import { LivePlayerMode } from "@/types/live";

export default function useCameraLiveMode(
  cameraConfig: CameraConfig,
  preferredMode?: string
): LivePlayerMode {
  const { data: config } = useSWR<FrigateConfig>("config");

  const restreamEnabled = useMemo(() => {
    if (!config) {
      return false;
    }

    return (
      cameraConfig &&
      Object.keys(config.go2rtc.streams || {}).includes(
        cameraConfig.live.stream_name
      )
    );
  }, [config, cameraConfig]);
  const defaultLiveMode = useMemo(() => {
    if (config && cameraConfig) {
      if (restreamEnabled) {
        return cameraConfig.ui.live_mode || config?.ui.live_mode;
      }

      return "jsmpeg";
    }

    return undefined;
  }, [cameraConfig, restreamEnabled]);
  const [viewSource] = usePersistence(
    `${cameraConfig.name}-source`,
    defaultLiveMode
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
