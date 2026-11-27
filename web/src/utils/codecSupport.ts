/**
 * Best-effort probe for whether this browser can decode a video codec
 * family.
 *
 * Frigate only stores the codec family from ffprobe (no profile or
 * level), so the probe tests representative MIME samples per family.
 * The result is a hint, not proof: a 10-bit stream can fail on a
 * browser that passes the Main-profile sample, so callers must keep a
 * reactive fallback for fatal codec errors. Unknown or NULL codecs
 * (legacy rows) always report supported - a wrong "unsupported" answer
 * silently degrades quality, which is worse than a failed attempt the
 * reactive path recovers from.
 */

declare global {
  interface Window {
    ManagedMediaSource?: typeof MediaSource;
  }
}

// any one supported sample marks the family playable
const CODEC_MIME_SAMPLES: Record<string, string[]> = {
  h264: ['video/mp4; codecs="avc1.42E01E"', 'video/mp4; codecs="avc1.64001F"'],
  hevc: [
    'video/mp4; codecs="hvc1.1.6.L120.90"',
    'video/mp4; codecs="hev1.1.6.L120.90"',
  ],
  av1: ['video/mp4; codecs="av01.0.05M.08"'],
};

const FAMILY_ALIASES: Record<string, string> = {
  avc: "h264",
  avc1: "h264",
  h265: "hevc",
  hev1: "hevc",
  hvc1: "hevc",
  av01: "av1",
};

function canPlayMimeType(mimeType: string): boolean {
  if (window.ManagedMediaSource?.isTypeSupported(mimeType)) {
    return true;
  }

  if (window.MediaSource?.isTypeSupported(mimeType)) {
    return true;
  }

  // native playback fallback for browsers without MSE
  return document.createElement("video").canPlayType(mimeType) !== "";
}

/**
 * Fails open: unknown codecs and NULL (legacy) codecs report supported,
 * since wrongly downgrading quality is worse than a recoverable failure.
 */
export function isCodecFamilySupported(
  codecName: string | null | undefined,
): boolean {
  if (!codecName) {
    return true;
  }

  const normalized = codecName.toLowerCase().trim();
  const family = FAMILY_ALIASES[normalized] ?? normalized;
  const samples = CODEC_MIME_SAMPLES[family];

  if (!samples) {
    return true;
  }

  return samples.some(canPlayMimeType);
}
