import { baseUrl } from "@/api/baseUrl";
import { generateFixedHash, isValidId } from "./stringUtil";
import type { LiveStreamMetadata } from "@/types/live";

/**
 * Processes a user-entered camera name and returns both the final camera name
 * and friendly name for Frigate configuration.
 *
 * @param userInput - The name entered by the user (could be display name)
 * @returns Object with finalCameraName and friendlyName
 */
export function processCameraName(userInput: string): {
  finalCameraName: string;
  friendlyName?: string;
} {
  const normalizedInput = userInput.replace(/\s+/g, "_").toLowerCase();

  if (isValidId(normalizedInput)) {
    return {
      finalCameraName: normalizedInput,
      friendlyName: userInput.includes(" ") ? userInput : undefined,
    };
  }

  return {
    finalCameraName: generateFixedHash(userInput, "cam"),
    friendlyName: userInput,
  };
}

/**
 * Detect Reolink camera capabilities and recommend optimal protocol
 *
 * Calls the Frigate backend API which queries the Reolink camera to determine
 * its resolution and recommends either http-flv (for 5MP and below) or rtsp
 * (for higher resolutions).
 *
 * @param host - Camera IP address or hostname
 * @param username - Camera username
 * @param password - Camera password
 * @returns The recommended protocol key ("http-flv" or "rtsp"), or null if detection failed
 */
export async function detectReolinkCamera(
  host: string,
  username: string,
  password: string,
): Promise<"http-flv" | "rtsp" | null> {
  try {
    const params = new URLSearchParams({
      host,
      username,
      password,
    });

    const response = await fetch(
      `${baseUrl}api/reolink/detect?${params.toString()}`,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.success && data.protocol) {
      return data.protocol;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Mask credentials in RTSP URIs for display
 */
export function maskUri(uri: string): string {
  try {
    // Handle RTSP URLs with user:pass@host format
    // Use greedy match for password to handle passwords with @
    const rtspMatch = uri.match(/rtsp:\/\/([^:]+):(.+)@(.+)/);
    if (rtspMatch) {
      return `rtsp://${rtspMatch[1]}:${"*".repeat(4)}@${rtspMatch[3]}`;
    }

    // Handle HTTP/HTTPS URLs with password query parameter
    const urlObj = new URL(uri);
    if (urlObj.searchParams.has("password")) {
      urlObj.searchParams.set("password", "*".repeat(4));
      return urlObj.toString();
    }
  } catch (e) {
    // ignore
  }
  return uri;
}

/**
 * Represents the audio features supported by a camera stream
 */
export type CameraAudioFeatures = {
  twoWayAudio: boolean;
  audioOutput: boolean;
};

/**
 * Detects camera audio features from go2rtc stream metadata.
 * Checks for two-way audio (backchannel) and audio output capabilities.
 *
 * @param metadata - The LiveStreamMetadata from go2rtc stream
 * @param requireSecureContext - If true, two-way audio requires secure context (default: true)
 * @returns CameraAudioFeatures object with detected capabilities
 */
export function detectCameraAudioFeatures(
  metadata: LiveStreamMetadata | null | undefined,
  requireSecureContext: boolean = true,
): CameraAudioFeatures {
  if (!metadata) {
    return {
      twoWayAudio: false,
      audioOutput: false,
    };
  }

  const twoWayAudio =
    (!requireSecureContext || window.isSecureContext) &&
    metadata.producers.find(
      (prod) =>
        prod.medias &&
        prod.medias.find((media) => media.includes("audio, sendonly")) !=
          undefined,
    ) != undefined;

  const audioOutput =
    metadata.producers.find(
      (prod) =>
        prod.medias &&
        prod.medias.find((media) => media.includes("audio, recvonly")) !=
          undefined,
    ) != undefined;

  return {
    twoWayAudio: !!twoWayAudio,
    audioOutput: !!audioOutput,
  };
}
