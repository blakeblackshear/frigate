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
};

export type ReviewFilter = {
  cameras?: string[];
  labels?: string[];
  before?: number;
  after?: number;
  showReviewed?: 0 | 1;
  showAll?: boolean;
};

type ReviewSummaryDay = {
  day: string;
  reviewed_alert: number;
  reviewed_detection: number;
  reviewed_motion: number;
  total_alert: number;
  total_detection: number;
  total_motion: number;
};

export type ReviewSummary = {
  [day: string]: ReviewSummaryDay;
};

export type MotionData = {
  start_time: number;
  motion?: number;
  audio?: number;
  camera: string;
};

export const REVIEW_PADDING = 2;
