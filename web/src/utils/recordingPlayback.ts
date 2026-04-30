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
  mode: "direct";
  variant: string;
  url: string;
  reason: string;
};

export type PlaybackVariant = "main" | "sub";

type DecisionOptions = {
  apiHost: string;
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
  return {
    main: getRecordingsForPlaybackVariant(recordings, "main"),
    sub: getRecordingsForPlaybackVariant(recordings, "sub"),
  };
}

export function normalizePlaybackVariantFamily(
  variant?: string | null,
): PlaybackVariant | undefined {
  const normalized = variant?.toLowerCase().trim() || "main";

  if (normalized === "main") {
    return "main";
  }

  if (normalized === "sub") {
    return "sub";
  }

  return undefined;
}

function getVariantPriority(recording: Recording): number {
  const normalized = recording.variant?.toLowerCase().trim();

  if (normalized === "sub") {
    return 1;
  }

  if (normalized === "main") {
    return 0;
  }

  return -1;
}

export function getRecordingsForPlaybackVariant(
  recordings: Recording[],
  variant: PlaybackVariant,
): Recording[] {
  const selected = recordings
    .filter((recording) => normalizePlaybackVariantFamily(recording.variant) === variant)
    .sort((left, right) => {
      if (left.start_time !== right.start_time) {
        return left.start_time - right.start_time;
      }

      return getVariantPriority(right) - getVariantPriority(left);
    });

  const deduped = new Map<string, Recording>();

  for (const recording of selected) {
    const key = `${recording.start_time}:${recording.end_time}`;
    const existing = deduped.get(key);

    if (!existing || getVariantPriority(recording) > getVariantPriority(existing)) {
      deduped.set(key, recording);
    }
  }

  return Array.from(deduped.values()).sort(
    (left, right) => left.start_time - right.start_time,
  );
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

export function buildVariantVodPath(vodPath: string, variant: string): string {
  if (variant === "main") {
    return vodPath;
  }

  return vodPath.replace(/^\/vod\//, `/vod/variant/${variant}/`);
}

export function buildDirectUrl(
  apiHost: string,
  vodPath: string,
  variant: string,
): string {
  return `${getDirectBaseUrl(apiHost)}${buildVariantVodPath(vodPath, variant)}`;
}

export function getFallbackVariantForPreference(
  preference: RecordingPlaybackPreference,
): "main" | "sub" {
  if (preference === "sub") {
    return "sub";
  }

  return "main";
}

export function chooseRecordingPlayback({
  apiHost,
  recordings,
  preference,
  vodPath,
  capabilities,
}: DecisionOptions): RecordingPlaybackDecision {
  const recordingsByVariant = groupRecordingsByVariant(recordings);
  const mainRecordings = recordingsByVariant.main ?? [];
  const subRecordings = recordingsByVariant.sub ?? [];
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
    return {
      mode: "direct",
      variant: "sub",
      url: buildDirectUrl(apiHost, vodPath, "sub"),
      reason: "manual-sub",
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

  return {
    mode: "direct",
    variant: "main",
    url: buildDirectUrl(apiHost, vodPath, "main"),
    reason: "direct-fallback",
  };
}
