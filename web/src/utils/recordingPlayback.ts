import { FrigateConfig } from "@/types/frigateConfig";
import {
  Recording,
  RecordingPlaybackPreference,
} from "@/types/record";

export type PlaybackCapabilities = {
  estimatedBandwidthBps?: number;
  saveData: boolean;
  supports: Record<string, boolean>;
};

export type RecordingPlaybackDecision = {
  mode: "direct" | "transcoded";
  variant: string;
  url: string;
  reason: string;
};

type DecisionOptions = {
  apiHost: string;
  config?: FrigateConfig;
  recordings: Recording[];
  preference: RecordingPlaybackPreference;
  vodPath: string;
  capabilities: PlaybackCapabilities;
};

const CODEC_SAMPLES: Record<string, string[]> = {
  h264: ['video/mp4; codecs="avc1.42E01E"', 'video/mp4; codecs="avc1.64001F"'],
  avc1: ['video/mp4; codecs="avc1.42E01E"', 'video/mp4; codecs="avc1.64001F"'],
  hevc: [
    'video/mp4; codecs="hev1.1.6.L120.90"',
    'video/mp4; codecs="hvc1.1.6.L120.90"',
    'video/mp4; codecs="hev1.1.6.L93.B0"',
    'video/mp4; codecs="hvc1.1.6.L93.B0"',
  ],
  h265: [
    'video/mp4; codecs="hev1.1.6.L120.90"',
    'video/mp4; codecs="hvc1.1.6.L120.90"',
    'video/mp4; codecs="hev1.1.6.L93.B0"',
    'video/mp4; codecs="hvc1.1.6.L93.B0"',
  ],
  hev1: [
    'video/mp4; codecs="hev1.1.6.L120.90"',
    'video/mp4; codecs="hvc1.1.6.L120.90"',
    'video/mp4; codecs="hev1.1.6.L93.B0"',
    'video/mp4; codecs="hvc1.1.6.L93.B0"',
  ],
  hvc1: [
    'video/mp4; codecs="hev1.1.6.L120.90"',
    'video/mp4; codecs="hvc1.1.6.L120.90"',
    'video/mp4; codecs="hev1.1.6.L93.B0"',
    'video/mp4; codecs="hvc1.1.6.L93.B0"',
  ],
  av1: ['video/mp4; codecs="av01.0.05M.08"'],
  av01: ['video/mp4; codecs="av01.0.05M.08"'],
  vp9: ['video/mp4; codecs="vp09.00.10.08"'],
  vp09: ['video/mp4; codecs="vp09.00.10.08"'],
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

function appendQuery(url: string, params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, value]) => value);
  if (entries.length === 0) {
    return url;
  }

  const search = new URLSearchParams(entries as [string, string][]);
  return `${url}${url.includes("?") ? "&" : "?"}${search.toString()}`;
}

function average(values: number[]): number | undefined {
  if (!values.length) {
    return undefined;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function normalizeCodecName(codecName?: string | null): string | undefined {
  return codecName?.toLowerCase().trim() || undefined;
}

export function getCodecMimeTypes(codecName?: string | null): string[] {
  const normalized = normalizeCodecName(codecName);
  if (!normalized) {
    return [];
  }

  return CODEC_SAMPLES[normalized] ?? [];
}

export function estimateRecordingBitrate(recordings: Recording[]): number | undefined {
  const explicit = recordings
    .map((recording) => recording.bitrate)
    .filter((value): value is number => typeof value === "number" && value > 0);

  if (explicit.length > 0) {
    return average(explicit);
  }

  const derived = recordings
    .map((recording) => {
      if (!recording.segment_size || !recording.duration) {
        return undefined;
      }

      return (recording.segment_size * 1024 * 1024 * 8) / recording.duration;
    })
    .filter((value): value is number => typeof value === "number" && value > 0);

  return average(derived);
}

export function groupRecordingsByVariant(
  recordings: Recording[],
): Record<string, Recording[]> {
  return recordings.reduce<Record<string, Recording[]>>((acc, recording) => {
    const variant = recording.variant || "main";
    if (!acc[variant]) {
      acc[variant] = [];
    }
    acc[variant].push(recording);
    return acc;
  }, {});
}

function canDirectPlayVariant(
  capabilities: PlaybackCapabilities,
  recordings: Recording[],
): boolean {
  const codecName = normalizeCodecName(recordings[0]?.codec_name);
  if (!codecName) {
    return false;
  }

  return capabilities.supports[codecName] === true;
}

function getDirectBaseUrl(apiHost: string): string {
  return trimTrailingSlash(apiHost);
}

function getTranscodeBaseUrl(apiHost: string, config?: FrigateConfig): string | undefined {
  if (!config?.transcode_proxy?.enabled) {
    return undefined;
  }

  if (config.transcode_proxy.vod_proxy_url?.trim()) {
    return trimTrailingSlash(config.transcode_proxy.vod_proxy_url);
  }

  return `${trimTrailingSlash(apiHost)}/vod-transcoded`;
}

function getTranscodeProfile(estimatedBandwidthBps?: number, saveData = false) {
  if (saveData || (estimatedBandwidthBps && estimatedBandwidthBps <= 1_500_000)) {
    return { bitrate: "512k", maxWidth: "640", maxHeight: "360" };
  }

  if (estimatedBandwidthBps && estimatedBandwidthBps <= 3_000_000) {
    return { bitrate: "1200k", maxWidth: "960", maxHeight: "540" };
  }

  return { bitrate: "2500k", maxWidth: "1280", maxHeight: "720" };
}

function buildDirectUrl(apiHost: string, vodPath: string, variant: string): string {
  const baseUrl = `${getDirectBaseUrl(apiHost)}${vodPath}`;
  return appendQuery(baseUrl, {
    variant: variant !== "main" ? variant : undefined,
  });
}

function buildTranscodeUrl(
  apiHost: string,
  config: FrigateConfig | undefined,
  vodPath: string,
  variant: string,
  capabilities: PlaybackCapabilities,
): string {
  const transcodeBase = getTranscodeBaseUrl(apiHost, config);
  if (!transcodeBase) {
    return buildDirectUrl(apiHost, vodPath, variant);
  }

  const profile = getTranscodeProfile(
    capabilities.estimatedBandwidthBps,
    capabilities.saveData,
  );

  return appendQuery(`${transcodeBase}${vodPath}`, {
    variant,
    bitrate: profile.bitrate,
    max_width: profile.maxWidth,
    max_height: profile.maxHeight,
  });
}

export function chooseRecordingPlayback({
  apiHost,
  config,
  recordings,
  preference,
  vodPath,
  capabilities,
}: DecisionOptions): RecordingPlaybackDecision {
  const recordingsByVariant = groupRecordingsByVariant(recordings);
  const mainRecordings = recordingsByVariant.main ?? [];
  const subRecordings = recordingsByVariant.sub ?? [];
  const transcodeAvailable = !!getTranscodeBaseUrl(apiHost, config);
  const estimatedBandwidthBps =
    capabilities.estimatedBandwidthBps ?? (capabilities.saveData ? 1_000_000 : 6_000_000);

  const candidates: Record<
    "main" | "sub",
    { recordings: Recording[]; playable: boolean; bitrate?: number }
  > = {
    main: {
      recordings: mainRecordings,
      playable: canDirectPlayVariant(capabilities, mainRecordings),
      bitrate: estimateRecordingBitrate(mainRecordings),
    },
    sub: {
      recordings: subRecordings,
      playable: canDirectPlayVariant(capabilities, subRecordings),
      bitrate: estimateRecordingBitrate(subRecordings),
    },
  };

  const preferDirect = (variant: "main" | "sub") => {
    const candidate = candidates[variant];
    return (
      candidate.recordings.length > 0 &&
      candidate.playable &&
      (!candidate.bitrate || candidate.bitrate <= estimatedBandwidthBps * 0.85)
    );
  };

  if (preference === "main" && candidates.main.recordings.length > 0) {
    return {
      mode: "direct",
      variant: "main",
      url: buildDirectUrl(apiHost, vodPath, "main"),
      reason: "manual-main",
    };
  }

  if (preference === "sub" && candidates.sub.recordings.length > 0) {
    if (candidates.sub.playable) {
      return {
        mode: "direct",
        variant: "sub",
        url: buildDirectUrl(apiHost, vodPath, "sub"),
        reason: "manual-sub",
      };
    }

    return {
      mode: "transcoded",
      variant: "sub",
      url: buildTranscodeUrl(apiHost, config, vodPath, "sub", capabilities),
      reason: "manual-sub-transcoded",
    };
  }

  if (preference === "transcoded") {
    const targetVariant = candidates.sub.recordings.length > 0 ? "sub" : "main";
    if (!transcodeAvailable) {
      return {
        mode: "direct",
        variant: targetVariant,
        url: buildDirectUrl(apiHost, vodPath, targetVariant),
        reason: "manual-transcoded-unavailable",
      };
    }

    return {
      mode: "transcoded",
      variant: targetVariant,
      url: buildTranscodeUrl(apiHost, config, vodPath, targetVariant, capabilities),
      reason: "manual-transcoded",
    };
  }

  if (preferDirect("main")) {
    return {
      mode: "direct",
      variant: "main",
      url: buildDirectUrl(apiHost, vodPath, "main"),
      reason: "raw-main",
    };
  }

  if (preferDirect("sub")) {
    return {
      mode: "direct",
      variant: "sub",
      url: buildDirectUrl(apiHost, vodPath, "sub"),
      reason: "raw-sub",
    };
  }

  const transcodeVariant = candidates.sub.recordings.length > 0 ? "sub" : "main";
  if (!transcodeAvailable) {
    return {
      mode: "direct",
      variant: transcodeVariant,
      url: buildDirectUrl(apiHost, vodPath, transcodeVariant),
      reason: "direct-fallback",
    };
  }

  return {
    mode: "transcoded",
    variant: transcodeVariant,
    url: buildTranscodeUrl(apiHost, config, vodPath, transcodeVariant, capabilities),
    reason: "transcode-fallback",
  };
}
