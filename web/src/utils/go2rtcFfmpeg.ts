export type FfmpegVideoOption = "copy" | "h264" | "h265" | "exclude";
export type FfmpegAudioOption =
  | "copy"
  | "aac"
  | "opus"
  | "pcmu"
  | "pcma"
  | "pcm"
  | "mp3"
  | "exclude";
export type FfmpegHardwareOption =
  | "none"
  | "auto"
  | "vaapi"
  | "cuda"
  | "v4l2m2m"
  | "dxva2"
  | "videotoolbox";

export type ParsedFfmpegUrl = {
  isFfmpeg: boolean;
  baseUrl: string;
  // go2rtc accepts repeatable #video=/#audio= fragments to express a fallback
  // chain (copy if source codec matches, otherwise transcode). An empty array
  // means no fragment is emitted for that track — equivalent to "exclude".
  videos: FfmpegVideoOption[];
  audios: FfmpegAudioOption[];
  hardware: FfmpegHardwareOption;
  extraFragments: string[];
};

const VIDEO_VALUES = new Set(["copy", "h264", "h265"]);
const AUDIO_VALUES = new Set([
  "copy",
  "aac",
  "opus",
  "pcmu",
  "pcma",
  "pcm",
  "mp3",
]);
const HARDWARE_SPECIFIC = new Set([
  "vaapi",
  "cuda",
  "v4l2m2m",
  "dxva2",
  "videotoolbox",
]);

function isRecognizedFragment(frag: string): boolean {
  if (frag === "hardware") return true;
  if (frag.startsWith("video=")) return VIDEO_VALUES.has(frag.slice(6));
  if (frag.startsWith("audio=")) return AUDIO_VALUES.has(frag.slice(6));
  if (frag.startsWith("hardware=")) return HARDWARE_SPECIFIC.has(frag.slice(9));
  return false;
}

export function parseFfmpegUrl(url: string): ParsedFfmpegUrl {
  if (!url.startsWith("ffmpeg:")) {
    return {
      isFfmpeg: false,
      baseUrl: url,
      videos: [],
      audios: [],
      hardware: "none",
      extraFragments: [],
    };
  }

  const withoutPrefix = url.slice(7);
  const parts = withoutPrefix.split("#");
  const baseUrl = parts[0];
  const fragments = parts.slice(1);

  const videos: FfmpegVideoOption[] = [];
  const audios: FfmpegAudioOption[] = [];
  let hardware: FfmpegHardwareOption = "none";
  const extraFragments: string[] = [];

  for (const frag of fragments) {
    if (frag.startsWith("video=") && VIDEO_VALUES.has(frag.slice(6))) {
      videos.push(frag.slice(6) as FfmpegVideoOption);
    } else if (frag.startsWith("audio=") && AUDIO_VALUES.has(frag.slice(6))) {
      audios.push(frag.slice(6) as FfmpegAudioOption);
    } else if (frag === "hardware") {
      hardware = "auto";
    } else if (
      frag.startsWith("hardware=") &&
      HARDWARE_SPECIFIC.has(frag.slice(9))
    ) {
      hardware = frag.slice(9) as FfmpegHardwareOption;
    } else {
      extraFragments.push(frag);
    }
  }

  return {
    isFfmpeg: true,
    baseUrl,
    // Guarantee at least one row per track so the UI always has a primary
    // dropdown to render; "exclude" is the sentinel meaning "no fragment".
    videos: videos.length > 0 ? videos : ["exclude"],
    audios: audios.length > 0 ? audios : ["exclude"],
    hardware,
    extraFragments,
  };
}

// Splits the editable "base URL + extra fragments" portion of a compat-mode
// URL into its parts. Recognized fragments (video=, audio=, hardware) are
// dropped — they are managed by the dedicated controls in the UI.
export function parseFfmpegBaseAndExtras(input: string): {
  baseUrl: string;
  extraFragments: string[];
} {
  const cleaned = input.startsWith("ffmpeg:") ? input.slice(7) : input;
  const parts = cleaned.split("#");
  const baseUrl = parts[0];
  const extraFragments = parts.slice(1).filter((f) => !isRecognizedFragment(f));
  return { baseUrl, extraFragments };
}

export function buildFfmpegUrl(parsed: ParsedFfmpegUrl): string {
  let url = `ffmpeg:${parsed.baseUrl}`;

  // Exclude is a primary-row sentinel meaning "no fragment for this track" —
  // it's mutually exclusive with fallbacks. If the primary is exclude, emit
  // nothing for that track regardless of trailing entries.
  if (parsed.videos[0] !== "exclude") {
    for (const v of parsed.videos) {
      if (v === "exclude") continue;
      url += `#video=${v}`;
    }
  }
  if (parsed.audios[0] !== "exclude") {
    for (const a of parsed.audios) {
      if (a === "exclude") continue;
      url += `#audio=${a}`;
    }
  }
  if (parsed.hardware === "auto") {
    url += "#hardware";
  } else if (parsed.hardware !== "none") {
    url += `#hardware=${parsed.hardware}`;
  }
  for (const frag of parsed.extraFragments) {
    url += `#${frag}`;
  }

  return url;
}

export function toggleFfmpegMode(url: string, enable: boolean): string {
  if (enable) {
    if (url.startsWith("ffmpeg:")) {
      return url;
    }
    return `ffmpeg:${url}#video=copy#audio=copy`;
  }

  if (!url.startsWith("ffmpeg:")) {
    return url;
  }

  // Preserve unknown fragments (e.g. #timeout=10) when leaving compat mode;
  // only video/audio/hardware are go2rtc-ffmpeg directives that should be
  // dropped along with the prefix.
  const parsed = parseFfmpegUrl(url);
  return [parsed.baseUrl, ...parsed.extraFragments].join("#");
}
