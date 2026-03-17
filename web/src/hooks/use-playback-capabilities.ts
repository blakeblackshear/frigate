import { useMemo } from "react";
import {
  getCodecMimeTypes,
  normalizeCodecName,
  PlaybackCapabilities,
} from "@/utils/recordingPlayback";

type NavigatorConnection = {
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
  saveData?: boolean;
};

declare global {
  interface Navigator {
    connection?: NavigatorConnection;
    mozConnection?: NavigatorConnection;
    webkitConnection?: NavigatorConnection;
  }

  interface Window {
    ManagedMediaSource?: typeof MediaSource;
  }
}

function canPlayMimeType(mimeType?: string): boolean {
  if (!mimeType || typeof window === "undefined") {
    return false;
  }

  if (window.ManagedMediaSource?.isTypeSupported(mimeType)) {
    return true;
  }

  if (window.MediaSource?.isTypeSupported(mimeType)) {
    return true;
  }

  const video = document.createElement("video");
  return video.canPlayType(mimeType) !== "";
}

function canPlayAnyMimeType(mimeTypes: string[]): boolean {
  return mimeTypes.some((mimeType) => canPlayMimeType(mimeType));
}

export default function usePlaybackCapabilities(codecNames: Array<string | null | undefined>) {
  return useMemo<PlaybackCapabilities>(() => {
    if (typeof window === "undefined") {
      return { estimatedBandwidthBps: undefined, saveData: false, supports: {} };
    }

    const connection =
      navigator.connection ?? navigator.mozConnection ?? navigator.webkitConnection;
    const supports: Record<string, boolean> = {};

    codecNames.forEach((codecName) => {
      const normalized = normalizeCodecName(codecName);
      if (!normalized || normalized in supports) {
        return;
      }

      supports[normalized] = canPlayAnyMimeType(getCodecMimeTypes(normalized));
    });

    const downlinkMbps = connection?.downlink;
    return {
      estimatedBandwidthBps:
        typeof downlinkMbps === "number" && downlinkMbps > 0
          ? downlinkMbps * 1_000_000
          : undefined,
      saveData: connection?.saveData === true,
      supports,
    };
  }, [codecNames]);
}
