import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import { useCallback, useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import { LivePlayerMode, LiveStreamMetadata } from "@/types/live";

export default function useCameraLiveMode(
  cameras: CameraConfig[],
  windowVisible: boolean,
) {
  const { data: config } = useSWR<FrigateConfig>("config");

  // Get comma-separated list of restreamed stream names for SWR key
  const restreamedStreamsKey = useMemo(() => {
    if (!cameras || !config) return null;

    const streamNames = new Set<string>();
    cameras.forEach((camera) => {
      const isRestreamed = Object.keys(config.go2rtc.streams || {}).includes(
        Object.values(camera.live.streams)[0],
      );

      if (isRestreamed) {
        Object.values(camera.live.streams).forEach((streamName) => {
          streamNames.add(streamName);
        });
      }
    });

    return streamNames.size > 0
      ? Array.from(streamNames).sort().join(",")
      : null;
  }, [cameras, config]);

  const streamsFetcher = useCallback(async (key: string) => {
    const streamNames = key.split(",");

    const metadataPromises = streamNames.map(async (streamName) => {
      try {
        const response = await fetch(`/api/go2rtc/streams/${streamName}`, {
          priority: "low",
        });

        if (response.ok) {
          const data = await response.json();
          return { streamName, data };
        }
        return { streamName, data: null };
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to fetch metadata for ${streamName}:`, error);
        return { streamName, data: null };
      }
    });

    const results = await Promise.allSettled(metadataPromises);

    const metadata: { [key: string]: LiveStreamMetadata } = {};
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value.data) {
        metadata[result.value.streamName] = result.value.data;
      }
    });

    return metadata;
  }, []);

  const { data: allStreamMetadata = {} } = useSWR<{
    [key: string]: LiveStreamMetadata;
  }>(restreamedStreamsKey, streamsFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

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
    if (!cameras) return;

    const mseSupported =
      "MediaSource" in window || "ManagedMediaSource" in window;

    const newPreferredLiveModes: { [key: string]: LivePlayerMode } = {};
    const newIsRestreamedStates: { [key: string]: boolean } = {};
    const newSupportsAudioOutputStates: {
      [key: string]: { supportsAudio: boolean; cameraName: string };
    } = {};

    cameras.forEach((camera) => {
      const isRestreamed =
        config &&
        Object.keys(config.go2rtc.streams || {}).includes(
          Object.values(camera.live.streams)[0],
        );

      newIsRestreamedStates[camera.name] = isRestreamed ?? false;

      if (!mseSupported) {
        newPreferredLiveModes[camera.name] = isRestreamed ? "webrtc" : "jsmpeg";
      } else {
        newPreferredLiveModes[camera.name] = isRestreamed ? "mse" : "jsmpeg";
      }

      // check each stream for audio support
      if (isRestreamed) {
        Object.values(camera.live.streams).forEach((streamName) => {
          const metadata = allStreamMetadata?.[streamName];
          newSupportsAudioOutputStates[streamName] = {
            supportsAudio: metadata
              ? metadata.producers.find(
                  (prod) =>
                    prod.medias &&
                    prod.medias.find((media) =>
                      media.includes("audio, recvonly"),
                    ) !== undefined,
                ) !== undefined
              : false,
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
  }, [cameras, config, windowVisible, allStreamMetadata]);

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

  return {
    preferredLiveModes,
    setPreferredLiveModes,
    resetPreferredLiveMode,
    isRestreamedStates,
    supportsAudioOutputStates,
  };
}
