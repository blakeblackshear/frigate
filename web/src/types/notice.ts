export type NoticeMode = "state" | "event";
export type NoticeSeverity = "error" | "warning" | "info";
export type NoticeCategory =
  | "camera"
  | "detector"
  | "storage"
  | "model"
  | "system";
export type NoticeKind =
  | "ffmpeg_crash_loop"
  | "detector_stuck"
  | "model_download_failed"
  | "retention_unmet"
  | "update_available";

export type Notice = {
  id: string;
  kind: NoticeKind;
  mode: NoticeMode;
  severity: NoticeSeverity;
  category: NoticeCategory;
  scope: string | null;
  params: Record<string, string | number | boolean>;
  first_seen: number;
  last_seen: number;
  count: number;
  dismissed_at: number | null;
};

export type NoticeStats = {
  kind: NoticeKind;
  occurrences: number;
  dismissals: number;
  first_seen: number;
  last_seen: number;
};
