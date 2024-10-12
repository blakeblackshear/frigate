import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { LivePlayerMode } from "@/types/live";

export default function useCameraLiveMode(
  cameras: CameraConfig[],
  windowVisible: boolean,
) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [preferredLiveModes, setPreferredLiveModes] = useState<{
    [key: string]: LivePlayerMode;
  }>({});

  useEffect(() => {
    if (!cameras) return;

    const mseSupported =
      "MediaSource" in window || "ManagedMediaSource" in window;

    const newPreferredLiveModes = cameras.reduce(
      (acc, camera) => {
        const isRestreamed =
          config &&
          Object.keys(config.go2rtc.streams || {}).includes(
            camera.live.stream_name,
          );

        if (!mseSupported) {
          acc[camera.name] = isRestreamed ? "webrtc" : "jsmpeg";
        } else {
          acc[camera.name] = isRestreamed ? "mse" : "jsmpeg";
        }
        return acc;
      },
      {} as { [key: string]: LivePlayerMode },
    );

    setPreferredLiveModes(newPreferredLiveModes);
  }, [cameras, config, windowVisible]);

  const resetPreferredLiveMode = useCallback(
    (cameraName: string) => {
      const mseSupported =
        "MediaSource" in window || "ManagedMediaSource" in window;
      const isRestreamed =
        config && Object.keys(config.go2rtc.streams || {}).includes(cameraName);

      setPreferredLiveModes((prevModes) => {
        const newModes = { ...prevModes };

        if (!mseSupported) {
          newModes[cameraName] = isRestreamed ? "webrtc" : "jsmpeg";
        } else {
          newModes[cameraName] = isRestreamed ? "mse" : "jsmpeg";
        }

        return newModes;
      });
    },
    [config],
  );

  return { preferredLiveModes, setPreferredLiveModes, resetPreferredLiveMode };
}
