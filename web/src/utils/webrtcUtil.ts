import { FrigateConfig } from "@/types/frigateConfig";
import { WebRTCUnavailableReason } from "@/types/live";

/**
 * Helpers for detecting what the current browser can do over WebRTC.
 * Used to gate the WebRTC live streaming option (e.g. H.265 is only
 * decodable over WebRTC on Chrome 136+ / Safari 18+ with HEVC hardware).
 */

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

type ConfiguredIceServers = FrigateConfig["go2rtc"]["webrtc"]["ice_servers"];

/** ICE servers for browser peer connections, falling back to public STUN. */
export function webRTCIceServers(
  configured: ConfiguredIceServers,
): RTCIceServer[] {
  if (!configured?.length) {
    return DEFAULT_ICE_SERVERS;
  }

  return configured.map((server) => ({
    urls: server.urls,
    username: server.username,
    credential: server.credential,
  }));
}

export function browserSupportsWebRTC(): boolean {
  return typeof window !== "undefined" && "RTCPeerConnection" in window;
}

/** Codec aliases that refer to the same underlying codec. */
const CODEC_ALIASES: Record<string, string> = {
  HEVC: "H265",
  AVC: "H264",
};

function normalizeCodec(codec: string): string {
  const upper = codec.toUpperCase();
  return CODEC_ALIASES[upper] ?? upper;
}

/** The set of video codec names the browser can receive over WebRTC. */
export function browserWebRTCVideoCodecs(): string[] {
  if (
    typeof RTCRtpReceiver === "undefined" ||
    typeof RTCRtpReceiver.getCapabilities !== "function"
  ) {
    return [];
  }

  const caps = RTCRtpReceiver.getCapabilities("video");
  if (!caps) return [];

  const codecs = new Set<string>();
  for (const codec of caps.codecs) {
    // mimeType is like "video/H264"; ignore infra codecs (rtx, red, ulpfec)
    const name = codec.mimeType.split("/")[1]?.toUpperCase();
    if (!name || ["RTX", "RED", "ULPFEC", "FLEXFEC-03"].includes(name)) {
      continue;
    }
    codecs.add(normalizeCodec(name));
  }
  return Array.from(codecs);
}

export function browserSupportsWebRTCVideoCodec(codec: string): boolean {
  return browserWebRTCVideoCodecs().includes(normalizeCodec(codec));
}

const DOCS_URL =
  "https://docs.frigate.video/configuration/live/#selecting-a-streaming-technology";

// Availability is consumed by several components at once, so without this the
// same fact prints once per consumer.
const loggedMessages = new Set<string>();

/**
 * Logs why WebRTC is unavailable, supplementing the short message shown inline
 * in the technology selector with the underlying detail.
 *
 * @param scope - Stream name for per-stream reasons, omitted for global ones
 * @param reason - The reason surfaced in the UI
 * @param description - The detail the UI message leaves out
 */
export function logWebRTCUnavailable(
  scope: string | undefined,
  reason: WebRTCUnavailableReason,
  description: string,
): void {
  const message = `${scope ? `${scope} - ` : ""}WebRTC unavailable '${reason}': ${description} See the documentation: ${DOCS_URL}`;

  if (loggedMessages.has(message)) {
    return;
  }
  loggedMessages.add(message);

  // eslint-disable-next-line no-console
  console.warn(message);
}

/** Clears the emitted messages (e.g. when go2rtc config changes). */
export function resetWebRTCUnavailableLog(): void {
  loggedMessages.clear();
}
