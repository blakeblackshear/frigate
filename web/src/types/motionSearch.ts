/**
 * Types for the Motion Search feature
 */

export interface MotionSearchResult {
  timestamp: number;
  change_percentage: number;
}

export interface MotionSearchRequest {
  start_time: number;
  end_time: number;
  polygon_points: number[][];
  parallel?: boolean;
  threshold?: number;
  min_area?: number;
  frame_skip?: number;
  max_results?: number;
}

export interface MotionSearchStartResponse {
  success: boolean;
  message: string;
  job_id: string;
}

export interface MotionSearchMetrics {
  segments_scanned: number;
  segments_processed: number;
  metadata_inactive_segments: number;
  heatmap_roi_skip_segments: number;
  fallback_full_range_segments: number;
  frames_decoded: number;
  wall_time_seconds: number;
  segments_with_errors: number;
}

export interface MotionSearchStatusResponse {
  success: boolean;
  message: string;
  status: "queued" | "running" | "success" | "failed" | "cancelled";
  results?: MotionSearchResult[];
  total_frames_processed?: number;
  error_message?: string;
  metrics?: MotionSearchMetrics;
}
