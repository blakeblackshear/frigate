import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import { useMemo } from "react";
import useSWR from "swr";
import { usePersistence } from "./use-persistence";
import { LivePlayerMode } from "@/types/live";

export default function useCameraLiveMode(
  cameraConfig: CameraConfig,
  preferredMode?: string,
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
    if (config && cameraConfig) {
      if (restreamEnabled) {
        return cameraConfig.ui.live_mode || config.ui.live_mode;
      }

      return "jsmpeg";
    }

    return undefined;
    // config will be updated if camera config is updated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraConfig, restreamEnabled]);
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
