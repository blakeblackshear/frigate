import type { ReactNode } from "react";

export type HealthSeverity = "error" | "warning" | "info";

/**
 * One row in the Health tab's Notices list. Registry notices, config checks,
 * and stream checks all map into this shape so the row component never needs
 * to know where a problem came from.
 */
export type HealthProblem = {
  id: string;
  /** which source produced the row; part of the sort order */
  source: "registry" | "config" | "stream";
  severity: HealthSeverity;
  /** camera name or other scope shown as a chip before the text */
  scope?: string;
  /** whether scope is a camera name, so the chip can use the friendly name */
  scopeIsCamera?: boolean;
  text: string;
  /** muted line under the text, for example when it was first seen */
  meta?: ReactNode;
  /** in-app route for a settings icon link */
  link?: string;
  /** docs path for an external link, rendered in PR 2 */
  docLink?: string;
  /** absolute URL rendered as an external link (the update notice's release page) */
  externalLink?: string;
  /** render with a spinner instead of the severity icon (stream check running) */
  pending?: boolean;
  /** why a hidden row is hidden */
  hidden?: "acknowledged" | "muted";
  /** hide until the next occurrence; only for kinds that repeat */
  onAcknowledge?: () => void;
  /** hide for good */
  onMute?: () => void;
  /** show a hidden row again */
  onUnhide?: () => void;
};

/** What the Health tab's filter shows. */
export type NoticeFilter = {
  showHidden: boolean;
  severities: HealthSeverity[];
};

export const DEFAULT_NOTICE_FILTER: NoticeFilter = {
  showHidden: false,
  severities: ["error", "warning", "info"],
};
