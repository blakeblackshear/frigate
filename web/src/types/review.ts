export interface ReviewSegment {
  id: string;
  camera: string;
  severity: ReviewSeverity;
  start_time: number;
  end_time?: number;
  thumb_path: string;
  has_been_reviewed: boolean;
  data: ReviewData;
}

export type ReviewSeverity = "alert" | "detection" | "significant_motion";

export type ReviewData = {
  audio: string[];
  detections: string[];
  objects: string[];
  sub_labels?: string[];
  significant_motion_areas: number[];
  zones: string[];
  metadata?: {
    title: string;
    scene: string;
    confidence: number;
    potential_threat_level?: number;
    other_concerns?: string[];
  };
};

export type SegmentedReviewData =
  | {
      all: ReviewSegment[];
      alert: ReviewSegment[];
      detection: ReviewSegment[];
      significant_motion: ReviewSegment[];
    }
  | undefined;

export type ReviewFilter = {
  cameras?: string[];
  labels?: string[];
  zones?: string[];
  before?: number;
  after?: number;
  showAll?: boolean;
};

type ReviewSummaryDay = {
  day: string;
  reviewed_alert: number;
  reviewed_detection: number;
  total_alert: number;
  total_detection: number;
};

export type ReviewSummary = {
  [day: string]: ReviewSummaryDay;
};

export type RecordingsSummary = {
  [day: string]: boolean;
};

export type MotionData = {
  start_time: number;
  motion?: number;
  audio?: number;
  camera: string;
};

export const REVIEW_PADDING = 4;

export type ReviewDetailPaneType = "overview" | "details";

export type ConsolidatedSegmentData = {
  startTime: number;
  endTime: number;
  severity: ReviewSeverity | "empty";
  reviewed: boolean;
};

export type TimelineZoomDirection = "in" | "out" | null;

export type ZoomLevel = {
  segmentDuration: number;
  timestampSpread: number;
};

export enum ThreatLevel {
  NORMAL = 0,
  NEEDS_REVIEW = 1,
  SECURITY_CONCERN = 2,
}

export const THREAT_LEVEL_LABELS: Record<ThreatLevel, string> = {
  [ThreatLevel.NORMAL]: "Normal",
  [ThreatLevel.NEEDS_REVIEW]: "Needs review",
  [ThreatLevel.SECURITY_CONCERN]: "Security concern",
};
