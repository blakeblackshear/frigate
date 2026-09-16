import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import { useCallback, useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import { LivePlayerMode } from "@/types/live";
import useDeferredStreamMetadata from "./use-deferred-stream-metadata";
import { detectCameraAudioFeatures } from "@/utils/cameraUtil";
import {
  evaluateStreamWebRTCAvailability,
  useWebRTCGloballyAvailable,
} from "./use-webrtc-availability";

// Shared by the initial computation and the context-menu "Reset" so the two
// can't diverge.
function resolveLiveMode(
  isRestreamed: boolean,
  mseSupported: boolean,
  webRTCAvailable: boolean,
  requested: LivePlayerMode | undefined,
): LivePlayerMode {
  let mode: LivePlayerMode;
  if (!mseSupported) {
    mode = isRestreamed && webRTCAvailable ? "webrtc" : "jsmpeg";
  } else {
    mode = isRestreamed ? "mse" : "jsmpeg";
  }

  if (requested === "jsmpeg") {
    mode = "jsmpeg";
  } else if (requested === "webrtc" && isRestreamed && webRTCAvailable) {
    mode = "webrtc";
  } else if (requested === "mse" && mseSupported && isRestreamed) {
    mode = "mse";
  }

  return mode;
}

export default function useCameraLiveMode(
  cameras: CameraConfig[],
  windowVisible: boolean,
  activeStreams?: { [cameraName: string]: string },
  preferredModes?: { [cameraName: string]: LivePlayerMode | undefined },
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

  const { globallyAvailable, globalReason } = useWebRTCGloballyAvailable();

  // "checking" counts as usable because the probe re-enters it on every mount,
  // and treating it as unavailable would downgrade a saved WebRTC choice.
  const webRTCUsableStates = useMemo(() => {
    const states: { [cameraName: string]: boolean } = {};
    cameras.forEach((camera) => {
      const streamName =
        activeStreams?.[camera.name] ?? Object.values(camera.live.streams)[0];
      const { available, reason } = evaluateStreamWebRTCAvailability({
        globallyAvailable,
        globalReason,
        metadata: streamMetadata[streamName],
      });
      states[camera.name] = available || reason === "checking";
    });
    return states;
  }, [cameras, activeStreams, globallyAvailable, globalReason, streamMetadata]);

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

      // Auto-selected default, overridden by the user's per-camera choice when viable
      // Runtime fallback (player errors) still adjusts the mode on top of this base
      newPreferredLiveModes[camera.name] = resolveLiveMode(
        !!isRestreamed,
        mseSupported,
        webRTCUsableStates[camera.name] ?? false,
        preferredModes?.[camera.name],
      );

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
  }, [
    activeStreams,
    cameras,
    config,
    windowVisible,
    streamMetadata,
    webRTCUsableStates,
    preferredModes,
  ]);

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

      setPreferredLiveModes((prevModes) => ({
        ...prevModes,
        [cameraName]: resolveLiveMode(
          !!isRestreamed,
          mseSupported,
          webRTCUsableStates[cameraName] ?? false,
          preferredModes?.[cameraName],
        ),
      }));
    },
    [activeStreams, cameras, config, webRTCUsableStates, preferredModes],
  );

  return {
    preferredLiveModes,
    setPreferredLiveModes,
    resetPreferredLiveMode,
    isRestreamedStates,
    supportsAudioOutputStates,
    streamMetadata,
    webRTCUsableStates,
  };
}
