import { ReviewSeverity } from "./review";
import { TimelineType } from "./timeline";

export type Recording = {
  id: string;
  camera: string;
  start_time: number;
  end_time: number;
  path: string;
  segment_size: number;
  duration: number;
  motion: number;
  objects: number;
  motion_heatmap?: Record<string, number> | null;
  dBFS: number;
};

export type RecordingSegment = {
  id: string;
  start_time: number;
  end_time: number;
  motion: number;
  objects: number;
  segment_size: number;
  duration: number;
};

export type RecordingActivity = {
  [hour: number]: RecordingSegmentActivity[];
};

type RecordingSegmentActivity = {
  date: number;
  count: number;
  hasObjects: boolean;
};

export type RecordingStartingPoint = {
  camera: string;
  startTime: number;
  severity: ReviewSeverity;
  timelineType?: TimelineType;
  navigationSource?: "shared-link";
};

export type RecordingPlayerError = "stalled" | "startup";

export type RecordingCoverageSpan = {
  start_time: number;
  end_time: number;
  streams: ("main" | "sub")[];
};

export type StreamMediaSummary = {
  video_codec: string | null;
  audio_rate: number | null;
  audio_codec: string | null;
  has_audio: boolean | null;
  bitrate: number | null;
};

// why auto quality is currently resolved to the low stream
export type AutoQualityReason = "bandwidth" | "codec" | "saveData";

// one span of a vod route's realized playlist. duration is in ms and
// exceeds the wall length when the clip carries keyframe back-snap
// lead-in; 0 means the clip is omitted from the playlist entirely
export type PlaybackTimelineSpan = {
  start_time: number;
  end_time: number;
  duration: number;
};

export type RecordingCoverage = {
  spans: RecordingCoverageSpan[];
  // informational, kept for API consumers; the UI no longer gates on it
  codecs_compatible: boolean;
  streams: { main?: StreamMediaSummary; sub?: StreamMediaSummary };
  // opt-in (?timelines=true); absent on requests that skip them
  timelines?: {
    auto: PlaybackTimelineSpan[];
    main: PlaybackTimelineSpan[];
    sub: PlaybackTimelineSpan[];
  };
};

export type PlaybackQuality = "auto" | "main" | "sub";
export const PLAYBACK_QUALITIES: PlaybackQuality[] = ["auto", "main", "sub"];

export const ASPECT_VERTICAL_LAYOUT = 1.5;
export const ASPECT_PORTRAIT_LAYOUT = 1.333;
export const ASPECT_WIDE_LAYOUT = 2;
