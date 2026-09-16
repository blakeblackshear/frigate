import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { LiveStreamMetadata, WebRTCUnavailableReason } from "@/types/live";
import {
  browserSupportsWebRTC,
  browserSupportsWebRTCVideoCodec,
  browserWebRTCVideoCodecs,
  logWebRTCUnavailable,
  resetWebRTCUnavailableLog,
  webRTCIceServers,
} from "@/utils/webrtcUtil";
import {
  getPlaybackAudioCodecs,
  getStreamVideoCodecs,
} from "@/utils/cameraUtil";
import { probeWebRTCAvailability, resetWebRTCProbe } from "@/utils/webrtcProbe";

const WEBRTC_AUDIO_CODECS = new Set(["OPUS", "PCMA", "PCMU"]);

type GlobalAvailability = {
  globallyAvailable: boolean;
  globalReason: WebRTCUnavailableReason | null;
};

export type StreamAvailability = {
  available: boolean;
  reason?: WebRTCUnavailableReason;
  detail?: string;
};

/** Split out of the hook so the decision can be exercised without React. */
export function evaluateStreamWebRTCAvailability(args: {
  globallyAvailable: boolean;
  globalReason: WebRTCUnavailableReason | null;
  metadata: LiveStreamMetadata | null | undefined;
}): StreamAvailability {
  const { globallyAvailable, globalReason, metadata } = args;

  if (!globallyAvailable) {
    return { available: false, reason: globalReason ?? "unreachable" };
  }

  // The metadata endpoint enumerates every producer variant including `#video=`
  // transcodes, so an empty list means unknown rather than unplayable.
  const videoCodecs = getStreamVideoCodecs(metadata);
  if (
    videoCodecs.length > 0 &&
    !videoCodecs.some((c) => browserSupportsWebRTCVideoCodec(c))
  ) {
    const browserCodecs = browserWebRTCVideoCodecs();
    return {
      available: false,
      reason: "video-codec",
      detail:
        `Stream video codecs [${videoCodecs.join(", ")}] cannot be received over WebRTC in this browser ` +
        `(browser supports: ${browserCodecs.length ? browserCodecs.join(", ") : "none"}).`,
    };
  }

  // A stream with no playback audio is not disqualified.
  const playbackAudioCodecs = getPlaybackAudioCodecs(metadata);
  if (
    playbackAudioCodecs.length > 0 &&
    !playbackAudioCodecs.some((c) => WEBRTC_AUDIO_CODECS.has(c))
  ) {
    return {
      available: false,
      reason: "audio-codec",
      detail:
        `Stream playback audio codecs [${playbackAudioCodecs.join(", ")}] cannot be carried over WebRTC ` +
        `(supported: ${Array.from(WEBRTC_AUDIO_CODECS).join(", ")}).`,
    };
  }

  return { available: true };
}

/** Console detail for a reason decided by the global availability check. */
function describeGlobalReason(
  reason: WebRTCUnavailableReason,
  testStream: string | undefined,
  probeDetail: string | undefined,
): string {
  switch (reason) {
    case "browser":
      return "This browser does not expose RTCPeerConnection.";
    case "not-configured":
      return "No candidates or ice_servers are set under go2rtc.webrtc.";
    case "unreachable":
      return `The connectivity probe against stream '${testStream}' failed: ${probeDetail ?? "unknown cause"}.`;
    default:
      return "";
  }
}

/** go2rtc config the cached probe result and log messages belong to. */
let lastProbeSignature: string | null = null;

/**
 * Once-per-session: browser support, go2rtc config, and a live handshake probe.
 */
export function useWebRTCGloballyAvailable(): GlobalAvailability {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [probe, setProbe] = useState<{
    state: "pending" | "pass" | "fail";
    detail?: string;
  }>({ state: "pending" });

  const browserOk = browserSupportsWebRTC();

  const configured = useMemo(() => {
    const webrtc = config?.go2rtc?.webrtc;
    if (!webrtc) return false;
    return (
      (webrtc.candidates?.length ?? 0) > 0 ||
      (webrtc.ice_servers?.length ?? 0) > 0
    );
  }, [config]);

  // Representative restreamed stream to probe against.
  const testStream = useMemo(() => {
    const streams = config?.go2rtc?.streams ?? {};
    return Object.keys(streams)[0];
  }, [config]);

  const iceServers = useMemo(
    () => webRTCIceServers(config?.go2rtc?.webrtc?.ice_servers),
    [config],
  );

  // Identity of the cached page-session probe: a config change here must
  // re-probe rather than return a stale result.
  const probeSignature = useMemo(
    () =>
      JSON.stringify({
        candidates: config?.go2rtc?.webrtc?.candidates ?? [],
        iceServers,
        testStream,
      }),
    [config, iceServers, testStream],
  );

  useEffect(() => {
    // Runs on every consumer's mount, but the probe cache and log are page-wide:
    // clearing them unconditionally would re-probe once per consumer.
    if (lastProbeSignature !== probeSignature) {
      lastProbeSignature = probeSignature;
      resetWebRTCProbe();
      resetWebRTCUnavailableLog();
    }
    setProbe({ state: "pending" });
  }, [probeSignature]);

  useEffect(() => {
    if (!browserOk || !configured || !testStream) {
      return;
    }
    let cancelled = false;
    probeWebRTCAvailability(testStream, iceServers).then((result) => {
      if (!cancelled) {
        setProbe({
          state: result.ok ? "pass" : "fail",
          detail: result.detail,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [browserOk, configured, testStream, iceServers]);

  const availability = useMemo<GlobalAvailability>(() => {
    if (!browserOk) {
      return { globallyAvailable: false, globalReason: "browser" };
    }
    if (!configured) {
      return { globallyAvailable: false, globalReason: "not-configured" };
    }
    if (probe.state === "pending") {
      return { globallyAvailable: false, globalReason: "checking" };
    }
    if (probe.state === "fail") {
      return { globallyAvailable: false, globalReason: "unreachable" };
    }
    return { globallyAvailable: true, globalReason: null };
  }, [browserOk, configured, probe]);

  useEffect(() => {
    const reason = availability.globalReason;
    // Before the config resolves, `configured` is false and the reason reads as
    // not-configured, which would mislog on a correctly configured install.
    if (!config || !reason || reason === "checking") {
      return;
    }
    logWebRTCUnavailable(
      undefined,
      reason,
      describeGlobalReason(reason, testStream, probe.detail),
    );
  }, [config, availability, testStream, probe.detail]);

  return availability;
}

/** Per-stream WebRTC availability for selectors and auto-selection. */
export function useWebRTCAvailableForStream(
  metadata: LiveStreamMetadata | null | undefined,
  streamName?: string,
): StreamAvailability {
  const { globallyAvailable, globalReason } = useWebRTCGloballyAvailable();

  const availability = useMemo(
    () =>
      evaluateStreamWebRTCAvailability({
        globallyAvailable,
        globalReason,
        metadata,
      }),
    [globallyAvailable, globalReason, metadata],
  );

  // Only stream-specific verdicts carry a detail; a global reason passing
  // through here was already logged by useWebRTCGloballyAvailable.
  useEffect(() => {
    if (!availability.reason || !availability.detail) {
      return;
    }
    logWebRTCUnavailable(streamName, availability.reason, availability.detail);
  }, [availability, streamName]);

  return availability;
}
