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
export type FfmpegHardwareOption = "none" | "auto";

export type ParsedFfmpegUrl = {
  isFfmpeg: boolean;
  baseUrl: string;
  video: FfmpegVideoOption;
  audio: FfmpegAudioOption;
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

export function parseFfmpegUrl(url: string): ParsedFfmpegUrl {
  if (!url.startsWith("ffmpeg:")) {
    return {
      isFfmpeg: false,
      baseUrl: url,
      video: "copy",
      audio: "copy",
      hardware: "none",
      extraFragments: [],
    };
  }

  const withoutPrefix = url.slice(7);
  const parts = withoutPrefix.split("#");
  const baseUrl = parts[0];
  const fragments = parts.slice(1);

  let video: FfmpegVideoOption | null = null;
  let audio: FfmpegAudioOption | null = null;
  let hardware: FfmpegHardwareOption = "none";
  const extraFragments: string[] = [];

  for (const frag of fragments) {
    if (frag.startsWith("video=")) {
      const val = frag.slice(6);
      if (VIDEO_VALUES.has(val)) {
        video = val as FfmpegVideoOption;
      } else {
        extraFragments.push(frag);
      }
    } else if (frag.startsWith("audio=")) {
      const val = frag.slice(6);
      if (AUDIO_VALUES.has(val)) {
        audio = val as FfmpegAudioOption;
      } else {
        extraFragments.push(frag);
      }
    } else if (frag === "hardware") {
      hardware = "auto";
    } else if (frag.startsWith("hardware=")) {
      const val = frag.slice(9);
      if (HARDWARE_SPECIFIC.has(val)) {
        hardware = "auto";
      } else {
        extraFragments.push(frag);
      }
    } else {
      extraFragments.push(frag);
    }
  }

  const hasAnyKnownFragment = video !== null || audio !== null;

  return {
    isFfmpeg: true,
    baseUrl,
    video: video ?? (hasAnyKnownFragment ? "exclude" : "copy"),
    audio: audio ?? (hasAnyKnownFragment ? "exclude" : "copy"),
    hardware,
    extraFragments,
  };
}

export function buildFfmpegUrl(parsed: ParsedFfmpegUrl): string {
  let url = `ffmpeg:${parsed.baseUrl}`;

  if (parsed.video !== "exclude") {
    url += `#video=${parsed.video}`;
  }
  if (parsed.audio !== "exclude") {
    url += `#audio=${parsed.audio}`;
  }
  if (parsed.hardware === "auto") {
    url += "#hardware";
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

  const withoutPrefix = url.slice(7);
  const baseUrl = withoutPrefix.split("#")[0];
  return baseUrl;
}
