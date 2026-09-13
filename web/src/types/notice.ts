export type NoticeSeverity = "error" | "warning" | "info";
export type NoticeCategory = "camera" | "detector" | "model" | "system";

export type Notice = {
  id: string;
  kind: string;
  severity: NoticeSeverity;
  category: NoticeCategory;
  scope: string | null;
  params: Record<string, string | number | boolean>;
  /** app route or absolute URL */
  link: string | null;
  first_seen: number;
  last_seen: number;
  count: number;
  dismissed_at: number | null;
};

/** a config or stream check row an admin dismissed */
export type DismissedCheck = {
  id: string;
  dismissed_at: number;
};
