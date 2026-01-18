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
};

export type RecordingPlayerError = "stalled" | "startup";

export const ASPECT_VERTICAL_LAYOUT = 1.5;
export const ASPECT_PORTRAIT_LAYOUT = 1.333;
export const ASPECT_WIDE_LAYOUT = 2;
