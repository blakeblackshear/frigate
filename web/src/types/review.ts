export interface ReviewSegment {
    id: string;
    camera: string;
    severity: ReviewSeverity;
    start_time: number;
    end_time: number;
    thumb_path: string;
    has_been_reviewed: boolean;
    data: ReviewData;
  }

  export type ReviewSeverity = "alert" | "detection" | "significant_motion";

  export type ReviewData = {
    audio: string[];
    detections: string[];
    objects: string[];
    significant_motion_areas: number[];
    zones: string[];
  };