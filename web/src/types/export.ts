export type Export = {
  id: string;
  camera: string;
  name: string;
  date: number;
  video_path: string;
  thumb_path: string;
  in_progress: boolean;
  export_case?: string | null;
  export_case_id?: string | null;
};

export type ExportCase = {
  id: string;
  name: string;
  description: string;
  created_at: number;
  updated_at: number;
};

export type BatchExportBody = {
  items: BatchExportItem[];
  export_case_id?: string;
  new_case_name?: string;
  new_case_description?: string;
};

export const MAX_BATCH_EXPORT_ITEMS = 50;

export type BatchExportItem = {
  camera: string;
  start_time: number;
  end_time: number;
  image_path?: string;
  friendly_name?: string;
  client_item_id?: string;
};

export type BatchExportResult = {
  camera: string;
  export_id?: string | null;
  success: boolean;
  status?: string | null;
  error?: string | null;
  item_index?: number | null;
  client_item_id?: string | null;
};

export type BatchExportResponse = {
  export_case_id?: string | null;
  export_ids: string[];
  results: BatchExportResult[];
};

export type StartExportResponse = {
  success: boolean;
  message: string;
  export_id?: string | null;
  status?: string | null;
};

export type ExportJobStep =
  | "queued"
  | "preparing"
  | "copying"
  | "encoding"
  | "encoding_retry"
  | "finalizing";

export type ExportJob = {
  id: string;
  job_type: string;
  status: string;
  camera: string;
  name?: string | null;
  export_case_id?: string | null;
  request_start_time: number;
  request_end_time: number;
  start_time?: number | null;
  end_time?: number | null;
  error_message?: string | null;
  results?: {
    export_id?: string;
    export_case_id?: string | null;
    video_path?: string;
    thumb_path?: string;
  } | null;
  current_step?: ExportJobStep;
  progress_percent?: number;
};

export type CameraActivitySegment = {
  /** Fractional start position within the time range, 0-1 inclusive. */
  start: number;
  /** Fractional end position within the time range, 0-1 inclusive. */
  end: number;
};

export type CameraActivity = {
  camera: string;
  count: number;
  hasDetections: boolean;
  segments: CameraActivitySegment[];
};

export type DeleteClipType = {
  file: string;
  exportName: string;
};

// filtering

const EXPORT_FILTERS = ["cameras"] as const;
export type ExportFilters = (typeof EXPORT_FILTERS)[number];
export const DEFAULT_EXPORT_FILTERS: ExportFilters[] = ["cameras"];

export type ExportFilter = {
  cameras?: string[];
};
