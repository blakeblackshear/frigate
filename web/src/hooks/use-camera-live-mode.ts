import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import { useCallback, useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import { LivePlayerMode } from "@/types/live";
import useDeferredStreamMetadata from "./use-deferred-stream-metadata";
import { detectCameraAudioFeatures } from "@/utils/cameraUtil";

export default function useCameraLiveMode(
  cameras: CameraConfig[],
  windowVisible: boolean,
  activeStreams?: { [cameraName: string]: string },
) {
  const { data: config } = useSWR<FrigateConfig>("config");

  // Compute which streams need metadata (restreamed streams only)
  const restreamedStreamNames = useMemo(() => {
    if (!cameras || !config) return [];

    const streamNames = new Set<string>();
    cameras.forEach((camera) => {
      if (activeStreams && activeStreams[camera.name]) {
        const selectedStreamName = activeStreams[camera.name];
        const isRestreamed = Object.keys(config.go2rtc.streams || {}).includes(
          selectedStreamName,
        );

        if (isRestreamed) {
          streamNames.add(selectedStreamName);
        }
      } else {
        Object.values(camera.live.streams).forEach((streamName) => {
          const isRestreamed = Object.keys(
            config.go2rtc.streams || {},
          ).includes(streamName);

          if (isRestreamed) {
            streamNames.add(streamName);
          }
        });
      }
    });

    return Array.from(streamNames);
  }, [cameras, config, activeStreams]);

  // Fetch stream metadata with deferred loading (doesn't block initial render)
  const streamMetadata = useDeferredStreamMetadata(restreamedStreamNames);

  // Compute live mode states
  const [preferredLiveModes, setPreferredLiveModes] = useState<{
    [key: string]: LivePlayerMode;
  }>({});
  const [isRestreamedStates, setIsRestreamedStates] = useState<{
    [key: string]: boolean;
  }>({});
  const [supportsAudioOutputStates, setSupportsAudioOutputStates] = useState<{
    [key: string]: {
      supportsAudio: boolean;
      cameraName: string;
    };
  }>({});

  useEffect(() => {
    if (!cameras || cameras.length === 0) return;

    const mseSupported =
      "MediaSource" in window || "ManagedMediaSource" in window;

    const newPreferredLiveModes: { [key: string]: LivePlayerMode } = {};
    const newIsRestreamedStates: { [key: string]: boolean } = {};
    const newSupportsAudioOutputStates: {
      [key: string]: { supportsAudio: boolean; cameraName: string };
    } = {};

    cameras.forEach((camera) => {
      const selectedStreamName =
        activeStreams?.[camera.name] ?? Object.values(camera.live.streams)[0];
      const isRestreamed =
        config &&
        Object.keys(config.go2rtc.streams || {}).includes(selectedStreamName);

      newIsRestreamedStates[camera.name] = isRestreamed ?? false;

      if (!mseSupported) {
        newPreferredLiveModes[camera.name] = isRestreamed ? "webrtc" : "jsmpeg";
      } else {
        newPreferredLiveModes[camera.name] = isRestreamed ? "mse" : "jsmpeg";
      }

      // Check each stream for audio support
      if (isRestreamed) {
        Object.values(camera.live.streams).forEach((streamName) => {
          const metadata = streamMetadata[streamName];
          const audioFeatures = detectCameraAudioFeatures(metadata);
          newSupportsAudioOutputStates[streamName] = {
            supportsAudio: audioFeatures.audioOutput,
            cameraName: camera.name,
          };
        });
      } else {
        newSupportsAudioOutputStates[camera.name] = {
          supportsAudio: false,
          cameraName: camera.name,
        };
      }
    });

    setPreferredLiveModes(newPreferredLiveModes);
    setIsRestreamedStates(newIsRestreamedStates);
    setSupportsAudioOutputStates(newSupportsAudioOutputStates);
  }, [activeStreams, cameras, config, windowVisible, streamMetadata]);

  const resetPreferredLiveMode = useCallback(
    (cameraName: string) => {
      const mseSupported =
        "MediaSource" in window || "ManagedMediaSource" in window;
      const cameraConfig = cameras.find((camera) => camera.name === cameraName);
      const selectedStreamName =
        activeStreams?.[cameraName] ??
        (cameraConfig
          ? Object.values(cameraConfig.live.streams)[0]
          : cameraName);
      const isRestreamed =
        config &&
        Object.keys(config.go2rtc.streams || {}).includes(selectedStreamName);

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
    [activeStreams, cameras, config],
  );

  return {
    preferredLiveModes,
    setPreferredLiveModes,
    resetPreferredLiveMode,
    isRestreamedStates,
    supportsAudioOutputStates,
    streamMetadata,
  };
}
