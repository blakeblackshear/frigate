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
  /** whether the kind repeats, so acknowledging it can hide it until next time */
  acknowledgeable: boolean;
  /** hidden until the next occurrence */
  acknowledged_at: number | null;
  /** hidden for good */
  muted_at: number | null;
};

/** a config or stream check row an admin muted */
export type MutedCheck = {
  id: string;
  muted_at: number;
};
